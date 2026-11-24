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
  verändern; Prüfungen und Datensicherung lesen nur. Die App ändert auch nie
  selbst Kleidungsstufen (Rückmeldungen ergeben nur Hinweise). Hilfsspeicher
  außerhalb der Daten (nicht in der Sicherung): `radkm-wetter`,
  `radkm-wartungsarten-pruefen`, `radkm-letzte-orte`, `radkm-heute-abfahrt`
  (verschobene Abfahrt von heute, gilt nur an diesem Tag).
- Die gefühlte Temperatur von Open-Meteo heißt in der Oberfläche „im Stehen“
  (seit 5g, B19; neben „beim Fahren“, in Wertezeile, Tageswerten, Umschalter,
  Protokoll); „gefühlt“ nur in der Erklärung zu anderen Wetter-Apps. Datenfelder
  (`gefuehlt`, `grundlage: "gefuehlt"`) bleiben.
- Sie steht nur einmal: Steht die Kleidungszeile mit „im Stehen …“ dabei,
  entfällt „(im Stehen …)“ in der Wertezeile (`werteText(w, false)`, B15, 5f).
- Rückmeldung je Körperbereich (B18, 5g): Felder und Kommentar werden still
  gespeichert (ohne Meldung, ohne Neuzeichnen: nur Feld, „Alles passte“ und
  Gesamtzeile ändern sich); eine Meldung mit „Rückgängig“ gibt es nur bei
  „✓ Alles passte“. Das Gesamturteil kommt immer aus `urteilAusBereiche`. In
  der Karte bleibt eine Fahrt mit Angabe bis „Fertig“ oder Reiterwechsel
  (`rueckmeldungOffen`, geleert in `zeichnen()`).
- Abwesenheiten (N3, 5g) gehören zu den Daten (`abwesenheiten`). Einträge
  gehen vor: Ein Tag mit Fahrt zählt trotz Abwesenheit als Fahrtag
  (`abwesendAm`, `zaehltAlsFahrtag`).
- Den Standort des iPhones fragt nur „📍 Aktueller Standort“ im Ortsformular ab
  (auf Tipp); das Wetter nie (seit 5e).
- Für das iPhone optimiert, Hell- und Dunkelmodus über die Farbvariablen in
  `:root` (`css/app.css`).
- Seitenaufbau: feste Seitenhöhe, nur `main` scrollt, die Reiterleiste ist
  nicht `position: fixed` (B3, 5c). Höhe der Reiter und freie Home-Zone über
  `--reiter-hoehe`, `--home-abzug`, `--home-frei` in `:root` (B11, 5d); was
  sich an der Leiste ausrichtet (z. B. `#toast`), nutzt diese Variablen. Zum Scrollen nach oben `nachOben()` statt
  `window.scrollTo`. Längere Formulare als Unterseite der Einstellungen
  (`EINSTELLUNGEN_SEITEN`, ggf. `formular: true`) statt als Fenster.

## Datei → Inhalt (nur die betroffenen Dateien lesen)

