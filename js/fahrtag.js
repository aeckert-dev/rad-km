// Rad-km · Fahrtag: nächster Fahrtag (B13), Auswahl im Reiter Wetter (B14) und „Heute später los“ (verschobene Abfahrt)
"use strict";

// Open-Meteo liefert die Vorhersage für 8 Tage (forecast_days): heute bis heute + 7
const VORHERSAGE_TAGE = 8;
// „Heute“ bleibt im Reiter Wetter Voreinstellung bis 2 Stunden nach dem Ende der Rückfahrt
const HEUTE_VORGABE_MIN = 120;
// Schnellwahl „Heute später los“: Minuten nach der geplanten Abfahrt
const SPAETER_MINUTEN = [30, 60, 90, 120];
const FAHRTARTEN = ["hinfahrt", "rueckfahrt"];
const FAHRT_NAME = { hinfahrt: "Hinfahrt", rueckfahrt: "Rückfahrt" };
// Letzte Minute des Tages: eine Fahrt muss vor Mitternacht enden
const TAG_ENDE_MIN = 24 * 60 - 1;

// ---------- Verschobene Abfahrt („Heute später los“) ----------

// Nur auf dem Gerät (Hilfsspeicher, nicht in den Daten und nicht in der Sicherung):
// { datum, hinfahrt: "HH:MM" | null, rueckfahrt: "HH:MM" | null }. Sie gilt nur am
// Tag "datum"; an jedem anderen Tag zählt sie nicht (und wird beim Start gelöscht).
function abweichungLesen(h = heute()) {
  const leer = { datum: h, hinfahrt: null, rueckfahrt: null };
  let a = null;
  try { a = JSON.parse(localStorage.getItem(ABWEICHUNG_SCHLUESSEL) || "null"); } catch (e) { a = null; }
  const gueltig = istObjekt(a) && a.datum === h && FAHRTARTEN.every(k => (a[k] ?? null) === null || istUhrzeit(a[k]));
  return gueltig ? { datum: h, hinfahrt: a.hinfahrt ?? null, rueckfahrt: a.rueckfahrt ?? null } : leer;
}
// Beim Start: eine Abweichung von einem anderen Tag (oder eine unlesbare) löschen
function abweichungAufraeumen(h = heute()) {
  let roh = null;
  try { roh = localStorage.getItem(ABWEICHUNG_SCHLUESSEL); } catch (e) { return; }
  if (roh === null) return;
  const a = abweichungLesen(h);
  if (!a.hinfahrt && !a.rueckfahrt) abweichungLoeschen();
}
function abweichungLoeschen() { try { localStorage.removeItem(ABWEICHUNG_SCHLUESSEL); } catch (e) { /* nicht verfügbar */ } }
// Speichert die Abweichung (ohne verschobene Fahrt wird der Speicher gelöscht); false, wenn das nicht geht
function abweichungSchreiben(a) {
  try {
    if (!a.hinfahrt && !a.rueckfahrt) localStorage.removeItem(ABWEICHUNG_SCHLUESSEL);
    else localStorage.setItem(ABWEICHUNG_SCHLUESSEL, JSON.stringify({ datum: a.datum, hinfahrt: a.hinfahrt || null, rueckfahrt: a.rueckfahrt || null }));
    return true;
  } catch (e) { return false; }
}

// Geplante Abfahrt einer Fahrt: die übliche Abfahrt, ohne sie der Beginn des Zeitraums
function geplanteAbfahrtVon(f) { return ueblicheAbfahrt(f) ?? f.von; }

