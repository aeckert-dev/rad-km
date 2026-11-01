// Rad-km · Kalender: Termin eines geplanten Auftrags als Kalenderdatei (.ics, iCalendar)
"use strict";

/* =====================================================================
   KALENDER
   Erzeugt aus einem geplanten Auftrag mit Termin eine Kalenderdatei nach
   RFC 5545, die iOS in die Kalender-App übernimmt. Ohne Uhrzeit ganztägig,
   mit Uhrzeit 1 Stunde; Erinnerung am Vortag um 18:00. Die Kennung (UID) ist
   je Auftrag fest. Zeiten ohne Zeitzone (Ortszeit des iPhones).
   Liest nur, verändert keine Daten.
   ===================================================================== */

const KALENDER_DAUER_MIN = 60;
const KALENDER_ERINNERUNG = "18:00"; // am Vortag

// Text für iCalendar maskieren: \ ; , und Zeilenumbrüche
function icsText(t) {
  return String(t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
}
// Zeilen nach höchstens 75 Bytes (UTF-8) falten; Folgezeilen beginnen mit einem Leerzeichen.
// Ein Zeichen wird nie geteilt.
function icsFalten(zeile) {
  const kodierer = new TextEncoder();
  const teile = [];
  let teil = "", bytes = 0;
  for (const z of zeile) {
    const n = kodierer.encode(z).length;
    const grenze = teile.length ? 74 : 75; // Folgezeilen: 1 Byte für das Leerzeichen
    if (bytes + n > grenze) { teile.push(teil); teil = ""; bytes = 0; }
    teil += z;
    bytes += n;
  }
  teile.push(teil);
  return teile.join("\r\n ");
}
// "2026-11-12" → "20261112"; mit Uhrzeit "09:30" → "20261112T093000"
const icsDatum = (iso, zeit) => iso.replace(/-/g, "") + (zeit ? "T" + zeit.replace(":", "") + "00" : "");
// Zeitpunkt in UTC für DTSTAMP: "20261101T120000Z"
const icsUtc = ms => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
// Minuten → Dauer "PT15H30M" (negativ: vor dem Beginn)
function icsDauer(minuten) {
  const v = minuten < 0 ? "-" : "", m = Math.abs(minuten);
  const h = Math.floor(m / 60), r = m % 60;
  return v + "PT" + (h ? h + "H" : "") + (r || !h ? r + "M" : "");
}
// Minuten seit Mitternacht
const minutenVon = zeit => Number(zeit.slice(0, 2)) * 60 + Number(zeit.slice(3, 5));

// Titel: "Kleine Inspektion – Werkstatt Muster" bzw. ohne Werkstatt nur der Name
function kalenderTitel(o) {
  return o.art.name + (o.auftrag.werkstatt ? " – " + o.auftrag.werkstatt : "");
}
// Beschreibung: Positionen (Aufgaben mit Bauteil, Mängel mit Datum), Notiz, erwarteter km-Stand
function kalenderBeschreibung(o) {
  const aufgaben = [], maengel = [];
  o.positionen.forEach(p => {
    if (p.art === "aufgabe") {
      const art = artVon(p.wartungsartId);
      if (art) aufgaben.push("- " + art.name + (art.bauteil ? " (" + art.bauteil + ")" : "") + (p.notiz ? ": " + p.notiz : ""));
    } else {
      const m = daten.maengel.find(x => x.id === p.mangelId);
      if (m) maengel.push("- " + m.beschreibung + " (festgestellt am " + datumText(m.datum) + ")" + (p.notiz ? ": " + p.notiz : ""));
    }
  });
  const teile = [];
  if (aufgaben.length) teile.push("Aufgaben:\n" + aufgaben.join("\n"));
  if (maengel.length) teile.push("Mängel:\n" + maengel.join("\n"));
  if (!aufgaben.length && !maengel.length) teile.push("Noch keine Positionen.");
  if (o.auftrag.notiz) teile.push("Notiz: " + o.auftrag.notiz);
  if (o.erwartet && o.erwartet.datum === o.auftrag.termin) teile.push("Erwarteter Kilometerstand am Termin: " + caKm(o.erwartet.km));
  teile.push("Aus Rad-km");
  return teile.join("\n\n");
}
// Feste Kennung je Auftrag
const kalenderUid = auftrag => "auftrag-" + auftrag.id + "@rad-km";

// Dateiname: "termin-kleine-inspektion-2026-11-12.ics"
function kalenderDateiname(o) {
  const name = o.art.name.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return "termin-" + (name || "auftrag") + "-" + o.auftrag.termin + ".ics";
}

// Kalenderdatei (Text mit CRLF) zu einem offenen Auftrag mit gespeichertem Termin
function kalenderDatei(o, jetzt = Date.now()) {
  const a = o.auftrag;
  if (!a.id || !a.termin) throw new Error("Der Auftrag hat keinen gespeicherten Termin.");
  const titel = kalenderTitel(o);
  const zeilen = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Rad-km//Werkstatt-Termin//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", "UID:" + kalenderUid(a), "DTSTAMP:" + icsUtc(jetzt)];
  let vorBeginn; // Minuten von der Erinnerung (Vortag 18:00) bis zum Beginn
  if (a.terminZeit) {
    const beginn = minutenVon(a.terminZeit);
    const ende = beginn + KALENDER_DAUER_MIN;
    const endeDatum = ende >= 24 * 60 ? plusTage(a.termin, 1) : a.termin;
    const endeZeit = zweistellig(Math.floor(ende % (24 * 60) / 60)) + ":" + zweistellig(ende % 60);
    zeilen.push("DTSTART:" + icsDatum(a.termin, a.terminZeit), "DTEND:" + icsDatum(endeDatum, endeZeit), "TRANSP:OPAQUE");
    vorBeginn = 24 * 60 - minutenVon(KALENDER_ERINNERUNG) + beginn;
  } else {
    zeilen.push("DTSTART;VALUE=DATE:" + icsDatum(a.termin), "DTEND;VALUE=DATE:" + icsDatum(plusTage(a.termin, 1)), "TRANSP:TRANSPARENT");
    vorBeginn = 24 * 60 - minutenVon(KALENDER_ERINNERUNG);
  }
  zeilen.push("SUMMARY:" + icsText(titel), "DESCRIPTION:" + icsText(kalenderBeschreibung(o)),
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsText(titel), "TRIGGER:" + icsDauer(-vorBeginn), "END:VALARM",
    "END:VEVENT", "END:VCALENDAR");
  return zeilen.map(icsFalten).join("\r\n") + "\r\n";
}
