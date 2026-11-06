// Rad-km · Gefühlt beim Fahren: Formel wie Open-Meteo, Luftstrom am Körper, Fahrgeschwindigkeit, Rechnung je Fahrt, Plausibilität
"use strict";

/* ---------------------------------------------------------------------
   Formel
   Open-Meteo berechnet apparent_temperature so (Quelle: open-meteo,
   Sources/App/Helper/Meteorology.swift, apparentTemperature; nach Steadman
   1994, „Norms of apparent temperature in Australia“, Aust. Met. Mag. 43):
     e  = RH/100 · 6,105 · exp(17,27·T / (237,7 + T))   Dampfdruck in hPa
     w  = 0,75 · w10                                     Wind in m/s auf 2 m (FAO-56, Gl. 47)
     Q  = max(0; 0,1 · (SW − 550))                       aufgenommene Strahlung
     AT = T + 0,348·e − 0,70·w + 0,70·Q/(w + 10) − 4,25
   „Beim Fahren“ setzt statt w den Luftstrom am Körper ein (siehe luftstrom).
   --------------------------------------------------------------------- */

// Gefühlte Temperatur (°C) aus Temperatur (°C), relativer Luftfeuchte (%),
// Luftstrom (m/s) und Globalstrahlung (W/m², Mittel der letzten 15 Minuten;
// fehlt sie, zählt keine Strahlung wie bei Open-Meteo)
function gefuehlteTemperatur(t, feuchte, luftMs, strahlung = null) {
  const e = feuchte / 100 * 6.105 * Math.exp(17.27 * t / (237.7 + t));
  const q = Math.max(0, 0.1 * ((strahlung ?? 550) - 550));
  return t + 0.348 * e - 0.70 * luftMs + 0.70 * q / (luftMs + 10) - 4.25;
}
const kmhInMs = kmh => kmh / 3.6;

// Luftstrom am Körper (km/h): Betrag der Relativgeschwindigkeit aus Fahrt und Wind.
// wind10: Wind in 10 m Höhe (km/h), auf Körperhöhe 1,5 m umgerechnet
// (WIND_KOERPER_FAKTOR); richtung: woher der Wind kommt (Grad); v: Fahrgeschwindigkeit
// (km/h); kurs: Fahrtrichtung (Grad). L² = u² + v² + 2·u·v·cos(richtung − kurs):
// Gegenwind u + v, Rückenwind |u − v|, Seitenwind √(u² + v²).
function luftstrom(wind10, richtung, v, kurs) {
  const u = WIND_KOERPER_FAKTOR * wind10;
  const phi = (richtung - kurs) * Math.PI / 180;
  return Math.sqrt(Math.max(0, u * u + v * v + 2 * u * v * Math.cos(phi)));
}
// Gefühlt beim Fahren für eine Fahrtrichtung (Winkel zwischen Wind und Fahrt in Grad, 0 = Gegenwind)
function gefuehltBeiWinkel(t, feuchte, strahlung, wind10, v, winkel) {
  return gefuehlteTemperatur(t, feuchte, kmhInMs(luftstrom(wind10, winkel, v, 0)), strahlung);
}
// Ohne Fahrtrichtung (Fahrt ab jetzt, Strecke ohne Länge): Mittel über alle
// Richtungen (alle 10°), dazu die Werte bei Gegen- und Rückenwind
function gefuehltOhneRichtung(t, feuchte, strahlung, wind10, v) {
  let summe = 0;
  for (let g = 0; g < 360; g += 10) summe += gefuehltBeiWinkel(t, feuchte, strahlung, wind10, v, g);
  return { mittel: summe / 36, gegen: gefuehltBeiWinkel(t, feuchte, strahlung, wind10, v, 0), ruecken: gefuehltBeiWinkel(t, feuchte, strahlung, wind10, v, 180) };
}

/* ---------- Fahrgeschwindigkeit ---------- */