// Zeitfenster einer Fahrt am Tag "datum". Mit verschobener Abfahrt verschiebt sich
// der Zeitraum um denselben Betrag (16:00–17:00 mit Abfahrt 18:30 statt 16:00 →
// 18:30–19:30); die Dauer bleibt. Minuten nach Mitternacht, Uhrzeiten und ms.
function fahrtZeitfenster(art, datum, w = daten.einstellungen.wetter, abw = null) {
  const f = w[art], neu = abw && abw.datum === datum ? abw[art] : null;
  const geplant = geplanteAbfahrtVon(f), d = neu ? minutenAus(neu) - minutenAus(geplant) : 0;
  const vonMin = minutenAus(f.von) + d, bisMin = minutenAus(f.bis) + d;
  return { art, vonMin, bisMin, von: uhrzeitAus(vonMin), bis: uhrzeitAus(bisMin), dauer: f.dauer, geplant,
    abfahrt: neu || ueblicheAbfahrt(f), geplanteAbfahrt: neu ? geplant : null, verschoben: !!neu,
    vonMs: zeitpunktAm(datum, vonMin), bisMs: zeitpunktAm(datum, bisMin) };
}
// Fahrzeit (wie in den Einstellungen) für das Zeitfenster: für Abfahrtsfenster und Anzeige
function fahrzeitAus(zf) {
  return { von: zf.von, bis: zf.bis, dauer: zf.dauer, abfahrtAn: zf.abfahrt !== null, abfahrt: zf.abfahrt || zf.von };
}
// Passt eine Abfahrt "neu" für die Fahrt "art" am Tag "datum"? Fehlertext oder null.
// Die Fahrt muss vor Mitternacht enden, und die Hinfahrt muss vor der (ggf.
// verschobenen) Rückfahrt enden.
function abweichungPruefen(art, neu, datum, w = daten.einstellungen.wetter, abw = null) {
  if (!istUhrzeit(neu)) return "Bitte eine Uhrzeit eingeben, z. B. 18:30.";
  const probe = Object.assign({ hinfahrt: null, rueckfahrt: null }, abw, { datum, [art]: neu });
  const hin = fahrtZeitfenster("hinfahrt", datum, w, probe), rueck = fahrtZeitfenster("rueckfahrt", datum, w, probe);
  const z = art === "hinfahrt" ? hin : rueck;
  if (z.vonMin < 0) return "Die Fahrt kann frühestens um 00:00 beginnen.";
  if (z.bisMin > TAG_ENDE_MIN) return "Die Fahrt muss vor Mitternacht enden; späteste Abfahrt " + uhrzeitAus(minutenAus(neu) - (z.bisMin - TAG_ENDE_MIN)) + ".";
  if (hin.bisMin > rueck.vonMin) {
    return art === "hinfahrt" ? "Die Hinfahrt muss vor der Rückfahrt (ab " + rueck.von + ") enden." : "Die Rückfahrt kann erst nach dem Ende der Hinfahrt (" + hin.bis + ") beginnen.";
  }
  return null;
}
// Die heute gültige Abweichung: nur Fahrten, deren verschobene Abfahrt zu den
// aktuellen Einstellungen passt (sonst gilt die Planung)
function abweichungFuer(jetzt, w = daten.einstellungen.wetter) {
  const a = abweichungLesen(isoAusDate(new Date(jetzt)));
  const erg = { datum: a.datum, hinfahrt: null, rueckfahrt: null };
  FAHRTARTEN.forEach(art => { if (a[art] && !abweichungPruefen(art, a[art], a.datum, w, erg)) erg[art] = a[art]; });
  return erg;
}

// Ende der Fahrten am Tag "datum" in Minuten nach Mitternacht, wenn eine Abfahrt
// verschoben ist; sonst null (für den Hinweis „Fahrtag ohne Eintrag“)
function verschobenesEndeMin(datum, w = daten.einstellungen.wetter) {
  const abw = abweichungFuer(zeitpunktAm(datum, 0), w);
  if (!abw.hinfahrt && !abw.rueckfahrt) return null;
  return Math.max(...FAHRTARTEN.map(art => fahrtZeitfenster(art, datum, w, abw).bisMin));
}
// Ende der Fahrten am Tag "datum" (ms): das spätere Ende von Hin- und Rückfahrt
function fahrtEnde(datum, w = daten.einstellungen.wetter, abw = null) {
  return Math.max(...FAHRTARTEN.map(art => fahrtZeitfenster(art, datum, w, abw).bisMs));
}

// ---------- Nächster Fahrtag ----------

// Ein Tag mit Eintrag „Keine Fahrt“ (0 km) zählt nicht als Fahrtag, ab 5g auch
// kein Tag einer Abwesenheit (außer mit Fahrt: Einträge gehen vor)
function keineFahrtAm(datum, eintraege = daten.eintraege) { return eintraege.some(e => e.datum === datum && e.typ === "tag" && e.km === 0); }
function zaehltAlsFahrtag(datum, fahrtage = daten.einstellungen.fahrtage, eintraege = daten.eintraege, abwesenheiten = daten.abwesenheiten) {
  return fahrtage.includes(isoWochentag(datum)) && !keineFahrtAm(datum, eintraege) && !abwesendAm(datum, abwesenheiten, eintraege);
}

