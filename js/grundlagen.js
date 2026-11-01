// Rad-km · Grundeinstellungen (Versionen, Speicherschlüssel, Konstanten) und Hilfsfunktionen für Datum, Zahlen, Text
"use strict";

/* =====================================================================
   1. GRUNDEINSTELLUNGEN
   ===================================================================== */

// Testmodus (Aufruf mit "?test", nur für tests/test.html): eigene
// Speicherplätze, damit die Tests die echten Daten nie berühren.
const TESTMODUS = new URLSearchParams(location.search).has("test");
// Unter diesem Namen liegen alle Daten im localStorage des Browsers.
const SPEICHER_SCHLUESSEL = TESTMODUS ? "radkm-test-daten" : "radkm-daten";
// Datum des letzten Exports (separat, damit ein Import es nicht verändert).
const EXPORT_SCHLUESSEL = TESTMODUS ? "radkm-test-letzter-export" : "radkm-letzter-export";
// Zuletzt geladene Wetterdaten (Zwischenspeicher, kein Teil der Daten und der Sicherung)
const WETTER_SCHLUESSEL = TESTMODUS ? "radkm-test-wetter" : "radkm-wetter";
// Version der App (wird in den Einstellungen und in der Sicherung angezeigt)
const APP_VERSION = "5a.1";
// Aktuelle Version des Datenmodells. Bei Änderungen am Aufbau erhöhen
// und unten in MIGRATIONEN eine Umwandlung ergänzen.
const DATEN_VERSION = 9;
const EXPORT_ERINNERUNG_TAGE = 30;
// Prognosen erst, wenn seit dem Startdatum so viele Tage vergangen sind
const PROGNOSE_MIN_TAGE = 7;
// So lange (ms) wird nach dem Löschen "Rückgängig" angeboten
const RUECKGAENGIG_MS = 12000;
// Übliche Fahrtage bei einer Neuinstallation: 1 = Montag … 7 = Sonntag
const STANDARD_FAHRTAGE = [1, 2, 5];
// Standard-Zuordnung einer Aufgabe: der nächste offene Auftrag einer Inspektion
const NAECHSTE_INSPEKTION = "naechste-inspektion";
// Merkt sich, dass die Wartungsarten nach der Umwandlung auf Version 8 noch
// geprüft werden sollen (kein Teil der Daten und der Sicherung)
const PRUEF_SCHLUESSEL = TESTMODUS ? "radkm-test-wartungsarten-pruefen" : "radkm-wartungsarten-pruefen";
// Ab dieser Uhrzeit weist die Übersicht schon am selben Tag auf einen fehlenden Eintrag hin
// (Schalter "Hinweis schon am selben Tag", Standard an)
const STANDARD_HINWEIS_HEUTE_AB = "18:00";
// Wetter außerhalb der Fahrten: am Wohnort oder am aktuellen Standort
const ORT_AUSSERHALB = ["wohnort", "standort"];
// Körperbereiche der Kleidung: [Schlüssel in den Daten, Bezeichnung]
const BEREICHE = [["kopf", "Kopf"], ["hals", "Hals"], ["haende", "Hände"], ["oberkoerper", "Oberkörper"], ["beine", "Beine"], ["fuesse", "Füße"]];
const BEREICH_SCHLUESSEL = BEREICHE.map(b => b[0]);
const BEREICH_NAME = Object.fromEntries(BEREICHE);
// Bei Regen gilt in diesen Bereichen das Zwiebelprinzip (eine Schicht weniger unter dem Regenzeug)
const ZWIEBEL_BEREICHE = ["oberkoerper", "beine", "fuesse"];
// Höchstens so viele Wegpunkte zwischen Wohn- und Arbeitsort
const MAX_WEGPUNKTE = 3;

/* =====================================================================
   2. HILFSFUNKTIONEN: Datum, Zahlen, Text
   Datumswerte werden intern immer als Text "JJJJ-MM-TT" gespeichert.
   ===================================================================== */

function zweistellig(n) { return String(n).padStart(2, "0"); }

function isoAusDate(d) {
  return d.getFullYear() + "-" + zweistellig(d.getMonth() + 1) + "-" + zweistellig(d.getDate());
}
function heute() { return isoAusDate(new Date()); }

// "JJJJ-MM-TT" → Date (lokal, 12 Uhr mittags, um Sommerzeit-Probleme zu vermeiden)
function dateAusIso(iso) {
  const [j, m, t] = iso.split("-").map(Number);
  return new Date(j, m - 1, t, 12);
}
function istGueltigesDatum(iso) {
  if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return isoAusDate(dateAusIso(iso)) === iso;
}
// "2026-10-10" → "10.10.2026"
function datumText(iso) {
  if (!iso) return "–";
  const [j, m, t] = iso.split("-");
  return t + "." + m + "." + j;
}
const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
function wochentag(iso) { return WOCHENTAGE[dateAusIso(iso).getDay()]; }
// Wochentag nach ISO 8601: 1 = Montag … 7 = Sonntag (wie in den Einstellungen "fahrtage")
function isoWochentag(iso) { return (dateAusIso(iso).getDay() + 6) % 7 + 1; }

