// Rad-km · Kalender: Termin eines geplanten Auftrags als Kalenderdatei (.ics, iCalendar)
"use strict";

/* =====================================================================
   KALENDER
   Erzeugt aus einem geplanten Auftrag mit Termin eine Kalenderdatei nach
   RFC 5545, die iOS in die Kalender-App übernimmt. Ohne Uhrzeit ganztägig,
   mit Uhrzeit 1 Stunde; mit Vorlaufzeit beginnt der Eintrag mit dem
   Losfahren. Erinnerung am Vortag um 18:00. Die Kennung (UID) ist je Auftrag
   fest. Zeiten mit Uhrzeit in UTC („Z“), umgerechnet aus der Ortszeit in
   Europe/Berlin (Sommer- und Winterzeit); ohne Zeitzone deutet ein
   Exchange-/Outlook-Kalender sie sonst als UTC (1 Stunde später).
   Liest nur, verändert keine Daten.
   ===================================================================== */

const KALENDER_DAUER_MIN = 60;
const KALENDER_ERINNERUNG = "18:00"; // am Vortag
const KALENDER_ZEITZONE = "Europe/Berlin";

// Ortszeit in Europe/Berlin zu einem Zeitpunkt (ms): Abstand zu UTC in Minuten
const berlinFormat = new Intl.DateTimeFormat("en-US", { timeZone: KALENDER_ZEITZONE, hourCycle: "h23",
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
function berlinAbstand(ms) {
  const t = Object.fromEntries(berlinFormat.formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  const alsUtc = Date.UTC(Number(t.year), Number(t.month) - 1, Number(t.day), Number(t.hour) % 24, Number(t.minute), Number(t.second));
  return Math.round((alsUtc - Math.floor(ms / 1000) * 1000) / 60000);
}
// Zeitpunkt (ms) zu Datum "JJJJ-MM-TT" und Minuten nach Mitternacht in Europe/Berlin.
// Eine Uhrzeit, die es wegen der Umstellung auf Sommerzeit nicht gibt (02:30),
// gilt eine Stunde später (03:30 Sommerzeit); eine doppelte (Umstellung auf
// Winterzeit) beim ersten Mal (Sommerzeit).
function berlinZeitpunkt(iso, minuten) {
  const [j, m, t] = iso.split("-").map(Number);
  const naiv = Date.UTC(j, m - 1, t, 0, minuten);
  const vorher = berlinAbstand(naiv - 3 * 3600000), nachher = berlinAbstand(naiv + 3 * 3600000);
  const passend = [vorher, nachher].map(a => naiv - a * 60000).filter(ms => berlinAbstand(ms) * 60000 === naiv - ms);
  return passend.length ? Math.min(...passend) : naiv - vorher * 60000;
}

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
// "2026-11-12" → "20261112" (ganztägige Termine)
const icsDatum = iso => iso.replace(/-/g, "");
// Zeitpunkt in UTC (DTSTAMP, DTSTART, DTEND): "20261101T120000Z"
const icsUtc = ms => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
// Minuten → Dauer "PT15H30M" (negativ: vor dem Beginn)
function icsDauer(minuten) {
  const v = minuten < 0 ? "-" : "", m = Math.abs(minuten);
  const h = Math.floor(m / 60), r = m % 60;
  return v + "PT" + (h ? h + "H" : "") + (r || !h ? r + "M" : "");
}
// Minuten seit Mitternacht
const minutenVon = zeit => Number(zeit.slice(0, 2)) * 60 + Number(zeit.slice(3, 5));

// Titel: "Kleine Inspektion – Werkstatt Muster" bzw. ohne Werkstatt nur der Name;
// mit Vorlaufzeit beginnt der Eintrag mit dem Losfahren, daher die Terminzeit dazu:
// "Kleine Inspektion – Werkstatt Muster (Termin 10:00)"
function kalenderTitel(o) {
  const a = o.auftrag;
  return o.art.name + (a.werkstatt ? " – " + a.werkstatt : "") + (a.terminZeit && a.vorlauf ? " (Termin " + a.terminZeit + ")" : "");
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
  const a = o.auftrag;
  if (a.terminZeit && a.vorlauf) teile.push("Termin " + a.terminZeit + " Uhr, losfahren " + losfahrenZeit(a.terminZeit, a.vorlauf) + " (" + a.vorlauf + " min Vorlauf)");
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

// Zeitpunkte (ms) eines Termins mit Uhrzeit: Beginn (Losfahren), Termin, Ende, Erinnerung
function kalenderZeitpunkte(a) {
  const termin = berlinZeitpunkt(a.termin, minutenVon(a.terminZeit));
  return { termin, beginn: termin - (a.vorlauf || 0) * 60000, ende: termin + KALENDER_DAUER_MIN * 60000,
    erinnerung: berlinZeitpunkt(plusTage(a.termin, -1), minutenVon(KALENDER_ERINNERUNG)) };
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
    // Beginn mit dem Losfahren, Ende 1 Stunde nach dem Termin; als echte Zeitpunkte
    const z = kalenderZeitpunkte(a);
    zeilen.push("DTSTART:" + icsUtc(z.beginn), "DTEND:" + icsUtc(z.ende), "TRANSP:OPAQUE");
    vorBeginn = Math.round((z.beginn - z.erinnerung) / 60000);
  } else {
    zeilen.push("DTSTART;VALUE=DATE:" + icsDatum(a.termin), "DTEND;VALUE=DATE:" + icsDatum(plusTage(a.termin, 1)), "TRANSP:TRANSPARENT");
    vorBeginn = 24 * 60 - minutenVon(KALENDER_ERINNERUNG);
  }
  zeilen.push("SUMMARY:" + icsText(titel), "DESCRIPTION:" + icsText(kalenderBeschreibung(o)),
    "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsText(titel), "TRIGGER:" + icsDauer(-vorBeginn), "END:VALARM",
    "END:VEVENT", "END:VCALENDAR");
  return zeilen.map(icsFalten).join("\r\n") + "\r\n";
}

/* ---------- Was steht im Kalender? ----------
   Beim Antippen von „Im Kalender öffnen“ merkt sich die App im Auftrag
   (imKalender), welcher Termin übernommen wurde: Datum, Uhrzeit, Vorlauf. iOS
   legt bei einer erneuten Übernahme einen zweiten Eintrag an; weicht der
   Termin später ab, weist die App darauf hin, den alten Eintrag zu löschen. */

// Der Stand eines Termins, wie er im Kalender stünde
const kalenderStand = a => ({ termin: a.termin, terminZeit: a.terminZeit || null, vorlauf: a.terminZeit ? a.vorlauf || null : null });
const gleicherStand = (x, y) => !!x && !!y && x.termin === y.termin && (x.terminZeit || null) === (y.terminZeit || null) && (x.vorlauf || null) === (y.vorlauf || null);
// Steht im Kalender ein anderer (oder ein inzwischen entfernter) Termin?
function kalenderVeraltet(a) { return !!a.imKalender && !(a.termin && gleicherStand(a.imKalender, kalenderStand(a))); }
// Steht genau dieser Termin schon im Kalender?
function kalenderAktuell(a) { return !!a.termin && gleicherStand(a.imKalender, kalenderStand(a)); }
// "Fr 06.11., 09:00", "Fr 06.11., ganztägig", "Fr 06.11., 10:00, losfahren 09:30"
function kalenderStandText(k) {
  return wochentag(k.termin) + " " + kurzDatum(k.termin) + ", " + (k.terminZeit ? k.terminZeit + (k.vorlauf ? ", losfahren " + losfahrenZeit(k.terminZeit, k.vorlauf) : "") : "ganztägig");
}
