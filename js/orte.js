// Rad-km · Ortseingabe: Koordinaten und Kartenlinks lesen, Ortssuche beim Tippen, zuletzt gewählte Orte, Namensvorschlag
"use strict";

/* ---------------------------------------------------------------------
   Koordinaten und Kartenlinks (ohne Netz)
   Erkannt werden:
   - Dezimalgrad: "51.5000, 9.9000", "51,5000; 9,9000", "51,5000 / 9,9000",
     "51.5 9.9", Süd und West mit Minus
   - mit Himmelsrichtung wie „Koordinaten kopieren“ in Apple Karten:
     "51.50000° N, 9.90000° E" (auch Dezimalkomma, S, W und O für Ost) und
     Grad/Minuten/Sekunden: 51° 30′ 0″ N, 9° 54′ 0″ E
   - Links von Apple Karten (ll=, q=, coordinate=, sll=), Google Maps
     (!3d…!4d…, @lat,lon, q=, query=, ll=) und geo:-Links
   --------------------------------------------------------------------- */

const ZAHL = "[+\\-−]?\\d+(?:[.,]\\d+)?";
const zahlAus = t => Number(String(t).replace("−", "-").replace(",", "."));
const imBereich = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

// Text mit Koordinaten → { lat, lon } oder null
function koordinatenAusText(text) {
  const t = String(text || "").trim().replace(/\s+/g, " ");
  // Mit Himmelsrichtung (Grad, optional Minuten und Sekunden)
  const teil = "(\\d+(?:[.,]\\d+)?)\\s*°?\\s*(?:(\\d+(?:[.,]\\d+)?)\\s*['′’]\\s*)?(?:(\\d+(?:[.,]\\d+)?)\\s*(?:[\"″”]|''|′′)\\s*)?";
  const mitRichtung = new RegExp("^" + teil + "([NS])\\s*[,;/]?\\s*" + teil + "([EOW])$", "i").exec(t);
  if (mitRichtung) {
    const grad = (g, m, s) => zahlAus(g) + (m ? zahlAus(m) / 60 : 0) + (s ? zahlAus(s) / 3600 : 0);
    const lat = grad(mitRichtung[1], mitRichtung[2], mitRichtung[3]) * (/s/i.test(mitRichtung[4]) ? -1 : 1);
    const lon = grad(mitRichtung[5], mitRichtung[6], mitRichtung[7]) * (/w/i.test(mitRichtung[8]) ? -1 : 1);
    return imBereich(lat, lon) ? { lat, lon } : null;
  }
  // Dezimalgrad: Trenner ; oder /, sonst Komma (bei Dezimalpunkt) bzw. ", " (bei Dezimalkomma) oder Leerzeichen
  const muster = [
    new RegExp("^(" + ZAHL + ")\\s*[;/]\\s*(" + ZAHL + ")$"),
    /^([+\-−]?\d+(?:\.\d+)?)\s*,\s*([+\-−]?\d+(?:\.\d+)?)$/,
    /^([+\-−]?\d+(?:,\d+)?),\s+([+\-−]?\d+(?:,\d+)?)$/,
    new RegExp("^(" + ZAHL + ") (" + ZAHL + ")$")
  ];
  for (const m of muster) {
    const x = m.exec(t);
    if (x) { const lat = zahlAus(x[1]), lon = zahlAus(x[2]); return imBereich(lat, lon) ? { lat, lon } : null; }
  }
  return null;
}
// "Musterdorf+am+See" → "Musterdorf am See"
const linkText = t => { try { return decodeURIComponent(String(t).replace(/\+/g, " ")).trim(); } catch (e) { return String(t).trim(); } };
// Kartenlink → { lat, lon, name, quelle } oder null
function ortAusLink(text) {
  const t = String(text).trim();
  const geo = /^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:[;?](.*))?$/i.exec(t);
  if (geo) {
    const lat = Number(geo[1]), lon = Number(geo[2]);
    const q = geo[3] ? new URLSearchParams(geo[3].replace(/^.*?\?/, "")).get("q") : null;
    const name = q && /\(([^)]+)\)/.exec(q);
    return imBereich(lat, lon) ? { lat, lon, name: name ? linkText(name[1]) : null, quelle: "geo-Link" } : null;
  }
  let url;
  try { url = new URL(/^https?:\/\//i.test(t) ? t : "https://" + t); } catch (e) { return null; }
  const host = url.hostname.toLowerCase(), p = url.searchParams;
  const ausParam = (...namen) => { for (const n of namen) { const c = p.get(n) && koordinatenAusText(p.get(n)); if (c) return c; } return null; };
  if (host === "maps.apple.com" || host.endsWith(".maps.apple.com")) {
    const c = ausParam("ll", "coordinate", "q", "sll", "daddr", "saddr");
    if (!c) return null;
    const q = p.get("q"), name = p.get("name") || (q && !koordinatenAusText(q) ? q : null);
    return Object.assign(c, { name: name ? linkText(name) : null, quelle: "Apple Karten" });
  }
  if (/(^|\.)google\.[a-z.]+$/.test(host) || host === "maps.google.com") {
    const pfad = decodeURIComponent(url.pathname + url.hash);
    // Die Markierung (!3d…!4d…) geht vor der Kartenmitte (@lat,lon)
    const marke = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(pfad), mitte = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(pfad);
    let c = marke ? { lat: Number(marke[1]), lon: Number(marke[2]) } : null;
    if (!c) c = ausParam("q", "query", "ll", "center", "destination");
    if (!c && mitte) c = { lat: Number(mitte[1]), lon: Number(mitte[2]) };
    if (!c || !imBereich(c.lat, c.lon)) return null;
    const ort = /\/place\/([^/@]+)/.exec(url.pathname);
    return Object.assign(c, { name: ort ? linkText(ort[1]) : null, quelle: "Google Maps" });
  }
  return null;
}
// Kurzlinks lassen sich ohne Netz nicht auflösen
const KURZLINK = /(^|\s)(https?:\/\/)?(maps\.apple\/p\/|maps\.app\.goo\.gl\/|goo\.gl\/maps\/)\S*/i;
// Eingabe im Suchfeld → { lat, lon, name, quelle } bei Koordinaten oder einem
// Kartenlink, { kurzlink: true } bei einem Kurzlink, sonst null (dann Ortssuche)
function ortAusText(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  if (KURZLINK.test(t)) return { kurzlink: true };
  const link = /(https?:\/\/\S+|geo:\S+|maps\.apple\.com\/\S+|(?:www\.)?google\.[a-z.]+\/maps\S*)/i.exec(t);
  if (link) return ortAusLink(link[1]);
  const c = koordinatenAusText(t);
  return c ? Object.assign(c, { name: null, quelle: "Koordinaten" }) : null;
}

/* ---------- Ortssuche beim Tippen (Open-Meteo) ---------- */

const ORTSSUCHE_MIN = 3, ORTSSUCHE_VERZOEGERUNG_MS = 400;
// Zweite Schreibweise für Umlaute, wenn die erste nichts findet: ä ↔ ae, ö ↔ oe, ü ↔ ue, ß → ss
function umlautVariante(text) {
  const t = String(text);
  let v;
  if (/[äöüßÄÖÜ]/.test(t)) v = t.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ß/g, "ss");
  else v = t.replace(/ae/g, "ä").replace(/oe/g, "ö").replace(/ue/g, "ü").replace(/Ae/g, "Ä").replace(/Oe/g, "Ö").replace(/Ue/g, "Ü");
  return v !== t ? v : null;
}
const ortssuche = { timer: null, abbruch: null, nr: 0 };
// Laufende oder vorgemerkte Suche beenden (älteres Ergebnis wird verworfen)
function ortssucheAbbrechen() {
  clearTimeout(ortssuche.timer);
  ortssuche.timer = null;
  if (ortssuche.abbruch) ortssuche.abbruch.abort();
  ortssuche.abbruch = null;
  ortssuche.nr++;
}
// Sucht den Text (ohne Treffer ein zweites Mal mit der anderen Schreibweise der
// Umlaute). Liefert { treffer, text } oder null, wenn eine neuere Suche begann;
// wirft bei Fehlern (z. B. keine Verbindung).
async function ortssucheAusfuehren(text) {
  ortssucheAbbrechen();
  const nr = ortssuche.nr;
  const abbruch = typeof AbortController === "function" ? new AbortController() : null;
  ortssuche.abbruch = abbruch;
  try {
    let treffer = ortsTrefferLesen(await jsonAbrufen(ortssucheUrl(text), abbruch && abbruch.signal));
    const variante = !treffer.length && umlautVariante(text);
    if (variante && nr === ortssuche.nr) treffer = ortsTrefferLesen(await jsonAbrufen(ortssucheUrl(variante), abbruch && abbruch.signal));
    return nr === ortssuche.nr ? { treffer, text } : null;
  } catch (e) {
    if (nr !== ortssuche.nr || e.abgebrochen) return null;
    throw e;
  } finally {
    if (nr === ortssuche.nr) ortssuche.abbruch = null;
  }
}
// Beim Tippen: Suche ORTSSUCHE_VERZOEGERUNG_MS nach der letzten Eingabe; "fertig"
// bekommt das Ergebnis ({ treffer, text } oder { fehler }), ältere werden verworfen
function ortssucheVormerken(text, fertig) {
  ortssucheAbbrechen();
  ortssuche.timer = setTimeout(async () => {
    ortssuche.timer = null;
    try { const erg = await ortssucheAusfuehren(text); if (erg) fertig(erg); }
    catch (e) { fertig({ fehler: e.message }); }
  }, ORTSSUCHE_VERZOEGERUNG_MS);
}
// Ohne Netz (soweit das Gerät es weiß)
function ohneNetz() { return typeof navigator !== "undefined" && navigator.onLine === false; }

