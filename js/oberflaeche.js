// Rad-km · Bausteine der Oberfläche: Fenster, Rückfrage, Meldung, Rückgängig; Zeichnen und Reiter
"use strict";

/* =====================================================================
   6. KLEINE BAUSTEINE DER OBERFLÄCHE: Fenster, Rückfrage, Meldung
   ===================================================================== */

const fenster = document.getElementById("fenster");
const fensterInhalt = document.getElementById("fensterinhalt");

function fensterOeffnen(html) {
  fensterInhalt.innerHTML = html;
  if (!fenster.open) fenster.showModal();
  fenster.scrollTop = 0;
}
function fensterSchliessen() { if (fenster.open) fenster.close(); }

// Rückfrage mit zwei Schaltflächen. Liefert true (Ja) oder false (Nein/Abbrechen).
function frage(text, jaText = "OK", neinText = "Abbrechen", gefaehrlich = false) {
  const dlg = document.getElementById("frage");
  document.getElementById("frageinhalt").innerHTML =
    '<p style="margin-top:0">' + text + '</p>' +
    '<div class="knopfreihe">' +
    '<button type="button" data-antwort="nein">' + esc(neinText) + '</button>' +
    '<button type="button" data-antwort="ja" class="' + (gefaehrlich ? "gefahr" : "primaer") + '">' + esc(jaText) + '</button>' +
    '</div>';
  return new Promise(fertig => {
    const klick = ev => {
      const b = ev.target.closest("[data-antwort]");
      if (!b) return;
      dlg.removeEventListener("click", klick);
      dlg.close();
      fertig(b.dataset.antwort === "ja");
    };
    dlg.addEventListener("click", klick);
    dlg.addEventListener("cancel", () => { dlg.removeEventListener("click", klick); fertig(false); }, { once: true });
    dlg.showModal();
  });
}

let toastTimer;
// Datenstand (JSON) vor dem letzten Löschen, solange "Rückgängig" angeboten wird
let rueckgaengigStand = null;

// Kurze Meldung unten. { rueckgaengig: true } zeigt daneben "Rückgängig";
// jede andere Meldung beendet ein noch offenes Rückgängig-Angebot.
function meldung(text, optionen = {}) {
  const t = document.getElementById("toast");
  const mitKnopf = !!optionen.rueckgaengig;
  if (!mitKnopf) rueckgaengigStand = null;
  document.getElementById("toast-text").textContent = text;
  document.getElementById("toast-knopf").hidden = !mitKnopf;
  t.classList.toggle("mit-knopf", mitKnopf);
  t.classList.add("sichtbar");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(meldungAus, optionen.dauer || (mitKnopf ? RUECKGAENGIG_MS : 1800));
}
function meldungAus() {
  clearTimeout(toastTimer);
  document.getElementById("toast").classList.remove("sichtbar", "mit-knopf");
  document.getElementById("toast-knopf").hidden = true;
  rueckgaengigStand = null;
}
function rueckgaengigVerwerfen() {
  rueckgaengigStand = null;
  if (!document.getElementById("toast-knopf").hidden) meldungAus();
}

// Änderung mit "Rückgängig" (Löschen, "Keine Fahrt"). Gemerkt wird der ganze
// Datenstand vorher, damit auch Verknüpfungen (z. B. die Mängel eines
// Protokoll-Eintrags) zurückkommen.
// "text" darf eine Funktion sein (Text erst nach der Änderung); "nachher" ersetzt
// das Schließen des Fensters (z. B. Detailansicht neu zeigen).
function mitRueckgaengig(aenderung, text, nachher) {
  const vorher = JSON.stringify(daten);
  aenderung();
  if (!speichern()) return;
  if (nachher) nachher(); else fensterSchliessen();
  zeichnen();
  rueckgaengigStand = vorher;
  meldung(typeof text === "function" ? text() : text, { rueckgaengig: true });
}
function rueckgaengig() {
  if (!rueckgaengigStand) return;
  daten = JSON.parse(rueckgaengigStand);
  if (speichern()) { zeichnen(); meldung("Wiederhergestellt"); }
}

