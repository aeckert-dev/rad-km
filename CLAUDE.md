# Arbeitsregeln für Rad-km

Das Repository ist öffentlich: Keine persönlichen Daten, keine echten
Kilometer- oder Wartungsdaten, keine Zugangsdaten ins Repository. Testdaten
sind immer erfunden.

## Aufbau

- Die App ist **eine einzige Datei `index.html`** (HTML, CSS, JavaScript),
  ohne externe Bibliotheken und ohne Build-Schritt. Ausnahme: Ein Service
  Worker und ggf. ein Manifest dürfen eigene Dateien sein.
- Oberfläche, README, Code-Kommentare, Commit-Nachrichten und
  Pull-Request-Beschreibungen sind auf Deutsch. Bezeichner im Code ebenfalls
  deutsch, passend zum vorhandenen Code.
- Die Daten liegen nur im `localStorage` des Geräts. Nichts darf sie ungefragt
  verändern; Prüfungen und Datensicherung lesen nur.
- Für das iPhone optimiert, Hell- und Dunkelmodus über die Farbvariablen in
  `:root`.

## Datenmodell

- Jede Änderung am Aufbau der Daten erhöht `DATEN_VERSION` und bekommt eine
  Umwandlung in `MIGRATIONEN`, die alle vorhandenen Daten vollständig erhält.
- README aktualisieren: Abschnitt „JSON-Format“ (Tabellen, Beispiel) und
  „Versionen“.

## Releases

- `APP_VERSION` in `index.html` für jedes Release anpassen.
- **Tests:** Jedes Release erweitert `tests/test.html` um Tests für alle neuen
  Funktionen (bei neuer Datenversion auch die Umwandlung aus allen älteren
  Versionen, mit einer erfundenen Testdatei in `tests/`). Die Ergebnisse
  stehen im Pull Request.
- Tests ausführen: `python3 -m http.server 8000` im Repository starten und
  `http://localhost:8000/tests/test.html` öffnen (oder dieselbe Seite headless,
  z. B. mit Playwright). Oben steht „Alle … Tests bestanden“; der Seitentitel
  beginnt mit `OK` bzw. `FEHLER`.
- README (Bedienung und JSON-Format) mit jedem Release aktualisieren.