/* ---------- Zuletzt gewählte Orte (nur auf dem Gerät, nicht in der Sicherung) ---------- */

const LETZTE_ORTE_MAX = 5;
function letzteOrte() {
  try {
    const l = JSON.parse(localStorage.getItem(LETZTE_ORTE_SCHLUESSEL) || "[]");
    return Array.isArray(l) ? l.filter(o => istObjekt(o) && typeof o.name === "string" && imBereich(o.lat, o.lon)).slice(0, LETZTE_ORTE_MAX) : [];
  } catch (e) { return []; }
}
// Ein gespeicherter Ort kommt nach vorn; derselbe Ort (gleiche Koordinaten) nur einmal
function letzteOrteMerken(o) {
  const ort = { name: o.name, lat: koordinateSpeichern(o.lat), lon: koordinateSpeichern(o.lon) };
  const liste = [ort].concat(letzteOrte().filter(x => !(x.lat === ort.lat && x.lon === ort.lon))).slice(0, LETZTE_ORTE_MAX);
  try { localStorage.setItem(LETZTE_ORTE_SCHLUESSEL, JSON.stringify(liste)); } catch (e) { /* Speicher voll: dann ohne Liste */ }
}
function letzteOrteLeeren() {
  try { localStorage.removeItem(LETZTE_ORTE_SCHLUESSEL); } catch (e) { /* nichts zu tun */ }
}

/* ---------- Namensvorschlag: Gemeinde des DWD ---------- */

// Name der Gemeinde (Warngebiet des DWD) an diesen Koordinaten oder null
// (außerhalb Deutschlands, ohne Netz). Sendet die auf 3 Stellen gerundeten Koordinaten.
async function gemeindeName(o) {
  const g = await jsonAbrufen(dwdUrl("Warngebiete_Gemeinden", ["WARNCELLID", "NAME"], "SHAPE", o));
  const p = Array.isArray(g.features) && g.features.length ? g.features[0].properties || {} : null;
  return p && p.NAME ? String(p.NAME) : null;
}
