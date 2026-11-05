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
// Nummer der Stufe bzw. des Regenzusatzes auf deren Unterseite (null = neu)
let einstellungenWert = null;

const TITEL = { uebersicht: "Übersicht", wetter: "Wetter", wartung: "Wartung", fahrten: "Fahrten", einstellungen: "Einstellungen" };

function zeichnen() {
  const unterseite = aktiverTab === "einstellungen" && einstellungenSeite ? EINSTELLUNGEN_SEITEN[einstellungenSeite] : null;
  document.getElementById("seitentitel").textContent = unterseite ? (typeof unterseite.titel === "function" ? unterseite.titel(einstellungenWert) : unterseite.titel) : TITEL[aktiverTab];
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

// Unterseite der Einstellungen zeigen (statt eines Fensters), oben beginnen
function unterseiteZeigen(seite, wert = null) {
  fensterSchliessen();
  aktiverTab = "einstellungen";
  einstellungenSeite = seite;
  einstellungenWert = wert;
  zeichnen();
  nachOben();
}
// Ist eine Unterseite mit Formular offen? Dann nicht von selbst neu zeichnen
// (z. B. beim Zurückkehren in die App), damit Eingaben nicht verloren gehen.
function formularSeiteOffen() {
  return aktiverTab === "einstellungen" && !!einstellungenSeite && !!(EINSTELLUNGEN_SEITEN[einstellungenSeite] || {}).formular;
}

// Inhalt (der einzige Scrollbereich) nach oben; "sanft" beim Tipp auf den aktiven Reiter
function nachOben(sanft = false) {
  const inhalt = document.getElementById("inhalt");
  if (sanft && typeof inhalt.scrollTo === "function") inhalt.scrollTo({ top: 0, behavior: "smooth" });
  else inhalt.scrollTop = 0;
}

/* ---------- Reiterleiste verankern (B3) ----------
   Die Seite selbst scrollt nie (nur der Inhalt). Hat iOS sie trotzdem
   verschoben (z. B. bleibt nach dem Schließen der Tastatur
   visualViewport.offsetTop stehen), setzt die App sie zurück – aber nur bei
   geschlossener Tastatur: Bei offener Tastatur schiebt iOS die Seite selbst,
   damit das Feld sichtbar bleibt. */
function sichtbereich() {
  const vv = window.visualViewport;
  return { scrollX: window.scrollX, scrollY: window.scrollY, innerHeight: window.innerHeight,
    vvHeight: vv ? vv.height : window.innerHeight, vvOffsetTop: vv ? vv.offsetTop : 0, scale: vv ? vv.scale : 1 };
}
// Ein fokussiertes Feld, das eine Tastatur öffnet (nicht Haken, Knöpfe, Datum/Uhrzeit-Auswahl zählen mit)
function eingabeFokussiert() {
  const el = document.activeElement;
  if (!el || el === document.body) return false;
  if (el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable) return true;
  return el.tagName === "INPUT" && !["checkbox", "radio", "button", "submit", "reset", "file", "range", "color"].includes(el.type);
}
// Tastatur geschlossen: kein fokussiertes Eingabefeld und der sichtbare Bereich so hoch wie das Fenster
function tastaturZu(b = sichtbereich()) {
  return !eingabeFokussiert() && Math.abs(b.innerHeight - b.vvHeight) < 40;
}
// Zurücksetzen, wenn die Seite verschoben ist; liefert true, wenn zurückgesetzt wurde
function ansichtVerankern() {
  const b = sichtbereich();
  if (!tastaturZu(b) || Math.abs(b.scale - 1) > 0.01) return false; // nicht bei offener Tastatur oder beim Zoomen
  if (b.scrollX === 0 && b.scrollY === 0 && Math.abs(b.vvOffsetTop) < 1) return false;
  window.scrollTo(0, 0);
  return true;
}
// Wann geprüft wird: nach dem Verlassen eines Felds (wenn die Tastatur zu ist),
// bei Änderungen des sichtbaren Bereichs, beim Zurückkehren in die App
function ansichtVerankernStarten() {
  const spaeter = () => { ansichtVerankern(); setTimeout(ansichtVerankern, 350); };
  document.addEventListener("focusout", () => setTimeout(spaeter, 50));
  window.addEventListener("pageshow", spaeter);
  window.addEventListener("scroll", () => ansichtVerankern(), { passive: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) spaeter(); });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => ansichtVerankern());
    window.visualViewport.addEventListener("scroll", () => ansichtVerankern());
  }
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
