// Rad-km · Test für Offline-Start und neue Versionen (Service Worker)
//
// Spielt in einem echten Browser (Chromium über Playwright) durch, was auf dem
// iPhone passiert: erster Start, Start ohne Netz, Veröffentlichung einer neuen
// Version, Hinweis "Neue Version verfügbar", "Neu laden", Wetter mit und ohne
// Netz – und prüft dabei jedes Mal, dass die Daten im localStorage unverändert
// bleiben. Die Wetterdienste antworten mit den Aufzeichnungen aus tests/.
//
// Aufruf (benötigt Node.js und Playwright):  node tests/offline-update-test.js
//
// Der Test arbeitet mit einer Kopie der App in einem temporären Ordner und
// einem eigenen Webserver, der sich wie GitHub Pages verhält (Pfad /rad-km/,
// Cache-Control max-age=600, ETag). Daten sind erfunden.

"use strict";
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const REPO = path.join(__dirname, "..");
const ORDNER = fs.mkdtempSync(path.join(os.tmpdir(), "radkm-update-"));
for (const datei of ["index.html", "sw.js"]) fs.copyFileSync(path.join(REPO, datei), path.join(ORDNER, datei));
fs.cpSync(path.join(REPO, "tests"), path.join(ORDNER, "tests"), { recursive: true });

// Webserver wie GitHub Pages: /rad-km/… , max-age=600, ETag, 304
const TYPEN = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json" };
let server = null;
function serverStarten(port) {
  server = http.createServer((anf, ant) => {
    let p = decodeURIComponent(new URL(anf.url, "http://x").pathname);
    if (!p.startsWith("/rad-km/")) { ant.writeHead(404); ant.end(); return; }
    p = p.slice("/rad-km/".length) || "index.html";
    const datei = path.join(ORDNER, p);
    if (!datei.startsWith(ORDNER) || !fs.existsSync(datei)) { ant.writeHead(404); ant.end(); return; }
    const inhalt = fs.readFileSync(datei);
    const etag = '"' + crypto.createHash("sha1").update(inhalt).digest("hex") + '"';
    const kopf = { "Content-Type": TYPEN[path.extname(datei)] || "application/octet-stream", "Cache-Control": "max-age=600", "ETag": etag };
    if (anf.headers["if-none-match"] === etag) { ant.writeHead(304, kopf); ant.end(); return; }
    ant.writeHead(200, kopf);
    ant.end(inhalt);
  });
  return new Promise(ok => server.listen(port, "127.0.0.1", ok));
}
const serverStoppen = () => new Promise(ok => { server.closeAllConnections(); server.close(ok); });

let bestanden = 0, fehlgeschlagen = 0;
function pruefe(text, ok, detail) {
  console.log((ok ? "✓ " : "✗ ") + text + (ok || !detail ? "" : "\n    " + detail));
  if (ok) bestanden++; else fehlgeschlagen++;
}
const warten = ms => new Promise(r => setTimeout(r, ms));

// App-Version aus index.html (für den Test einer neuen Version wird sie verändert)
const VERSION = /const APP_VERSION = "([^"]+)";/.exec(fs.readFileSync(path.join(REPO, "index.html"), "utf8"))[1];

const BEISPIEL = JSON.stringify({
  version: 3,
  fahrrad: { name: "Test-Rad", startdatum: "2026-01-01", startKm: 100, rahmennummer: "", beschreibung: "" },
  einstellungen: { fahrtage: [1, 2, 5], jahresziele: [] },
  vorlagen: [{ id: "v1", name: "Arbeit", km: 14.2, arbeitsweg: true }],
  eintraege: [
    { id: "e1", datum: "2026-01-05", km: 14.2, vorlage: "Arbeit", notiz: "", typ: "tag", arbeitsweg: true },
    { id: "e2", datum: "2026-01-06", km: 0, vorlage: null, notiz: "Regen", typ: "tag", arbeitsweg: false }
  ],
  wartungsarten: [], wartungsprotokoll: [], termine: [], maengel: []
});

