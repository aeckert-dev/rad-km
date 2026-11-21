// Rad-km · Test für Offline-Start und neue Versionen (Service Worker)
//
// Spielt in einem echten Browser (Chromium über Playwright) durch, was auf dem
// iPhone passiert: erster Start, Start ohne Netz, Veröffentlichung einer neuen
// Version, Hinweis "Neue Version verfügbar", "Neu laden", Wetter mit und ohne
// Netz, den nächsten Fahrtag ohne Standortabfrage (seit 5e, mit und ohne Netz),
// die verschobene Abfahrt nach "Neu laden", den Übergang von Release 5a.1 (eine
// Datei) auf die aufgeteilte App – und prüft
// dabei jedes Mal, dass die Daten im localStorage unverändert bleiben.
// Die App besteht aus index.html, css/ und js/; der Service Worker hält immer
// einen vollständigen Satz derselben Version bereit.
// Die Wetterdienste antworten mit den Aufzeichnungen aus tests/.
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
const { execFileSync } = require("child_process");

const REPO = path.join(__dirname, "..");
const ORDNER = fs.mkdtempSync(path.join(os.tmpdir(), "radkm-update-"));
// Aktuelle Fassung der App in den Ordner des Webservers kopieren
function appKopieren() {
  for (const datei of ["index.html", "sw.js"]) fs.copyFileSync(path.join(REPO, datei), path.join(ORDNER, datei));
  for (const ordner of ["css", "js"]) fs.cpSync(path.join(REPO, ordner), path.join(ORDNER, ordner), { recursive: true });
}
appKopieren();
fs.cpSync(path.join(REPO, "tests"), path.join(ORDNER, "tests"), { recursive: true });
// Alle Dateien der App laut sw.js
const DATEIEN = JSON.parse(/const DATEIEN = (\[[^\]]*\]);/.exec(fs.readFileSync(path.join(REPO, "sw.js"), "utf8"))[1]);
// Release 5a.1 (letzte Fassung als eine Datei) für den Test des Übergangs
const ALT_COMMIT = "52cd779";

