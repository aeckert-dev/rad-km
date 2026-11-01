// Rad-km · Offline und neue Versionen (Service Worker) und Start der App; wird als letzte Datei geladen
"use strict";

/* =====================================================================
   10. OFFLINE UND NEUE VERSIONEN
   Der Service Worker (sw.js) hält die App für den Start ohne Netz bereit und
   meldet neue Versionen. Er speichert nur die App, nie die Daten.
   ===================================================================== */

let neueVersion = false;
let letzteUpdatePruefung = 0;
const UPDATE_PRUEFEN_MS = 10 * 60 * 1000;
const swVerfuegbar = () => !TESTMODUS && "serviceWorker" in navigator;

function serviceWorkerStarten() {
  if (!swVerfuegbar()) return;
  navigator.serviceWorker.addEventListener("message", ev => swNachricht(ev.data));
  navigator.serviceWorker.register("sw.js").then(() => updatePruefen(), () => {});
}
// Fragt den Service Worker nach einer neuen Version (beim Start und beim
// Zurückkehren in die App, höchstens alle 10 Minuten)
function updatePruefen() {
  if (!swVerfuegbar() || Date.now() - letzteUpdatePruefung < UPDATE_PRUEFEN_MS) return;
  letzteUpdatePruefung = Date.now();
  navigator.serviceWorker.ready.then(reg => {
    // Wird gerade ein neuer Service Worker eingerichtet, erst ihn fragen, wenn er
    // aktiv ist (sonst müsste der bisherige dafür neu starten und hielte dessen
    // Übernahme auf)
    const neu = reg.installing || reg.waiting;
    if (neu) {
      neu.addEventListener("statechange", () => {
        if (neu.state === "activated") neu.postMessage({ typ: "update-pruefen" });
      });
      return;
    }
    if (reg.active) reg.active.postMessage({ typ: "update-pruefen" });
  });
}
function swNachricht(nachricht) {
  const typ = nachricht && nachricht.typ;
  if (typ === "neue-version" && !neueVersion) { neueVersion = true; zeichnen(); }
  if (typ === "aktiviert") location.reload();
}
// "Neu laden": neue Version übernehmen, dann neu laden. Alle Daten sind
// schon gespeichert, der localStorage bleibt unverändert.
function neuLaden() {
  if (!swVerfuegbar()) { location.reload(); return; }
  navigator.serviceWorker.ready.then(reg => {
    if (reg.active) reg.active.postMessage({ typ: "aktivieren" });
    setTimeout(() => location.reload(), 3000); // falls keine Antwort kommt
  });
}

/* =====================================================================
   11. START
   ===================================================================== */
laden();
wetterSpeicherLaden();
zeichnen();
serviceWorkerStarten();
wetterBeiBedarf();
