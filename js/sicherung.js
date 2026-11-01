// Rad-km · Datensicherung: Export, Prüfung, Vergleich, Import
"use strict";

/* =====================================================================
   8. DATENSICHERUNG: Export, Prüfung, Import
   Nichts in diesem Abschnitt verändert die Daten der App – außer dem
   Import nach ausdrücklicher Bestätigung. Eine erfolgreiche Sicherung
   setzt nur das Datum der letzten Sicherung (eigener Speicherplatz).
   ===================================================================== */

function exportVermerken() {
  try { localStorage.setItem(EXPORT_SCHLUESSEL, heute()); } catch (e) {}
}

// Kurzinfo am Anfang der Exportdatei
function kurzinfoFuer(d, zeitpunkt) {
  const f = d.fahrrad;
  return {
    zeitpunkt,
    appVersion: APP_VERSION,
    eintraege: d.eintraege.length,
    kmSumme: runden(d.eintraege.reduce((s, e) => s + e.km, 0)),
    kmStand: f ? runden(f.startKm + d.eintraege.filter(e => e.datum >= f.startdatum).reduce((s, e) => s + e.km, 0)) : null,
    wartungen: d.auftraege.filter(a => a.status === "erledigt").length,
    maengel: d.maengel.length
  };
}
// "412 Einträge, 7.380,4 km"
function inhaltText(ki) {
  return (ki.eintraege === 1 ? "1 Eintrag" : ki.eintraege + " Einträge") + ", " + kmText(ki.kmSumme) + " km";
}

function exportInhalt(zeitpunkt = new Date().toISOString()) {
  const { version, ...rest } = daten;
  return JSON.stringify(Object.assign({ version: DATEN_VERSION, kurzinfo: kurzinfoFuer(daten, zeitpunkt) }, rest), null, 2);
}

// ---------- Vergleich einer Sicherung mit dem aktuellen Stand ----------

// Gleicher Inhalt, unabhängig von der Reihenfolge der Felder
function kanonisch(x) {
  if (Array.isArray(x)) return x.map(kanonisch);
  if (x && typeof x === "object") return Object.keys(x).sort().reduce((o, k) => { o[k] = kanonisch(x[k]); return o; }, {});
  return x;
}
function gleicherInhalt(a, b) { return JSON.stringify(kanonisch(a)) === JSON.stringify(kanonisch(b)); }

// Je Liste: fehlen = nur im aktuellen Stand (neuer als die Sicherung),
// nurSicherung = nur in der Sicherung, geaendert = in beiden, aber verschieden.
// Einträge werden über das Datum zugeordnet, alles andere über die Kennung.
// Berechnete Kilometerstände erledigter Aufträge zählen nicht als Unterschied.
function datenVergleichen(sicherung, aktuell) {
  const liste = (alt, neu, schluessel, inhalt = x => x) => {
    const a = new Map(alt.map(x => [schluessel(x), x])), n = new Map(neu.map(x => [schluessel(x), x]));
    return {
      fehlen: [...n.keys()].filter(k => !a.has(k)),
      nurSicherung: [...a.keys()].filter(k => !n.has(k)),
      geaendert: [...n.keys()].filter(k => a.has(k) && !gleicherInhalt(inhalt(a.get(k)), inhalt(n.get(k))))
    };
  };
  const nachId = x => x.id;
  const ohneId = ({ id, ...rest }) => rest;
  const ohneBerechnetenKm = a => Object.assign({}, a, { kmStand: a.kmManuell ? a.kmStand : null });
  const gemeinsameReihenfolge = (x, y) => x.map(nachId).filter(id => y.some(v => v.id === id));
  const vorlagen = liste(sicherung.vorlagen, aktuell.vorlagen, nachId);
  vorlagen.reihenfolge = !gleicherInhalt(gemeinsameReihenfolge(sicherung.vorlagen, aktuell.vorlagen), gemeinsameReihenfolge(aktuell.vorlagen, sicherung.vorlagen));
  return {
    eintraege: liste(sicherung.eintraege, aktuell.eintraege, e => e.datum, ohneId),
    vorlagen,
    wartungsarten: liste(sicherung.wartungsarten, aktuell.wartungsarten, nachId),
    auftraege: liste(sicherung.auftraege, aktuell.auftraege, nachId, ohneBerechnetenKm),
    maengel: liste(sicherung.maengel, aktuell.maengel, nachId),
    fahrrad: !gleicherInhalt(sicherung.fahrrad, aktuell.fahrrad),
    einstellungen: !gleicherInhalt(sicherung.einstellungen, aktuell.einstellungen)
  };
}