// Webserver wie GitHub Pages: /rad-km/… , max-age=600, ETag, 304
const TYPEN = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json" };
let server = null;
// Abrufe der App-Dateien beim Server (ohne Service Worker und Tests)
const abrufe = [];
function serverStarten(port) {
  server = http.createServer((anf, ant) => {
    let p = decodeURIComponent(new URL(anf.url, "http://x").pathname);
    if (!p.startsWith("/rad-km/")) { ant.writeHead(404); ant.end(); return; }
    p = p.slice("/rad-km/".length) || "index.html";
    if (DATEIEN.includes(p)) abrufe.push(p);
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

// App-Version aus js/grundlagen.js (für den Test einer neuen Version wird sie verändert)
const GRUNDLAGEN = path.join("js", "grundlagen.js");
const VERSION = /const APP_VERSION = "([^"]+)";/.exec(fs.readFileSync(path.join(REPO, GRUNDLAGEN), "utf8"))[1];
// Datei im Ordner des Webservers ändern
const aendern = (datei, fn) => fs.writeFileSync(path.join(ORDNER, datei), fn(fs.readFileSync(path.join(ORDNER, datei), "utf8")));

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
  // Markierung, die der Test für eine neue Version ins CSS schreibt
  const cssMarke = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--testmarke").trim());
  // Alle Dateien geladen und angewandt: Farben aus dem CSS, Funktionen aus jeder JS-Datei
  const alleDateien = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor !== "rgba(0, 0, 0, 0)" &&
    ["heute", "datenEinlesen", "kmStandAm", "jahresKennzahlen", "werkstattLage", "wetterAnsicht", "meldung", "bildUebersicht", "bildWetter",
      "bildWartung", "bildEinstellungen", "exportInhalt", "neuLaden"].every(f => typeof window[f] === "function"));
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
    pruefe("… alle " + DATEIEN.length + " Dateien (index.html, CSS, JS) kommen aus dem Zwischenspeicher", await alleDateien());
    await serverStarten(port);
    abrufe.length = 0;
    await page.reload();
    await nachAntwort();
    pruefe("Mit Netz: die App selbst kommt aus dem Zwischenspeicher, nur die Prüfung auf Updates fragt den Server (jede Datei einmal)",
      DATEIEN.every(d => abrufe.filter(a => a === d).length === 1) && abrufe.length === DATEIEN.length, abrufe.join(", "));

    // 3. Neue Version veröffentlichen (nur eine JS-Datei geändert)
    aendern(GRUNDLAGEN, t => t.replace('const APP_VERSION = "' + VERSION + '";', 'const APP_VERSION = "' + VERSION + '-neu";'));
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
    pruefe("Ohne Netz: die neue Version startet aus dem Zwischenspeicher", (await version()) === VERSION + "-neu" && (await daten()) === d0 && (await alleDateien()));
    await serverStarten(port);

    // 4b. Nur das CSS geändert: ebenfalls eine neue Version; bis „Neu laden“ gilt der
    //     bisherige Satz vollständig, danach der neue (alle Dateien gemeinsam)
    aendern(path.join("css", "app.css"), t => t + "\n:root { --testmarke: neu; }\n");
    aendern(GRUNDLAGEN, t => t.replace('const APP_VERSION = "' + VERSION + '-neu";', 'const APP_VERSION = "' + VERSION + '-neu2";'));
    aendern(GRUNDLAGEN, t => t.replace('const APP_VERSION = "' + VERSION + '-neu2";', 'const APP_VERSION = "' + VERSION + '-neu";'));
    await page.reload();
    await page.waitForSelector('[data-action="neu-laden"]', { timeout: 5000 }).catch(() => {});
    pruefe("Nur das CSS geändert: „Neue Version verfügbar“, bis dahin weiter das bisherige CSS", (await hinweis()) && (await cssMarke()) === "");
    await Promise.all([page.waitForNavigation(), page.click('[data-action="neu-laden"]')]);
    await nachAntwort();
    pruefe("… nach „Neu laden“ gilt das neue CSS, kein Hinweis, Daten unverändert", (await cssMarke()) === "neu" && !(await hinweis()) && (await daten()) === d0);

    // 4c. Neue Version in CSS und JS gleichzeitig: vor „Neu laden“ nichts davon, danach beides
    aendern(path.join("css", "app.css"), t => t.replace("--testmarke: neu;", "--testmarke: neu3;"));
    aendern(GRUNDLAGEN, t => t.replace('const APP_VERSION = "' + VERSION + '-neu";', 'const APP_VERSION = "' + VERSION + '-neu3";'));
    await page.reload();
    await page.waitForSelector('[data-action="neu-laden"]', { timeout: 5000 }).catch(() => {});
    await page.reload();
    await nachAntwort();
    pruefe("CSS und JS geändert: vor „Neu laden“ läuft der bisherige Satz vollständig (Version und CSS)",
      (await hinweis()) && (await version()) === VERSION + "-neu" && (await cssMarke()) === "neu");
    await Promise.all([page.waitForNavigation(), page.click('[data-action="neu-laden"]')]);
    await nachAntwort();
    pruefe("… danach der neue Satz vollständig", (await version()) === VERSION + "-neu3" && (await cssMarke()) === "neu3" && (await daten()) === d0);
    await serverStoppen();
    await page.reload();
    await nachAntwort();
    pruefe("… auch ohne Netz", (await version()) === VERSION + "-neu3" && (await cssMarke()) === "neu3" && (await alleDateien()));
    await serverStarten(port);

    // 4d. Fehlt auf dem Server eine Datei, gilt das wie „offline“: kein halber Satz
    aendern(GRUNDLAGEN, t => t.replace('const APP_VERSION = "' + VERSION + '-neu3";', 'const APP_VERSION = "' + VERSION + '-neu4";'));
    const weg = path.join(ORDNER, "js", "start.js"), wegInhalt = fs.readFileSync(weg);
    fs.rmSync(weg);
    await page.reload();
    await nachAntwort();
    pruefe("Eine Datei fehlt auf dem Server: kein Hinweis, die App läuft unverändert weiter",
      !(await hinweis()) && (await version()) === VERSION + "-neu3" && (await alleDateien()));
    fs.writeFileSync(weg, wegInhalt);
    aendern(GRUNDLAGEN, t => t.replace('const APP_VERSION = "' + VERSION + '-neu4";', 'const APP_VERSION = "' + VERSION + '-neu";'));
    await page.reload();
    await page.waitForSelector('[data-action="neu-laden"]', { timeout: 5000 }).catch(() => {});
    await Promise.all([page.waitForNavigation(), page.click('[data-action="neu-laden"]')]);
    await nachAntwort();

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
    pruefe("Testseite unter aktivem Service Worker: " + titel, titel.startsWith("OK"), await page.textContent("#ergebnis") +
      (await page.$$eval("#protokoll .fehler", els => els.map(el => "\n    " + el.textContent + (el.nextElementSibling && el.nextElementSibling.tagName === "PRE" ? "\n      " + el.nextElementSibling.textContent.replace(/\n/g, "\n      ") : "")).join(""))));
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
      // Ein Ort (z. B. nur der Wohnort): die Antwort ist ein Objekt statt einer Liste
      const antwort = u.includes("open-meteo") ? (/latitude=[^&,]+&/.test(u) ? om[0] : om) : u.includes("Warngebiete") ? aufnahme("wetter-dwd-gebiet.json") : aufnahme("wetter-dwd-leer.json");
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

    // 8. Seit 5e: Übersicht und Reiter Wetter zeigen den nächsten Fahrtag; der
    //    Standort des iPhones wird für das Wetter nie abgefragt, auch nicht mit
    //    einer Datei aus 5d mit „Wetter außerhalb der Fahrten: aktueller Standort“
    //    und ohne Fahrtag heute. Ohne Netz aus dem Zwischenspeicher. Die
    //    verschobene Abfahrt („Heute später los“) übersteht „Neu laden“. Die
    //    Daten der App bleiben unverändert.
    wetterNetz = true;
    wetterAbrufe.length = 0;
    await context.grantPermissions(["geolocation"], { origin: "http://127.0.0.1:" + port });
    await context.setGeolocation({ latitude: 52.012345, longitude: 8.765432 });
    // Jede Standortabfrage zählen (die Erlaubnis ist erteilt: eine Abfrage würde gelingen)
    await context.addInitScript(() => {
      window.__standortAbfragen = 0;
      const g = navigator.geolocation;
      if (g) ["getCurrentPosition", "watchPosition"].forEach(n => { const f = g[n].bind(g); g[n] = (...a) => { window.__standortAbfragen++; return f(...a); }; });
    });
    const morgenFahrtag = (new Date().getDay() + 1) % 7 || 7;
    const MIT_STANDORT = JSON.stringify(Object.assign(JSON.parse(BEISPIEL), { version: 11, einstellungen: { fahrtage: [morgenFahrtag], jahresziele: [],
      wetter: { wohnort: { name: "Musterdorf", lat: 51, lon: 10 }, arbeitsort: { name: "Beispielstadt", lat: 51.1, lon: 10.2 }, ortAusserhalb: "standort" } } }));
    await page.evaluate(d => { localStorage.setItem("radkm-daten", d); localStorage.removeItem("radkm-wetter"); }, MIT_STANDORT);
    await page.reload();
    await page.waitForFunction(() => /Hin|Rück/.test((document.querySelector(".wetter-kachel") || {}).textContent || ""), null, { timeout: 15000 }).catch(() => {});
    await nachAntwort();
    const kachelS = await kachel();
    pruefe("Datei aus 5d mit „aktueller Standort“, heute kein Fahrtag: Kachel mit dem nächsten Fahrtag (morgen) und Ampeln, kein „Jetzt“",
      /^🌦️ Morgen, /.test(kachelS) && /Hin (grün|gelb|rot)/.test(kachelS) && !/Jetzt|Standort/.test(kachelS), kachelS);
    await page.click('nav [data-tab="wetter"]');
    await nachAntwort();
    const wetterS = await page.textContent("#inhalt");
    pruefe("… im Reiter Wetter ebenso (Hin- und Rückfahrt des nächsten Fahrtags)", wetterS.includes("Morgen, ") && wetterS.includes("Hinfahrt") && !/Jetzt|aktueller Standort/i.test(wetterS),
      wetterS.slice(0, 300));
    const omAbrufe = wetterAbrufe.filter(u => u.includes("open-meteo"));
    pruefe("Keine Standortabfrage für das Wetter (weder beim Start noch im Reiter Wetter); an Open-Meteo nur Wohn- und Arbeitsort",
      (await page.evaluate(() => window.__standortAbfragen)) === 0 && omAbrufe.length > 0 && omAbrufe.every(u => u.includes("latitude=51.000,51.100&")),
      "Abfragen: " + (await page.evaluate(() => window.__standortAbfragen)) + ", " + omAbrufe.join(" "));
    pruefe("… die Daten der App bleiben unverändert", (await daten()) === MIT_STANDORT);
    // Verschobene Abfahrt von heute (nur auf dem Gerät) übersteht „Neu laden“, auch ohne Netz
    const ABWEICHUNG = await page.evaluate(() => {
      const a = { datum: heute(), hinfahrt: null, rueckfahrt: "18:00" };
      localStorage.setItem("radkm-heute-abfahrt", JSON.stringify(a));
      // Letzter Abruf vor drei Stunden
      const c = JSON.parse(localStorage.getItem("radkm-wetter"));
      c.vorhersage.stand = c.warnungen.stand = Date.now() - 3 * 3600 * 1000;
      localStorage.setItem("radkm-wetter", JSON.stringify(c));
      return JSON.stringify(a);
    });
    wetterNetz = false;
    await serverStoppen();
    await page.reload();
    await page.waitForFunction(() => /Hin|Rück/.test((document.querySelector(".wetter-kachel") || {}).textContent || ""), null, { timeout: 15000 }).catch(() => {});
    await nachAntwort();
    const kachelO = await kachel();
    pruefe("Ohne Netz: der nächste Fahrtag aus dem Zwischenspeicher, mit Ampel und Hinweis auf den Stand",
      /^🌦️ Morgen, /.test(kachelO) && /(grün|gelb|rot)/.test(kachelO) && kachelO.includes("Nicht aktuell"), kachelO);
    pruefe("… die verschobene Abfahrt bleibt nach „Neu laden“ erhalten und gilt (nur auf dem Gerät, nicht in den Daten)",
      (await page.evaluate(() => localStorage.getItem("radkm-heute-abfahrt"))) === ABWEICHUNG &&
      (await page.evaluate(() => abweichungFuer(Date.now()).rueckfahrt)) === "18:00" && !(await daten()).includes("18:00"));
    pruefe("… keine Standortabfrage, die Daten der App bleiben unverändert", (await page.evaluate(() => window.__standortAbfragen)) === 0 && (await daten()) === MIT_STANDORT);
    // Eine Abweichung von gestern wird beim Start gelöscht
    await page.evaluate(() => localStorage.setItem("radkm-heute-abfahrt", JSON.stringify({ datum: plusTage(heute(), -1), hinfahrt: "07:00", rueckfahrt: null })));
    await page.reload();
    await nachAntwort();
    pruefe("Verschiebung von gestern: beim Start gelöscht", (await page.evaluate(() => localStorage.getItem("radkm-heute-abfahrt"))) === null);
    await serverStarten(port);
    pruefe("Keine Fehler in der Seite", seitenFehler.length === 0, seitenFehler.join("; "));

    // 9. Übergang von Release 5a.1 (App in einer Datei, Service Worker nur für
    //    index.html) auf die aufgeteilte App
    let alt = null;
    try {
      alt = ["index.html", "sw.js"].map(d => execFileSync("git", ["-C", REPO, "show", ALT_COMMIT + ":" + d], { stdio: ["ignore", "pipe", "ignore"] }));
    } catch (e) { /* kein Git */ }
    if (!alt) {
      console.log("– Übergang von 5a.1 übersprungen: Git oder Commit " + ALT_COMMIT + " nicht verfügbar");
    } else {
      const altSetzen = () => { fs.writeFileSync(path.join(ORDNER, "index.html"), alt[0]); fs.writeFileSync(path.join(ORDNER, "sw.js"), alt[1]); };
      // a) Neue App und neuer Service Worker werden gemeinsam veröffentlicht
      for (const [titel, schritte] of [
        ["gemeinsam veröffentlicht", ["alles"]],
        ["erst die App, dann der Service Worker", ["app", "sw"]]
      ]) {
        const ctx = await browser.newContext();
        const p = await ctx.newPage();
        const fehler = [];
        p.on("pageerror", e => fehler.push(e.message));
        const pd = () => p.evaluate(() => localStorage.getItem("radkm-daten"));
        // Version: 5a.1 (eine Datei) oder die aufgeteilte App (bindet js/start.js ein)
        const pv = () => p.evaluate(() => document.querySelector('script[src="js/start.js"]') ? APP_VERSION : "5a.1 (eine Datei)");
        const ph = () => p.evaluate(() => !!document.querySelector('[data-action="neu-laden"]'));
        appKopieren();
        altSetzen();
        await p.goto(url);
        await p.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 10000 });
        await p.evaluate(d => localStorage.setItem("radkm-daten", d), BEISPIEL);
        await p.reload();
        await warten(800);
        const dAlt = await pd();
        const alteVersion = await pv();
        let ok = alteVersion === "5a.1 (eine Datei)" && !(await ph());
        for (const schritt of schritte) {
          if (schritt === "alles") appKopieren();
          if (schritt === "app") { appKopieren(); fs.writeFileSync(path.join(ORDNER, "sw.js"), alt[1]); }
          if (schritt === "sw") fs.copyFileSync(path.join(REPO, "sw.js"), path.join(ORDNER, "sw.js"));
          await p.reload();
          await p.waitForSelector('[data-action="neu-laden"]', { timeout: 8000 }).catch(() => {});
          await p.reload();
          await p.waitForSelector('[data-action="neu-laden"]', { timeout: 8000 }).catch(() => {});
          if (schritt !== "sw") {
            ok = ok && (await pv()) === "5a.1 (eine Datei)" && (await ph()) && (await pd()) === dAlt;
            await Promise.all([p.waitForNavigation(), p.click('[data-action="neu-laden"]')]);
            await warten(800);
          }
        }
        // Hier übernimmt meist gerade der neue Service Worker; das Neuladen darf
        // dabei nicht hängen (die App fragt erst den neuen nach Updates)
        await p.reload();
        await warten(1500);
        await p.reload();
        await warten(800);
        const neuOk = (await pv()) === VERSION && !(await ph()) && (await pd()) === dAlt;
        await serverStoppen();
        await p.reload();
        await warten(800);
        const offlineOk = (await pv()) === VERSION && (await pd()) === dAlt &&
          (await p.evaluate(() => document.querySelector(".stand-zahl").textContent)) === "114,2 km";
        await serverStarten(port);
        pruefe("Übergang 5a.1 → " + VERSION + " (" + titel + "): erst „Neue Version verfügbar“ in 5a.1, nach „Neu laden“ die neue Version, " +
          "danach auch ohne Netz mit allen Dateien; Daten unverändert", ok && neuOk && offlineOk && fehler.length === 0,
          JSON.stringify({ alteVersion, ok, neuOk, offlineOk, fehler }));
        await ctx.close();
      }
      appKopieren();
    }
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
