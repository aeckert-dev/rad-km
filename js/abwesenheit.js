// Rad-km · Abwesenheit (N3, ab 5g): Zeiträume ohne Fahrt, Wirkung auf Fahrtage, Liste im Reiter Fahrten, Formular, Statistik
"use strict";
// Gründe: Urlaub, Dienstreise, krank, sonstiges (oder ohne Angabe)

// Eine Abwesenheit: { id, von, bis, grund } (grund null = ohne Angabe). Die Liste
// daten.abwesenheiten ist nach dem Beginn sortiert, ohne Überschneidung (daten.js).
// Im Zeitraum gibt es keinen Hinweis „Fahrtag ohne Eintrag“ und keinen nächsten
// Fahrtag. Vorhandene Einträge bleiben und haben Vorrang: Ein Tag mit Fahrt
// (mehr als 0 km) zählt trotzdem als Fahrtag.

const ABWESENHEIT_NAME = { urlaub: "Urlaub", dienstreise: "Dienstreise", krank: "Krank", sonstiges: "Sonstiges" };
const ABWESENHEIT_SYMBOL = { urlaub: "🏖️", dienstreise: "💼", krank: "🤒", sonstiges: "📌" };
const abwesenheitName = a => ABWESENHEIT_NAME[a.grund] || "Abwesend";
const abwesenheitSymbol = a => ABWESENHEIT_SYMBOL[a.grund] || "📌";
// Datum mit Wochentag, ohne Jahr, wenn es höchstens 300 Tage von heute entfernt liegt: "So 03.01."
function tagKurz(iso, h = heute()) { return wochentag(iso) + " " + (Math.abs(tageZwischen(h, iso)) <= 300 ? kurzDatum(iso) : datumText(iso)); }
// "Mo 21.12.–So 03.01."
function zeitraumKurz(a, h = heute()) { return a.von === a.bis ? tagKurz(a.von, h) : tagKurz(a.von, h) + "–" + tagKurz(a.bis, h); }

// Die Abwesenheit am Tag "datum" oder null
function abwesenheitAm(datum, liste = daten.abwesenheiten) {
  return (liste || []).find(a => a.von <= datum && datum <= a.bis) || null;
}
// Fahrt (Tages-Eintrag mit mehr als 0 km) an diesem Tag?
function radtagAm(datum, eintraege = daten.eintraege) { return eintraege.some(e => e.datum === datum && e.typ === "tag" && e.km > 0); }
// Abwesend an "datum" (ohne Fahrt an diesem Tag)?
function abwesendAm(datum, liste = daten.abwesenheiten, eintraege = daten.eintraege) {
  return !!abwesenheitAm(datum, liste) && !radtagAm(datum, eintraege);
}
// Tage von "von" bis "bis" (einschließlich)
function tageVonBis(von, bis) {
  const tage = [];
  for (let d = von; d <= bis; d = plusTage(d, 1)) tage.push(d);
  return tage;
}
// Eingestellte Fahrtage im Zeitraum und wie viele davon einen Eintrag haben
function fahrtageImZeitraum(von, bis, fahrtage = daten.einstellungen.fahrtage) {
  const tage = tageVonBis(von, bis).filter(d => fahrtage.includes(isoWochentag(d)));
  return { fahrtage: tage.length, mitEintrag: tage.filter(d => eintragAm(d)).length };
}
// Abwesenheit, die sich mit von–bis überschneidet (außer der mit "ohneId"), sonst null
function abwesenheitUeberschneidung(von, bis, ohneId = null, liste = daten.abwesenheiten) {
  return liste.find(a => a.id !== ohneId && a.von <= bis && von <= a.bis) || null;
}
// Für den Hinweis beim nächsten Fahrtag: die zuletzt endende Abwesenheit zwischen
// heute (h) und dem Fahrtag (datum), die mindestens einen eingestellten Fahrtag
// umfasst; sonst null. Liegt kein Fahrtag mehr in Sicht (datum null), die
// Abwesenheit am heutigen Tag.
function abwesenheitVorFahrtag(h, datum, fahrtage = daten.einstellungen.fahrtage, liste = daten.abwesenheiten) {
  const bis = datum ? plusTage(datum, -1) : h;
  return liste.filter(a => a.bis >= h && a.von <= bis &&
    tageVonBis(a.von > h ? a.von : h, a.bis < bis ? a.bis : bis).some(d => fahrtage.includes(isoWochentag(d))))
    .reduce((m, a) => !m || a.bis > m.bis ? a : m, null);
}
// "Urlaub bis So 03.01." bzw. "Abwesend bis …"
function abwesenheitBisText(a, h = heute()) {
  return abwesenheitName(a) + " bis " + tagKurz(a.bis, h);
}

// ---------- Reiter Fahrten → Einträge: Abschnitt „Abwesenheiten“ ----------

