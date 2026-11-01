// Rad-km · Service Worker
//
// Hält die App bereit, damit sie auch ohne Netz startet, und erkennt neue
// Versionen. Er speichert nur die App selbst (die Dateien in DATEIEN). Die
// Daten im localStorage kann ein Service Worker nicht lesen oder ändern – sie
// bleiben bei Updates unberührt.
//
// Die App besteht aus mehreren Dateien. Gespeichert und ausgeliefert wird
// immer ein vollständiger Satz derselben Version; alte und neue Dateien werden
// nie gemischt.
//
// Ablauf:
// - Aufruf der App: index.html und alle übrigen Dateien sofort aus dem
//   Zwischenspeicher (auch offline).
// - Nach dem Start fragt die App nach Updates ("update-pruefen"). Der Service
//   Worker lädt alle Dateien vom Server. Ist eine davon anders als die
//   gespeicherte, legt er den ganzen neuen Satz beiseite und meldet
//   "neue-version". Fehlt dabei eine Datei, gilt das wie "offline".
// - "Neu laden" in der App ("aktivieren"): Der neue Satz ersetzt den
//   gespeicherten, dann lädt die App neu.
// Erkannt wird eine neue Version am Inhalt der Dateien; eine Versionsnummer
// muss hier nicht angepasst werden. Kommt eine Datei dazu oder fällt eine weg,
// muss DATEIEN angepasst werden (tests/test.html prüft das).

// Der Name bleibt seit Release 4: So startet eine installierte ältere Version
// weiter wie bisher und wird erst mit "Neu laden" ersetzt.
const CACHE = "radkm-app-1";
const DATEIEN = [
  "index.html",
  "css/app.css",
  "js/grundlagen.js",
  "js/daten.js",
  "js/berechnungen.js",
  "js/statistik.js",
  "js/wartung.js",
  "js/kalender.js",
  "js/wetter.js",
  "js/oberflaeche.js",
  "js/uebersicht.js",
  "js/wetter-ansicht.js",
  "js/wartung-ansicht.js",
  "js/einstellungen.js",
  "js/sicherung.js",
  "js/bedienung.js",
  "js/start.js"
];
const URLS = DATEIEN.map(d => new URL(d, self.registration.scope).href);
const APP = URLS[0];
// Platz für eine erkannte, noch nicht übernommene neue Version
const NEU = url => url + "?neue-version";

// Antwort zum Speichern: ohne die Angaben des Servers zur Zwischenspeicherung
// (GitHub Pages: max-age=600). Sonst nähme der Browser eine Datei bis zu 10
// Minuten lang aus seinem eigenen Speicher, ohne hier zu fragen – nach „Neu
// laden“ liefe dann noch die alte Fassung.
async function speicherbar(antwort) {
  const kopf = new Headers(antwort.headers);
  ["Cache-Control", "Expires", "ETag", "Last-Modified", "Age"].forEach(k => kopf.delete(k));
  kopf.set("Cache-Control", "no-cache");
  return new Response(await antwort.blob(), { status: antwort.status, statusText: antwort.statusText, headers: kopf });
}
// Alle Dateien vom Server; null, wenn eine fehlt oder kein Netz da ist
async function satzLaden() {
  try {
    const antworten = await Promise.all(URLS.map(u => fetch(u, { cache: "no-cache" })));
    return antworten.every(a => a.ok) ? await Promise.all(antworten.map(speicherbar)) : null;
  } catch (e) {
    return null;
  }
}
// Speichert einen Satz; index.html zuletzt (sie zeigt an, dass der Satz vollständig ist)
async function satzSpeichern(cache, antworten, ziel = url => url) {
  for (let i = URLS.length - 1; i >= 0; i--) await cache.put(ziel(URLS[i]), antworten[i]);
}
async function satzVollstaendig(cache, ziel = url => url) {
  for (const u of URLS) if (!(await cache.match(ziel(u)))) return false;
  return true;
}
async function neuenSatzEntfernen(cache) {
  for (const u of URLS) await cache.delete(NEU(u));
}