// Datumswerte als kurze Bereiche: "25.–27.10., 30.10.–02.11."; das Jahr nur,
// wenn es nicht das laufende ist. Mehr als "max" Bereiche werden mit "…" gekürzt.
function datumsBereiche(liste, h, max = 4) {
  const bereiche = [];
  [...liste].sort().forEach(d => {
    const b = bereiche[bereiche.length - 1];
    if (b && plusTage(b[1], 1) === d) b[1] = d; else bereiche.push([d, d]);
  });
  const jahr = h.slice(0, 4);
  const text = ([von, bis]) => {
    const mitJahr = von.slice(0, 4) !== jahr || bis.slice(0, 4) !== jahr;
    const t = iso => mitJahr ? datumText(iso) : kurzDatum(iso);
    if (von === bis) return t(von);
    if (von.slice(0, 7) === bis.slice(0, 7)) return von.slice(8) + ".–" + t(bis);
    if (von.slice(0, 4) === bis.slice(0, 4)) return kurzDatum(von) + "–" + t(bis);
    return t(von) + "–" + t(bis);
  };
  const teile = bereiche.slice(0, max).map(text);
  if (bereiche.length > max) teile.push("…");
  return teile.join(", ");
}

const VERGLEICH_BEZEICHNUNG = {
  eintraege: ["Eintrag", "Einträge"],
  auftraege: ["Auftrag", "Aufträge"],
  maengel: ["Mangel", "Mängel"],
  vorlagen: ["Vorlage", "Vorlagen"],
  wartungsarten: ["Wartungsart", "Wartungsarten"]
};
// Unterschiede als Text: "fehlen" (nur Neues seit der Sicherung) und "sonst"
function unterschiedTexte(v, h) {
  const fehlen = [], sonst = [];
  Object.keys(VERGLEICH_BEZEICHNUNG).forEach(k => {
    const [einzahl, mehrzahl] = VERGLEICH_BEZEICHNUNG[k];
    const anzahl = n => n + " " + (n === 1 ? einzahl : mehrzahl);
    const tage = liste => k === "eintraege" ? " (" + datumsBereiche(liste, h) + ")" : "";
    const x = v[k];
    if (x.fehlen.length) fehlen.push(anzahl(x.fehlen.length) + (x.fehlen.length === 1 ? " fehlt" : " fehlen") + tage(x.fehlen));
    if (x.nurSicherung.length) sonst.push(anzahl(x.nurSicherung.length) + " nur in der Sicherung" + tage(x.nurSicherung));
    if (x.geaendert.length) sonst.push(anzahl(x.geaendert.length) + " geändert" + tage(x.geaendert));
  });
  if (v.vorlagen.reihenfolge) sonst.push("Reihenfolge der Vorlagen geändert");
  if (v.fahrrad) sonst.push("Angaben zum Fahrrad geändert");
  if (v.einstellungen) sonst.push("Einstellungen geändert");
  return { fehlen, sonst };
}

