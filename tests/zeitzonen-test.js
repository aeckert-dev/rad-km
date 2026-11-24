// Rad-km · tests/test.html in mehreren Zeitzonen und Farbschemata (ab 5g, T2)
//
// Startet einen eigenen Webserver auf dem Repository und öffnet die Testseite
// headless in Chromium (Playwright) – je Zeitzone einmal hell und einmal dunkel
// (die Kontrastprüfungen laufen so in beiden Farbschemata).
//
// Aufruf (benötigt Node.js und Playwright):  node tests/zeitzonen-test.js
// Nur bestimmte Zeitzonen:                    node tests/zeitzonen-test.js UTC Asia/Tokyo

"use strict";
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const REPO = path.join(__dirname, "..");
const ZONEN = process.argv.slice(2).length ? process.argv.slice(2) : ["Europe/Berlin", "UTC", "America/New_York", "Asia/Tokyo"];
const SCHEMATA = ["light", "dark"];
const TYPEN = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml" };

const server = http.createServer((req, res) => {
  const pfad = path.normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\])+/, "");
  const datei = path.join(REPO, pfad);
  if (!datei.startsWith(REPO) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TYPEN[path.extname(datei)] || "application/octet-stream", "Cache-Control": "no-store" });
  res.end(fs.readFileSync(datei));
});

(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const basis = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch();
  let fehler = 0;
  for (const zone of ZONEN) {
    for (const schema of SCHEMATA) {
      const ctx = await browser.newContext({ timezoneId: zone, locale: "de-DE", colorScheme: schema });
      const seite = await ctx.newPage();
      await seite.goto(basis + "/tests/test.html");
      await seite.waitForFunction(() => /^(OK|FEHLER)/.test(document.title), null, { timeout: 600000 });
      const titel = await seite.title();
      console.log((titel.startsWith("OK") ? "✓ " : "✗ ") + zone + " (" + (schema === "light" ? "hell" : "dunkel") + "): " + titel);
      if (!titel.startsWith("OK")) {
        fehler++;
        const liste = await seite.$$eval(".fehler", els => els.map(e => e.textContent.slice(0, 400) + (e.nextElementSibling && e.nextElementSibling.tagName === "PRE" ? "\n     " + e.nextElementSibling.textContent.slice(0, 3000).replace(/\n/g, "\n     ") : "")));
        liste.forEach(t => console.log("   " + t));
      }
      await ctx.close();
    }
  }
  await browser.close();
  server.close();
  console.log(fehler ? fehler + " Läufe mit Fehlern" : "Alle Läufe bestanden");
  process.exit(fehler ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
