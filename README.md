# Rad-km

Eine kleine Web-App zum Erfassen der gefahrenen Fahrrad-Kilometer und zum
Überblick über Inspektionen und Reparaturen. Sie ersetzt eine Excel-Liste und
ist für das iPhone optimiert.

- Kilometer pro Tag erfassen, mit Vorlagen in zwei Klicks
- Aktueller Kilometerstand und Summen für heute, diese Woche, diesen Monat, dieses Jahr
- Wartungsprotokoll mit Fälligkeit und geplanten Terminen
- Export und Import aller Daten als JSON-Datei
- Hell- und Dunkelmodus nach Systemeinstellung

Die ganze App steckt in **einer einzigen Datei: `index.html`**. Es gibt keine
externen Bibliotheken und keinen Build-Schritt.

## Wo liegen meine Daten?

**Nur auf deinem Gerät**, im Speicher des Browsers (`localStorage`, Schlüssel
`radkm-daten`). Es gibt keinen Server und keine Cloud, und im Repository liegen
keine Daten.

Das bedeutet:

- Die App auf dem **Home-Bildschirm** hat ihren eigenen Speicher, getrennt von
  Safari. Erfasse deine Daten deshalb immer in derselben App. Zum Übertragen
  dienen Export und Import.
- Löschst du die Website-Daten, oder wechselst du das iPhone, sind die Daten
  weg, wenn du keine Sicherung hast. **Exportiere deshalb regelmäßig.** Die
  App erinnert dich auf der Startseite, wenn der letzte Export mehr als 30
  Tage zurückliegt.

## Installation auf dem iPhone (über GitHub Pages)

Einmalig auf GitHub einrichten:

1. Das Repository auf **öffentlich** stellen: *Settings → General → Danger
   Zone → Change visibility*.
2. *Settings → Pages* öffnen und bei *Build and deployment* einstellen:
   - Source: **Deploy from a branch**
   - Branch: **main**, Ordner **/ (root)**, dann **Save**
3. Nach ein bis zwei Minuten ist die App erreichbar unter
   `https://aeckert-dev.github.io/rad-km/`.

Veröffentlicht wird dabei nur der Programmcode, deine Kilometer bleiben auf
dem iPhone.

Auf dem iPhone:

1. Die Adresse oben in **Safari** öffnen.
2. Auf das Teilen-Symbol tippen (Quadrat mit Pfeil nach oben) und
   **„Zum Home-Bildschirm“** wählen.
3. Ab jetzt die App immer über das Symbol auf dem Home-Bildschirm starten.

Updates: Sobald eine neue Version auf `main` liegt, lädt die App sie beim
nächsten Start. Deine Daten bleiben erhalten.

## Bedienung

### Erster Start

1. Unter **Einstellungen → Fahrrad** Namen, Startdatum und
   Start-Kilometerstand eintragen. Der Start-Kilometerstand gilt **zu Beginn**
   des Startdatums.
2. Unter **Vorlagen** die Standard-Strecken anlegen, z. B. „Arbeit hin und
   zurück – 14,2 km“. Die km gelten jeweils für den ganzen Tag.
3. Wenn du schon Daten hast, kannst du sie unter **Einstellungen →
   Daten importieren** einlesen (Format siehe unten).

### Kilometer erfassen

- **Mit Vorlage (2 Klicks):** Auf der Übersicht unter „Heute erfassen“ die
  Vorlage antippen. Das Formular öffnet sich mit den km der Vorlage, die du
  noch ändern kannst. Dann **Speichern** tippen.
- **Frei:** „Andere km“ antippen und die Kilometer eingeben.
- Für ein **anderes Datum** im Formular einfach das Datum ändern.
- Pro Datum gibt es genau einen Eintrag. Ist ein Datum schon erfasst, öffnet
  die App den vorhandenen Eintrag zum Bearbeiten.
- Kilometer mit Komma eingeben, z. B. `12,5`.
- Gibt es in derselben Woche (Montag bis Sonntag) bereits einen
  **Wochen-Eintrag**, warnt die App vor dem Speichern, denn die km würden
  sonst doppelt zählen.

### Übersicht

- **Kilometerstand** = Start-Kilometerstand + alle Einträge ab dem Startdatum.
- **Nächste fällige Wartung:** ein geplanter Termin oder die berechnete
  Fälligkeit, je nachdem, was zuerst kommt.
- **Summen:**
  - Heute.
  - Woche: Montag bis Sonntag.
  - Monat und Jahr.
  - Ein Wochen-Eintrag zählt dabei vollständig zu seinem Datum.
- **Liste der Einträge:** die neuesten zuerst. Antippen öffnet die
  Bearbeitung, 🗑 löscht den Eintrag (mit Rückfrage).
- **Markierungen in der Liste:**
  - Importierte Wochensummen tragen das Abzeichen **Woche**.
  - Einträge vor dem Startdatum werden angezeigt, zählen aber nicht zum
    Kilometerstand.

