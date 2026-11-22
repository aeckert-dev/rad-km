// Rad-km · Wetter (Logik): Abruf, Zwischenspeicher, Ampel, Kleidung, Wind, Abfahrt, Wetter je Eintrag, Rückblick
"use strict";

/* =====================================================================
   5. WETTER: Abruf, Zwischenspeicher, Ampel, Kleidung, Abfahrt, Wind
   Vorhersage von Open-Meteo (Modell ICON des Deutschen Wetterdienstes, in
   Deutschland im 15-Minuten-Raster). Amtliche Warnungen vom GeoServer des
   DWD, bei dessen Ausfall über Bright Sky (dieselben Warnungen des DWD).
   Gesendet werden nur die auf 3 Nachkommastellen gerundeten Koordinaten. Die geladenen Daten
   liegen in einem eigenen Zwischenspeicher; der Abruf verändert die Daten
   der App nie. Zeitpunkte sind Millisekunden, Fahrzeiten gelten in Ortszeit.
   ===================================================================== */

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const ORTSSUCHE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const DWD_URL = "https://maps.dwd.de/geoserver/dwd/ows";
const BRIGHT_SKY_URL = "https://api.brightsky.dev/alerts";
const RUECKBLICK_URL = "https://historical-forecast-api.open-meteo.com/v1/forecast";
// Apple Karten: nur beim Antippen von "In Karten zeigen", keine eingebettete Karte
const KARTEN_URL = "https://maps.apple.com/";
// Der Rückblick reicht etwa bis 2022 zurück; abgefragt wird in Abschnitten von höchstens so vielen Tagen
const RUECKBLICK_AB = "2022-01-01";
const RUECKBLICK_TAGE = 31;
// Luftfeuchte und Globalstrahlung (ab 5d) für „gefühlt beim Fahren“ mit derselben Formel wie apparent_temperature
const WERTE_15_MIN = ["temperature_2m", "apparent_temperature", "precipitation", "weather_code", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
  "relative_humidity_2m", "shortwave_radiation"];
const WERTE_STUENDLICH = ["precipitation_probability", "soil_temperature_0cm"];
// Je Tag (nur Vorhersage): Sonnenauf- und -untergang
const WERTE_TAEGLICH = ["sunrise", "sunset"];
const DWD_FELDER = ["IDENTIFIER", "STATUS", "MSGTYPE", "CATEGORY", "EVENT", "EC_GROUP", "SEVERITY", "ONSET", "EXPIRES", "HEADLINE", "DESCRIPTION", "NAME"];
const MINUTE_MS = 60 * 1000, VIERTELSTUNDE_MS = 15 * MINUTE_MS, STUNDE_MS = 60 * MINUTE_MS;
// Neu laden, wenn Vorhersage bzw. Warnungen älter sind; noch ältere gelten als nicht aktuell
const VORHERSAGE_NEU_MS = 15 * MINUTE_MS;
const WARNUNGEN_NEU_MS = 10 * MINUTE_MS;
const NICHT_AKTUELL_MS = 2 * STUNDE_MS;
const ABRUF_ZEITLIMIT_MS = 10000;
// Wettercodes (WMO): Gewitter; gefrierender Sprühregen bzw. Regen
const GEWITTER_CODES = [95, 96, 99];
const GEFRIEREND_CODES = [56, 57, 66, 67];
// "Nasse Straße" für die Glätte: Niederschlag in so vielen Stunden vor der Fahrt
const NASS_STUNDEN = 6;
// Darunter (km/h) gilt der Wind als schwach
const WIND_SCHWACH = 10;
const WARNSTUFEN = { minor: 1, moderate: 2, severe: 3, extreme: 4 };
const FARBWORT = { gruen: "grün", gelb: "gelb", rot: "rot" };
const ORT_TITEL = { wohnort: "Wohnort", arbeitsort: "Arbeitsort", weitererOrt: "Weiterer Ort" };
const QUELLEN_NAME = { dwd: "Deutscher Wetterdienst", brightsky: "Bright Sky (Ersatz, Daten des DWD)" };

// ---------- Orte und Adressen ----------

// Orte, für die das Wetter geladen wird: die Strecke und (ab 5e zusätzlich) der
// weitere Ort, wenn er aktiv ist – in einer Abfrage, als letzter Ort
function wetterOrte(w = daten.einstellungen.wetter) {
  const orte = streckenOrte(w);
  if (w.weitererOrt && w.weitererOrt.aktiv) orte.push({ rolle: "weitererOrt", titel: ORT_TITEL.weitererOrt, ort: w.weitererOrt });
  return orte;
}
// Orte der Fahrten zur Arbeit: Wohnort, Wegpunkte, Arbeitsort. Wegpunkte zählen
// nur, wenn Wohn- und Arbeitsort festgelegt sind.
function streckenOrte(w = daten.einstellungen.wetter) {
  const orte = [];
  if (w.wohnort) orte.push({ rolle: "wohnort", titel: ORT_TITEL.wohnort, ort: w.wohnort });
  if (w.wohnort && w.arbeitsort) w.wegpunkte.forEach((o, i) => orte.push({ rolle: "wegpunkt", titel: wegpunktTitel(i), ort: o }));
  if (w.arbeitsort) orte.push({ rolle: "arbeitsort", titel: ORT_TITEL.arbeitsort, ort: w.arbeitsort });
  return orte;
}
function wegpunktTitel(i) { return "Wegpunkt " + (i + 1); }
// Teilstrecken Wohnort → Wegpunkte → Arbeitsort: Länge (km, Luftlinie), Richtung
// hin und zurück, ob sie für den Wind zählt, und die Nummern ihrer beiden Orte
// in streckenOrte (dieselbe Reihenfolge wie in der Vorhersage). [] ohne Strecke.
function teilstrecken(w = daten.einstellungen.wetter) {
  const orte = streckenOrte(w);
  if (!w.wohnort || !w.arbeitsort) return [];
  return orte.slice(1).map((b, i) => {
    const a = orte[i];
    return { von: a, bis: b, a: i, b: i + 1, laenge: entfernungKm(a.ort, b.ort), kursHin: kursZwischen(a.ort, b.ort), kursRueck: kursZwischen(b.ort, a.ort),
      wind: w.windTeilstrecken[i] !== false };
  });
}
// "Wohnort → Brücke"
function teilstreckeTitel(t, rueck) { return rueck ? t.bis.ort.name + " → " + t.von.ort.name : t.von.ort.name + " → " + t.bis.ort.name; }
// Koordinate für die Adressen der Wetterdienste: immer auf 3 Stellen gerundet, "51.100".
// Auch die Schlüssel des Zwischenspeichers nutzen sie.
function koordinate(x) { return koordinateSenden(x).toFixed(3); }
function ortSchluessel(o) { return koordinate(o.lat) + "," + koordinate(o.lon); }
// Anzeige und Eingabefeld mit 4 Stellen: "51,1000"
function koordinateFeld(x) { return koordinateSpeichern(x).toFixed(4).replace(".", ","); }
// Anzeige: "51,1000 / 10,2000"
function koordinatenText(o) { return koordinateFeld(o.lat) + " / " + koordinateFeld(o.lon); }

function wetterParameter(orte) {
  return "?latitude=" + orte.map(o => koordinate(o.lat)).join(",") + "&longitude=" + orte.map(o => koordinate(o.lon)).join(",") +
    "&models=icon_seamless&minutely_15=" + WERTE_15_MIN.join(",") + "&hourly=" + WERTE_STUENDLICH.join(",") + "&timeformat=unixtime&timezone=auto";
}
function vorhersageUrl(orte) { return OPEN_METEO_URL + wetterParameter(orte) + "&daily=" + WERTE_TAEGLICH.join(",") + "&past_days=1&forecast_days=8"; }
// Rückblick: archivierte Vorhersagen (die ersten Stunden jedes Laufs), gleiches Format, Tage "von" bis "bis"
function rueckblickUrl(orte, von, bis) { return RUECKBLICK_URL + wetterParameter(orte) + "&start_date=" + von + "&end_date=" + bis; }
// GeoServer des DWD (WFS): Objekte der Ebene, deren Fläche den Punkt enthält (Reihenfolge lat lon)
function dwdUrl(ebene, felder, geometrie, o) {
  return DWD_URL + "?service=WFS&version=2.0.0&request=GetFeature&typeName=dwd:" + ebene + "&outputFormat=application/json" +
    "&propertyName=" + felder.join(",") + "&CQL_FILTER=" + encodeURIComponent("CONTAINS(" + geometrie + ",POINT(" + koordinate(o.lat) + " " + koordinate(o.lon) + "))");
}
function brightSkyUrl(o) { return BRIGHT_SKY_URL + "?lat=" + koordinate(o.lat) + "&lon=" + koordinate(o.lon); }
// Apple Karten an dieser Stelle: Koordinaten mit 4 Nachkommastellen, der Name als
// Beschriftung der Markierung (q gilt als Beschriftung, wenn ll gesetzt ist)
function kartenUrl(o) {
  return KARTEN_URL + "?ll=" + koordinateSpeichern(o.lat).toFixed(4) + "," + koordinateSpeichern(o.lon).toFixed(4) + "&q=" + encodeURIComponent(o.name);
}
function ortssucheUrl(text) { return ORTSSUCHE_URL + "?name=" + encodeURIComponent(text) + "&count=8&language=de&format=json"; }