// Wertet den Text einer Sicherung aus: Prüfung mit denselben Regeln wie beim
// Import, Vergleich mit "aktuell" und Abgleich der Kurzinfo. Verändert nichts.
//   status: "identisch" | "aelter" | "abweichend" | "defekt"
//   kurzinfoPasst: true / false, null = Datei ohne Kurzinfo (ältere Sicherung)
//   identischStreng: Inhalt einschließlich aller Kennungen gleich
function sicherungAuswerten(text, aktuell, h = heute()) {
  let gelesen, roh;
  try {
    gelesen = datenEinlesen(text);
    roh = JSON.parse(text);
  } catch (e) {
    return { status: "defekt", titel: "Datei beschädigt bzw. keine Rad-km-Sicherung", details: [e.message], kurzinfo: null, kurzinfoPasst: null, identischStreng: false };
  }
  const ki = roh.kurzinfo && typeof roh.kurzinfo === "object" && !Array.isArray(roh.kurzinfo) ? roh.kurzinfo : null;
  const soll = kurzinfoFuer(gelesen, null);
  // Bis Version 7 zählte "wartungen" die Einträge im Wartungsprotokoll
  if (roh.version < 8) soll.wartungen = Array.isArray(roh.wartungsprotokoll) ? roh.wartungsprotokoll.length : 0;
  const kurzinfoPasst = roh.kurzinfo === undefined ? null
    : !!ki && ["eintraege", "kmSumme", "kmStand", "wartungen", "maengel"].every(k => ki[k] === soll[k]);
  const erg = { gelesen, kurzinfo: ki, kurzinfoPasst, inhalt: soll, details: [], identischStreng: gleicherInhalt(gelesen, aktuell) };
  const u = unterschiedTexte(datenVergleichen(gelesen, aktuell), h);
  if (!u.fehlen.length && !u.sonst.length) {
    erg.status = "identisch"; erg.titel = "Identisch mit dem aktuellen Stand";
  } else if (!u.sonst.length) {
    erg.status = "aelter"; erg.titel = "Sicherung ist älter: " + u.fehlen.join(", ");
  } else {
    erg.status = "abweichend"; erg.titel = "Sicherung weicht vom aktuellen Stand ab"; erg.details = [...u.fehlen, ...u.sonst];
  }
  return erg;
}

// ---------- Sichern ----------

let sicherungLaeuft = false;
// Ergebnis der letzten erfolgreichen Sicherung (nur solange die App geöffnet ist)
let sicherungsErgebnis = null;
// Bereits geprüfte Sicherung, falls das Teilen-Menü einen zweiten Tipper braucht
let geprueftZumTeilen = null;

// "rad-km-2026-10-25-1403.json" – mit Uhrzeit, damit mehrere Sicherungen am selben Tag eindeutig sind
function sicherungsDateiname(jetzt) {
  return "rad-km-" + isoAusDate(jetzt) + "-" + zweistellig(jetzt.getHours()) + zweistellig(jetzt.getMinutes()) + ".json";
}

// Erzeugt die Exportdatei und prüft sie, bevor sie geteilt wird: Die Datei
// wird wieder eingelesen, mit den Import-Regeln geprüft und mit dem aktuellen
// Stand verglichen. Wirft einen Fehler, wenn etwas nicht stimmt.
async function sicherungVorbereiten() {
  const dateiname = sicherungsDateiname(new Date());
  const inhalt = exportInhalt();
  let datei;
  try { datei = new File([inhalt], dateiname, { type: "application/json" }); }
  catch (e) { datei = new Blob([inhalt], { type: "application/json" }); }
  let text;
  try { text = await dateiLesen(datei); }
  catch (e) { throw new Error("Die Exportdatei konnte nicht wieder gelesen werden."); }
  const erg = sicherungAuswerten(text, daten);
  if (erg.status === "defekt") throw new Error("Die Exportdatei ist fehlerhaft: " + erg.details.join(" "));
  if (!erg.identischStreng) {
    const was = erg.status === "aelter" ? [erg.titel] : erg.details;
    throw new Error("Die Exportdatei stimmt nicht mit dem aktuellen Stand überein" + (was.length ? ": " + was.join(", ") + "." : " (interne Kennungen)."));
  }
  if (erg.kurzinfoPasst !== true) throw new Error("Die Kurzinfo der Exportdatei passt nicht zum Inhalt.");
  return { datei, dateiname, inhalt, kurzinfo: erg.kurzinfo };
}