// Der nächste Fahrtag: heute bis zum Ende der (ggf. verschobenen) Rückfahrt, danach
// der folgende (Fahrtage Mo, Di, Fr: Freitag nach der Rückfahrt schon Montag).
// "vorlaeufig" bis zum geplanten Ende der Rückfahrt am Vortag (Standard 17:00);
// "inVorhersage": der Tag liegt in den 8 Tagen der Vorhersage, sonst gibt es sie
// ab "vorhersageAb". null ohne Fahrtage. "abwesenheit" (ab 5g): die zuletzt endende
// Abwesenheit, die bis dahin Fahrtage überspringt (für „Urlaub bis So 03.01.“), sonst null.
function naechsterFahrtag(jetzt, w = daten.einstellungen.wetter, fahrtage = daten.einstellungen.fahrtage, abw = abweichungFuer(jetzt, w), eintraege = daten.eintraege) {
  if (!fahrtage.length) return null;
  const h = isoAusDate(new Date(jetzt));
  const zaehlt = d => zaehltAlsFahrtag(d, fahrtage, eintraege);
  let datum = zaehlt(h) && jetzt < fahrtEnde(h, w, abw) ? h : plusTage(h, 1);
  // Höchstens ein Jahr voraus (sonst sind alle Fahrtage als „Keine Fahrt“ eingetragen
  // oder abwesend); danach sucht die App nicht weiter
  for (let i = 0; i < 366 && !zaehlt(datum); i++) datum = plusTage(datum, 1);
  if (!zaehlt(datum)) return null;
  const abwesenheit = abwesenheitVorFahrtag(h, datum, fahrtage);
  const tage = tageZwischen(h, datum), vortag = plusTage(datum, -1);
  const endgueltigAb = zeitpunktAm(vortag, minutenAus(w.rueckfahrt.bis));
  return { datum, heute: tage === 0, morgen: tage === 1, tage, vorlaeufig: jetzt < endgueltigAb, endgueltigAb, vortag,
    inVorhersage: tage < VORHERSAGE_TAGE, vorhersageAb: plusTage(datum, 1 - VORHERSAGE_TAGE), abwesenheit };
}
// "Heute, Mo 23.11.", "Morgen, Mo 23.11. · vorläufig", "Mo 23.11. · in 3 Tagen · vorläufig"
function fahrtagTitel(n) {
  const tag = wochentag(n.datum) + " " + kurzDatum(n.datum), zusatz = n.vorlaeufig ? " · vorläufig" : "";
  if (n.heute) return "Heute, " + tag;
  if (n.morgen) return "Morgen, " + tag + zusatz;
  return tag + " · in " + tageText(n.tage) + zusatz;
}
// Für die Kachel: "Heute, Mo 23.11.", "Morgen, Mo 23.11. (vorläufig)", "Mo 23.11. (vorläufig)"
function fahrtagKurz(n) {
  const tag = wochentag(n.datum) + " " + kurzDatum(n.datum);
  return (n.heute ? "Heute, " : n.morgen ? "Morgen, " : "") + tag + (n.vorlaeufig ? " (vorläufig)" : "");
}
// "Endgültig ab So 22.11., 17:00" bzw. "… ab heute 17:00"
function endgueltigText(n, h, w = daten.einstellungen.wetter) {
  return "Vorläufige Empfehlung: Die Vorhersage für mehrere Tage im Voraus ist unsicherer. Endgültig ab " +
    (n.vortag === h ? "heute" : wochentag(n.vortag) + " " + kurzDatum(n.vortag) + ",") + " " + w.rueckfahrt.bis + ".";
}
// "Vorhersage für Mo 30.11. gibt es ab Mo 23.11."
function vorhersageAbText(n) {
  return "Die Vorhersage für " + wochentag(n.datum) + " " + kurzDatum(n.datum) + " gibt es ab " + wochentag(n.vorhersageAb) + " " + kurzDatum(n.vorhersageAb);
}

// ---------- Auswahl im Reiter Wetter (Umschalter) ----------

// Ein Tipp im Umschalter gilt nur im Arbeitsspeicher und nur, bis sich die
// Voreinstellung ändert (2 Stunden nach dem Ende der Rückfahrt, um 00:00) oder die App neu startet.
let wetterWahl = null; // { wert, schluessel }

// Auswahl im Reiter Wetter: „Heute“ (an einem Fahrtag nach dem Ende der Fahrt bis
// 24:00), „Nächster“ (der nächste Fahrtag; vor dem Ende der Fahrt ist das heute)
// und der weitere Ort, wenn er aktiv ist. Voreinstellung „Heute“ bis 2 Stunden
// nach dem Ende der Rückfahrt, danach „Nächster“.
function wetterAuswahl(jetzt, n, w = daten.einstellungen.wetter, abw = null, mitStrecke = true) {
  const h = isoAusDate(new Date(jetzt)), optionen = [];
  let vorgabe = null;
  if (mitStrecke) {
    if (n && !n.heute && zaehltAlsFahrtag(h)) {
      optionen.push({ wert: "heute", titel: "Heute", datum: h });
      if (jetzt < fahrtEnde(h, w, abw) + HEUTE_VORGABE_MIN * MINUTE_MS) vorgabe = "heute";
    }
    optionen.push({ wert: "naechster", titel: n && n.heute ? "Heute" : "Nächster", datum: n ? n.datum : null });
    if (!vorgabe) vorgabe = "naechster";
  }
  if (w.weitererOrt && w.weitererOrt.aktiv) {
    optionen.push({ wert: "ort", titel: w.weitererOrt.name, datum: null });
    if (!vorgabe) vorgabe = "ort";
  }
  const schluessel = h + "|" + vorgabe;
  const wert = wetterWahl && wetterWahl.schluessel === schluessel && optionen.some(o => o.wert === wetterWahl.wert) ? wetterWahl.wert : vorgabe;
  return { optionen, vorgabe, wert, schluessel };
}