| Datei | Inhalt |
|---|---|
| `index.html` | Grundgerüst, Reiterleiste, Fenster, Einbindung von CSS und JS |
| `css/app.css` | Aussehen, Farbvariablen, Dunkelmodus |
| `js/grundlagen.js` | `APP_VERSION`, `DATEN_VERSION`, Speicherschlüssel, Konstanten; Hilfsfunktionen Datum/Zahlen/Text |
| `js/daten.js` | Datenmodell: Standardwerte, Laden, Prüfen, `MIGRATIONEN`, Speichern |
| `js/berechnungen.js` | km-Stand, Summen, Prognosen, Jahresziel, Zusammenfassung der Einträge |
| `js/statistik.js` | Reiter Fahrten (Einträge \| Statistik, darunter die Abwesenheiten), Fahrtage/Kennzahlen (Fahrtage ohne Eintrag ohne Abwesenheiten), Diagramm, Jahresziele, Wetter-Statistik, „Wetter nachtragen“ |
| `js/wartung.js` | Werkstatt-Berechnung: Fälligkeit (`intervallStatus`, `saisonStatus`), `werkstattLage`, Standard-Zuordnung, Vorschläge |
| `js/kalender.js` | Kalenderdatei (.ics) zum Termin eines geplanten Auftrags (UTC aus Europe/Berlin, Vorlaufzeit), Stand im Kalender (`imKalender`) |
| `js/wartung-ansicht.js` | Reiter Wartung (Aktuell \| Verlauf), Wartungsarten-Liste, Aufträge, Termin mit Vorlaufzeit, Kalender (Knopf in der Karte, Fenster, veralteter Eintrag), Abschluss, Aufgaben, Mängel, Wartungsarten, Prüfbildschirm |
| `js/wetter.js` | Wetter-Logik: Abruf (Strecke + aktiver weiterer Ort in einer Abfrage), Zwischenspeicher, Ampel, Kleidung (`stufenGrundlage`), Wind (Pfeilrichtung/-farbe), Sonnenauf-/untergang, Abfahrt, `wetterAnsicht` (nächster Fahrtag, heute, weiterer Ort), Wetter je Eintrag mit Zeitfenster, Rückblick (`rueckblickUebernehmen`, `gespeicherteZeiten`) |
| `js/abwesenheit.js` | Abwesenheit: `abwesenheitAm`, `abwesendAm` (Einträge gehen vor), Hinweis „Urlaub bis …“ (`abwesenheitVorFahrtag`), Abschnitt in Fahrten → Einträge, Formular (Überschneidung), Löschen, `abwesendeFahrtage` (Statistik) |
| `js/fahrtag.js` | Nächster Fahrtag (`naechsterFahrtag`, „vorläufig“, Vorlauf, außerhalb der Vorhersage, „Keine Fahrt“, Abwesenheit), Auswahl im Reiter Wetter (`wetterAuswahl`, 2-Stunden-Regel), „Heute später los“ (`fahrtZeitfenster`, `abweichungPruefen`, Hilfsspeicher `radkm-heute-abfahrt`, `fahrtEnde`) |
| `js/gefuehlt.js` | Gefühlt beim Fahren: Formel wie Open-Meteo, Luftstrom, Wind auf 1,5 m, Fahrgeschwindigkeit, `fahrtGefuehlt` (Teilstrecken, kältester Schritt, ohne Richtung), Windlage, Plausibilität |
| `js/orte.js` | Ortseingabe: Koordinaten/Kartenlinks lesen (`ortAusText`), Ortssuche beim Tippen (Verzögerung, Abbruch, Umlaute), zuletzt gewählte Orte, Namensvorschlag (DWD-Gemeinde) |
| `js/wetter-ansicht.js` | Reiter Wetter (Umschalter, eingeklappt „vorbei ›“, „Heute später los …“ als Fenster von unten, Link zum gespeicherten Wetter), Kachel, Windpfeile, „gefühlt · beim Fahren“, Wetter-Einstellungen (Hauptseite; Unterseiten Orte und Strecke, Ort-Formular, Kleidung mit Umschalter/Fahrgeschwindigkeit/Plausibilität im Testmodus, Stufe/Regenzusatz, Änderungen, Ampel-Grenzen), Rückmeldung je Körperbereich („✓ Alles passte“, Felder zyklisch, `gesamtText`, Kommentar, `rueckmeldungOffen` bis „Fertig“/Reiterwechsel), Änderungsprotokoll, Zählung ab der letzten Änderung (`seitTitel`/`seitText`, mit „gemischt“), Hinweise zur Stufe und je Bereich (`kleidungHinweise`), „Wo“ je Stufe mit „passte“, letzte Kommentare, „im Stehen · beim Fahren“ |
| `js/uebersicht.js` | Reiter Übersicht, Eintragsliste (Fahrten → Einträge), Eintragsformular, Prognosefenster |
| `js/einstellungen.js` | Reiter Einstellungen: Hauptseite, Unterseiten (`EINSTELLUNGEN_SEITEN`), Fahrrad, Vorlagen, Fahrtage |
| `js/sicherung.js` | Export, Prüfung, Vergleich, Import |
| `js/oberflaeche.js` | Fenster, Rückfrage, Meldung, Rückgängig, `zeichnen()`, Reiter, Unterseiten (`unterseiteZeigen`), Umschalter, Wege, Verankern der Reiterleiste |
| `js/bedienung.js` | `AKTIONEN`: Zuordnung von `data-action`/`data-change` zu Funktionen |
| `js/start.js` | Service Worker anmelden, „Neue Version verfügbar“, Start |
| `sw.js` | Service Worker: vollständiger Satz aller Dateien offline, Update erst nach „Neu laden“ |
| `tests/test.html` | Testseite (lädt `index.html?test` unsichtbar); Testdateien `tests/daten-v*.json`, `tests/wetter-*.json` (u. a. `wetter-gefuehlt.json`, stimmig nach der Formel von Open-Meteo; Zeitstempel aus Europe/Berlin, außerhalb Berlins per `aufGeraetezeit` auf dieselbe Uhrzeit in Gerätezeit gesetzt, `fxRoh` unverändert). Zeitabhängiges immer mit eingespeistem `jetzt` testen |
| `tests/zeitzonen-test.js` | Testseite headless in Europe/Berlin, UTC, America/New_York, Asia/Tokyo, je hell und dunkel |
| `tests/offline-update-test.js` | Offline-Start und neue Versionen mit Playwright |

## Datenmodell

- Jede Änderung am Aufbau der Daten erhöht `DATEN_VERSION` und bekommt eine
  Umwandlung in `MIGRATIONEN`, die alle vorhandenen Daten vollständig erhält.
- README aktualisieren: Abschnitt „JSON-Format“ (Tabellen, Beispiel) und
  „Versionen“.

## Releases

- `APP_VERSION` in `js/grundlagen.js` für jedes Release anpassen. Zählweise
  ab 5c: fortlaufende Buchstaben (5c, 5d …), eine neue Zahl für ein neues
  Thema (6, 6a …); keine „.1“-Korrekturen mehr.
- **Tests:** Jedes Release erweitert `tests/test.html` um Tests für alle neuen
  Funktionen (bei neuer Datenversion auch die Umwandlung aus allen älteren
  Versionen, mit einer erfundenen Testdatei in `tests/`). Die Ergebnisse
  stehen im Pull Request.
- Tests ausführen: `python3 -m http.server 8000` im Repository starten und
  `http://localhost:8000/tests/test.html` öffnen (oder dieselbe Seite headless,
  z. B. mit Playwright). Oben steht „Alle … Tests bestanden“; der Seitentitel
  beginnt mit `OK` bzw. `FEHLER`. Vor dem Pull Request
  `node tests/zeitzonen-test.js` (vier Zeitzonen, hell und dunkel; alle grün).
- Bei Änderungen an `sw.js`, an der Dateiliste oder am Start der App
  zusätzlich `node tests/offline-update-test.js` ausführen (Offline-Start,
  neue Version, „Neu laden“, Übergang von 5a.1, Daten unverändert).
- Was sich nur am iPhone prüfen lässt (Scrollen, Tastatur, Kalender-App,
  Farben), steht im Pull Request ausdrücklich unter „Am iPhone prüfen“.
- README (Bedienung, JSON-Format und ggf. Dateistruktur) mit jedem Release
  aktualisieren.