// Die erste Vorlage mit Arbeitsweg (Reihenfolge der Vorlagen), sonst null
function arbeitswegVorlage(vorlagen = daten.vorlagen) { return vorlagen.find(v => v.arbeitsweg && v.km > 0) || null; }
// Fahrgeschwindigkeit (km/h) einer Fahrt ("hinfahrt", "rueckfahrt"; die Fahrt ab
// jetzt dauert so lange wie die Hinfahrt): die eigene, sonst je Richtung die
// halbe Strecke der Vorlage mit Arbeitsweg in der Dauer der Fahrt, sonst die
// Annahme. Liefert { kmh, quelle: "eigen" | "vorlage" | "annahme", vorlage }.
function fahrgeschwindigkeit(art, w = daten.einstellungen.wetter, vorlagen = daten.vorlagen) {
  if (w.geschwindigkeit !== null && w.geschwindigkeit !== undefined) return { kmh: w.geschwindigkeit, quelle: "eigen", vorlage: null };
  const v = arbeitswegVorlage(vorlagen), f = art === "rueckfahrt" ? w.rueckfahrt : w.hinfahrt;
  if (!v) return { kmh: GESCHWINDIGKEIT_ANNAHME, quelle: "annahme", vorlage: null };
  const kmh = Math.min(GESCHWINDIGKEIT_MAX, Math.max(GESCHWINDIGKEIT_MIN, Math.round(v.km / 2 / (f.dauer / 60) * 10) / 10));
  return { kmh, quelle: "vorlage", vorlage: v };
}

/* ---------- Rechnung je Fahrt ---------- */

// Wert einer Reihe zum Zeitpunkt t (null, wenn er fehlt oder die Reihe fehlt, z. B. alter Zwischenspeicher)
function m15Wert(d, feld, t) {
  const m = d && d.m15, reihe = m && m[feld];
  if (!Array.isArray(reihe)) return null;
  const i = ersterIndex(m.zeit, t);
  return m.zeit[i] === t && typeof reihe[i] === "number" ? reihe[i] : null;
}
// Werte eines Orts zum Zeitpunkt t; null, wenn Temperatur, Luftfeuchte oder Wind fehlen
function ortSchritt(d, t) {
  const s = { t: m15Wert(d, "temperatur", t), feuchte: m15Wert(d, "luftfeuchte", t), wind: m15Wert(d, "wind", t), richtung: m15Wert(d, "richtung", t),
    strahlung: m15Wert(d, "strahlung", t) };
  return s.t === null || s.feuchte === null || s.wind === null ? null : s;
}
// Mittel zweier Orte (Enden einer Teilstrecke); Wind wie windMittel: Geschwindigkeit
// gemittelt, Richtung aus dem Mittel der Windvektoren
function schrittMittel(a, b) {
  const mittel = k => a[k] === null || b[k] === null ? (a[k] ?? b[k]) : (a[k] + b[k]) / 2;
  const proben = [a, b].filter(x => x.richtung !== null).map(x => ({ v: x.wind, r: x.richtung }));
  const wm = windMittel(proben);
  return { t: mittel("t"), feuchte: mittel("feuchte"), strahlung: mittel("strahlung"), wind: mittel("wind"), richtung: wm ? wm.grad : null };
}
// Lage des Winds zur Fahrtrichtung in drei Gruppen (wie die Pfeile: genau auf
// einer Grenze zählt die ungünstigere): bis 67,5° Gegenwind, bis 112,5° Seitenwind, sonst Rückenwind
function windGruppe(winkel) {
  const d = Math.abs(windWinkel(winkel));
  return d <= 67.5 ? "gegen" : d <= 112.5 ? "seite" : "ruecken";
}
const WIND_LAGE_TEXT = { gegen: "Gegenwind", seite: "Seitenwind", ruecken: "Rückenwind" };
// Text zur Windlage einer Fahrt aus den Anteilen und dem mittleren Wind der
// zählenden Teilstrecken: "Gegenwind", "Seitenwind", "Rückenwind", "wechselnd"
// (keine Lage über der Hälfte der Länge), "kaum Wind" (unter WIND_SCHWACH);
// null ohne Teilstrecke, die für den Wind zählt
function windLage(anteil, windKmh) {
  if (!anteil) return null;
  if (windStaerke(windKmh).windstill || windStaerke(windKmh).schwach) return "kaum Wind";
  const g = ["gegen", "seite", "ruecken"].find(k => anteil[k] > 0.5);
  return g ? WIND_LAGE_TEXT[g] : "wechselnd";
}
// Windlage einer gespeicherten Fahrt (aus windAnteil und den Teilstrecken)
function windLageGespeichert(f) {
  if (!f || !f.windAnteil) return null;
  const zaehlen = (f.teilstrecken || []).filter(t => t.zaehlt);
  const laenge = zaehlen.reduce((x, t) => x + t.laenge, 0);
  const wind = laenge > 0 ? zaehlen.reduce((x, t) => x + t.laenge * t.wind, 0) / laenge : 0;
  return windLage(f.windAnteil, wind);
}