// Frühere Abwesenheiten aufgeklappt (nur im Arbeitsspeicher)
let abwesenheitFruehereOffen = false;
// "läuft · noch 9 Tage", "in 50 Tagen", "morgen", "vorbei"
function abwesenheitStand(a, h) {
  if (a.bis < h) return "vorbei";
  if (a.von <= h) { const rest = tageZwischen(h, a.bis); return "läuft · " + (rest === 0 ? "bis heute" : "noch " + (rest === 1 ? "1 Tag" : rest + " Tage")); }
  const bis = tageZwischen(h, a.von);
  return bis === 1 ? "ab morgen" : "in " + tageText(bis);
}
function abwesenheitZeile(a, h) {
  const z = fahrtageImZeitraum(a.von, a.bis);
  const teile = [abwesenheitStand(a, h), z.fahrtage === 1 ? "1 Fahrtag" : z.fahrtage + " Fahrtage"].concat(z.mitEintrag ? [z.mitEintrag + " mit Eintrag"] : []);
  return '<div class="zeile"><button type="button" class="inhalt" data-action="abwesenheit-bearbeiten" data-id="' + esc(a.id) + '">' +
    '<div class="text"><div>' + abwesenheitSymbol(a) + ' ' + esc(abwesenheitName(a)) + ' <span class="klein">' + esc(zeitraumKurz(a, h)) + '</span></div>' +
    '<div class="klein">' + esc(teile.join(" · ")) + '</div></div><span class="klein" style="padding-right:16px">›</span></button></div>';
}
function abwesenheitenBereich(h) {
  const liste = daten.abwesenheiten, aktuell = liste.filter(a => a.bis >= h), frueher = liste.filter(a => a.bis < h).reverse();
  return '<h2>Abwesenheiten</h2><div class="liste">' +
    (aktuell.length ? aktuell.map(a => abwesenheitZeile(a, h)).join("") : '<div class="leer">Keine Abwesenheit geplant.</div>') +
    (frueher.length ? '<div class="zeile"><button type="button" class="inhalt" data-action="abwesenheit-fruehere" aria-expanded="' + abwesenheitFruehereOffen + '">' +
      '<div class="text"><div class="klein">Frühere (' + frueher.length + ') ' + (abwesenheitFruehereOffen ? "⌄" : "›") + '</div></div></button></div>' +
      (abwesenheitFruehereOffen ? frueher.map(a => abwesenheitZeile(a, h)).join("") : "") : "") +
    '</div><div class="knopfreihe"><button type="button" data-action="abwesenheit-neu">+ Abwesenheit</button></div>' +
    (liste.length ? "" : '<p class="klein" style="margin-top:4px">Urlaub, Dienstreise oder krank: Im Zeitraum gibt es keinen Hinweis „Fahrtag ohne Eintrag“, ' +
      'und Übersicht und Reiter Wetter zeigen den nächsten Fahrtag danach. Vorhandene Einträge bleiben und gehen vor.</p>');
}
function abwesenheitFruehereSchalten() { abwesenheitFruehereOffen = !abwesenheitFruehereOffen; zeichnen(); }

// ---------- Formular (Fenster) ----------