(async () => {
  const port = 8400 + Math.floor(Math.random() * 400);
  const url = "http://127.0.0.1:" + port + "/rad-km/";
  await serverStarten(port);
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const seitenFehler = [];
  page.on("pageerror", e => seitenFehler.push(e.message));
  const daten = () => page.evaluate(() => localStorage.getItem("radkm-daten"));
  const version = () => page.evaluate(() => APP_VERSION);
  const hinweis = () => page.evaluate(() => !!document.querySelector('[data-action="neu-laden"]'));
  const kmStand = () => page.evaluate(() => document.querySelector(".stand-zahl").textContent);
  const nachAntwort = () => warten(800); // Zeit für die Antwort des Service Workers

  try {
    // 1. Erster Start: Service Worker wird angemeldet und übernimmt die Seite
    await page.goto(url);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 10000 });
    pruefe("Erster Start: Service Worker angemeldet und aktiv", true);
    await page.evaluate(d => localStorage.setItem("radkm-daten", d), BEISPIEL);
    await page.reload();
    await nachAntwort();
    const d0 = await daten();
    pruefe("Mit Daten neu geladen: Kilometerstand 114,2 km, kein Hinweis auf neue Version",
      (await kmStand()) === "114,2 km" && !(await hinweis()), await kmStand());

    // 2. Ohne Netz: Server aus
    await serverStoppen();
    await page.reload();
    await nachAntwort();
    pruefe("Ohne Netz: App startet aus dem Zwischenspeicher, Daten unverändert",
      (await version()) === VERSION && (await kmStand()) === "114,2 km" && (await daten()) === d0 && !(await hinweis()));
    await serverStarten(port);

    // 3. Neue Version veröffentlichen
    const appDatei = path.join(ORDNER, "index.html");
    fs.writeFileSync(appDatei, fs.readFileSync(appDatei, "utf8").replace('const APP_VERSION = "' + VERSION + '";', 'const APP_VERSION = "' + VERSION + '-neu";'));
    await page.reload();
    await page.waitForSelector('[data-action="neu-laden"]', { timeout: 5000 }).catch(() => {});
    pruefe("Neue Version auf dem Server: die App läuft weiter in der bisherigen Version und zeigt „Neue Version verfügbar“",
      (await version()) === VERSION && (await hinweis()) && (await page.textContent("#inhalt")).includes("Neue Version verfügbar"));
    pruefe("… die Daten sind unverändert", (await daten()) === d0);
    await page.reload();
    await nachAntwort();
    pruefe("Erneutes Öffnen ohne „Neu laden“: weiter die bisherige Version, Hinweis wieder da", (await version()) === VERSION && (await hinweis()));

    // 4. "Neu laden"
    await Promise.all([page.waitForNavigation(), page.click('[data-action="neu-laden"]')]);
    await nachAntwort();
    pruefe("„Neu laden“: neue Version läuft, kein Hinweis mehr", (await version()) === VERSION + "-neu" && !(await hinweis()));
    pruefe("… Daten unverändert und angezeigt", (await daten()) === d0 && (await kmStand()) === "114,2 km");
    await page.reload();
    await nachAntwort();
    pruefe("Nächster Start: neue Version, kein Hinweis", (await version()) === VERSION + "-neu" && !(await hinweis()));
    await serverStoppen();
    await page.reload();
    await nachAntwort();
    pruefe("Ohne Netz: die neue Version startet aus dem Zwischenspeicher", (await version()) === VERSION + "-neu" && (await daten()) === d0);
    await serverStarten(port);

    // 5. Geänderter Service Worker: übernimmt, ohne App oder Daten anzutasten
    fs.appendFileSync(path.join(ORDNER, "sw.js"), "\n// geändert\n");
    await page.reload();
    const neuerSw = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update();
      for (let i = 0; i < 50 && (reg.installing || reg.waiting); i++) await new Promise(r => setTimeout(r, 100));
      const antwort = await fetch(reg.active.scriptURL, { cache: "no-store" });
      return (await antwort.text()).includes("// geändert") && !reg.waiting;
    });
    await page.reload();
    await nachAntwort();
    pruefe("Geänderter Service Worker wird aktiv; App-Version und Daten bleiben", neuerSw && (await version()) === VERSION + "-neu" && (await daten()) === d0 && !(await hinweis()));

    // 6. Die Testseite läuft unter dem aktiven Service Worker (index.html?test geht ans Netz)
    await page.goto(url + "tests/test.html");
    await page.waitForFunction(() => /^(OK|FEHLER)/.test(document.title), null, { timeout: 60000 });
    const titel = await page.title();
    pruefe("Testseite unter aktivem Service Worker: " + titel, titel.startsWith("OK"), await page.textContent("#ergebnis"));
    pruefe("… die Daten der App sind danach unverändert", (await daten()) === d0);

    // 7. Wetter: Abruf beim Start (die Wetterdienste antworten mit den aufgezeichneten
    //    Antworten aus tests/), danach ohne Netz: letzter Stand mit Zeitstempel, als
    //    nicht aktuell gekennzeichnet. Die Daten der App bleiben dabei unverändert.
    const aufnahme = n => JSON.parse(fs.readFileSync(path.join(REPO, "tests", n), "utf8"));
    const om = aufnahme("wetter-open-meteo.json");
    // Zeiten der Aufnahme um ganze Tage verschieben, sodass sie wie beim Abruf mit dem Vortag beginnen
    const heute0 = new Date();
    heute0.setHours(0, 0, 0, 0);
    const tage = Math.round((heute0.getTime() / 1000 - om[0].minutely_15.time[0]) / 86400) - 1;
    om.forEach(o => ["minutely_15", "hourly"].forEach(k => { o[k].time = o[k].time.map(t => t + tage * 86400); }));
    let wetterNetz = true;
    const wetterAbrufe = [];
    await context.route(/^https:\/\/(api\.open-meteo\.com|maps\.dwd\.de|api\.brightsky\.dev)\//, route => {
      const u = route.request().url();
      wetterAbrufe.push(u);
      if (!wetterNetz) return route.abort("internetdisconnected");
      const antwort = u.includes("open-meteo") ? om : u.includes("Warngebiete") ? aufnahme("wetter-dwd-gebiet.json") : aufnahme("wetter-dwd-leer.json");
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(antwort) });
    });
    const MIT_ORTEN = JSON.stringify(Object.assign(JSON.parse(BEISPIEL), { version: 4, einstellungen: { fahrtage: [1, 2, 3, 4, 5, 6, 7], jahresziele: [],
      wetter: { wohnort: { name: "Musterdorf", lat: 51, lon: 10 }, arbeitsort: { name: "Beispielstadt", lat: 51.1, lon: 10.2 } } } }));
    await page.goto(url);
    await page.evaluate(d => { localStorage.setItem("radkm-daten", d); localStorage.removeItem("radkm-wetter"); }, MIT_ORTEN);
    await page.reload();
    await page.waitForFunction(() => !!localStorage.getItem("radkm-wetter"), null, { timeout: 10000 }).catch(() => {});
    await nachAntwort();
    const d1 = await daten();
    const kachel = () => page.evaluate(() => { const k = document.querySelector(".wetter-kachel"); return k ? k.textContent : ""; });
    const gespeichert = await page.evaluate(() => JSON.parse(localStorage.getItem("radkm-wetter") || "null"));
    pruefe("Wetter beim Start geladen (Open-Meteo und DWD), Kachel auf der Übersicht mit Ampel",
      !!gespeichert && !!gespeichert.vorhersage && !!gespeichert.warnungen && gespeichert.warnungen.quelle === "dwd" && /grün|gelb|rot/.test(await kachel()),
      "Abrufe: " + wetterAbrufe.length + ", Kachel: " + (await kachel()));
    pruefe("… die Daten der App bleiben unverändert", d1 === MIT_ORTEN);
    // Letzter Abruf vor drei Stunden, jetzt ohne Netz
    await page.evaluate(() => {
      const c = JSON.parse(localStorage.getItem("radkm-wetter"));
      c.vorhersage.stand = c.warnungen.stand = Date.now() - 3 * 3600 * 1000;
      localStorage.setItem("radkm-wetter", JSON.stringify(c));
    });
    wetterNetz = false;
    await serverStoppen();
    await page.reload();
    await nachAntwort();
    await page.click('nav [data-tab="wetter"]');
    await nachAntwort();
    const wetterText = await page.textContent("#inhalt");
    const standUhr = await page.evaluate(() => uhrzeit(JSON.parse(localStorage.getItem("radkm-wetter")).vorhersage.stand) + " Uhr");
    pruefe("Ohne Netz: der Reiter Wetter zeigt den letzten Stand (" + standUhr + "), deutlich als nicht aktuell gekennzeichnet",
      wetterText.includes("Vorhersage nicht erreichbar") && wetterText.includes("Angezeigt wird der letzte Stand von") && wetterText.includes(standUhr) &&
      wetterText.includes("nicht aktuell") && wetterText.includes("Amtliche Warnungen nicht erreichbar"), wetterText.slice(0, 500));
    pruefe("… die Kachel auf der Übersicht ebenso", await page.evaluate(() => { aktiverTab = "uebersicht"; zeichnen(); return document.querySelector(".wetter-kachel").textContent.includes("Nicht aktuell"); }));
    pruefe("… die Daten der App bleiben unverändert", (await daten()) === d1);
    await serverStarten(port);
    pruefe("Keine Fehler in der Seite", seitenFehler.length === 0, seitenFehler.join("; "));
  } catch (e) {
    pruefe("Unerwarteter Fehler: " + e.message, false, e.stack);
  } finally {
    await browser.close();
    await serverStoppen().catch(() => {});
    fs.rmSync(ORDNER, { recursive: true, force: true });
  }
  console.log("\n" + (fehlgeschlagen ? fehlgeschlagen + " von " + (bestanden + fehlgeschlagen) + " Prüfungen fehlgeschlagen" : "Alle " + bestanden + " Prüfungen bestanden"));
  process.exit(fehlgeschlagen ? 1 : 0);
})();