// Gefühlt beim Fahren für eine Fahrt im Zeitraum [von, bis):
// - je 15-Minuten-Schritt je Teilstrecke die Werte ihrer beiden Enden gemittelt;
//   Teilstrecken, die nicht für den Wind zählen, nur mit Fahrtwind (Wind 0);
// - der Wert des Schritts ist das nach der Länge (Luftlinie) gewichtete Mittel;
// - für die Fahrt gilt der kälteste Schritt.
// Ohne Strecke (kein Wohn- und Arbeitsort, alle Teilstrecken ohne Länge, Fahrt
// ab jetzt): keine Fahrtrichtung, je Ort das Mittel über alle Richtungen (Orte
// gleich gewichtet), dazu die Spanne von Gegen- bis Rückenwind.
// "strecken": teilstrecken() (Nummern der Orte wie in orteDaten) oder null;
// "rueck": Rückfahrt (umgekehrte Richtung). Liefert null, wenn für einen Schritt
// Werte fehlen (z. B. Luftfeuchte in einem alten Zwischenspeicher).
function fahrtGefuehlt(orteDaten, strecken, von, bis, kmh, rueck = false) {
  if (!orteDaten || !orteDaten.length) return null;
  const zeiten = orteDaten[0].m15.zeit.filter(t => t >= von && t < bis);
  if (!zeiten.length) return null;
  const mitStrecke = Array.isArray(strecken) && strecken.some(s => s.laenge > 0);
  const schritte = [];
  const feuchten = [], windProben = [];
  for (const t of zeiten) {
    const orte = orteDaten.map(d => ortSchritt(d, t));
    if (orte.some(o => o === null)) return null;
    orte.forEach(o => { feuchten.push(o.feuchte); if (o.richtung !== null) windProben.push({ v: o.wind, r: o.richtung }); });
    if (mitStrecke) {
      const teile = strecken.filter(s => s.laenge > 0).map(s => {
        const m = schrittMittel(orte[s.a], orte[s.b]), kurs = rueck ? s.kursRueck : s.kursHin;
        const zaehlt = s.wind && m.richtung !== null;
        const luft = zaehlt ? luftstrom(m.wind, m.richtung, kmh, kurs) : kmh;
        return { laenge: s.laenge, kurs, zaehlt, wind: m.wind, richtung: m.richtung, luftstrom: luft,
          beimFahren: gefuehlteTemperatur(m.t, m.feuchte, kmhInMs(luft), m.strahlung), gruppe: zaehlt ? windGruppe(m.richtung - kurs) : null };
      });
      const summe = teile.reduce((x, s) => x + s.laenge, 0);
      schritte.push({ t, wert: teile.reduce((x, s) => x + s.laenge * s.beimFahren, 0) / summe, teile });
    } else {
      const je = orte.map(o => gefuehltOhneRichtung(o.t, o.feuchte, o.strahlung, o.wind, kmh));
      const mittel = k => je.reduce((x, j) => x + j[k], 0) / je.length;
      schritte.push({ t, wert: mittel("mittel"), gegen: mittel("gegen"), ruecken: mittel("ruecken") });
    }
  }
  const kalt = schritte.reduce((a, b) => b.wert < a.wert ? b : a);
  const wm = windMittel(windProben);
  const erg = { beimFahren: kalt.wert, zeit: kalt.t, geschwindigkeit: kmh, luftfeuchte: feuchten.reduce((x, f) => x + f, 0) / feuchten.length,
    windRichtung: wm ? wm.grad : null, ohneRichtung: !mitStrecke, windAnteil: null, teilstrecken: null, lage: null, gegen: null, ruecken: null };
  if (!mitStrecke) return Object.assign(erg, { gegen: kalt.gegen, ruecken: kalt.ruecken });
  erg.teilstrecken = kalt.teile;
  const zaehlen = kalt.teile.filter(s => s.zaehlt), laenge = zaehlen.reduce((x, s) => x + s.laenge, 0);
  if (laenge > 0) {
    const anteil = g => zaehlen.filter(s => s.gruppe === g).reduce((x, s) => x + s.laenge, 0) / laenge;
    erg.windAnteil = { gegen: anteil("gegen"), seite: anteil("seite"), ruecken: anteil("ruecken") };
    erg.lage = windLage(erg.windAnteil, zaehlen.reduce((x, s) => x + s.laenge * s.wind, 0) / laenge);
  }
  return erg;
}
// Für den Eintrag: gerundete Werte (beimFahren, luftfeuchte, windRichtung,
// windAnteil, teilstrecken, geschwindigkeit) oder alle null
function fahrtGefuehltSpeichern(g) {
  if (!g) return Object.assign({}, FAHRT_WERTE_11);
  const r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100, grad = x => x === null ? null : Math.round(x) % 360;
  return {
    beimFahren: r1(g.beimFahren), luftfeuchte: Math.round(g.luftfeuchte), windRichtung: grad(g.windRichtung),
    windAnteil: g.windAnteil ? { gegen: r2(g.windAnteil.gegen), seite: r2(g.windAnteil.seite), ruecken: r2(g.windAnteil.ruecken) } : null,
    teilstrecken: g.teilstrecken ? g.teilstrecken.map(s => ({ laenge: r1(s.laenge), kurs: grad(s.kurs), zaehlt: s.zaehlt, wind: r1(s.wind), richtung: grad(s.richtung),
      luftstrom: r1(s.luftstrom), beimFahren: r1(s.beimFahren) })) : null,
    geschwindigkeit: g.geschwindigkeit
  };
}

