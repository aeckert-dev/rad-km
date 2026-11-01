# Arbeitsregeln für Rad-km

Das Repository ist öffentlich: Keine persönlichen Daten, keine echten
Kilometer- oder Wartungsdaten, keine Zugangsdaten ins Repository. Testdaten
sind immer erfunden.

## Aufbau

- Die App besteht aus `index.html` (nur Grundgerüst), `css/app.css` und
  JavaScript-Dateien in `js/` – ohne externe Bibliotheken und ohne
  Build-Schritt, direkt über GitHub Pages lauffähig. Dazu kommen der Service
  Worker `sw.js` und ggf. ein Manifest.
- Die JS-Dateien sind normale Skripte (keine Module) mit gemeinsamem globalen
  Bereich und `"use strict"` in jeder Datei. Code, der beim Laden läuft, nur
  in `js/grundlagen.js`, `js/daten.js` und `js/start.js` (wird zuletzt
  geladen).
- **Neue Datei:** in `index.html` einbinden **und** in `DATEIEN` in `sw.js`
  eintragen (gleiche Reihenfolge; `tests/test.html` prüft das).
- Oberfläche, README, Code-Kommentare, Commit-Nachrichten und
  Pull-Request-Beschreibungen sind auf Deutsch. Bezeichner im Code ebenfalls
  deutsch, passend zum vorhandenen Code.
- Die Daten liegen nur im `localStorage` des Geräts. Nichts darf sie ungefragt
  verändern; Prüfungen und Datensicherung lesen nur.
- Für das iPhone optimiert, Hell- und Dunkelmodus über die Farbvariablen in
  `:root` (`css/app.css`).

## Datei → Inhalt (nur die betroffenen Dateien lesen)

| Datei | Inhalt |
|---|---|
| `index.html` | Grundgerüst, Reiterleiste, Fenster, Einbindung von CSS und JS |
| `css/app.css` | Aussehen, Farbvariablen, Dunkelmodus |
| `js/grundlagen.js` | `APP_VERSION`, `DATEN_VERSION`, Speicherschlüssel, Konstanten; Hilfsfunktionen Datum/Zahlen/Text |
| `js/daten.js` | Datenmodell: Standardwerte, Laden, Prüfen, `MIGRATIONEN`, Speichern |
| `js/berechnungen.js` | km-Stand, Summen, Prognosen, Jahresziel, Zusammenfassung der Einträge |
| `js/statistik.js` | Fahrtage/Kennzahlen, Reiter Statistik, Diagramm, Wetter-Statistik, „Wetter nachtragen“ |
| `js/wartung.js` | Werkstatt-Berechnung: Fälligkeit, `werkstattLage`, Standard-Zuordnung, Vorschläge |
| `js/wartung-ansicht.js` | Reiter Wartung, Aufträge, Termin, Abschluss, Aufgaben, Mängel, Wartungsarten, Prüfbildschirm |
| `js/wetter.js` | Wetter-Logik: Abruf, Zwischenspeicher, Standort, Ampel, Kleidung, Wind, Abfahrt, Rückblick |
| `js/wetter-ansicht.js` | Reiter Wetter, Kachel, Wetter-Einstellungen, Ampel-Grenzen, Kleidung, Rückmeldung |
| `js/uebersicht.js` | Reiter Übersicht, Eintragsliste, Eintragsformular, Prognosefenster |
| `js/einstellungen.js` | Reiter Einstellungen: Fahrrad, Vorlagen, Fahrtage, Jahresziele |
| `js/sicherung.js` | Export, Prüfung, Vergleich, Import |
| `js/oberflaeche.js` | Fenster, Rückfrage, Meldung, Rückgängig, `zeichnen()`, Reiter |
| `js/bedienung.js` | `AKTIONEN`: Zuordnung von `data-action`/`data-change` zu Funktionen |
| `js/start.js` | Service Worker anmelden, „Neue Version verfügbar“, Start |
| `sw.js` | Service Worker: vollständiger Satz aller Dateien offline, Update erst nach „Neu laden“ |
| `tests/test.html` | Testseite (lädt `index.html?test` unsichtbar) |
| `tests/offline-update-test.js` | Offline-Start und neue Versionen mit Playwright |

## Datenmodell

- Jede Änderung am Aufbau der Daten erhöht `DATEN_VERSION` und bekommt eine
  Umwandlung in `MIGRATIONEN`, die alle vorhandenen Daten vollständig erhält.
- README aktualisieren: Abschnitt „JSON-Format“ (Tabellen, Beispiel) und
  „Versionen“.

## Releases

- `APP_VERSION` in `js/grundlagen.js` für jedes Release anpassen.
- **Tests:** Jedes Release erweitert `tests/test.html` um Tests für alle neuen
  Funktionen (bei neuer Datenversion auch die Umwandlung aus allen älteren
  Versionen, mit einer erfundenen Testdatei in `tests/`). Die Ergebnisse
  stehen im Pull Request.
- Tests ausführen: `python3 -m http.server 8000` im Repository starten und
  `http://localhost:8000/tests/test.html` öffnen (oder dieselbe Seite headless,
  z. B. mit Playwright). Oben steht „Alle … Tests bestanden“; der Seitentitel
  beginnt mit `OK` bzw. `FEHLER`.
- Bei Änderungen an `sw.js`, an der Dateiliste oder am Start der App
  zusätzlich `node tests/offline-update-test.js` ausführen (Offline-Start,
  neue Version, „Neu laden“, Übergang von 5a.1, Daten unverändert).
- README (Bedienung, JSON-Format und ggf. Dateistruktur) mit jedem Release
  aktualisieren.