// Holt JSON. Wirft einen Fehler mit kurzer Begründung (keine Verbindung, Zeitüberschreitung, Fehler 503 …).
// "aussen": AbortSignal zum Abbrechen (z. B. eine ältere Ortssuche); dann hat der Fehler "abgebrochen".
async function jsonAbrufen(url, aussen = null) {
  const abbruch = typeof AbortController === "function" ? new AbortController() : null;
  const timer = abbruch && setTimeout(() => abbruch.abort(), ABRUF_ZEITLIMIT_MS);
  const abgebrochen = () => { const f = new Error("abgebrochen"); f.abgebrochen = true; return f; };
  if (aussen && abbruch) { if (aussen.aborted) abbruch.abort(); else aussen.addEventListener("abort", () => abbruch.abort()); }
  try {
    let antwort;
    try {
      if (aussen && aussen.aborted) throw abgebrochen();
      antwort = await fetch(url, { credentials: "omit", signal: abbruch ? abbruch.signal : undefined });
    } catch (e) {
      if (aussen && aussen.aborted) throw abgebrochen();
      throw new Error(e && e.name === "AbortError" ? "keine Antwort (Zeitüberschreitung)" : "keine Verbindung");
    }
    if (aussen && aussen.aborted) throw abgebrochen();
    let inhalt = null;
    try { inhalt = await antwort.json(); } catch (e) { /* kein JSON */ }
    if (!antwort.ok) {
      const f = new Error("Fehler " + antwort.status);
      f.status = antwort.status;
      throw f;
    }
    if (inhalt === null || typeof inhalt !== "object") throw new Error("unerwartete Antwort");
    return inhalt;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Antworten der Dienste lesen ----------

// Open-Meteo → je Ort { m15: {zeit, temperatur, …}, stunde: {zeit, wahrscheinlichkeit, boden},
// sonne: {tag, aufgang, untergang} } ("sonne" null, wenn die Antwort keine Tageswerte hat,
// z. B. im Rückblick)
function vorhersageLesen(antwort, anzahl) {
  const liste = Array.isArray(antwort) ? antwort : [antwort];
  if (liste.length !== anzahl) throw new Error("unerwartete Antwort");
  return liste.map(o => {
    const m = o && o.minutely_15, s = o && o.hourly;
    if (!m || !s || !Array.isArray(m.time) || !Array.isArray(s.time)) throw new Error("unerwartete Antwort");
    const spalte = (q, name) => Array.isArray(q[name]) && q[name].length === q.time.length ? q[name] : q.time.map(() => null);
    return {
      m15: {
        zeit: m.time.map(t => t * 1000), temperatur: spalte(m, "temperature_2m"), gefuehlt: spalte(m, "apparent_temperature"),
        niederschlag: spalte(m, "precipitation"), code: spalte(m, "weather_code"), wind: spalte(m, "wind_speed_10m"),
        richtung: spalte(m, "wind_direction_10m"), boeen: spalte(m, "wind_gusts_10m"),
        luftfeuchte: spalte(m, "relative_humidity_2m"), strahlung: spalte(m, "shortwave_radiation")
      },
      stunde: { zeit: s.time.map(t => t * 1000), wahrscheinlichkeit: spalte(s, "precipitation_probability"), boden: spalte(s, "soil_temperature_0cm") },
      sonne: sonneLesen(o.daily)
    };
  });
}

// Tageswerte: Datum (Ortszeit; "time" ist Mitternacht, 3 Stunden später gerechnet,
// damit eine Zeitumstellung das Datum nicht verschiebt), Auf- und Untergang (ms)
function sonneLesen(t) {
  if (!t || !Array.isArray(t.time) || !Array.isArray(t.sunrise) || !Array.isArray(t.sunset)) return null;
  const ms = x => typeof x === "number" && Number.isFinite(x) ? x * 1000 : null;
  return { tag: t.time.map(x => isoAusDate(new Date(x * 1000 + 3 * STUNDE_MS))), aufgang: t.sunrise.map(ms), untergang: t.sunset.map(ms) };
}

// Art einer Warnung nach Ereignis ("STARKES GEWITTER") und Gruppe ("THUNDERSTORM;WIND")
function warnungsArt(text) {
  const t = text.toUpperCase();
  if (/GEWITTER|THUNDERSTORM/.test(t)) return "gewitter";
  if (/GLÄTTE|GLATTEIS|GLAZE/.test(t)) return "glaette";
  if (/HITZE|HEAT|(^|[^A-ZÄÖÜ])UV([^A-ZÄÖÜ]|$)/.test(t)) return "gesundheit";
  return "sonst";
}
// Einheitliche Warnung aus DWD oder Bright Sky; Stufe 1–4 aus minor … extreme
function warnungAus(r) {
  const zeit = t => { const ms = t ? Date.parse(t) : NaN; return isNaN(ms) ? null : ms; };
  const ereignis = String(r.ereignis || "WARNUNG").trim();
  return {
    id: String(r.id || ""), ereignis, stufe: WARNSTUFEN[String(r.schwere || "").toLowerCase()] || 1,
    beginn: zeit(r.beginn), ende: zeit(r.ende), titel: String(r.titel || ""), text: String(r.text || ""),
    art: String(r.kategorie || "").toLowerCase() === "health" ? "gesundheit" : warnungsArt(ereignis + " " + (r.gruppe || ""))
  };
}
// GeoServer des DWD → { abgedeckt, gebiet, warnungen }. Ohne Warnung ist offen, ob der Ort im Warngebiet liegt (abgedeckt null).
function dwdWarnungenLesen(antwort) {
  if (!antwort || !Array.isArray(antwort.features)) throw new Error("unerwartete Antwort");
  const p = antwort.features.map(f => (f && f.properties) || {});
  return {
    abgedeckt: p.length ? true : null,
    gebiet: p.length && p[0].NAME ? String(p[0].NAME) : null,
    warnungen: p.filter(x => String(x.STATUS).toLowerCase() === "actual" && String(x.MSGTYPE).toLowerCase() !== "cancel")
      .map(x => warnungAus({ id: x.IDENTIFIER, ereignis: x.EVENT, gruppe: x.EC_GROUP, kategorie: x.CATEGORY, schwere: x.SEVERITY,
        beginn: x.ONSET, ende: x.EXPIRES, titel: x.HEADLINE, text: x.DESCRIPTION }))
  };
}
function brightSkyLesen(antwort) {
  if (!antwort || !Array.isArray(antwort.alerts)) throw new Error("unerwartete Antwort");
  return {
    abgedeckt: true,
    gebiet: antwort.location && antwort.location.name ? String(antwort.location.name) : null,
    warnungen: antwort.alerts.filter(a => a && String(a.status).toLowerCase() === "actual")
      .map(a => warnungAus({ id: a.alert_id, ereignis: a.event_de, kategorie: a.category, schwere: a.severity,
        beginn: a.onset, ende: a.expires, titel: a.headline_de, text: a.description_de }))
  };
}
// Ortssuche → Treffer, Koordinaten sofort auf 4 Nachkommastellen gerundet
function ortsTrefferLesen(antwort) {
  return (antwort && Array.isArray(antwort.results) ? antwort.results : [])
    .filter(r => r && r.name && istEndlich(r.latitude) && istEndlich(r.longitude))
    .map(r => ({ name: String(r.name), zusatz: [r.admin1, r.country].filter(Boolean).join(", "), lat: koordinateSpeichern(r.latitude), lon: koordinateSpeichern(r.longitude),
      plz: Array.isArray(r.postcodes) && r.postcodes.length ? String(r.postcodes[0]) : null }));
}

// ---------- Laden und Zwischenspeicher ----------

// vorhersage / warnungen: { schluessel (Koordinaten der Orte), stand, orte, … }; gebiete: Warngebiet je Ort.
// Ändert sich der Aufbau, WETTER_SPEICHER_VERSION erhöhen: ein alter Zwischenspeicher wird dann verworfen.
const WETTER_SPEICHER_VERSION = 1;
let wetter = { vorhersage: null, warnungen: null, gebiete: {} };
// Fehler des letzten Abrufs (nur solange die App geöffnet ist)
const wetterStatus = { laeuft: false, fehlerVorhersage: null, fehlerWarnungen: null };

function wetterSpeicherLaden() {
  try {
    const c = JSON.parse(localStorage.getItem(WETTER_SCHLUESSEL) || "null");
    if (istObjekt(c) && c.version === WETTER_SPEICHER_VERSION) {
      wetter = { vorhersage: c.vorhersage || null, warnungen: c.warnungen || null, gebiete: istObjekt(c.gebiete) ? c.gebiete : {} };
    }
  } catch (e) { /* kein oder unlesbarer Zwischenspeicher: wird neu geladen */ }
}
function wetterSpeicherSchreiben() {
  try { localStorage.setItem(WETTER_SCHLUESSEL, JSON.stringify(Object.assign({ version: WETTER_SPEICHER_VERSION }, wetter))); }
  catch (e) { /* Speicher voll: dann ohne Zwischenspeicher */ }
}

// Amtliche Warnungen aller Orte: vom DWD, bei einem Fehler von Bright Sky.
// "gebiete" merkt sich je Ort, ob er im Warngebiet liegt.
async function warnungenLaden(orte, gebiete = wetter.gebiete) {
  try {
    return { quelle: "dwd", orte: await Promise.all(orte.map(o => dwdWarnungenOrt(o, gebiete))) };
  } catch (e) {
    try {
      return { quelle: "brightsky", dwdFehler: e.message, orte: await Promise.all(orte.map(brightSkyWarnungenOrt)) };
    } catch (e2) {
      throw new Error("DWD: " + e.message + "; Bright Sky: " + e2.message);
    }
  }
}
async function dwdWarnungenOrt(o, gebiete = wetter.gebiete) {
  const erg = dwdWarnungenLesen(await jsonAbrufen(dwdUrl("Warnungen_Gemeinden", DWD_FELDER, "THE_GEOM", o)));
  if (erg.abgedeckt) return erg;
  // Keine Warnung: einmal je Ort nachsehen, ob er im Warngebiet des DWD liegt (z. B. Urlaub im Ausland)
  const k = ortSchluessel(o);
  if (!gebiete[k]) {
    const g = await jsonAbrufen(dwdUrl("Warngebiete_Gemeinden", ["WARNCELLID", "NAME"], "SHAPE", o));
    if (!Array.isArray(g.features)) throw new Error("unerwartete Antwort");
    const p = g.features.length ? g.features[0].properties || {} : null;
    gebiete[k] = { abgedeckt: !!p, gebiet: p && p.NAME ? String(p.NAME) : null };
  }
  return Object.assign({ warnungen: [] }, gebiete[k]);
}
async function brightSkyWarnungenOrt(o) {
  try {
    return brightSkyLesen(await jsonAbrufen(brightSkyUrl(o)));
  } catch (e) {
    // 404: Ort liegt nicht im Warngebiet des DWD
    if (e.status === 404) return { abgedeckt: false, gebiet: null, warnungen: [] };
    throw e;
  }
}

// Lädt Vorhersage und Warnungen neu, wenn sie fehlen, zu alt sind, zu anderen
// Orten gehören oder der letzte Versuch fehlschlug. Verändert nur den
// Zwischenspeicher, nie die Daten der App.
async function wetterAktualisieren(erzwingen = false, jetzt = Date.now()) {
  const orte = wetterOrte().map(x => x.ort);
  if (!orte.length || wetterStatus.laeuft) return;
  const schluessel = orte.map(ortSchluessel).join(";");
  const faellig = (teil, fehler, ms) => erzwingen || !!fehler || !teil || teil.schluessel !== schluessel || !(jetzt - teil.stand < ms);
  const vorhersage = faellig(wetter.vorhersage, wetterStatus.fehlerVorhersage, VORHERSAGE_NEU_MS);
  const warnungen = faellig(wetter.warnungen, wetterStatus.fehlerWarnungen, WARNUNGEN_NEU_MS);
  if (!vorhersage && !warnungen) return;
  wetterStatus.laeuft = true;
  if (erzwingen) wetterNeuZeichnen();
  await Promise.all([
    vorhersage && jsonAbrufen(vorhersageUrl(orte)).then(a => {
      wetter.vorhersage = { schluessel, stand: jetzt, orte: vorhersageLesen(a, orte.length) };
      wetterStatus.fehlerVorhersage = null;
    }).catch(e => { wetterStatus.fehlerVorhersage = e.message; }),
    warnungen && warnungenLaden(orte).then(w => {
      wetter.warnungen = Object.assign({ schluessel, stand: jetzt }, w);
      wetterStatus.fehlerWarnungen = null;
    }).catch(e => { wetterStatus.fehlerWarnungen = e.message; })
  ]);
  wetterStatus.laeuft = false;
  wetterSpeicherSchreiben();
  wetterNeuZeichnen();
  // Orte während des Abrufs geändert: für die neuen Orte gleich nachladen
  if (wetterOrte().map(x => ortSchluessel(x.ort)).join(";") !== schluessel) await wetterAktualisieren(erzwingen, Date.now());
}
// Nach dem Laden neu zeichnen, aber kein geöffnetes Formular stören
function wetterNeuZeichnen() {
  if (!fenster.open && (aktiverTab === "wetter" || aktiverTab === "uebersicht")) zeichnen();
}
// Beim Start, beim Wechsel in Übersicht oder Wetter und beim Zurückkehren in die App
// (im Testmodus nicht: die Tests rufen wetterAktualisieren selbst auf). Den Standort
// des iPhones fragt das Wetter seit 5e nie ab.
function wetterBeiBedarf() { if (!TESTMODUS) wetterAktualisieren(); }

// ---------- Zeiten ----------

// Zeitpunkt "minuten" nach Mitternacht (Ortszeit) am Tag "datum"; auch an Tagen mit Zeitumstellung
function zeitpunktAm(datum, minuten) {
  const [j, m, t] = datum.split("-").map(Number);
  return new Date(j, m - 1, t, 0, minuten).getTime();
}
function uhrzeit(ms) { const d = new Date(ms); return zweistellig(d.getHours()) + ":" + zweistellig(d.getMinutes()); }
function tagTitel(datum, h) { return datum === h ? "Heute" : datum === plusTage(h, 1) ? "Morgen" : wochentag(datum) + " " + kurzDatum(datum); }
// "20:15 Uhr", "gestern, 20:15 Uhr" bzw. "Fr 23.10., 20:15 Uhr"
function standText(ms, jetzt) {
  const datum = isoAusDate(new Date(ms)), h = isoAusDate(new Date(jetzt));
  const tag = datum === h ? "" : datum === plusTage(h, -1) ? "gestern, " : wochentag(datum) + " " + kurzDatum(datum) + ", ";
  return tag + uhrzeit(ms) + " Uhr";
}

// ---------- Werte eines Zeitraums ----------

// Erster Index mit zeit[i] >= t (Zeiten aufsteigend)
function ersterIndex(zeit, t) {
  let a = 0, b = zeit.length;
  while (a < b) { const m = (a + b) >> 1; if (zeit[m] < t) a = m + 1; else b = m; }
  return a;
}
// Werte eines Orts für den Zeitraum [von, bis) als Reihen { t, v }.
// Momentwerte (Temperatur, Wind, Wettercode) zählen zu Zeitpunkten von ≤ t < bis.
// Niederschlag und Böen gelten für die 15 Minuten vor t, zählen also für
// von < t ≤ bis; t in der Reihe ist der Beginn dieser 15 Minuten. Die
// stündliche Regenwahrscheinlichkeit gilt für die Stunde vor t.
function ortWerte(d, von, bis) {
  const m = d.m15, s = d.stunde;
  const r = { temperatur: [], gefuehlt: [], code: [], wind: [], niederschlag: [], boeen: [], vorher: [], wahrscheinlichkeit: [], boden: [] };
  const neu = (reihe, t, v) => { if (typeof v === "number") reihe.push({ t, v }); };
  for (let i = ersterIndex(m.zeit, von - NASS_STUNDEN * STUNDE_MS); i < m.zeit.length && m.zeit[i] <= bis; i++) {
    const t = m.zeit[i];
    if (t >= von && t < bis) {
      neu(r.temperatur, t, m.temperatur[i]); neu(r.gefuehlt, t, m.gefuehlt[i]); neu(r.code, t, m.code[i]);
      if (typeof m.wind[i] === "number" && typeof m.richtung[i] === "number") r.wind.push({ v: m.wind[i], r: m.richtung[i] });
    }
    if (t > von && t <= bis) {
      neu(r.niederschlag, Math.max(von, t - VIERTELSTUNDE_MS), m.niederschlag[i]);
      neu(r.boeen, Math.max(von, t - VIERTELSTUNDE_MS), m.boeen[i]);
    }
    if (t > von - NASS_STUNDEN * STUNDE_MS && t <= von) neu(r.vorher, t, m.niederschlag[i]);
  }
  for (let i = ersterIndex(s.zeit, von - STUNDE_MS); i < s.zeit.length && s.zeit[i] < bis + STUNDE_MS; i++) {
    const t = s.zeit[i];
    if (t > von) neu(r.wahrscheinlichkeit, Math.max(von, t - STUNDE_MS), s.wahrscheinlichkeit[i]);
    if (t > von - STUNDE_MS) neu(r.boden, t, s.boden[i]);
  }
  return r;
}
const summeVon = reihe => reihe.reduce((x, p) => x + p.v, 0);
// Frühester Zeitpunkt, an dem die Bedingung erfüllt ist (null = nie)
function erstesMal(reihe, bedingung) {
  return reihe.reduce((t, p) => bedingung(p.v) && (t === null || p.t < t) ? p.t : t, null);
}

// ---------- Ampel je Fahrt ----------

const zahl0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const zahl1 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
// Negative Zahlen mit echtem Minuszeichen
const minus = text => text.replace("-", "−");
function gradText(t, stellen = 0) {
  const f = 10 ** stellen;
  return minus((stellen ? zahl1 : zahl0).format(Math.round(t * f) / f || 0)) + " °C";
}
function kmhText(v) { return zahl0.format(Math.round(v)) + " km/h"; }
function mmhText(v) { return zahl1.format(Math.round(v * 10) / 10) + " mm/h"; }
function grundText(g) { return g.text + (g.zeit ? " ab " + uhrzeit(g.zeit) : ""); }

// Glätte aus der Vorhersage: gefrierender Regen, oder kalt (Luft ≤ Grenze bzw.
// Boden ≤ 0 °C) und nass (Niederschlag während der Fahrt oder in den Stunden davor)
function glaetteErkennen(orte, g) {
  let erg = null;
  orte.forEach(o => {
    const gefrierend = erstesMal(o.code, v => GEFRIEREND_CODES.includes(v));
    const kaltLuft = erstesMal(o.temperatur, v => v <= g.glaetteTemperatur);
    const kaltBoden = o.boden.some(p => p.v <= 0);
    const nassVorher = summeVon(o.vorher) >= 0.1;
    const regen = erstesMal(o.niederschlag, v => v > 0);
    let fund = null;
    if (gefrierend !== null) fund = { text: "Glätte (gefrierender Regen)", zeit: gefrierend };
    else if ((kaltLuft !== null || kaltBoden) && (nassVorher || regen !== null)) {
      fund = { text: nassVorher ? "Glätte (nasse Straße)" : "Glätte", zeit: nassVorher ? kaltLuft : regen };
    }
    if (fund && (!erg || (fund.zeit ?? 0) < (erg.zeit ?? 0))) erg = fund;
  });
  return erg;
}

// Bewertet eine Fahrt im Zeitraum [von, bis) an allen Orten (es gilt jeweils der
// ungünstigere Wert). Liefert { farbe, gruende, text, werte } oder null, wenn
// für den Zeitraum keine Vorhersage vorliegt.
function fahrtBewerten(orteDaten, warnungen, von, bis, g = daten.einstellungen.wetter.ampel) {
  const orte = orteDaten.map(d => ortWerte(d, von, bis));
  if (orte.some(o => !o.temperatur.length || !o.gefuehlt.length || !o.niederschlag.length)) return null;
  const alle = feld => orte.flatMap(o => o[feld]);
  const groesster = feld => Math.max(...alle(feld).map(p => p.v));
  const werte = {
    temperatur: Math.min(...alle("temperatur").map(p => p.v)),
    gefuehlt: Math.min(...alle("gefuehlt").map(p => p.v)),
    niederschlag: Math.round(Math.max(...orte.map(o => summeVon(o.niederschlag))) * 10) / 10,
    intensitaet: groesster("niederschlag") * 4,
    regenWahrscheinlichkeit: alle("wahrscheinlichkeit").length ? groesster("wahrscheinlichkeit") : null,
    boeen: alle("boeen").length ? groesster("boeen") : 0,
    windProben: alle("wind"),
    windJeOrt: orte.map(o => o.wind)
  };
  const gruende = [];
  const grund = (farbe, art, text, zeit) => gruende.push({ farbe, art, text, zeit: zeit !== null && zeit > von ? zeit : null });

  // Amtliche Warnungen zuerst: Gewitter und Glätte immer rot, sonst ab der Stufe für Rot; Hitze und UV nur zur Info
  const gesehen = new Set();
  warnungen.filter(wn => wn.art !== "gesundheit" && warnungImZeitraum(wn, von, bis)).forEach(wn => {
    if (gesehen.has(wn.ereignis)) return;
    gesehen.add(wn.ereignis);
    const rot = wn.art === "gewitter" || wn.art === "glaette" || wn.stufe >= g.rotWarnstufe;
    grund(rot ? "rot" : "gelb", "warnung", "Warnung " + wn.ereignis + " (Stufe " + wn.stufe + ")", wn.beginn);
  });
  // Rot aus der Vorhersage
  const gewitter = erstesMal(alle("code"), v => GEWITTER_CODES.includes(v));
  if (gewitter !== null) grund("rot", "gewitter", "Gewitter", gewitter);
  const glaette = glaetteErkennen(orte, g);
  if (glaette) grund("rot", "glaette", glaette.text, glaette.zeit);
  if (werte.boeen >= g.rotBoeen) grund("rot", "boeen", "Böen " + kmhText(werte.boeen), erstesMal(alle("boeen"), v => v >= g.rotBoeen));
  if (werte.intensitaet >= g.rotStarkregen) grund("rot", "regen", "Starkregen " + mmhText(werte.intensitaet), erstesMal(alle("niederschlag"), v => v * 4 >= g.rotStarkregen));
  // Gelb
  const regenZeit = erstesMal(alle("niederschlag"), v => v > 0);
  const wahrscheinlich = werte.regenWahrscheinlichkeit !== null && werte.regenWahrscheinlichkeit >= g.gelbRegenWahrscheinlichkeit;
  const regnerisch = werte.intensitaet >= g.gelbNiederschlag && werte.intensitaet < g.rotStarkregen;
  if (wahrscheinlich) {
    grund("gelb", "regen", werte.regenWahrscheinlichkeit + " % Regen", regenZeit ?? erstesMal(alle("wahrscheinlichkeit"), v => v >= g.gelbRegenWahrscheinlichkeit));
  } else if (regnerisch) {
    grund("gelb", "regen", "Regen " + mmhText(werte.intensitaet), erstesMal(alle("niederschlag"), v => v * 4 >= g.gelbNiederschlag));
  }
  if (werte.boeen >= g.gelbBoeen && werte.boeen < g.rotBoeen) grund("gelb", "boeen", "Böen " + kmhText(werte.boeen), erstesMal(alle("boeen"), v => v >= g.gelbBoeen));
  if (werte.temperatur < g.gelbTemperatur) grund("gelb", "frost", "Frost (" + gradText(werte.temperatur, 1) + ")", erstesMal(alle("temperatur"), v => v < g.gelbTemperatur));

  const farbe = gruende.some(x => x.farbe === "rot") ? "rot" : gruende.length ? "gelb" : "gruen";
  // Rote Gründe zuerst, sonst in der Reihenfolge oben (Warnungen, Gewitter, Glätte, Böen, Regen, …)
  gruende.sort((a, b) => (a.farbe === "rot" ? 0 : 1) - (b.farbe === "rot" ? 0 : 1));
  // Grün: Böen stehen in der Zeile zum Wind; in der Begründung nur, wenn sie Gelb oder Rot auslösen
  const ruhig = werte.niederschlag > 0 ? "kaum Regen" : "trocken";
  return { farbe, gruende, werte, text: FARBWORT[farbe] + ": " + (gruende.length ? gruende.slice(0, 3).map(grundText).join(", ") : ruhig) };
}

// Warnungen aller Orte ohne Doppelte (gleiches Ereignis, gleiche Stufe und Zeit), mit den betroffenen Orten
function warnungenZusammen(teil, orte) {
  const m = new Map();
  teil.orte.forEach((o, i) => o.warnungen.forEach(wn => {
    const k = [wn.ereignis, wn.stufe, wn.beginn, wn.ende].join("|");
    if (!m.has(k)) m.set(k, Object.assign({}, wn, { orte: [] }));
    if (!m.get(k).orte.includes(orte[i].titel)) m.get(k).orte.push(orte[i].titel);
  }));
  return [...m.values()].sort((a, b) => b.stufe - a.stufe || (a.beginn ?? 0) - (b.beginn ?? 0));
}
function warnungImZeitraum(wn, von, bis) { return (wn.beginn === null || wn.beginn < bis) && (wn.ende === null || wn.ende > von); }

// ---------- Kleidung ----------

// Teile einer Kleidung ("T-Shirt, warmer Pullover" → ["T-Shirt", "warmer Pullover"])
function teileVon(text) { return String(text || "").split(",").map(t => t.trim()).filter(Boolean); }
// Steht das Teil schon in der Kleidung? ("Regenjacke als Windschutz" enthält "Regenjacke")
function enthaelt(text, teil) { return String(text || "").toLowerCase().includes(teil.toLowerCase()); }
// Empfehlung in einer Zeile, leere Bereiche weggelassen: "leichte Mütze · Socken"
function empfehlungText(bereiche) { return BEREICH_SCHLUESSEL.map(b => bereiche[b]).filter(Boolean).join(" · "); }

// Kleidung je Körperbereich nach dem kältesten Wert der Fahrt (gefühlt beim Fahren bzw. gefühlt, siehe stufenGrundlage; Stufe:
// die erste, deren Untergrenze erreicht ist) und der Regenwahrscheinlichkeit
// (Regenzusatz). Bei Regen gilt das Zwiebelprinzip:
// - Kopf und Hals wie in der Stufe; Hände ebenso, außer die Stufe nennt
//   "Hände bei Regen" (gilt, sobald ein Regenzusatz greift).
// - Oberkörper, Beine, Füße: Kommt Regenzeug dazu, das noch nicht in der
//   Kleidung der Stufe steht, wird es angehängt. Besteht der Bereich dabei aus
//   mehreren Teilen, gilt die Kleidung der nächstwärmeren Stufe (eine Schicht
//   weniger); bei einem Teil und in der wärmsten Stufe bleibt er.
// - Regenzeug für Kopf, Hals oder Hände wird nur angehängt.
function kleidungFuer(gefuehlt, wahrscheinlichkeit, k = daten.einstellungen.wetter.kleidung) {
  let i = k.stufen.findIndex(s => s.ab !== null && gefuehlt >= s.ab);
  if (i < 0) i = k.stufen.length - 1;
  const stufe = k.stufen[i], waermer = i > 0 ? k.stufen[i - 1] : null;
  const zusaetze = wahrscheinlichkeit === null ? [] : k.regen.filter(r => wahrscheinlichkeit >= r.ab);
  const mitRegen = zusaetze.length > 0;
  const bereiche = {}, regenBereiche = [];
  BEREICH_SCHLUESSEL.forEach(b => {
    let eigen = stufe.bereiche[b], geaendert = false;
    if (b === "haende" && mitRegen && stufe.haendeBeiRegen) { eigen = stufe.haendeBeiRegen; geaendert = eigen !== stufe.bereiche[b]; }
    const neu = [...new Set(zusaetze.flatMap(r => teileVon(r.bereiche[b])))].filter(t => !enthaelt(eigen, t));
    let text = eigen;
    if (neu.length) {
      const basis = ZWIEBEL_BEREICHE.includes(b) && waermer && teileVon(eigen).length > 1 ? waermer.bereiche[b] : eigen;
      text = teileVon(basis).concat(neu.filter(t => !enthaelt(basis, t))).join(", ");
      geaendert = true;
    }
    bereiche[b] = text;
    if (geaendert) regenBereiche.push(b);
  });
  return { index: i, stufe, mitRegen, bereiche, regenBereiche, text: empfehlungText(bereiche) };
}
// Wonach die Kleidungsstufe gewählt wird: „gefühlt beim Fahren“ (Grundlage
// "fahrt"), wenn es berechnet werden konnte, sonst die gefühlte Temperatur von
// Open-Meteo. Liefert { grundlage, wert }.
function stufenGrundlage(gefuehlt, beimFahren, k = daten.einstellungen.wetter.kleidung) {
  const fahrt = k.grundlage === "fahrt" && !!beimFahren;
  return { grundlage: fahrt ? "fahrt" : "gefuehlt", wert: fahrt ? beimFahren.beimFahren : gefuehlt };
}
// Hinweis, wenn die Rückfahrt andere Kleidung braucht als die Hinfahrt, z. B.
// "Für die Rückfahrt einpacken: Regenhose, Gamaschen; nicht mehr nötig: Schal."
function kleidungsHinweis(hin, rueck) {
  if (!hin || !rueck) return null;
  const dazu = new Set(), weg = new Set();
  BEREICH_SCHLUESSEL.forEach(b => {
    const h = hin.bereiche[b], r = rueck.bereiche[b];
    teileVon(r).filter(t => !enthaelt(h, t)).forEach(t => dazu.add(t));
    teileVon(h).filter(t => !enthaelt(r, t)).forEach(t => weg.add(t));
  });
  const teile = [];
  if (dazu.size) teile.push("einpacken: " + [...dazu].join(", "));
  if (weg.size) teile.push("nicht mehr nötig: " + [...weg].join(", "));
  return teile.length ? "Für die Rückfahrt " + teile.join("; ") + "." : null;
}

// ---------- Wind relativ zur Strecke ----------

// Richtung (Grad, 0 = Nord) von a nach b auf dem Großkreis
function kursZwischen(a, b) {
  const r = x => x * Math.PI / 180;
  const y = Math.sin(r(b.lon - a.lon)) * Math.cos(r(b.lat));
  const x = Math.cos(r(a.lat)) * Math.sin(r(b.lat)) - Math.sin(r(a.lat)) * Math.cos(r(b.lat)) * Math.cos(r(b.lon - a.lon));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
// Entfernung (km, Luftlinie auf der Kugel) zwischen zwei Orten
function entfernungKm(a, b) {
  const r = x => x * Math.PI / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
const HIMMELSRICHTUNGEN = ["Nord", "Nordost", "Ost", "Südost", "Süd", "Südwest", "West", "Nordwest"];
// Relative Richtung des Winds zur Fahrtrichtung in acht Abschnitten zu je 45°:
// [Grenze (Grad), Name von links, Name von rechts, Farbe des Pfeils]. Ein Winkel
// genau auf einer Grenze zählt zum Abschnitt weiter vorn (dem ungünstigeren).
// Farben: "gegen" (rot), "seite" (orange, schräg von vorn und von der Seite),
// "ruecken" (grün, schräg von hinten und Rückenwind).
const WIND_ABSCHNITTE = [
  [22.5, "Gegenwind", "Gegenwind", "gegen"],
  [67.5, "von schräg vorn links", "von schräg vorn rechts", "seite"],
  [112.5, "von links", "von rechts", "seite"],
  [157.5, "von schräg hinten links", "von schräg hinten rechts", "ruecken"],
  [180, "Rückenwind", "Rückenwind", "ruecken"]
];
// Winkel auf 1/1000 Grad gerundet (damit die Grenzen trotz Rechenungenauigkeit
// eindeutig sind), 0 ≤ x < 360
const winkelRunden = x => (Math.round(x * 1000) / 1000 % 360 + 360) % 360;
// Mittlerer Wind: Geschwindigkeit (Mittel der Werte) und Richtung, aus der er weht
// (Grad, 0 = Nord, Mittel der Windvektoren); null ohne Werte
function windMittel(proben) {
  if (!proben.length) return null;
  let x = 0, y = 0, summe = 0;
  proben.forEach(p => { x += p.v * Math.sin(p.r * Math.PI / 180); y += p.v * Math.cos(p.r * Math.PI / 180); summe += p.v; });
  return { kmh: summe / proben.length, grad: (Math.atan2(x, y) * 180 / Math.PI + 360) % 360 };
}
// Der angezeigte (gerundete) Wert entscheidet: 0 = windstill, unter WIND_SCHWACH schwach
function windStaerke(kmh) {
  const gerundet = Math.round(kmh);
  return { kmh: gerundet, windstill: gerundet === 0, schwach: gerundet > 0 && gerundet < WIND_SCHWACH };
}
// Winkel zwischen Windrichtung (aus der er weht) und Fahrtrichtung, −180 < d ≤ 180;
// positiv = von rechts
function windWinkel(winkel) {
  const d = winkelRunden(winkel);
  return d > 180 ? d - 360 : d;
}
// Abschnitt zum Winkel: Name und Farbe des Pfeils
function windAbschnittVon(winkel) {
  const d = windWinkel(winkel);
  const [, links, rechts, farbe] = WIND_ABSCHNITTE.find(([grenze]) => Math.abs(d) <= grenze);
  return { name: d > 0 ? rechts : links, farbe };
}
function windAbschnitt(winkel) { return windAbschnittVon(winkel).name; }
// Wind relativ zu einer Fahrtrichtung "kurs": "Gegenwind 14 km/h", "von links
// 4 km/h, schwach", "windstill" (auch die Beschriftung des Pfeils für VoiceOver).
// "drehung": Richtung des Pfeils in Grad im Uhrzeigersinn, 0 = nach oben (der
// Fahrer fährt nach oben; der Pfeil zeigt, wohin der Wind weht: Gegenwind nach
// unten, Wind von rechts nach links, Rückenwind nach oben). null ohne Werte.
function windRelativ(proben, kurs) {
  const m = windMittel(proben);
  if (!m) return null;
  const s = windStaerke(m.kmh);
  if (s.windstill) return Object.assign(s, { abschnitt: null, farbe: null, drehung: null, text: "windstill" });
  const a = windAbschnittVon(m.grad - kurs);
  const drehung = Math.round(((windWinkel(m.grad - kurs) + 180) % 360) * 10) / 10;
  return Object.assign(s, { abschnitt: a.name, farbe: a.farbe, drehung, text: a.name + " " + kmhText(m.kmh) + (s.schwach ? ", schwach" : "") });
}
// Wind je Teilstrecke, die für den Wind zählt: mit ihrer eigenen Fahrtrichtung
// und dem Wind an ihren beiden Enden. Die Rückfahrt in umgekehrter Richtung und
// Reihenfolge. Teilstrecken, die nicht zählen, ohne Länge (keine Richtung) oder
// ohne Winddaten entfallen.
function windJeTeilstrecke(windJeOrt, strecken, rueck) {
  const reihe = rueck ? [...strecken].reverse() : strecken;
  return reihe.filter(t => t.wind && t.laenge > 0).map(t => {
    const r = windRelativ((windJeOrt[t.a] || []).concat(windJeOrt[t.b] || []), rueck ? t.kursRueck : t.kursHin);
    return r && Object.assign({ titel: teilstreckeTitel(t, rueck) }, r);
  }).filter(Boolean);
}
// Erste Zeile des Winds: mittlerer Wind mit Himmelsrichtung, aus der er kommt,
// und Böen, z. B. "Wind 15 km/h aus Südwest, Böen bis 36 km/h", "Wind 4 km/h aus
// Südwest (schwach), Böen bis 12 km/h", "Windstill, Böen bis 5 km/h". "teile"
// (Wind je Teilstrecke) setzt die Fahrt dazu. null ohne Werte.
function windAllgemein(proben, boeen) {
  const m = windMittel(proben);
  if (!m) return null;
  const s = windStaerke(m.kmh), richtung = HIMMELSRICHTUNGEN[Math.round(winkelRunden(m.grad) / 45) % 8];
  return Object.assign(s, { grad: m.grad, richtung, boeen, teile: [],
    text: (s.windstill ? "Windstill" : "Wind " + kmhText(m.kmh) + " aus " + richtung + (s.schwach ? " (schwach)" : "")) + ", Böen bis " + kmhText(boeen) });
}

// ---------- Sonnenauf- und -untergang ----------

// Sonne an einem Ort am Tag "datum": { aufgang, untergang } (ms) oder null
// (alter Zwischenspeicher ohne Tageswerte, Tag nicht in der Vorhersage)
function sonneAm(ortDaten, datum) {
  const s = ortDaten && ortDaten.sonne;
  const i = s ? s.tag.indexOf(datum) : -1;
  if (i < 0 || s.aufgang[i] === null || s.untergang[i] === null) return null;
  return { aufgang: s.aufgang[i], untergang: s.untergang[i] };
}
// Liegt die Fahrt von "von" bis "bis" (ms) im Dunkeln? " · Fahrt im Dunkeln",
// " · bis 07:21 dunkel", " · ab 16:52 dunkel" bzw. "" (ganz im Hellen)
function dunkelText(s, von, bis) {
  if (bis <= s.aufgang || von >= s.untergang) return " · Fahrt im Dunkeln";
  const teile = [];
  if (von < s.aufgang) teile.push("bis " + uhrzeit(s.aufgang) + " dunkel");
  if (bis > s.untergang) teile.push("ab " + uhrzeit(s.untergang) + " dunkel");
  return teile.length ? " · " + teile.join(", ") : "";
}
// Zeile zur Sonne einer Fahrt: Hinfahrt mit Sonnenaufgang, Rückfahrt mit
// Sonnenuntergang, jeweils mit Hinweis, wenn die Fahrt ganz oder teilweise im
// Dunkeln liegt. null ohne Daten.
function sonnenZeile(art, s, von, bis) {
  if (!s) return null;
  return (art === "hinfahrt" ? "🌅 Sonnenaufgang " + uhrzeit(s.aufgang) : "🌇 Sonnenuntergang " + uhrzeit(s.untergang)) + dunkelText(s, von, bis);
}

// ---------- Bestes Abfahrtsfenster ----------

function abfahrtKosten(b) {
  const w = b.werte;
  return Math.round({ gruen: 0, gelb: 100, rot: 1000 }[b.farbe] + w.niederschlag * 20 + Math.max(0, w.boeen - 30) + (w.regenWahrscheinlichkeit || 0) / 10);
}
// Abfahrten im 15-Minuten-Raster von 30 Minuten vor bis 30 Minuten nach der
// Fahrzeit (mit der Dauer der Fahrt). "felder" sind die Viertelstunden für die
// Zeitleiste. Mit üblicher Abfahrt: "Abfahrt 15:45 statt 16:00: …", sonst die
// beste Abfahrt und die zu meidende Zeit. Heute zählen nur kommende Abfahrten.
function abfahrtsfenster(orteDaten, warnungen, datum, f, g, jetzt = null) {
  const von = minutenAus(f.von), bis = minutenAus(f.bis), ab = ueblicheAbfahrt(f);
  return abfahrtenPruefen(orteDaten, warnungen, datum, g, { erste: von - 30, letzte: bis + 30 - f.dauer, fahrVon: von, fahrBis: bis, dauer: f.dauer,
    ueblich: ab === null ? null : minutenAus(ab), jetzt });
}
// Abfahrten "erste" … "letzte" (Minuten nach Mitternacht am Tag "datum") mit der
// Dauer "dauer"; "fahrVon"/"fahrBis" ist die eigentliche Fahrzeit, "ueblich" die
// übliche Abfahrt (null = keine). Mit "jetzt" zählen nur kommende Abfahrten.
function abfahrtenPruefen(orteDaten, warnungen, datum, g, r) {
  const t = m => zeitpunktAm(datum, m);
  const kommend = m => r.jetzt === null || t(m) >= r.jetzt;
  const bewerten = m => { const b = fahrtBewerten(orteDaten, warnungen, t(m), t(m + r.dauer), g); return b && { minuten: m, bewertung: b, kosten: abfahrtKosten(b) }; };
  const kandidaten = [];
  for (let m = r.erste; m <= r.letzte; m += 15) { if (kommend(m)) { const k = bewerten(m); if (k) kandidaten.push(k); } }
  if (!kandidaten.length) return null;
  const felder = [];
  for (let m = r.erste; m < r.letzte + r.dauer; m += 15) {
    const b = fahrtBewerten(orteDaten, warnungen, t(m), t(m + 15), g);
    felder.push({ minuten: m, farbe: b ? b.farbe : null, grund: b && b.gruende.length ? b.gruende[0] : null });
  }
  const von = r.fahrVon, bis = r.fahrBis, ueblichMin = r.ueblich;
  const ueblich = ueblichMin !== null && kommend(ueblichMin) ? kandidaten.find(k => k.minuten === ueblichMin) || bewerten(ueblichMin) : null;
  const nah = m => Math.abs(m - (ueblichMin ?? von));
  const beste = kandidaten.reduce((x, y) => y.kosten < x.kosten || (y.kosten === x.kosten && nah(y.minuten) < nah(x.minuten)) ? y : x);
  // Zu meiden: zusammenhängende Viertelstunden mit der schlechtesten Farbe
  const schlimmste = felder.some(x => x.farbe === "rot") ? "rot" : felder.some(x => x.farbe === "gelb") ? "gelb" : null;
  const meiden = [];
  felder.forEach(x => {
    if (!schlimmste || x.farbe !== schlimmste) return;
    const letzte = meiden[meiden.length - 1];
    if (letzte && letzte.bis === x.minuten) letzte.bis += 15;
    else meiden.push({ von: x.minuten, bis: x.minuten + 15, grund: x.grund });
  });
  const zeigen = felder.some(x => x.minuten >= von && x.minuten < bis && x.farbe && x.farbe !== "gruen") || (!!ueblich && ueblich.bewertung.farbe !== "gruen");
  const zustand = k => k.bewertung.farbe === "gruen" ? (k.bewertung.werte.niederschlag > 0 ? "kaum Regen" : "trocken")
    : k.bewertung.gruende.slice(0, 2).map(grundText).join(", ");
  let text = null;
  if (ueblich) {
    if (beste.minuten !== ueblich.minuten && beste.kosten < ueblich.kosten) {
      const ende = beste.minuten + r.dauer;
      const stoerung = meiden.find(x => x.von < ueblich.minuten + r.dauer && x.bis > ueblich.minuten);
      const nachher = stoerung && stoerung.grund ? (stoerung.von >= ende ? ", " + stoerung.grund.text + " erst ab " + uhrzeitAus(stoerung.von)
        : stoerung.bis <= beste.minuten ? ", " + stoerung.grund.text + " nur bis " + uhrzeitAus(stoerung.bis) : "") : "";
      text = "Abfahrt " + uhrzeitAus(beste.minuten) + " statt " + uhrzeitAus(ueblich.minuten) + ": " + zustand(beste) + nachher;
    } else if (ueblich.bewertung.farbe !== "gruen") {
      text = "Keine bessere Abfahrt zwischen " + uhrzeitAus(kandidaten[0].minuten) + " und " + uhrzeitAus(kandidaten[kandidaten.length - 1].minuten) + ".";
    }
  } else {
    text = "Beste Abfahrt " + uhrzeitAus(beste.minuten) + ": " + zustand(beste) +
      (meiden.length ? " · meiden: " + meiden.map(r => uhrzeitAus(r.von) + "–" + uhrzeitAus(r.bis) + (r.grund ? " (" + r.grund.text + ")" : "")).join(", ") : "");
  }
  return { felder, kandidaten, beste, ueblich, meiden, zeigen: zeigen && !!text, text };
}

// ---------- Alles für Reiter und Kachel ----------

function quellenStand(teil, fehler, jetzt) {
  return { vorhanden: !!teil, stand: teil ? teil.stand : null, fehler, aktuell: !!teil && !fehler && jetzt - teil.stand < NICHT_AKTUELL_MS };
}
function tagesWerte(orteDaten, von, bis) {
  const orte = orteDaten.map(d => ortWerte(d, von, bis));
  if (orte.some(o => !o.temperatur.length)) return null;
  const alle = feld => orte.flatMap(o => o[feld]).map(p => p.v);
  const gefuehlt = alle("gefuehlt"), wind = orte.flatMap(o => o.wind).map(p => p.v);
  return {
    tmin: Math.min(...alle("temperatur")), tmax: Math.max(...alle("temperatur")),
    gefuehltMin: gefuehlt.length ? Math.min(...gefuehlt) : null, gefuehltMax: gefuehlt.length ? Math.max(...gefuehlt) : null,
    niederschlag: Math.round(Math.max(...orte.map(o => summeVon(o.niederschlag))) * 10) / 10,
    regenWahrscheinlichkeit: alle("wahrscheinlichkeit").length ? Math.max(...alle("wahrscheinlichkeit")) : null,
    wind: wind.length ? Math.max(...wind) : null,
    boeen: alle("boeen").length ? Math.max(...alle("boeen")) : 0,
    gewitter: alle("code").some(c => GEWITTER_CODES.includes(c))
  };
}
function tagesAnsicht(orteDaten, warnungen, datum, h) {
  const von = zeitpunktAm(datum, 0), bis = zeitpunktAm(plusTage(datum, 1), 0);
  return { datum, titel: tagTitel(datum, h), werte: orteDaten ? tagesWerte(orteDaten, von, bis) : null, warnungen: warnungen.filter(wn => warnungImZeitraum(wn, von, bis)) };
}
// Eine Fahrt (Hin- oder Rückfahrt) am Tag "datum" im Zeitfenster "zf" (siehe
// fahrtZeitfenster, ggf. mit verschobener Abfahrt). "sonnenOrt": Nummer des Orts
// für Sonnenauf- bzw. -untergang (Hinfahrt Wohnort, Rückfahrt Arbeitsort).
function fahrtAnsicht(art, strecken, datum, heuteIst, zf, orteDaten, warnungen, jetzt, w, sonnenOrt = 0) {
  const f = fahrzeitAus(zf), von = zf.vonMs, bis = zf.bisMs;
  const a = { art, name: FAHRT_NAME[art], fahrt: f, zeit: zf, datum, heute: heuteIst, von, bis, vorbei: heuteIst && jetzt >= bis,
    bewertung: null, kleidung: null, wind: null, abfahrt: null, sonne: null, beimFahren: null, grundlage: null };
  if (!orteDaten) return a;
  a.sonne = sonnenZeile(art, sonneAm(orteDaten[sonnenOrt], datum), von, bis);
  a.bewertung = fahrtBewerten(orteDaten, warnungen, von, bis, w.ampel);
  if (!a.bewertung) return a;
  // Kleidung nach „gefühlt beim Fahren“ (oder, je nach Einstellung, nach der gefühlten Temperatur von Open-Meteo)
  a.beimFahren = fahrtGefuehlt(orteDaten, strecken, von, bis, fahrgeschwindigkeit(art, w).kmh, art === "rueckfahrt");
  const sg = stufenGrundlage(a.bewertung.werte.gefuehlt, a.beimFahren, w.kleidung);
  a.grundlage = sg.grundlage;
  a.kleidung = kleidungFuer(sg.wert, a.bewertung.werte.regenWahrscheinlichkeit, w.kleidung);
  // Wind: erste Zeile mit Himmelsrichtung und Böen, darunter je Teilstrecke, die zählt
  const wv = a.bewertung.werte;
  a.wind = windAllgemein(wv.windProben, wv.boeen);
  if (a.wind && strecken) a.wind.teile = windJeTeilstrecke(wv.windJeOrt, strecken, art === "rueckfahrt");
  // Abfahrtsfenster um das (ggf. verschobene) Zeitfenster; heute nur kommende Abfahrten
  if (!a.vorbei) a.abfahrt = abfahrtsfenster(orteDaten, warnungen, datum, f, w.ampel, heuteIst ? jetzt : null);
  return a;
}
// Hin- und Rückfahrt eines Fahrtags mit den Warnungen des Tages (heute nur die,
// die noch gelten) und dem Hinweis, was für die Rückfahrt einzupacken ist
function fahrtagAnsicht(datum, h, orte, orteDaten, alleWarnungen, jetzt, w, abw) {
  const strecken = teilstrecken(w);
  // Wind je Teilstrecke; ohne Strecke (z. B. nur Wohnort) nur mit Himmelsrichtung
  const mitStrecke = strecken.some(t => t.laenge > 0) ? strecken : null;
  // Sonne: Hinfahrt am Wohnort, Rückfahrt am Arbeitsort (ohne den jeweiligen Ort der erste bzw. letzte)
  const ortNr = rolle => Math.max(0, orte.findIndex(x => x.rolle === rolle));
  const arbeit = orte.findIndex(x => x.rolle === "arbeitsort");
  const heuteIst = datum === h;
  const t = { datum, heute: heuteIst, abweichung: heuteIst ? abw : null };
  t.fahrten = FAHRTARTEN.map(art => fahrtAnsicht(art, mitStrecke, datum, heuteIst, fahrtZeitfenster(art, datum, w, abw), orteDaten, alleWarnungen, jetzt, w,
    art === "hinfahrt" ? ortNr("wohnort") : arbeit < 0 ? orte.length - 1 : arbeit));
  const [hin, rueck] = t.fahrten;
  t.kleidungsHinweis = !hin.vorbei ? kleidungsHinweis(hin.kleidung, rueck.kleidung) : null;
  t.warnungen = tagesAnsicht(null, alleWarnungen, datum, h).warnungen.filter(wn => !heuteIst || wn.ende === null || wn.ende > jetzt);
  return t;
}
// Ansicht für den Zeitpunkt "jetzt" aus den Einstellungen und dem Zwischenspeicher:
// der nächste Fahrtag ("naechster", immer; die Kachel zeigt ihn), heute nach dem
// Ende der Fahrt ("heute"), der weitere Ort ("ort", wenn er aktiv ist) und die
// Auswahl im Umschalter des Reiters
function wetterAnsicht(jetzt = Date.now()) {
  const w = daten.einstellungen.wetter;
  const alle = wetterOrte(w), orte = streckenOrte(w), n0 = orte.length;
  const a = { orte, leer: !alle.length, laeuft: wetterStatus.laeuft };
  if (a.leer) return a;
  const schluessel = alle.map(x => ortSchluessel(x.ort)).join(";");
  const passend = teil => teil && teil.schluessel === schluessel && Array.isArray(teil.orte) && teil.orte.length === alle.length ? teil : null;
  const v = passend(wetter.vorhersage), wa = passend(wetter.warnungen);
  const gebiete = wa ? wa.orte.map((o, i) => ({ rolle: alle[i].rolle, titel: alle[i].titel, name: alle[i].ort.name, abgedeckt: o.abgedeckt, gebiet: o.gebiet })) : null;
  // Quellen; die Warngebiete je nach Auswahl nur der Strecke bzw. nur des weiteren Orts
  const quellen = gebieteVon => ({
    vorhersage: quellenStand(v, wetterStatus.fehlerVorhersage, jetzt),
    warnungen: Object.assign(quellenStand(wa, wetterStatus.fehlerWarnungen, jetzt), wa ? { quelle: wa.quelle, dwdFehler: wa.dwdFehler || null, gebiete: gebieteVon(gebiete) } : {})
  });
  const h = isoAusDate(new Date(jetzt));
  const abw = abweichungFuer(jetzt, w);
  if (n0) {
    const orteDaten = v ? v.orte.slice(0, n0) : null;
    const warnungen = wa ? warnungenZusammen({ orte: wa.orte.slice(0, n0) }, orte) : [];
    a.fahrtageLeer = !daten.einstellungen.fahrtage.length;
    a.naechster = naechsterFahrtag(jetzt, w, daten.einstellungen.fahrtage, abw);
    if (a.naechster && a.naechster.inVorhersage) a.naechsterTag = fahrtagAnsicht(a.naechster.datum, h, orte, orteDaten, warnungen, jetzt, w, abw);
    a.quellenStrecke = quellen(g => g && g.slice(0, n0));
  }
  if (w.weitererOrt && w.weitererOrt.aktiv) {
    const ortDaten = v ? [v.orte[n0]] : null;
    const ortWarnungen = wa ? warnungenZusammen({ orte: [wa.orte[n0]] }, [alle[n0]]) : [];
    const tage = [h, plusTage(h, 1)].map(datum => tagesAnsicht(ortDaten, ortWarnungen, datum, h));
    a.ort = { name: w.weitererOrt.name, tage, warnungen: [...new Set([...tage[0].warnungen, ...tage[1].warnungen])] };
    a.quellenOrt = quellen(g => g && g.slice(n0));
  }
  a.auswahl = wetterAuswahl(jetzt, a.naechster || null, w, abw, n0 > 0);
  if (a.auswahl.optionen.some(o => o.wert === "heute")) {
    a.heute = fahrtagAnsicht(h, h, orte, v ? v.orte.slice(0, n0) : null, wa ? warnungenZusammen({ orte: wa.orte.slice(0, n0) }, orte) : [], jetzt, w, abw);
  }
  a.quellen = a.auswahl.wert === "ort" ? a.quellenOrt : a.quellenStrecke;
  // Der angezeigte Fahrtag (nach der Auswahl; beim weiteren Ort der nächste) mit seinen Fahrten und Warnungen
  a.tag = (a.auswahl.wert === "heute" ? a.heute : a.naechsterTag) || null;
  a.fahrten = a.tag ? a.tag.fahrten : [];
  a.warnungen = a.tag ? a.tag.warnungen : [];
  a.kleidungsHinweis = a.tag ? a.tag.kleidungsHinweis : null;
  return a;
}

// Vorhersage und Warnungen der Strecke aus dem Zwischenspeicher (orteDaten null ohne passende Vorhersage)
function streckeWetter(w = daten.einstellungen.wetter) {
  const alle = wetterOrte(w), orte = streckenOrte(w), n0 = orte.length;
  const schluessel = alle.map(x => ortSchluessel(x.ort)).join(";");
  const passend = teil => teil && teil.schluessel === schluessel && Array.isArray(teil.orte) && teil.orte.length === alle.length ? teil : null;
  const v = passend(wetter.vorhersage), wa = passend(wetter.warnungen);
  return { orte, orteDaten: v && n0 ? v.orte.slice(0, n0) : null, warnungen: wa && n0 ? warnungenZusammen({ orte: wa.orte.slice(0, n0) }, orte) : [] };
}
// Vorschau „Heute später los“: Zeitfenster und Ampel der Fahrt "art" am Tag "datum" mit der Abfahrt "neu"
function spaeterVorschau(art, neu, datum, jetzt = Date.now()) {
  const w = daten.einstellungen.wetter, abw = Object.assign({}, abweichungFuer(jetzt, w), { datum, [art]: neu });
  const zf = fahrtZeitfenster(art, datum, w, abw), s = streckeWetter(w);
  return { zf, bewertung: s.orteDaten ? fahrtBewerten(s.orteDaten, s.warnungen, zf.vonMs, zf.bisMs, w.ampel) : null };
}

// ---------- Wetter je Eintrag (nur Arbeitsweg) ----------

// Bekommt der Eintrag Wetter? Nur Tages-Einträge mit Merkmal "Arbeitsweg" und mehr als 0 km
function mitWetter(e) { return e.typ === "tag" && e.arbeitsweg && e.km > 0; }
// Wohnort, Wegpunkte und Arbeitsort (die Orte der Fahrten zur Arbeit)
function arbeitswegOrte(w = daten.einstellungen.wetter) { return streckenOrte(w).map(x => x.ort); }
// Hin- und Rückfahrt am Tag "datum" aus Vorhersage- oder Rückblickdaten. Die
// Ampel kommt nur aus den Wetterwerten, ohne amtliche Warnungen (die gibt es
// im Rückblick nicht). null, wenn keine der Fahrten abgedeckt ist.
// Ab 5d je Fahrt dazu „gefühlt beim Fahren“ mit Windrichtung, Anteilen von
// Gegen-, Seiten- und Rückenwind, den Werten je Teilstrecke und der
// Fahrgeschwindigkeit, die Grundlage der Stufe und wann sie empfohlen wurde
// ("berechnet", ms).
// Ab 5e mit dem tatsächlichen Zeitfenster: "zeiten" je Fahrt (z. B. das bei einem
// Eintrag gespeicherte), sonst die Einstellungen mit der verschobenen Abfahrt von
// heute („Heute später los“, gilt nur, wenn "datum" heute ist).
function fahrtenWetter(orteDaten, datum, quelle, stand, berechnet = Date.now(), zeiten = null) {
  const w = daten.einstellungen.wetter;
  const r1 = x => Math.round(x * 10) / 10;
  const strecken = teilstrecken(w);
  const mitStrecke = strecken.some(t => t.laenge > 0) ? strecken : null;
  const abw = abweichungFuer(berechnet, w);
  const fahrt = art => {
    const zf = (zeiten && zeiten[art]) || fahrtZeitfenster(art, datum, w, abw), von = zf.vonMs, bis = zf.bisMs;
    const b = fahrtBewerten(orteDaten, [], von, bis, w.ampel);
    if (!b) return null;
    const v = b.werte;
    const wind = v.windProben.length ? v.windProben.reduce((x, p) => x + p.v, 0) / v.windProben.length : 0;
    const g = fahrtGefuehlt(orteDaten, mitStrecke, von, bis, fahrgeschwindigkeit(art, w).kmh, art === "rueckfahrt");
    const sg = stufenGrundlage(v.gefuehlt, g, w.kleidung);
    const kl = kleidungFuer(sg.wert, v.regenWahrscheinlichkeit, w.kleidung);
    return Object.assign({ temperatur: r1(v.temperatur), gefuehlt: r1(v.gefuehlt), niederschlag: v.niederschlag, regenWahrscheinlichkeit: v.regenWahrscheinlichkeit,
      wind: r1(wind), boeen: r1(v.boeen), ampel: b.farbe, kleidung: kl.stufe.id, empfehlung: Object.assign({}, kl.bereiche), regenkleidung: kl.mitRegen, rueckmeldung: null },
      fahrtGefuehltSpeichern(g), { grundlage: sg.grundlage, empfohlenAm: new Date(berechnet).toISOString() },
      // Ab 5e: Zeitfenster, für das das Wetter berechnet wurde, die tatsächliche und ggf. die geplante Abfahrt
      { von: zf.von, bis: zf.bis, abfahrt: zf.abfahrt, geplanteAbfahrt: zf.geplanteAbfahrt },
      // Ab 5f: Bereiche und Kommentar zur Rückmeldung (erst nach der Fahrt)
      { rueckmeldungBereiche: [], rueckmeldungKommentar: "" });
  };
  const hin = fahrt("hinfahrt"), rueck = fahrt("rueckfahrt");
  return hin || rueck ? { quelle, stand: new Date(stand).toISOString(), hin, rueck } : null;
}
// Wetter für den Tag "datum" aus der zuletzt geladenen Vorhersage (nur, wenn sie zu
// Wohn- und Arbeitsort gehört). Ist der weitere Ort aktiv, steht er als letzter Ort
// in derselben Abfrage; für den Eintrag zählen nur die Orte der Strecke.
function wetterAusVorhersage(datum, zeiten = null, jetzt = Date.now()) {
  const orte = arbeitswegOrte(), v = wetter.vorhersage;
  if (!orte.length || !v || !Array.isArray(v.orte) || typeof v.schluessel !== "string") return null;
  const k = v.schluessel.split(";"), sk = orte.map(ortSchluessel);
  if (k.length !== v.orte.length || (k.length !== sk.length && k.length !== sk.length + 1) || sk.some((x, i) => k[i] !== x)) return null;
  try { return fahrtenWetter(v.orte.slice(0, sk.length), datum, "vorhersage", v.stand, jetzt, zeiten); } catch (e) { return null; }
}
// Gespeichertes Zeitfenster einer Fahrt (ab 5e) im Format von fahrtZeitfenster; null vor 5e
function gespeichertesZeitfenster(art, datum, fw) {
  if (!fw || !fw.von || !fw.bis) return null;
  const vonMin = minutenAus(fw.von), bisMin = minutenAus(fw.bis);
  return { art, vonMin, bisMin, von: fw.von, bis: fw.bis, dauer: bisMin - vonMin, geplant: fw.geplanteAbfahrt || fw.abfahrt || fw.von,
    abfahrt: fw.abfahrt ?? null, geplanteAbfahrt: fw.geplanteAbfahrt ?? null, verschoben: !!fw.geplanteAbfahrt,
    vonMs: zeitpunktAm(datum, vonMin), bisMs: zeitpunktAm(datum, bisMin) };
}
// Die gespeicherten Zeitfenster eines Eintrags (für „Wetter nachtragen“); ohne Wetter null
function gespeicherteZeiten(e) {
  const ew = e.wetter;
  return ew ? { hinfahrt: gespeichertesZeitfenster("hinfahrt", e.datum, ew.hin), rueckfahrt: gespeichertesZeitfenster("rueckfahrt", e.datum, ew.rueck) } : null;
}
// Beim Speichern eines Eintrags: Arbeitsweg bekommt das Wetter (falls noch keins
// gespeichert ist und die Vorhersage den Tag abdeckt), alle anderen keins
function eintragWetterSetzen(e) {
  if (!mitWetter(e)) e.wetter = null;
  else if (!e.wetter) e.wetter = wetterAusVorhersage(e.datum);
}
// Fehlen einer gespeicherten Fahrt die Werte „beim Fahren“ (Wetter von vor 5d)?
function ohneBeimFahren(ew) { return !!ew && [ew.hin, ew.rueck].some(f => f && f.beimFahren === null); }
// Vergangene Fahrten zur Arbeit ohne Wetter, mit dem Wetter aus der Vorhersage
// oder (ab 5d) mit Rückblick-Wetter ohne die Werte „beim Fahren“ (ab Beginn des Rückblicks)
function rueckblickKandidaten(h = heute()) {
  return daten.eintraege.filter(e => mitWetter(e) && e.datum < h && e.datum >= RUECKBLICK_AB &&
    (!e.wetter || e.wetter.quelle === "vorhersage" || ohneBeimFahren(e.wetter)))
    .sort((a, b) => a.datum.localeCompare(b.datum));
}
// Rückblick in ein gespeichertes Wetter übernehmen ("alt" darf null sein):
// - Rückblick-Wetter: nur die Werte „beim Fahren“ ergänzen; alle vorhandenen
//   Werte, die empfohlene Kleidung und die Rückmeldung bleiben unverändert;
// - sonst (kein Wetter, Wetter aus der Vorhersage): die Werte aus dem Rückblick,
//   dabei bleiben empfohlene Kleidung (Stufe, Empfehlung, Regenkleidung, Grundlage,
//   Zeitpunkt der Empfehlung) und Rückmeldung (ab 5f mit Bereichen und Kommentar);
//   eine Fahrt ohne Rückblick bleibt.
function rueckblickUebernehmen(alt, neu) {
  const MESS = Object.keys(FAHRT_WERTE_11);
  if (alt && alt.quelle === "rueckblick") {
    const ergaenzt = art => alt[art] && neu[art] && alt[art].beimFahren === null
      ? Object.assign({}, alt[art], Object.fromEntries(MESS.map(k => [k, neu[art][k]]))) : alt[art];
    return Object.assign({}, alt, { hin: ergaenzt("hin"), rueck: ergaenzt("rueck") });
  }
  const erg = Object.assign({}, neu);
  ["hin", "rueck"].forEach(art => {
    const a = alt && alt[art];
    if (a && !neu[art]) erg[art] = a;
    else if (a && a.kleidung) erg[art] = Object.assign({}, neu[art], { kleidung: a.kleidung, empfehlung: a.empfehlung, regenkleidung: a.regenkleidung,
      rueckmeldung: a.rueckmeldung, rueckmeldungBereiche: a.rueckmeldungBereiche, rueckmeldungKommentar: a.rueckmeldungKommentar, grundlage: a.grundlage, empfohlenAm: a.empfohlenAm });
  });
  return erg;
}
// Abschnitte für die Abfragen: aufeinanderfolgende Daten, je höchstens RUECKBLICK_TAGE Tage
function rueckblickAbschnitte(liste) {
  const abschnitte = [];
  liste.forEach(e => {
    const a = abschnitte[abschnitte.length - 1];
    if (a && tageZwischen(a.von, e.datum) < RUECKBLICK_TAGE) { a.bis = e.datum; a.eintraege.push(e); }
    else abschnitte.push({ von: e.datum, bis: e.datum, eintraege: [e] });
  });
  return abschnitte;
}

// Wetter-Kennzahlen je Jahr: nur Fahrten zur Arbeit. km bei Regen = km der Tage,
// an denen auf einer der Fahrten mindestens 0,1 mm fiel; Tage unter 0 °C =
// Tage, an denen auf einer der Fahrten die Temperatur unter 0 °C lag.
function wetterKennzahlen(h = heute()) {
  const arbeit = daten.eintraege.filter(e => mitWetter(e) && e.datum <= h);
  const zaehlen = liste => {
    const mit = liste.filter(e => e.wetter);
    const fahrten = e => [e.wetter.hin, e.wetter.rueck].filter(Boolean);
    const regen = mit.filter(e => fahrten(e).some(f => f.niederschlag >= 0.1));
    const alle = mit.flatMap(fahrten);
    return {
      tage: liste.length, mitWetter: mit.length, kmRegen: runden(regen.reduce((x, e) => x + e.km, 0)), tageRegen: regen.length,
      tageFrost: mit.filter(e => fahrten(e).some(f => f.temperatur < 0)).length,
      ampel: { gruen: alle.filter(f => f.ampel === "gruen").length, gelb: alle.filter(f => f.ampel === "gelb").length, rot: alle.filter(f => f.ampel === "rot").length }
    };
  };
  const jahre = [...new Set(arbeit.map(e => e.datum.slice(0, 4)))].sort().reverse();
  return { jahre: jahre.map(j => Object.assign({ jahr: Number(j) }, zaehlen(arbeit.filter(e => e.datum.slice(0, 4) === j)))), gesamt: zaehlen(arbeit) };
}