let formAbwesenheit = null; // { id } (id null = neu)
function abwesenheitFormular(id = null, von = null, bis = null) {
  const a = id ? daten.abwesenheiten.find(x => x.id === id) : null;
  if (id && !a) return;
  formAbwesenheit = { id: a ? a.id : null };
  const h = heute(), v = a ? a.von : von || h, b = a ? a.bis : bis || v;
  const gruende = [["", "keine Angabe"]].concat(ABWESENHEIT_GRUENDE.map(g => [g, ABWESENHEIT_NAME[g]]));
  fensterOeffnen(
    '<h2>' + (a ? "Abwesenheit bearbeiten" : "Neue Abwesenheit") + '</h2>' +
    '<label for="ab-von">Von</label><input type="date" id="ab-von" value="' + v + '" data-change="abwesenheit-zeitraum">' +
    '<label for="ab-bis">Bis (einschließlich)</label><input type="date" id="ab-bis" value="' + b + '" data-change="abwesenheit-zeitraum">' +
    '<label for="ab-grund">Grund (optional)</label><select id="ab-grund">' + gruende.map(([g, t]) =>
      '<option value="' + g + '"' + ((a ? a.grund || "" : "") === g ? " selected" : "") + '>' + t + '</option>').join("") + '</select>' +
    '<div class="feldhinweis" id="ab-info" aria-live="polite"></div>' +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Abbrechen</button>' +
    '<button type="button" class="primaer" data-action="abwesenheit-speichern">Speichern</button></div>' +
    (a ? '<div class="knopfreihe"><button type="button" class="gefahr voll" data-action="abwesenheit-loeschen" data-id="' + esc(a.id) + '">Abwesenheit löschen</button></div>' : "")
  );
  abwesenheitInfo();
}
// Text unter dem Zeitraum: Fahrtage, Einträge (bleiben erhalten), Überschneidung
function abwesenheitInfoText(von, bis, ohneId) {
  if (!istGueltigesDatum(von) || !istGueltigesDatum(bis)) return "";
  if (von > bis) return "„Bis“ liegt vor „Von“.";
  const tage = tageZwischen(von, bis) + 1;
  if (tage > ABWESENHEIT_MAX_TAGE) return "Höchstens " + ABWESENHEIT_MAX_TAGE + " Tage.";
  const anders = abwesenheitUeberschneidung(von, bis, ohneId);
  if (anders) return "Überschneidet sich mit " + abwesenheitName(anders) + " " + zeitraumKurz(anders);
  const z = fahrtageImZeitraum(von, bis);
  return (tage === 1 ? "1 Tag" : tage + " Tage") + ", davon " + (z.fahrtage === 1 ? "1 Fahrtag" : z.fahrtage + " Fahrtage") +
    (z.mitEintrag ? " (" + z.mitEintrag + " mit Eintrag – " + (z.mitEintrag === 1 ? "er bleibt" : "sie bleiben") + " erhalten)" : "") + ".";
}
function abwesenheitInfo() {
  const el = document.getElementById("ab-info");
  if (el && formAbwesenheit) el.textContent = abwesenheitInfoText(wert("ab-von"), wert("ab-bis"), formAbwesenheit.id);
}
function abwesenheitSpeichern() {
  if (!formAbwesenheit) return;
  const von = wert("ab-von"), bis = wert("ab-bis"), grund = wert("ab-grund") || null;
  if (!istGueltigesDatum(von) || !istGueltigesDatum(bis)) { alert("Bitte für „Von“ und „Bis“ ein gültiges Datum wählen."); return; }
  if (von > bis) { alert("„Bis“ darf nicht vor „Von“ liegen."); return; }
  if (tageZwischen(von, bis) + 1 > ABWESENHEIT_MAX_TAGE) { alert("Eine Abwesenheit darf höchstens " + ABWESENHEIT_MAX_TAGE + " Tage dauern."); return; }
  if (grund !== null && !ABWESENHEIT_GRUENDE.includes(grund)) return;
  const anders = abwesenheitUeberschneidung(von, bis, formAbwesenheit.id);
  if (anders) { alert("Der Zeitraum überschneidet sich mit " + abwesenheitName(anders) + " " + zeitraumKurz(anders) + " Bitte diese Abwesenheit ändern oder einen anderen Zeitraum wählen."); return; }
  const neu = { id: formAbwesenheit.id || neueId(), von, bis, grund };
  daten.abwesenheiten = daten.abwesenheiten.filter(a => a.id !== neu.id).concat([neu]).sort((a, b) => a.von.localeCompare(b.von));
  if (!speichern()) return;
  fensterSchliessen();
  zeichnen();
  meldung(abwesenheitName(neu) + " " + zeitraumKurz(neu) + " gespeichert");
}
async function abwesenheitLoeschen(id) {
  const a = daten.abwesenheiten.find(x => x.id === id);
  if (!a) return;
  if (!await frage(abwesenheitName(a) + " " + zeitraumKurz(a) + " wirklich löschen? Einträge in diesem Zeitraum bleiben.", "Löschen", "Abbrechen", true)) return;
  mitRueckgaengig(() => { daten.abwesenheiten = daten.abwesenheiten.filter(x => x.id !== id); }, abwesenheitName(a) + " " + zeitraumKurz(a) + " gelöscht");
}

// ---------- Statistik: abwesende Fahrtage je Jahr ----------

// Eingestellte Fahrtage in Abwesenheiten bis zum Stichtag, ohne Tage mit Fahrt, je
// Jahr (neueste zuerst) und Grund: [{ jahr, tage, gruende: { urlaub: 15, … } }]
function abwesendeFahrtage(h = heute(), fahrtage = daten.einstellungen.fahrtage) {
  const jahre = {};
  daten.abwesenheiten.forEach(a => tageVonBis(a.von, a.bis < h ? a.bis : h).forEach(d => {
    if (!fahrtage.includes(isoWochentag(d)) || radtagAm(d)) return;
    const j = jahre[d.slice(0, 4)] || (jahre[d.slice(0, 4)] = { jahr: Number(d.slice(0, 4)), tage: 0, gruende: {} });
    const g = a.grund || "ohne";
    j.tage++; j.gruende[g] = (j.gruende[g] || 0) + 1;
  }));
  return Object.values(jahre).sort((a, b) => b.jahr - a.jahr);
}
// "2026: 18 Fahrtage abwesend (Urlaub 15, krank 3)"
function abwesendText(j) {
  const reihe = ABWESENHEIT_GRUENDE.concat(["ohne"]).filter(g => j.gruende[g]);
  const name = g => g === "ohne" ? "ohne Grund" : g === "krank" ? "krank" : ABWESENHEIT_NAME[g];
  return j.jahr + ": " + (j.tage === 1 ? "1 Fahrtag" : j.tage + " Fahrtage") + " abwesend" +
    (reihe.length > 1 || reihe[0] !== "ohne" ? " (" + reihe.map(g => name(g) + " " + j.gruende[g]).join(", ") + ")" : "");
}