function plusTage(iso, tage) {
  const d = dateAusIso(iso);
  d.setDate(d.getDate() + tage);
  return isoAusDate(d);
}
// Montag der Woche, in der das Datum liegt
function montagDerWoche(iso) {
  const tag = dateAusIso(iso).getDay(); // 0 = Sonntag
  return plusTage(iso, -((tag + 6) % 7));
}
// Monate addieren; 31.01. + 1 Monat → 28./29.02.
function plusMonate(iso, monate) {
  const [j, m, t] = iso.split("-").map(Number);
  const ziel = new Date(j, m - 1 + monate, 1, 12);
  const letzterTag = new Date(ziel.getFullYear(), ziel.getMonth() + 1, 0).getDate();
  ziel.setDate(Math.min(t, letzterTag));
  return isoAusDate(ziel);
}
// "2026-10-10" → "10.10."
function kurzDatum(iso) { return datumText(iso).slice(0, 6); }
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
// Erster bzw. letzter Tag eines Monats (monat = 1 … 12)
function monatsanfang(jahr, monat) { return jahr + "-" + zweistellig(monat) + "-01"; }
function monatsende(jahr, monat) {
  return jahr + "-" + zweistellig(monat) + "-" + zweistellig(new Date(jahr, monat, 0).getDate());
}
// Kalenderwoche nach ISO 8601: Die Woche gehört zu dem Jahr, in dem ihr Donnerstag liegt.
function kalenderwoche(iso) {
  const donnerstag = plusTage(montagDerWoche(iso), 3);
  return Math.floor(tageZwischen(donnerstag.slice(0, 4) + "-01-01", donnerstag) / 7) + 1;
}

// Anzahl Tage von a nach b (positiv, wenn b später ist)
function tageZwischen(a, b) {
  const [j1, m1, t1] = a.split("-").map(Number);
  const [j2, m2, t2] = b.split("-").map(Number);
  return Math.round((Date.UTC(j2, m2 - 1, t2) - Date.UTC(j1, m1 - 1, t1)) / 86400000);
}
function tageText(n) { return n === 1 ? "1 Tag" : n + " Tagen"; }

// Kilometer runden (2 Nachkommastellen), um Rechenungenauigkeiten zu vermeiden
function runden(n) { return Math.round(n * 100) / 100; }
// Prognosen: auf 10 km gerundet und immer mit "ca."
function rund10(n) { return Math.round(n / 10) * 10; }
function caKm(n) { return "ca. " + kmText(rund10(n)) + " km"; }
// "2027-05-14" → "Mai 2027"
function monatJahrText(iso) { return MONATE[Number(iso.slice(5, 7)) - 1] + " " + iso.slice(0, 4); }

const zahlFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
// 1234.5 → "1.234,5"
function kmText(n) { return n === null || n === undefined ? "–" : zahlFormat.format(runden(n)); }
// 12.5 → "12,5" (für Eingabefelder, ohne Tausenderpunkt)
function kmFeld(n) { return n === null || n === undefined ? "" : String(runden(n)).replace(".", ","); }
// Eingabe → Zahl. Erlaubt "12,5" und "12.5"; "1.234,5" wird zu 1234.5.
// Gibt null zurück, wenn die Eingabe keine gültige Zahl ≥ 0 ist.
function kmLesen(text) {
  let s = String(text).trim().replace(/\s/g, "");
  if (s === "") return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  return runden(Number(s));
}

// Koordinaten der Orte und Wegpunkte werden mit 4 Nachkommastellen (ca. 10 m)
// gespeichert; Teilstrecken (Länge, Richtung, Wind) rechnen damit.
function koordinateSpeichern(x) { return Math.round(x * 10000) / 10000; }
// An die Wetterdienste (Vorhersage, Rückblick, Warnungen) gehen sie nur auf 3
// Nachkommastellen gerundet (ca. 100 m).
function koordinateSenden(x) { return Math.round(x * 1000) / 1000; }
// Uhrzeit im Format "HH:MM"
function istUhrzeit(t) { return typeof t === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(t); }
function minutenAus(t) { return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)); }
function uhrzeitAus(minuten) {
  const m = ((minuten % 1440) + 1440) % 1440;
  return zweistellig(Math.floor(m / 60)) + ":" + zweistellig(m % 60);
}

// Zahl mit Komma oder Punkt, auch negativ ("-2,5" oder "−2,5"); null, wenn keine Zahl
function zahlLesen(text) {
  const s = String(text ?? "").trim().replace(/\s/g, "").replace("−", "-").replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}
// 51.1 → "51,1" (für Eingabefelder, ohne Tausenderpunkt)
function zahlFeld(n) { return n === null || n === undefined ? "" : String(n).replace(".", ","); }

// Text sicher in HTML einsetzen (verhindert, dass z. B. "<" die Seite zerstört)
function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[z]));
}
function neueId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