self.addEventListener("install", ev => {
  ev.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const gespeichert = await cache.match(APP);
    // Eine schon gespeicherte App bleibt; neue Versionen nur über "Neu laden".
    // Ausnahme: Die gespeicherte index.html braucht weitere Dateien, die fehlen
    // (z. B. wenn noch der Service Worker bis Release 5a.1 "Neu laden" ausgeführt
    // hat). Dann gilt der vollständige Satz vom Server; die App lief in diesem
    // Fall ohnehin schon mit dessen Dateien.
    const unvollstaendig = gespeichert && (await gespeichert.text()).includes('src="js/') && !(await satzVollstaendig(cache));
    if (!gespeichert || unvollstaendig) {
      const satz = await satzLaden();
      if (satz) await satzSpeichern(cache, satz);
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

// Antwort aus dem Zwischenspeicher; fehlt die Datei dort, vom Server (und merken)
async function ausSpeicher(url) {
  const cache = await caches.open(CACHE);
  const gespeichert = await cache.match(url);
  if (gespeichert) return gespeichert;
  const antwort = await fetch(url, { cache: "no-cache" });
  if (!antwort.ok) return antwort;
  const neu = await speicherbar(antwort);
  await cache.put(url, neu.clone());
  return neu;
}

// Nur die App selbst kommt aus dem Zwischenspeicher: der Aufruf der App und
// die Dateien, die sie lädt. Alles andere geht direkt ans Netz, ebenso Seiten
// mit Parameter (z. B. die Testseite mit "index.html?test") samt ihren Dateien.
self.addEventListener("fetch", ev => {
  const anfrage = ev.request;
  if (anfrage.method !== "GET") return;
  const url = new URL(anfrage.url);
  if (url.search !== "") return;
  if (anfrage.mode === "navigate") {
    if (url.href === self.registration.scope || url.href === APP) ev.respondWith(ausSpeicher(APP));
    return;
  }
  if (!URLS.includes(url.href) || url.href === APP) return;
  // Dateien einer Seite mit Parameter (z. B. der Testseite) kommen vom Server
  if (anfrage.referrer && new URL(anfrage.referrer).search !== "") return;
  ev.respondWith(ausSpeicher(url.href));
});

// Vergleicht alle Dateien auf dem Server mit der gespeicherten Fassung
async function updatePruefen() {
  const cache = await caches.open(CACHE);
  const netz = await satzLaden();
  if (netz) {
    if (!(await cache.match(APP))) { await satzSpeichern(cache, netz); return { typ: "aktuell" }; }
    let gleich = true;
    for (let i = 0; i < URLS.length && gleich; i++) {
      const gespeichert = await cache.match(URLS[i]);
      gleich = !!gespeichert && await netz[i].clone().text() === await gespeichert.text();
    }
    if (gleich) { await neuenSatzEntfernen(cache); return { typ: "aktuell" }; }
    await satzSpeichern(cache, netz, NEU);
    return { typ: "neue-version" };
  }
  return { typ: (await satzVollstaendig(cache, NEU)) ? "neue-version" : "offline" };
}

// Übernimmt den beiseitegelegten neuen Satz (nur vollständig)
async function aktivieren() {
  const cache = await caches.open(CACHE);
  if (!(await satzVollstaendig(cache, NEU))) return;
  const neu = [];
  for (const u of URLS) neu.push(await cache.match(NEU(u)));
  await satzSpeichern(cache, neu);
  await neuenSatzEntfernen(cache);
}

self.addEventListener("message", ev => {
  const typ = ev.data && ev.data.typ;
  const antworten = nachricht => { if (ev.source) ev.source.postMessage(nachricht); };
  if (typ === "update-pruefen") ev.waitUntil(updatePruefen().then(antworten, () => {}));
  if (typ === "aktivieren") ev.waitUntil(aktivieren().then(() => antworten({ typ: "aktiviert" }), () => antworten({ typ: "aktiviert" })));
});