### Vorlagen

Vorlagen anlegen, bearbeiten, löschen, und mit ▲/▼ die Reihenfolge ändern.
Jeder Eintrag speichert seine Kilometer und den Namen der Vorlage selbst. Das
Ändern oder Löschen einer Vorlage verändert also keine bestehenden Einträge.

### Wartung

- **Wartungsarten:**
  - Voreingestellt sind „Große Inspektion“ (12 Monate), „Kleine Inspektion“
    und „Reparatur“, die beiden letzten ohne Intervall.
  - Eigene Wartungsarten kannst du anlegen und bearbeiten.
  - Das Intervall in km wird schon gespeichert, aber erst in einer späteren
    Version ausgewertet.
- **Termin planen:**
  - Pro Wartungsart ist ein geplanter Termin mit Datum und Werkstatt möglich.
  - Der Termin wird statt der berechneten Fälligkeit angezeigt.
- **Erledigt eintragen:**
  - Gibt es einen geplanten Termin, bietet die App an, ihn ins Protokoll zu
    übernehmen. Danach wird der Termin entfernt.
  - Den **Kilometerstand** berechnet die App automatisch aus allen Einträgen
    bis einschließlich diesem Datum.
  - Du kannst ihn überschreiben. Mit „Berechneten Wert verwenden“ kehrst du
    zur Berechnung zurück.
- **Fälligkeit:**
  - Berechnung: letzte Durchführung + Intervall.
  - Anzeige: „fällig in X Tagen“, „heute fällig“ oder „überfällig seit X
    Tagen“, dazu „Seit letzter Wartung gefahren: X km“.
  - Ohne Durchführung steht dort „noch nicht durchgeführt“.
- Eine Wartungsart, die im Protokoll verwendet wird, kann nicht gelöscht
  werden. Umbenennen geht jederzeit.

### Datensicherung

- **Daten exportieren:**
  - Auf dem iPhone öffnet sich das **Teilen-Menü**. Dort z. B. „In Dateien
    sichern“ wählen, um die Datei in iCloud Drive abzulegen.
  - Wo Teilen nicht möglich ist (z. B. am Computer), wird die Datei
    heruntergeladen.
  - Der Dateiname lautet `rad-km-JJJJ-MM-TT.json`.
- **Daten importieren:**
  - Eine solche Datei auswählen.
  - Die App prüft die Datei und zeigt eine Zusammenfassung.
  - Nach deiner Bestätigung **ersetzt** sie alle vorhandenen Daten.
  - Fehlerhafte Dateien werden mit einer Meldung abgelehnt, z. B. bei einem
    doppelten Datum.

## JSON-Format für Export und Import

Die Datei ist ein JSON-Objekt mit folgenden Teilen:

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `version` | Zahl | ja | Version des Datenmodells, aktuell `1` |
| `exportiertAm` | Text | nein | Zeitpunkt des Exports; wird beim Import ignoriert |
| `fahrrad` | Objekt oder `null` | nein | Das Fahrrad (siehe unten) |
| `vorlagen` | Liste | nein | Vorlagen in Anzeigereihenfolge |
| `eintraege` | Liste | nein | Kilometer-Einträge |
| `wartungsarten` | Liste | nein | Fehlt das Feld, werden die drei Standard-Wartungsarten angelegt |
| `wartungsprotokoll` | Liste | nein | Durchgeführte Wartungen |
| `termine` | Liste | nein | Geplante Termine |

Allgemeine Regeln:

- **Datum** immer als Text im Format `"JJJJ-MM-TT"`, z. B. `"2025-03-17"`.
- **Kilometer** als Zahl mit **Punkt** (JSON-Regel), z. B. `12.5`, nicht
  `"12,5"`. Alle km-Werte müssen ≥ 0 sein.
- **Texte** in Anführungszeichen. Optionale Texte dürfen fehlen, `""` oder
  `null` sein.
- **`id`-Felder** sind beliebige eindeutige Texte. Bei Vorlagen, Einträgen und
  Protokolleinträgen dürfen sie fehlen, die App vergibt dann eigene.

### `fahrrad`

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `name` | Text | ja | Name des Fahrrads |
| `startdatum` | Datum | ja | Ab diesem Tag (einschließlich) werden Einträge gezählt |
| `startKm` | Zahl | ja | Kilometerstand zu Beginn des Startdatums |

### `vorlagen[]`

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | Text | nein | Eindeutige Kennung |
| `name` | Text | ja | Name der Strecke |
| `km` | Zahl | ja | Gesamt-km für den Tag |