// "Jetzt sichern": prüfen, dann teilen (iPhone) oder herunterladen
async function jetztSichern() {
  if (sicherungLaeuft) return;
  sicherungLaeuft = true;
  try {
    let s;
    try {
      s = await sicherungVorbereiten();
    } catch (e) {
      alert("Die Sicherung wurde nicht erstellt, weil die Prüfung der Exportdatei fehlgeschlagen ist:\n" + e.message +
        "\n\nDeine Daten in der App sind unverändert.");
      return;
    }
    await sicherungTeilen(s);
  } finally {
    sicherungLaeuft = false;
  }
}

// Teilen-Menü bzw. Download einer geprüften Sicherung. Erst nach dem Abschluss
// wird das Datum der letzten Sicherung gesetzt; die Daten bleiben unberührt.
// navigator.share wird ohne vorheriges "await" aufgerufen (iPhone).
async function sicherungTeilen(s) {
  if (navigator.canShare && navigator.canShare({ files: [s.datei] })) {
    try {
      // Nur die Datei: Mit Titel oder Text legt "In Dateien sichern" zusätzlich eine Textdatei an
      await navigator.share({ files: [s.datei] });
    } catch (err) {
      if (err && err.name === "AbortError") { meldung("Sicherung abgebrochen"); return; }
      // Das iPhone öffnet das Teilen-Menü nur direkt nach einem Tipper
      if (err && err.name === "NotAllowedError" && !s.zweiterVersuch) { teilenNachfragen(s); return; }
      herunterladen(s.inhalt, s.dateiname);
      sicherungFertig(s, "heruntergeladen");
      return;
    }
    sicherungFertig(s, "übergeben");
  } else {
    herunterladen(s.inhalt, s.dateiname);
    sicherungFertig(s, "heruntergeladen");
  }
}
function teilenNachfragen(s) {
  geprueftZumTeilen = Object.assign({}, s, { zweiterVersuch: true });
  fensterOeffnen('<h2>Sicherung geprüft</h2>' +
    '<p>Die Exportdatei ist geprüft: ' + inhaltText(s.kurzinfo) + '. Tippe auf „Teilen …“, um sie z. B. in „Dateien“ zu speichern.</p>' +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Abbrechen</button>' +
    '<button type="button" class="primaer" data-action="sicherung-teilen">Teilen …</button></div>');
}
function sicherungFertig(s, wie) {
  exportVermerken();
  sicherungsErgebnis = { wie, kurzinfo: s.kurzinfo };
  zeichnen();
  meldung("Sicherung " + wie + " – Inhalt geprüft: " + inhaltText(s.kurzinfo), { dauer: 4000 });
}
function herunterladen(inhalt, dateiname) {
  const url = URL.createObjectURL(new Blob([inhalt], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ---------- Sicherung prüfen (liest nur, überschreibt nichts) ----------

function sicherungPruefenStarten() {
  const eingabe = document.getElementById("pruefdatei");
  eingabe.value = "";
  eingabe.click();
}
async function pruefDateiGewaehlt(datei) {
  if (!datei) return;
  let erg;
  try {
    erg = sicherungAuswerten(await dateiLesen(datei), daten);
  } catch (e) {
    erg = { status: "defekt", titel: "Datei beschädigt bzw. keine Rad-km-Sicherung", details: ["Die Datei konnte nicht gelesen werden."] };
  }
  pruefErgebnisAnzeigen(datei.name, erg);
}
function zeitpunktText(iso) {
  const d = typeof iso === "string" ? new Date(iso) : null;
  if (!d || isNaN(d)) return null;
  return datumText(isoAusDate(d)) + ", " + zweistellig(d.getHours()) + ":" + zweistellig(d.getMinutes()) + " Uhr";
}
function pruefErgebnisAnzeigen(name, erg) {
  const klasse = { identisch: "status-gruen", aelter: "status-orange", abweichend: "status-orange", defekt: "status-rot" }[erg.status];
  const zeichen = { identisch: "✓", aelter: "⚠️", abweichend: "⚠️", defekt: "✗" }[erg.status];
  let html = '<h2>Sicherung prüfen</h2><p class="klein" style="overflow-wrap:anywhere">' + esc(name) + '</p>' +
    '<p class="' + klasse + '">' + zeichen + " " + esc(erg.titel) + '</p>' +
    (erg.details.length ? '<ul>' + erg.details.map(d => '<li>' + esc(d) + '</li>').join("") + '</ul>' : "");
  if (erg.status !== "defekt") {
    const i = erg.inhalt;
    const wann = erg.kurzinfo && zeitpunktText(erg.kurzinfo.zeitpunkt);
    html += detailListe([
      ["Gesichert am", wann ? esc(wann) + (erg.kurzinfo.appVersion ? " (App-Version " + esc(erg.kurzinfo.appVersion) + ")" : "") : "unbekannt (Sicherung ohne Kurzinfo)"],
      ["Inhalt der Sicherung", inhaltText(i) + ", " + (i.wartungen === 1 ? "1 Wartung" : i.wartungen + " Wartungen") + ", " +
        (i.maengel === 1 ? "1 Mangel" : i.maengel + " Mängel") + (i.kmStand !== null ? "<br>Kilometerstand " + kmText(i.kmStand) + " km" : "")]
    ]);
    if (erg.kurzinfoPasst === false) {
      html += '<p class="status-orange">⚠️ Die Kurzinfo passt nicht zum Inhalt – die Datei wurde nachträglich verändert oder ist unvollständig.</p>';
    }
  }
  html += '<p class="klein">Die Datei wurde nur gelesen. In der App wurde nichts verändert.</p>' +
    '<div class="knopfreihe"><button type="button" class="primaer" data-action="fenster-zu">Schließen</button></div>';
  fensterOeffnen(html);
}

// ---------- Import ----------

function importStarten() {
  const eingabe = document.getElementById("importdatei");
  eingabe.value = "";
  eingabe.click();
}
async function importDateiGewaehlt(datei) {
  if (!datei) return;
  let neu, roh;
  try {
    const text = await dateiLesen(datei);
    neu = datenEinlesen(text);
    roh = JSON.parse(text);
  } catch (e) {
    alert("Import nicht möglich:\n" + e.message);
    return;
  }
  const wann = roh.kurzinfo && zeitpunktText(roh.kurzinfo.zeitpunkt);
  const ziele = neu.einstellungen.jahresziele.length;
  const zusammenfassung =
    "<strong>" + esc(datei.name) + "</strong><br>" +
    (wann ? "Gesichert am " + esc(wann) + "<br>" : "") +
    "Fahrrad: " + (neu.fahrrad ? esc(neu.fahrrad.name) : "–") + "<br>" +
    neu.eintraege.length + " Einträge, " + neu.vorlagen.length + " Vorlagen, " +
    neu.wartungsarten.length + " Wartungsarten, " + auftraegeText(neu.auftraege) + ", " + neu.maengel.length + " Mängel" +
    (neu.maengel.length ? " (davon " + neu.maengel.filter(m => m.status === "offen").length + " offen)" : "") +
    (ziele ? ", " + (ziele === 1 ? "1 Jahresziel" : ziele + " Jahresziele") : "") + ".<br><br>" +
    "<strong>Alle vorhandenen Daten in der App werden ersetzt.</strong> Fortfahren?";
  if (!await frage(zusammenfassung, "Importieren und ersetzen", "Abbrechen", true)) return;
  daten = neu;
  ladeFehler = null;
  sicherungsErgebnis = null;
  if (roh.version < 8) pruefungVormerken(true);
  if (speichern()) { zeichnen(); meldung("Import erfolgreich"); }
}