// Datei als Text lesen (ältere Browser ohne File.text() über FileReader)
function dateiLesen(datei) {
  if (typeof datei.text === "function") return datei.text();
  return new Promise((fertig, fehler) => {
    const r = new FileReader();
    r.onload = () => fertig(r.result);
    r.onerror = () => fehler(r.error);
    r.readAsText(datei);
  });
}

function wert(id) { return document.getElementById(id).value; }

/* =====================================================================
   7. BILDSCHIRME
   Jeder Bildschirm ist eine Funktion, die HTML-Text erzeugt.
   Nach jeder Änderung wird der aktuelle Bildschirm neu gezeichnet.
   ===================================================================== */

let aktiverTab = "uebersicht";
// Aufgeklappte Zeilen der Eintragsliste (nur solange die App geöffnet ist)
const offeneGruppen = new Set();
// Umschalter in den Reitern Wartung („Aktuell | Verlauf“) und Fahrten
// („Einträge | Statistik“) und die offene Unterseite der Einstellungen
// (null = Hauptseite); nur solange die App geöffnet ist
let wartungAnsicht = "aktuell";
let fahrtenAnsicht = "eintraege";
let einstellungenSeite = null;

const TITEL = { uebersicht: "Übersicht", wetter: "Wetter", wartung: "Wartung", fahrten: "Fahrten", einstellungen: "Einstellungen" };

function zeichnen() {
  const unterseite = aktiverTab === "einstellungen" && einstellungenSeite ? EINSTELLUNGEN_SEITEN[einstellungenSeite] : null;
  document.getElementById("seitentitel").textContent = unterseite ? unterseite.titel : TITEL[aktiverTab];
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("aktiv", b.dataset.tab === aktiverTab));
  const bildschirme = { uebersicht: bildUebersicht, wetter: bildWetter, wartung: bildWartung, fahrten: bildFahrten, einstellungen: bildEinstellungen };
  let html = ladeFehler ? '<div class="hinweis fehler">' + esc(ladeFehler) + '</div>' : "";
  if (neueVersion) {
    html += '<div class="hinweis info"><strong>Neue Version verfügbar</strong><br>Deine Daten bleiben dabei unverändert.' +
      '<br><button type="button" class="primaer" data-action="neu-laden">Neu laden</button></div>';
  }
  html += bildschirme[aktiverTab]();
  document.getElementById("inhalt").innerHTML = html;
}

// Umschalter oben in einem Reiter, z. B. „Aktuell | Verlauf“: [[Wert, Text], …]
function umschalterHtml(aktion, aktuell, optionen, beschriftung) {
  return '<div class="umschalter reiter-umschalter" role="group" aria-label="' + beschriftung + '">' + optionen.map(([w, t]) =>
    '<button type="button" data-action="' + aktion + '" data-wert="' + w + '" aria-pressed="' + (w === aktuell) + '"' + (w === aktuell ? ' class="aktiv"' : "") + '>' + t + '</button>').join("") + '</div>';
}
// Weg zu einer Unterseite der Einstellungen (oder zur Hauptseite mit Sprung zu einem Abschnitt)
function wegZuEinstellungen(text, seite, anker) {
  return '<button type="button" class="leise weg" data-action="einstellungen-seite" data-seite="' + (seite || "") + '"' +
    (anker ? ' data-anker="' + anker + '"' : "") + '>' + text + ' ›</button>';
}

// Aufklapp-Pfeil; dreht sich über aria-expanded der Schaltfläche (siehe CSS)
const CHEVRON = '<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

// Detailansicht (nur lesen): Liste aus [Bezeichnung, HTML-Wert]; leere Werte entfallen
function detailListe(felder) {
  return '<dl class="details">' + felder.filter(f => f[1] !== "" && f[1] !== null && f[1] !== undefined)
    .map(f => '<dt>' + f[0] + '</dt><dd>' + f[1] + '</dd>').join("") + '</dl>';
}