### `eintraege[]`

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | Text | nein | Eindeutige Kennung |
| `datum` | Datum | ja | **Pro Datum nur ein Eintrag** |
| `km` | Zahl | ja | Gefahrene Kilometer |
| `vorlage` | Text | nein | Name der verwendeten Vorlage (nur zur Anzeige) |
| `notiz` | Text | nein | Notiz |
| `typ` | `"tag"` oder `"woche"` | nein | Standard `"tag"`. `"woche"` = importierte Wochensumme, Datum = Montag der Woche bzw. erster Fahrtag |

### `wartungsarten[]`

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | Text | ja | Eindeutige Kennung, wird von Protokoll und Terminen verwendet |
| `name` | Text | ja | z. B. `"Große Inspektion"` |
| `intervallMonate` | ganze Zahl ≥ 1 oder `null` | nein | Intervall in Monaten |
| `intervallKm` | Zahl > 0 oder `null` | nein | Intervall in km (für später) |

Die Standard-Wartungsarten haben die IDs `grosse-inspektion`,
`kleine-inspektion` und `reparatur`.

### `wartungsprotokoll[]`

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | Text | nein | Eindeutige Kennung |
| `datum` | Datum | ja | Datum der Wartung |
| `wartungsartId` | Text | ja | `id` einer Wartungsart |
| `werkstatt` | Text | nein | Werkstatt |
| `kmStand` | Zahl oder `null` | nein | Kilometerstand bei der Wartung |
| `kmManuell` | `true`/`false` | nein | `true` = Wert von Hand eingetragen; `false` = App berechnet ihn selbst. Fehlt das Feld, gilt ein vorhandener `kmStand` als von Hand eingetragen |
| `notiz` | Text | nein | Durchgeführte Arbeiten / Notiz |

### `termine[]`

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `wartungsartId` | Text | ja | `id` einer Wartungsart; pro Wartungsart höchstens ein Termin |
| `datum` | Datum | ja | Geplantes Datum |
| `werkstatt` | Text | nein | Werkstatt |

### Beispiel (erfundene Werte)

```json
{
  "version": 1,
  "fahrrad": { "name": "Mein Rad", "startdatum": "2025-01-01", "startKm": 100 },
  "vorlagen": [
    { "name": "Arbeit hin und zurück", "km": 10 },
    { "name": "Einkauf", "km": 3.5 }
  ],
  "eintraege": [
    { "datum": "2025-01-06", "km": 40, "typ": "woche", "notiz": "aus Excel" },
    { "datum": "2025-01-13", "km": 35.5, "typ": "woche" },
    { "datum": "2025-01-20", "km": 10, "vorlage": "Arbeit hin und zurück" },
    { "datum": "2025-01-21", "km": 12.5, "notiz": "Umweg" }
  ],
  "wartungsarten": [
    { "id": "grosse-inspektion", "name": "Große Inspektion", "intervallMonate": 12, "intervallKm": null },
    { "id": "kleine-inspektion", "name": "Kleine Inspektion", "intervallMonate": null, "intervallKm": null },
    { "id": "reparatur", "name": "Reparatur", "intervallMonate": null, "intervallKm": null }
  ],
  "wartungsprotokoll": [
    { "datum": "2025-01-15", "wartungsartId": "grosse-inspektion", "werkstatt": "Beispiel-Werkstatt",
      "kmStand": 175.5, "kmManuell": true, "notiz": "Bremsen eingestellt" }
  ],
  "termine": [
    { "wartungsartId": "kleine-inspektion", "datum": "2025-06-02", "werkstatt": "Beispiel-Werkstatt" }
  ]
}
```

### Versionen

Die Zahl `version` beschreibt den Aufbau der Daten. Ändert eine spätere
App-Version den Aufbau, wandelt sie ältere Daten beim Laden oder Importieren
automatisch um. Daten aus einer *neueren* Version lehnt eine ältere App ab,
damit nichts verloren geht.

## Aufbau des Codes (für Neugierige)

`index.html` besteht aus drei Teilen:

1. **HTML:** das Grundgerüst, also Überschrift, Inhaltsbereich, die untere
   Navigationsleiste und zwei Fenster (für Formulare und Rückfragen).
2. **CSS** (`<style>`): das Aussehen. Die Farben stehen als Variablen am
   Anfang. Für den Dunkelmodus werden nur diese Variablen ausgetauscht.
3. **JavaScript** (`<script>`): die Logik, in nummerierten Abschnitten:
   1. Grundeinstellungen
   2. Hilfsfunktionen für Datum und Zahlen
   3. Datenmodell: Laden, Prüfen, Umwandeln, Speichern
   4. Berechnungen: Kilometerstand, Summen, Fälligkeit
   5. Fenster, Rückfragen, Meldungen
   6. Die vier Bildschirme und ihre Formulare
   7. Export und Import
   8. Zuordnung der Klicks zu den Funktionen
   9. Start

## Geplant (Stufe 2)

- Statistiken und Diagramme (z. B. km pro Monat, Jahresvergleich)
- Kilometerbasierte Wartungsintervalle (z. B. Kette)