/* ---------- Plausibilität (Anzeige im Testmodus) ---------- */

// Eigene Rechnung mit dem Wind, wie Open-Meteo ihn einsetzt (0,75 · w10), gegen
// apparent_temperature: größte Abweichung über alle Orte und Schritte.
// Liefert { schritte, abweichung, ort, zeit } oder null ohne passende Werte.
function plausibilitaet(orteDaten) {
  let erg = null, schritte = 0;
  (orteDaten || []).forEach((d, nr) => {
    const m = d.m15;
    if (!Array.isArray(m.luftfeuchte)) return;
    m.zeit.forEach((t, i) => {
      const werte = [m.temperatur[i], m.luftfeuchte[i], m.wind[i], m.gefuehlt[i]];
      if (werte.some(v => typeof v !== "number")) return;
      const strahlung = Array.isArray(m.strahlung) && typeof m.strahlung[i] === "number" ? m.strahlung[i] : null;
      const eigen = gefuehlteTemperatur(m.temperatur[i], m.luftfeuchte[i], kmhInMs(WIND_2M_FAKTOR * m.wind[i]), strahlung);
      const ab = Math.abs(eigen - m.gefuehlt[i]);
      schritte++;
      if (!erg || ab > erg.abweichung) erg = { abweichung: ab, ort: nr, zeit: t, eigen, openMeteo: m.gefuehlt[i] };
    });
  });
  return erg ? Object.assign(erg, { schritte }) : null;
}
