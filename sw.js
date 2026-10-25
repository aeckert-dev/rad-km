// Rad-km · Service Worker
//
// Hält die App (index.html) bereit, damit sie auch ohne Netz startet, und
// erkennt neue Versionen. Er speichert nur die App selbst. Die Daten im
// localStorage kann ein Service Worker nicht lesen oder ändern – sie bleiben
// bei Updates unberührt.
//
// Ablauf:
// - Aufruf der App: Antwort sofort aus dem Zwischenspeicher (auch offline).
// - Nach dem Start fragt die App nach Updates ("update-pruefen"). Der Service
//   Worker lädt index.html vom Server. Ist sie anders als die gespeicherte,
//   legt er sie als neue Version beiseite und meldet "neue-version".
// - "Neu laden" in der App ("aktivieren"): Die neue Version ersetzt die
//   gespeicherte, dann lädt die App neu.
// Erkannt wird eine neue Version am Inhalt von index.html; eine
// Versionsnummer muss hier nicht angepasst werden.

const CACHE = "radkm-app-1";
const APP = new URL("index.html", self.registration.scope).href;
// Platz für eine erkannte, noch nicht übernommene neue Version
const NEU = APP + "?neue-version";

self.addEventListener("install", ev => {
  ev.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Eine schon gespeicherte App bleibt; neue Versionen nur über "Neu laden"
    if (!(await cache.match(APP))) {
      const antwort = await fetch(APP, { cache: "no-cache" });
      if (antwort.ok) await cache.put(APP, antwort);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", ev => {
  ev.waitUntil((async () => {
    // Zwischenspeicher früherer Fassungen dieses Service Workers entfernen
    for (const name of await caches.keys()) {
      if (name.startsWith("radkm-app-") && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

// Nur der Aufruf der App selbst kommt aus dem Zwischenspeicher. Alles andere
// (z. B. die Testseite oder "index.html?test") geht direkt ans Netz.
function istApp(anfrage) {
  if (anfrage.mode !== "navigate") return false;
  const url = new URL(anfrage.url);
  return url.search === "" && (url.href === self.registration.scope || url.href === APP);
}

self.addEventListener("fetch", ev => {
  if (!istApp(ev.request)) return;
  ev.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const gespeichert = await cache.match(APP);
    if (gespeichert) return gespeichert;
    const antwort = await fetch(APP, { cache: "no-cache" });
    if (antwort.ok) await cache.put(APP, antwort.clone());
    return antwort;
  })());
});

// Vergleicht index.html auf dem Server mit der gespeicherten Fassung
async function updatePruefen() {
  const cache = await caches.open(CACHE);
  let netz = null;
  try { netz = await fetch(APP, { cache: "no-cache" }); } catch (e) { /* offline */ }
  if (netz && netz.ok) {
    const gespeichert = await cache.match(APP);
    if (!gespeichert) { await cache.put(APP, netz); return { typ: "aktuell" }; }
    if (await netz.clone().text() === await gespeichert.text()) { await cache.delete(NEU); return { typ: "aktuell" }; }
    await cache.put(NEU, netz);
    return { typ: "neue-version" };
  }
  return { typ: (await cache.match(NEU)) ? "neue-version" : "offline" };
}

// Übernimmt die beiseitegelegte neue Version
async function aktivieren() {
  const cache = await caches.open(CACHE);
  const neu = await cache.match(NEU);
  if (neu) {
    await cache.put(APP, neu);
    await cache.delete(NEU);
  }
}

self.addEventListener("message", ev => {
  const typ = ev.data && ev.data.typ;
  const antworten = nachricht => { if (ev.source) ev.source.postMessage(nachricht); };
  if (typ === "update-pruefen") ev.waitUntil(updatePruefen().then(antworten, () => {}));
  if (typ === "aktivieren") ev.waitUntil(aktivieren().then(() => antworten({ typ: "aktiviert" }), () => antworten({ typ: "aktiviert" })));
});
