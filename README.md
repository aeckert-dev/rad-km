# Rad-km

Eine kleine Web-App zum Erfassen der gefahrenen Fahrrad-Kilometer und zum
Überblick über Inspektionen und Reparaturen. Sie ersetzt eine Excel-Liste und
ist für das iPhone optimiert.

- Kilometer pro Tag erfassen, mit Vorlagen in zwei Klicks
- Wetter für den Arbeitsweg: Ampel, Kleidung je Körperbereich, amtliche Warnungen
  des DWD, beste Abfahrtszeit und Wind je Hin- und Rückfahrt (mit
  Himmelsrichtung und Böen, je Teilstrecke relativ zur Fahrtrichtung), ab dem Vorabend für
  den nächsten Fahrtag; zu allen übrigen Zeiten die Ampel für eine spontane Runde
  ab jetzt, am Wohnort oder am aktuellen Standort
- Bis zu 3 Wegpunkte: Wind je Teilstrecke, Temperatur, Regen und Warnungen auch
  unterwegs; Orte mit 4 Nachkommastellen (ca. 10 m), auf Wunsch in Apple Karten
  gezeigt
- Kleidung (Kopf, Hals, Hände, Oberkörper, Beine, Füße) und Ampel-Grenzen selbst
  einstellen; bei Regen nach dem Zwiebelprinzip; die Rückmeldung „zu warm /
  passte / zu kalt“ nach der Fahrt wird je Stufe ausgewertet
- Wetter jeder Fahrt zur Arbeit beim Eintrag gespeichert, auf Wunsch auch
  nachträglich; Statistik „km bei Regen“, „Tage unter 0 °C“ und Ampelverteilung
- Aktueller Kilometerstand und Summen für heute, diese Woche, diesen Monat, dieses Jahr
- Jahresprognose, Jahresziel und Kilometerstand-Prognose für ein beliebiges Datum
- Statistik: km pro Monat im Vergleich zum Vorjahr, Radtage, Arbeitstage mit
  dem Rad und längste Serie
- Hinweis auf übliche Fahrtage ohne Eintrag (auf Wunsch schon am selben Tag ab 18:00), mit „Nachtragen“ und „Keine Fahrt“
- Einträge übersichtlich zusammengefasst nach Woche, Monat und Jahr
- Werkstatt wie in der Instandhaltung (Auftrag – Position – Mangel):
  Inspektionen und Reparaturen sind **Aufträge** mit Termin, Wartungsaufgaben
  (z. B. Bremsbeläge, Ölwechsel) und Mängel hängen als **Positionen** daran;
  Fälligkeit nach Intervall (Monate und/oder km), jährlichem Zeitfenster oder
  einmalig, Vorschläge „zu diesem Auftrag nehmen?“
- Termin eines Auftrags (auf Wunsch mit Uhrzeit) mit einem Tipper in den
  Kalender des iPhones übernehmen, mit Positionen und Erinnerung am Vortag
- Mängelliste; Mängel werden einem Auftrag zugeordnet oder als Reparatur angelegt
- Löschen mit „Rückgängig“
- Datensicherung als JSON-Datei, die vor dem Teilen geprüft wird; gespeicherte
  Sicherungen lassen sich prüfen, ohne etwas zu überschreiben
- Startet auch ohne Netz (dann mit dem zuletzt geladenen Wetter); neue Versionen werden angekündigt
- Hell- und Dunkelmodus nach Systemeinstellung

Die App besteht aus `index.html`, dem Aussehen in `css/app.css` und dem
Programmcode in einigen Dateien unter `js/` (siehe „Dateistruktur“). Dazu
kommt der Service Worker `sw.js`, der die App für den Start ohne Netz
bereithält. Es gibt keine externen Bibliotheken und keinen Build-Schritt;
GitHub Pages liefert die Dateien direkt aus.

## Wo liegen meine Daten?

**Nur auf deinem Gerät**, im Speicher des Browsers (`localStorage`, Schlüssel
`radkm-daten`). Es gibt keinen Server und keine Cloud, und im Repository liegen
keine Daten.

Das bedeutet:

- Die App auf dem **Home-Bildschirm** hat ihren eigenen Speicher, getrennt von
  Safari. Erfasse deine Daten deshalb immer in derselben App. Zum Übertragen
  dienen Sicherung und Import.
- Löschst du die Website-Daten, oder wechselst du das iPhone, sind die Daten
  weg, wenn du keine Sicherung hast. **Sichere deshalb regelmäßig** („Jetzt
  sichern“ auf der Übersicht oder in den Einstellungen). Die App erinnert dich, wenn die letzte
  Sicherung mehr als 30 Tage zurückliegt.
- Der Service Worker speichert nur die App selbst (`index.html`, `css/` und
  `js/`), damit sie auch ohne Netz startet. Auf die Daten im `localStorage` hat er keinen
  Zugriff.
- Nach dem Update auf Datenversion 8 merkt sich die App unter
  `radkm-wartungsarten-pruefen`, dass der Hinweis „Bitte Wartungsarten prüfen“
  noch angezeigt werden soll. Das gehört nicht zu deinen Daten und nicht zur
  Sicherung.

### Was geht beim Wetter ins Netz?

Nur für das Wetter fragt die App Wetterdienste ab, und nur, wenn du Orte
festgelegt hast:

| Dienst | Wofür | Was gesendet wird |
|---|---|---|
| [Open-Meteo](https://open-meteo.com/) (`api.open-meteo.com`) | Vorhersage, Modell ICON des Deutschen Wetterdienstes | die auf 3 Nachkommastellen gerundeten Koordinaten (ca. 100 m) von Wohn- und Arbeitsort und den Wegpunkten bzw. des weiteren Orts; ist „aktueller Standort“ gewählt, außerhalb der Fahrten auch die des Standorts |
| [Deutscher Wetterdienst](https://www.dwd.de/) (GeoServer `maps.dwd.de`) | amtliche Warnungen für die Gemeinde jedes Orts (auch der Wegpunkte und des aktuellen Standorts); der Name der Gemeinde ist zugleich der Name des Standorts | dieselben gerundeten Koordinaten |
| [Bright Sky](https://brightsky.dev/) (`api.brightsky.dev`) | nur wenn der DWD nicht erreichbar ist: dieselben amtlichen Warnungen des DWD | dieselben gerundeten Koordinaten |
| Ortssuche von Open-Meteo (`geocoding-api.open-meteo.com`) | Ort beim Festlegen suchen | nur der eingegebene Name |
| Rückblick von Open-Meteo (`historical-forecast-api.open-meteo.com`) | nur nach „Wetter nachtragen …“ und deiner Bestätigung: das Wetter vergangener Fahrten zur Arbeit | die gerundeten Koordinaten von Wohn- und Arbeitsort und den Wegpunkten und der Zeitraum (Datum von–bis) |
| [Apple Karten](https://maps.apple.com/) (`maps.apple.com`) | nur beim Antippen von „In Karten zeigen“ im Formular eines Orts: die Stelle in Apple Karten | die Koordinaten mit 4 Nachkommastellen und der Name des Orts |

- Gespeichert werden Orte mit 4 Nachkommastellen (ca. 10 m); genauere Werte (aus
  der Ortssuche, vom aktuellen Standort im Formular, von Hand eingegeben oder aus
  einer importierten Datei) rundet die App sofort. An die Wetterdienste gehen sie
  nur auf 3 Nachkommastellen gerundet.
- **Aktueller Standort** (nur wenn „Wetter außerhalb der Fahrten: aktueller
  Standort“ gewählt ist): Die App fragt den Standort des iPhones nur ab, während
  die Ansicht „Jetzt“ auf der Übersicht oder im Reiter Wetter angezeigt wird. Die
  Koordinaten rundet sie sofort auf 3 Nachkommastellen; sie, das Wetter dort und
  der Name der Gemeinde bleiben nur im Arbeitsspeicher und werden weder in den
  Daten noch im Wetter-Zwischenspeicher gespeichert. Einen Dienst für Ortsnamen
  gibt es nicht.
- Wie bei jedem Abruf im Internet sehen die Dienste deine IP-Adresse. Es gibt
  keine Anmeldung, keinen Schlüssel und keine Cookies.
- Die Orte und Wegpunkte gehören zu den Einstellungen, bleiben auf dem Gerät und
  stehen deshalb auch in der Sicherungsdatei.
- Die zuletzt geladenen Wetterdaten liegen in einem eigenen Zwischenspeicher
  (`localStorage`, Schlüssel `radkm-wetter`). Er gehört nicht zu deinen Daten,
  steht nicht in der Sicherung und darf jederzeit gelöscht werden. Das Laden des
  Wetters verändert deine Daten nie. In deine Daten kommt Wetter nur beim
  Speichern eines Eintrags mit Arbeitsweg und mit „Wetter nachtragen …“ (nach
  Rückfrage).

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

### Ohne Netz und neue Versionen

- Nach dem ersten Start ist die App auf dem iPhone gespeichert und startet
  auch **ohne Netz** (Flugmodus, Funkloch) sofort.
- Liegt eine neue Version auf `main`, startet die App zunächst weiter in der
  bisherigen Version und zeigt oben **„Neue Version verfügbar“**. Ein Tipper
  auf **Neu laden** übernimmt sie. Bis dahin bleibt alles wie gewohnt; der
  Hinweis erscheint bei jedem Start wieder.
- Die App fragt beim Start und beim Zurückkehren in die App nach (höchstens
  alle 10 Minuten).
- Deine Daten im `localStorage` bleiben bei Updates unverändert. Alles ist
  schon gespeichert, bevor neu geladen wird.
- **Wetter ohne Netz:** Der Reiter Wetter und die Kachel auf der Übersicht
  zeigen die zuletzt geladenen Daten mit Zeitstempel, z. B. „Angezeigt wird der
  letzte Stand von 20:15 Uhr – nicht aktuell“, und nehmen Ampeln und Werte
  sichtbar zurück. Das Wetter am aktuellen Standort wird nicht gespeichert; ohne
  Netz zeigt die Ansicht „Jetzt“ deshalb den Wohnort mit Hinweis.

## Bedienung

### Aufbau: die fünf Reiter

Unten stehen fünf Reiter. Oben in jedem Reiter steht, was du am häufigsten
brauchst; Verlauf und Einstellungen kommen weiter unten bzw. auf eigene Seiten.

| Reiter | Inhalt (von oben nach unten) |
|---|---|
| 🚲 **Übersicht** | Hinweise (z. B. „Datensicherung fällig“), Wetter-Kachel mit der Ampel, **Heute erfassen** mit den Fahrtagen ohne Eintrag, Kilometerstand mit nächster Wartung und offenen Mängeln, Summen, Jahr (Jahresziel, Prognose), Einträge dieser Woche, Datensicherung in einer Zeile |
| 🌦️ **Wetter** | Ampel, Kleidung, Wind und Abfahrtszeit für Hin- und Rückfahrt bzw. „Jetzt“, amtliche Warnungen; unten der Weg zu den Wetter-Einstellungen |
| 🔧 **Wartung** | oben „+ Mangel“, „+ Reparatur“, „+ Eigenleistung“; darunter umschaltbar **Aktuell** (Mängel ohne Auftrag, offene Aufträge, Aufgaben) und **Verlauf** (erledigte Aufträge und Mängel) |
| 📊 **Fahrten** (bis 5a.1 „Statistik“) | umschaltbar **Einträge** (alle Einträge, zusammengefasst) und **Statistik** (Diagramm, Kennzahlen, Jahresziele, Wetter auf dem Arbeitsweg) |
| ⚙️ **Einstellungen** | Hauptseite mit Abschnitten; die Zeilen mit „›“ öffnen eine eigene Seite (zurück mit „‹ Einstellungen“ oder erneutem Antippen des Reiters) |

Die Hauptseite der Einstellungen:

- **Fahrrad** → Seite mit allen Angaben und „Ändern“
- **Datensicherung:** letzte Sicherung und „Jetzt sichern“ direkt; „Sicherung
  prüfen, Daten importieren“ → eigene Seite
- **Fahrten:** Vorlagen → Seite; Fahrtage und Hinweis → Seite; Weg zu den
  Jahreszielen (Fahrten → Statistik)
- **Wetter:** Orte und Strecke → Seite (Wohn- und Arbeitsort, Wegpunkte,
  Teilstrecken, weiterer Ort); Wetter außerhalb der Fahrten → Seite; Hinfahrt,
  Rückfahrt, Kleidung und Ampel-Grenzen öffnen wie bisher ihr Formular
- **Wartung:** Wartungsarten → Seite
- **Über Rad-km:** App-Version und Datenversion

Was sich mit Release 5b geändert hat (keine Funktion ist weggefallen, die
Daten sind unverändert):

| Inhalt | bis 5a.1 | ab 5b |
|---|---|---|
| Heute erfassen | Übersicht, nach Kilometerstand und Wetter | Übersicht, direkt unter der Wetter-Kachel |
| Eintragsliste | Übersicht, ganz unten | Fahrten → Einträge; auf der Übersicht die laufende Woche |
| Datensicherung | Karte auf der Übersicht und unten in den Einstellungen | Zeile auf der Übersicht; Einstellungen an 2. Stelle |
| Erledigte Aufträge und Mängel | Wartung, Mitte (Mängel einklappbar) | Wartung → Verlauf |
| Wartungsarten | Wartung, unten | Einstellungen → Wartungsarten (Weg aus der Wartung) |
| „+ Mangel / Reparatur / Eigenleistung“ | an verschiedenen Stellen | Wartung, oben |
| Jahresziele | Einstellungen | Fahrten → Statistik |
| Wetter-Einstellungen | Einstellungen, ein langer Abschnitt | Einstellungen → Wetter mit eigenen Seiten |
| Vorlagen, Fahrtage | Einstellungen, oben | Einstellungen → Fahrten |

### Erster Start

1. Unter **Einstellungen → Fahrrad anlegen** Namen, Startdatum und
   Start-Kilometerstand eintragen, optional auch Rahmennummer und eine
   Beschreibung (z. B. Farbe, Modell). Der Start-Kilometerstand gilt **zu
   Beginn** des Startdatums.
2. Unter **Einstellungen → Vorlagen** die Standard-Strecken anlegen, z. B.
   „Arbeit hin und zurück – 14,2 km“. Die km gelten jeweils für den ganzen Tag.
3. Für das Wetter unter **Einstellungen → Orte und Strecke** Wohnort und
   Arbeitsort festlegen und unter **Einstellungen → Wetter** die Fahrzeiten
   prüfen (siehe „Wetter“).
4. Wenn du schon Daten hast, kannst du sie unter **Einstellungen →
   Datensicherung → Daten importieren** einlesen (Format siehe unten).

### Kilometer erfassen

- **Mit Vorlage (2 Klicks):** Auf der Übersicht unter „Heute erfassen“ die
  Vorlage antippen. Das Formular öffnet sich mit den km der Vorlage, die du
  noch ändern kannst. Dann **Speichern** tippen.
- **Frei:** „Andere km“ antippen und die Kilometer eingeben.
- Für ein **anderes Datum** im Formular einfach das Datum ändern.
- Pro Datum gibt es genau einen Eintrag. Ist ein Datum schon erfasst, zeigt
  die App den vorhandenen Eintrag an; mit **Ändern** kannst du ihn bearbeiten.
- **Arbeitsweg:** Das Häkchen im Formular übernimmt die App aus der Vorlage
  (siehe „Vorlagen“). Du kannst es für den einzelnen Eintrag ändern. Bei einem
  Eintrag mit Arbeitsweg und mehr als 0 km speichert die App das Wetter der
  Hin- und Rückfahrt mit (siehe „Wetter je Eintrag“).
- **Keine Fahrt:** Ein Eintrag mit 0 km bedeutet „an diesem Tag nicht
  gefahren“. Er erscheint in der Liste dezent als „keine Fahrt“ und zählt in
  der Statistik nicht als Radtag.
- Kilometer mit Komma eingeben, z. B. `12,5`.
- Gibt es in derselben Woche (Montag bis Sonntag) bereits einen
  **Wochen-Eintrag**, warnt die App vor dem Speichern, denn die km würden
  sonst doppelt zählen.

### Übersicht

Reihenfolge: Hinweise, Wetter-Kachel, Heute erfassen (mit Fahrtagen ohne
Eintrag), Kilometerstand, Summen, Jahr, Einträge dieser Woche,
Datensicherung. So sind Ampel und Erfassen auch auf einem kleinen iPhone
(z. B. 13 mini) ohne Scrollen sichtbar.

- **Kilometerstand** = Start-Kilometerstand + alle Einträge ab dem Startdatum.
  Antippen der Karte öffnet den Reiter Wartung.
- **Wetter-Kachel:** die Ampeln der nächsten Hin- und Rückfahrt (desselben
  Tages wie im Reiter Wetter; nach der Hinfahrt nur noch die Rückfahrt) und der
  wichtigste Grund, z. B. „Rückfahrt rot: Gewitter ab 16:45“. Antippen öffnet
  den Reiter Wetter. Gibt es gerade keine Hin- und Rückfahrt (siehe „Wetter“),
  steht dort kurz „Jetzt · Musterdorf (Wohnort)“ bzw. „Jetzt · Stadt Beispielbad
  (aktueller Standort)“, darunter nur die Ampel für eine Fahrt ab jetzt mit
  kurzer Begründung, z. B. „gelb: 70 % Regen ab 10:30“, und „Empfehlung für Mo
  02.11. ab So 17:00“. Ist der Standort gewählt, aber nicht verfügbar, steht der
  Grund klein darunter (z. B. „Standort nicht freigegeben“).
- **Fahrtage ohne Eintrag:** Fehlt für einen deiner üblichen Fahrtage (siehe
  „Einstellungen“) der letzten 14 Tage (bis gestern, ab dem Startdatum) ein
  Eintrag, erscheint z. B. „2 Fahrtage ohne Eintrag“ und darunter je Tag eine
  Zeile, z. B. „Di 20.10.“ und „Fr 23.10.“. Der heutige Fahrtag kommt ab 18:00
  dazu (Zeile „heute“), solange der Schalter „Hinweis schon am selben Tag“ an
  ist; Schalter und Uhrzeit stehen unter Einstellungen → Fahrtage und Hinweis. Jeder Tag
  steht nur einmal da. Je Tag gibt es zwei Schaltflächen:
  - **Nachtragen** öffnet die Erfassung für diesen Tag.
  - **Keine Fahrt** legt mit einem Tipper einen Eintrag mit 0 km an (mit
    „Rückgängig“).
  - Eine Woche mit einer importierten Wochensumme gilt als erfasst.
- **Nächster fälliger Auftrag:** der erste überfällige bzw. anstehende offene
  Auftrag (siehe „Wartung“) mit Termin oder Fälligkeit und der Zahl seiner
  Positionen, z. B. „🔧 Kleine Inspektion: fällig bis 30.11. (ca. 4.350 km) · 3
  Positionen“. Liegt das Datum in der Zukunft, steht der erwartete
  Kilometerstand dabei. Eine überfällige Aufgabe ohne Auftrag steht als Hinweis
  darunter, z. B. „⚠️ Licht prüfen überfällig – keinem Auftrag zugeordnet“.
- **Summen:**
  - Heute.
  - Woche: Montag bis Sonntag.
  - Monat und Jahr.
  - Ein Wochen-Eintrag zählt dabei vollständig zu seinem Datum.
- **Jahr:** Jahresziel mit Fortschritt und Jahresprognose (siehe
  „Prognosen und Jahresziel“) sowie „Kilometerstand für ein Datum …“.
- **Diese Woche:** die Einträge der laufenden Woche (Montag bis Sonntag), die
  neuesten zuerst. **Alle Einträge (N) ›** öffnet Fahrten → Einträge.
- **Datensicherung:** eine Zeile mit dem Datum der letzten Sicherung und
  „Jetzt sichern“ (siehe „Datensicherung“). Liegt die letzte Sicherung mehr als
  30 Tage zurück, steht zusätzlich oben der Hinweis „Datensicherung fällig“.
- **Liste aller Einträge** (Reiter Fahrten → Einträge): die neuesten zuerst,
  abgeschlossene Zeiträume zusammengefasst (siehe unten), darunter
  „+ Eintrag“. Antippen eines Eintrags öffnet die Detailansicht.
- **Markierungen in der Liste:**
  - Importierte Wochensummen tragen das Abzeichen **Woche**.
  - Einträge mit 0 km erscheinen grau als **keine Fahrt**.
  - Einträge vor dem Startdatum werden angezeigt, zählen aber nicht zum
    Kilometerstand.

### Zusammenfassung der Einträge

Gespeichert wird weiterhin jeder Eintrag einzeln, nur die Anzeige fasst
zusammen:

- **Woche** (Montag bis Sonntag): wird erst nach ihrem Ende, also ab Montag
  0:00 Uhr, zu einer Zeile zusammengefasst. Bis dahin erscheinen die
  einzelnen Einträge.
- **Monat:** wird zusammengefasst, wenn auch seine letzte Woche abgeschlossen
  ist. Beispiel: Oktober 2026 (letzte Woche 26.10.–01.11.) ab Montag,
  02.11.2026. Bis dahin erscheint er als Wochenzeilen.
- **Jahr:** ebenso, wenn seine letzte Woche abgeschlossen ist. Beispiel:
  2026 ab Montag, 04.01.2027. Bis dahin erscheint es als Monats- bzw.
  Wochenzeilen.
- **Summen nach Kalenderdatum:** Jeder Eintrag zählt zu Monat und Jahr seines
  Datums. Eine Woche über einen Monats- oder Jahreswechsel erscheint in
  beiden Monaten als **Teilwoche**, z. B. „KW 44 (Teil)“ mit 26.10.–31.10.
  im Oktober und 01.11.–01.11. im November. Die Kalenderwoche wird nach ISO
  8601 gezählt.
- **Antippen** einer Zeile (irgendwo in der Zeile) klappt die nächste Ebene
  auf: Jahr → Monate → Wochen → Einträge. Der Pfeil zeigt › (zugeklappt) bzw.
  ⌄ (aufgeklappt). Importierte Wochensummen erscheinen in ihrer Woche als ein
  Eintrag.

### Erst lesen, dann ändern

Antippen eines Eintrags, eines erledigten Auftrags oder eines Mangels
zeigt ihn zunächst nur an. Erst **Ändern** öffnet das Formular. **Löschen**
gibt es nur im Formular, immer mit Rückfrage. Das Erfassen über eine Vorlage
bleibt bei zwei Klicks (Vorlage antippen, Speichern).

### Rückgängig

Nach dem Löschen eines Eintrags, eines Auftrags, eines
Mangels oder einer Vorlage, nach „Keine Fahrt“, einer Rückmeldung zur Kleidung,
„Wetter nachtragen …“, dem Speichern eines geänderten erledigten Auftrags
(„Auftrag bearbeiten“), dem Entfernen einer Kleidungsstufe oder eines
Regenzusatzes und „Auf Standard zurücksetzen“ (Kleidung, Ampel-Grenzen)
erscheint unten 12 Sekunden lang eine Meldung mit **Rückgängig**. Damit kommt der alte Stand vollständig zurück, auch die
Verknüpfungen (z. B. die Mängel eines gelöschten Auftrags). Jede
weitere Änderung beendet das Angebot, damit sie nicht überschrieben wird.

### Vorlagen

Die Vorlagen sind ein Bereich in den **Einstellungen**. Dort kannst du sie
anlegen, bearbeiten, löschen, und mit ▲/▼ die Reihenfolge ändern. Auf der
Übersicht stehen sie weiterhin als Schaltflächen unter „Heute erfassen“.
Jeder Eintrag speichert seine Kilometer und den Namen der Vorlage selbst. Das
Ändern oder Löschen einer Vorlage verändert also keine bestehenden Einträge.

**Arbeitsweg:** Vorlagen für den Weg zur Arbeit bekommen das Häkchen
„Arbeitsweg“. Beim Erfassen übernimmt der Eintrag das Merkmal (wie die km).
Setzt oder entfernst du das Häkchen an einer Vorlage, fragt die App, ob die
bisherigen Einträge mit dieser Vorlage (gleicher Name) ebenfalls angepasst
werden sollen. Ohne deine Zustimmung bleiben sie unverändert.

### Wetter

Der Reiter **Wetter** zeigt für deine Fahrten zur Arbeit, wie das Wetter wird,
was du anziehen sollst und ob amtliche Warnungen bestehen.

- **Orte** (Einstellungen → Orte und Strecke): Wohnort, Arbeitsort und optional ein
  weiterer Ort (z. B. Urlaub). Antippen öffnet das Formular:
  - **Ort suchen:** Namen eingeben, „Suchen“ (oder Eingabetaste), Treffer
    antippen.
  - **📍 Aktueller Standort:** übernimmt den Standort des iPhones (es fragt
    einmal nach der Erlaubnis). Den Namen vergibst du selbst.
  - **Koordinaten direkt:** Breite und Länge in Grad eingeben, z. B. `51,1234`
    und `10,4567` (Komma oder Punkt, Süd und West mit Minus). Suche und Standort
    tragen ihre Koordinaten in dieselben Felder ein.
  - Die Koordinaten werden mit 4 Nachkommastellen gespeichert (ca. 10 m); an die
    Wetterdienste gehen sie auf 3 Nachkommastellen gerundet (ca. 100 m), siehe
    „Was geht beim Wetter ins Netz?“.
  - **🗺️ In Karten zeigen:** öffnet Apple Karten an dieser Stelle, mit dem Namen
    als Beschriftung der Markierung. Der Knopf nimmt die Werte aus den Feldern,
    so lässt sich z. B. ein Suchtreffer vor dem Speichern prüfen; ohne gültige
    Koordinaten ist er gesperrt. Es gibt keine eingebettete Karte; erst das
    Antippen schickt Koordinaten und Name an Apple.
  - **Weiterer Ort „aktiv“:** Dann zeigt der Reiter das Wetter dort für heute
    und morgen, ohne Hin- und Rückfahrt. Ausschalten mit dem Schalter in den
    Einstellungen oder mit „Zurück zu Wohn- und Arbeitsort“ im Reiter.
- **Wegpunkte** (Einstellungen → Orte und Strecke, zwischen Wohn- und Arbeitsort): bis zu
  3 Punkte auf deinem Weg, in Fahrtrichtung der Hinfahrt. **+ Wegpunkt** öffnet
  dasselbe Formular wie bei den Orten (Suche, Standort oder Koordinaten mit 4
  Nachkommastellen, „In Karten zeigen“); ein neuer Wegpunkt kommt direkt vor den
  Arbeitsort, mit ▲/▼ änderst du die Reihenfolge, im Formular entfernst du ihn.
  - Aus Wohnort, Wegpunkten und Arbeitsort ergeben sich bis zu 4
    **Teilstrecken** (berechnet mit den genauen gespeicherten Koordinaten).
    Darunter stehen sie mit Länge (Luftlinie) und Richtung,
    z. B. „Musterdorf → Ecke · 14 km Luftlinie nach Ost“, je mit dem Haken
    **zählt für den Wind** (sofort gespeichert). Nimm z. B. eine Strecke durch
    ein Wohngebiet heraus.
  - Ein neuer Wegpunkt teilt die letzte Teilstrecke; beide Teile zählen wie
    bisher. Wird ein Wegpunkt entfernt, werden seine beiden Teilstrecken eine,
    die zählt, wenn eine der beiden zählte. Beim Verschieben bleiben die Haken
    an ihrer Stelle.
  - Wegpunkte zählen erst, wenn Wohn- und Arbeitsort festgelegt sind. Sie
    bleiben wie alle Orte nur auf dem Gerät (und in der Sicherung).
- **Fahrzeiten** (Einstellungen → Wetter), je Hin- und Rückfahrt:
  - **Zeitraum**, Standard 06:00–07:00 und 16:00–17:00: Dafür gelten Ampel,
    Kleidung und Wind.
  - **Übliche Abfahrt**: Schalter (Standard an) und darunter die Uhrzeit
    (Standard 06:00 bzw. 16:00, nur bei „an“ bedienbar), dazu die **Dauer** der
    Fahrt (Standard 60 Minuten): für das beste Abfahrtsfenster. Aus = keine
    übliche Abfahrt; die Uhrzeit bleibt für das nächste Einschalten. (Das
    Uhrzeitfeld lässt sich auf dem iPhone nicht leeren; ein „Zurücksetzen“ ändert
    die Uhrzeit nicht.)
- **Welcher Tag:** Bis zum Ende der Rückfahrt (Standard 17:00) zählt der
  heutige Tag, danach der morgige. Hin- und Rückfahrt mit Ampel, Kleidung und
  Wind gibt es nur, wenn dieser Tag ein Fahrtag ist (siehe „Fahrtage“), für
  einen Fahrtag also vom Ende der Rückfahrt am Vortag bis zum Ende der
  Rückfahrt am Fahrtag. Nach dem Ende der Hinfahrt ist sie als „vorbei“
  zurückgenommen.
- **Zu allen übrigen Zeiten: „Jetzt“** (spontane Runde). Statt Hin- und
  Rückfahrt zeigt der Reiter das Wetter für eine Fahrt ab jetzt:
  - Überschrift mit dem heutigen Tag, z. B. **„Heute, Sa 31.10. – kein
    Fahrtag“**; „– kein Fahrtag“ nur, wenn heute keiner ist (Fr 18:00: „Heute,
    Fr 30.10.“).
  - Darunter der Ort, z. B. **„📍 Musterdorf (Wohnort)“** bzw. **„📍 Stadt
    Beispielbad (aktueller Standort)“**, mit dem Umschalter **Wohnort /
    Aktueller Standort** (ein Tipp speichert die Einstellung, siehe unten).
  - Die Karte **„Jetzt“**, z. B. „Jetzt 10:00–11:00“: Die Fahrt beginnt mit der
    laufenden Viertelstunde (10:07 → 10:00) und dauert so lange wie die
    Hinfahrt (Standard 60 Minuten). Sie zeigt wie eine Fahrt am Fahrtag Ampel mit
    Begründung, Werte (Temperatur, gefühlt, Regen), Kleidung nach dem
    Zwiebelprinzip, die erste Zeile zum Wind mit Himmelsrichtung und Böen (z. B.
    „🧭 Wind 20 km/h aus West, Böen bis 35 km/h“; Zeilen je Teilstrecke gibt es
    nicht, da die Richtung der Fahrt unbekannt ist) und, wenn nötig, das beste
    Abfahrtsfenster.
  - Darunter der Hinweis, ab wann es die Empfehlung gibt, z. B. **„Empfehlung
    für Mo 02.11. ab So 17:00“** (am Vortag selbst „ab heute 17:00“), dann die
    amtlichen Warnungen, Stand, „Aktualisieren“ und die Quellen.
  - Beispiel mit den Fahrtagen Mo, Di, Fr: Freitag bis 17:00 die Fahrten am
    Freitag; von Freitag 17:00 bis Sonntag 17:00 „Jetzt“; ab Sonntag 17:00 Hin-
    und Rückfahrt am Montag.
- **Wetter außerhalb der Fahrten** (Einstellungen → Wetter außerhalb der Fahrten, auch im Reiter per
  Tipp): **Wohnort** (Standard) oder **aktueller Standort**.
  - Der Standort wird über die Ortung des iPhones bestimmt (es fragt beim ersten
    Mal nach der Erlaubnis) – nur, während die Ansicht „Jetzt“ auf der Übersicht
    oder im Reiter Wetter angezeigt wird: beim Start, beim Wechsel in diese
    Reiter, beim Zurückkehren in die App, beim Umschalten und mit
    „Aktualisieren“. Eine Ortung darf bis zu 5 Minuten alt sein; neu geladen wird
    das Wetter, wenn sich der Standort um mehr als 1 km geändert hat oder die
    Daten zu alt sind.
  - Der Name kommt aus der Gemeinde des DWD (Warnzellen-Abfrage), z. B. „Stadt
    Beispielbad (aktueller Standort)“; außerhalb Deutschlands steht „Aktueller
    Standort“.
  - Ohne Freigabe, Ortung oder Netz zeigt die App den Wohnort mit kurzem Hinweis,
    z. B. „Standort nicht freigegeben – angezeigt wird das Wetter am Wohnort.“
    Nach einer Ablehnung fragt sie erst beim Umschalten oder mit „Aktualisieren“
    wieder.
  - Koordinaten und Name des Standorts werden nicht gespeichert (siehe „Was geht
    beim Wetter ins Netz?“).
- **Je Fahrt:** Ampel mit kurzer Begründung, die Werte (niedrigste Temperatur
  und gefühlte Temperatur, Regenwahrscheinlichkeit und Niederschlag),
  Kleidung, Wind mit Böen und, wenn nötig, das beste Abfahrtsfenster.
- **Ampel:** Geprüft wird die Fahrzeit an Wohnort, Wegpunkten und Arbeitsort;
  es zählt der ungünstigste Wert. Die Grenzen (Standardwerte in der Tabelle) lassen sich
  unter **Einstellungen → Wetter → Ampel-Grenzen** ändern.

  | Farbe | Wann |
  |---|---|
  | rot | amtliche Warnung vor Gewitter oder Glätte (jede Stufe) oder eine andere Warnung ab Stufe 2 · Gewitter vorhergesagt (Wettercode 95–99) · Glätte (siehe unten) · Böen ab 60 km/h · Niederschlag ab 5 mm/h |
  | gelb | amtliche Warnung der Stufe 1 · Regenwahrscheinlichkeit ab 50 % · Niederschlag ab 0,5 mm/h · Böen ab 40 km/h · Temperatur unter 0 °C |
  | grün | sonst |

  - Die Begründung nennt höchstens drei Gründe mit Uhrzeit, rote zuerst, z. B.
    „gelb: 70 % Regen ab 16:30, Böen 45 km/h“. Amtliche Warnungen stehen vor
    den Gründen aus der Vorhersage.
  - Bei Grün steht nur „trocken“ bzw. „kaum Regen“. Böen erscheinen in der
    Ampelzeile nur, wenn sie die Ampel gelb oder rot machen; sonst stehen sie
    nur in der Zeile zum Wind.
  - Niederschlag in mm/h ist die Menge einer Viertelstunde mal 4.
  - Eine Wahrscheinlichkeit für Gewitter liefert das Vorhersagemodell nicht;
    „hohe Wahrscheinlichkeit“ heißt hier: Das Modell sagt Gewitter vorher.
  - Hitze- und UV-Warnungen erscheinen nur in der Liste der Warnungen („nur
    zur Info“), nicht in der Ampel.
- **Glätte aus der Vorhersage:** gefrierender Regen oder Sprühregen
  (Wettercode 56, 57, 66, 67), oder kalt und nass: Luft höchstens 1 °C oder
  Boden höchstens 0 °C, dazu Niederschlag während der Fahrt oder in den 6
  Stunden davor („nasse Straße“).
- **Kleidung** nach der niedrigsten gefühlten Temperatur der Fahrt (sie
  enthält schon Wind, Luftfeuchte und Sonne), je Körperbereich. Im Reiter steht
  sie Zeile für Zeile (Kopf, Hals, Hände, Oberkörper, Beine, Füße); leere
  Bereiche (nichts anzuziehen) entfallen dort, damit die Karte kompakt bleibt.
  Standardstufen (– = nichts):

  | Gefühlte Temperatur | Kopf | Hals | Hände | Oberkörper | Beine | Füße |
  |---|---|---|---|---|---|---|
  | ab 20 °C | – | – | – | T-Shirt | kurze Hose | Sneakersocken |
  | 15–20 °C | – | – | – | T-Shirt, leichter Pullover | Hose | Sneakersocken |
  | 11–15 °C | – | – | – | T-Shirt, warmer Pullover | Hose | Socken |
  | 7–11 °C | leichte Mütze | – | Unterziehhandschuhe (bei Regen: Übergangshandschuhe) | 2 T-Shirts, warmer Pullover | Hose | Socken |
  | 3–7 °C | mittlere Mütze | Schal | Übergangshandschuhe | T-Shirt, leichter Pullover, warmer Pullover | Hose | Socken |
  | −1–3 °C | warme Mütze | Schal | Unterziehhandschuhe, Übergangshandschuhe | T-Shirt, leichter Pullover, Regenjacke als Windschutz | Hose | Socken |
  | −6–−1 °C | warme Mütze, leichte Mütze | Schal, Tuch | Winterhandschuhe | 2 T-Shirts, warmer Pullover, Regenjacke als Windschutz | Hose, Regenhose als Windschutz | Socken, Gamaschen |
  | unter −6 °C | warme Mütze, mittlere Mütze | Schal, Tuch | Unterziehhandschuhe, Winterhandschuhe | 2 T-Shirts, leichter Pullover, warmer Pullover, Regenjacke als Windschutz | lange Unterhose, Hose, Regenhose als Windschutz | 2 Paar Socken, Gamaschen |

  - Ein Grenzwert gehört zum Bereich darüber: genau 20 °C ergibt die Stufe
    „ab 20 °C“, 19,9 °C die nächste Stufe.
  - **Regenzusatz** (Standard): ab 40 % Regenwahrscheinlichkeit Regenjacke
    (Oberkörper); ab 60 % zusätzlich Regenhose (Beine) und Gamaschen (Füße).
  - **Zwiebelprinzip bei Regen**, je Bereich:
    - Kopf und Hals: immer wie in der Stufe.
    - Hände: wie in der Stufe (Übergangs- und Winterhandschuhe sind
      regenfest). Hat die Stufe **Hände bei Regen** (Standard: ab 7 °C
      Übergangshandschuhe), gilt das, sobald ein Regenzusatz greift.
    - Oberkörper, Beine, Füße: Kommt Regenzeug dazu, das noch nicht in der
      Stufe steht, wird es angehängt. Besteht der Bereich der Stufe aus
      mehreren Teilen (durch Komma getrennt), gilt darunter die Kleidung der
      nächstwärmeren Stufe (eine Schicht weniger); bei einem Teil (z. B.
      „Hose“, „Socken“) bleibt er. Steht das Regenzeug schon in der Stufe
      (z. B. „Regenjacke als Windschutz“), bleibt der Bereich unverändert. In
      der wärmsten Stufe kommt nur das Regenzeug dazu.
    - Regenzeug für Kopf, Hals oder Hände (falls du welches einträgst) wird nur
      angehängt.
    - Beispiele: 8 °C, 45 %: Hände Übergangshandschuhe, Oberkörper „T-Shirt,
      warmer Pullover, Regenjacke“. 8 °C, 70 %: dazu Beine „Hose, Regenhose“,
      Füße „Socken, Gamaschen“. 16 °C, 70 %: Oberkörper „T-Shirt, Regenjacke“,
      Beine „Hose, Regenhose“, Füße „Sneakersocken, Gamaschen“. 0 °C, 70 %:
      Oberkörper unverändert, Beine „Hose, Regenhose“, Füße „Socken,
      Gamaschen“.
    - Im Reiter sind die wegen Regen angepassten Bereiche mit ☔ markiert.
  - Braucht die Rückfahrt andere Kleidung, steht ein Hinweis darunter, z. B.
    „Für die Rückfahrt einpacken: Regenhose, Gamaschen; nicht mehr nötig:
    Schal.“
- **Kleidung anpassen** (Einstellungen → Wetter → Kleidung): Oben der Schalter
  **Rückmeldung zur Kleidung**, darunter die Stufen von warm nach kalt mit ihrer
  Kleidung und der Auswertung der Rückmeldungen, dann der Regenzusatz.
  - Antippen einer Stufe öffnet ihr Formular: Grenze („ab … °C“; die letzte
    Stufe gilt darunter), die sechs Bereiche (leer = nichts; mehrere Teile mit
    Komma) und optional **Hände bei Regen**. **Speichern** übernimmt sie sofort
    und führt zurück zur Liste. Die Stufen werden nach ihrer Grenze sortiert;
    eine Grenze darf es nur einmal geben, mindestens ein Bereich muss
    ausgefüllt sein.
  - **+ Stufe** legt eine neue Stufe an (vorgeschlagen 3 °C unter der
    kältesten Grenze), **Stufe entfernen** im Formular entfernt sie (mit
    Rückfrage und „Rückgängig“; mindestens zwei bleiben). Wird die letzte
    entfernt, gilt die Stufe davor darunter.
  - Der Regenzusatz ebenso: Schwelle in % und das Regenzeug je Bereich; eine
    Schwelle gibt es nur einmal.
  - **Auf Standard zurücksetzen** stellt Stufen und Regenzusatz aus der Tabelle
    oben wieder her (mit Rückfrage und „Rückgängig“); der Schalter und deine
    Rückmeldungen bleiben.
- **Rückmeldung nach der Fahrt:** „Wie war die Kleidung?“ mit **zu warm**,
  **passte** und **zu kalt** – im Reiter Wetter für die vorbeigegangenen
  Fahrten von heute und den zwei Tagen davor (höchstens zwei auf einmal) und in
  der Detailansicht jedes Eintrags mit gespeichertem Wetter. Sie bezieht sich
  auf die tatsächlich empfohlene Kleidung (mit Zwiebelprinzip).
  - Die Rückmeldung wird je Fahrt gespeichert (mit „Rückgängig“) und
    **verschiebt keine Grenzen**. Eine geänderte Rückmeldung ersetzt die
    vorige.
  - **Auswertung** je Stufe in den Kleidungsregeln, z. B. „3× zu kalt, 1×
    passte (bei Regen: 1× zu kalt)“; die Meldung nach einer Rückmeldung nennt
    den neuen Stand. Rückmeldungen zu Stufen, die es nicht mehr gibt (z. B. die
    Stufen von 4b), stehen gesammelt als „… Rückmeldungen zu früheren Stufen“.
  - **Schalter „Rückmeldung zur Kleidung“** aus: Die Karte „Wie war die
    Kleidung?“ und die Knöpfe in der Detailansicht verschwinden; eine schon
    gegebene Rückmeldung steht dort nur noch als Text. Rückmeldungen und
    Auswertung bleiben erhalten; nach dem Wiedereinschalten ist alles wieder da.
- **Wetter je Eintrag:** Speicherst du einen Eintrag mit Arbeitsweg und mehr
  als 0 km, übernimmt die App aus der geladenen Vorhersage je Hin- und
  Rückfahrt die Werte (Temperatur, gefühlt, Regen, Wind, Böen), die Ampel und
  die empfohlene Kleidung – sofern die Vorhersage den Tag abdeckt und für die
  aktuellen Wohn- und Arbeitsorte geladen ist. Die gespeicherte Ampel kommt nur
  aus den Wetterwerten, ohne amtliche Warnungen (die gibt es im Rückblick
  nicht). Gespeichert wird die tatsächlich empfohlene Kleidung (je Bereich, mit
  Zwiebelprinzip), auch wenn du die Regeln später änderst. Die Detailansicht des
  Eintrags zeigt das Wetter, die Kleidung in einer Zeile und „Wie war die
  Kleidung?“. Sind Wegpunkte festgelegt, zählen deren Werte mit.
  - Beim Ändern eines Eintrags bleibt das Wetter bei gleichem Datum; bei
    neuem Datum holt die App es neu aus der Vorhersage, ohne Arbeitsweg
    entfällt es.
  - Andere Einträge (ohne Arbeitsweg, 0 km, Wochensummen) bekommen kein
    Wetter.
- **Wetter nachtragen …** (Statistik): holt für vergangene Fahrten zur Arbeit
  ohne Wetter oder mit dem Wetter aus der Vorhersage das Wetter aus dem
  **Rückblick** von Open-Meteo (archivierte Vorhersagen desselben Modells, ab
  2022). Die App fragt vorher nach (Anzahl, Zeitraum, was gesendet wird) und
  fragt je bis zu 31 Tage auf einmal ab, mit den aktuellen Wohn- und
  Arbeitsorten und Wegpunkten. Empfohlene Kleidung und Rückmeldungen bleiben,
  damit die Auswertung stimmt. Danach gibt es „Rückgängig“. Ohne Netz oder bei einem
  Fehler bleiben deine Daten unverändert; bricht der Abruf mittendrin ab, wird
  das schon Geholte übernommen und die Meldung sagt es.
- **Amtliche Warnungen:** alle Warnungen des DWD für den angezeigten Tag mit
  Stufe (1 Wetterwarnung bis 4 extremes Unwetter), Zeitraum, betroffenen Orten
  (auch Wegpunkten, z. B. „Wohnort, Wegpunkt 1“) und Text. In der Ansicht „Jetzt“
  nur die für den angezeigten Ort (Wohnort bzw. aktueller Standort), von jetzt
  bis zum Ende des Tages (bei einer Fahrt über Mitternacht bis zu deren Ende). Dieselbe Warnung an
  mehreren Orten steht nur einmal da. Darunter steht, woher sie gerade kommen („Quelle: Deutscher
  Wetterdienst“ bzw. „Bright Sky (Ersatz, Daten des DWD)“), das Warngebiet
  (Gemeinde) und der Stand. Liegt ein Ort außerhalb Deutschlands, steht das
  dabei.
- **Bestes Abfahrtsfenster:** Ist die Fahrzeit nicht durchgehend grün, prüft
  die App Abfahrten im 15-Minuten-Raster von 30 Minuten vor bis 30 Minuten
  nach der Fahrzeit, jeweils mit der Dauer der Fahrt. Eine Zeitleiste zeigt die
  Ampel jeder Viertelstunde; die beste Fahrt ist umrandet.
  - Mit üblicher Abfahrt: „Abfahrt 15:45 statt 16:00: trocken, Gewitter erst
    ab 16:45“, oder „Keine bessere Abfahrt zwischen 15:30 und 16:30.“
  - Ohne übliche Abfahrt: „Beste Abfahrt 15:45: trocken · meiden: 16:45–17:30
    (Gewitter)“.
  - Am selben Tag zählen nur Abfahrten, die noch kommen.
  - In der Ansicht „Jetzt“: Abfahrten von jetzt bis eine Stunde später, z. B.
    „Abfahrt 11:00 statt jetzt: trocken, 70 % Regen nur bis 11:00“ oder „Keine
    bessere Abfahrt bis 11:00.“
- **Wind:** In jeder Fahrt-Karte (Hin- und Rückfahrt, „Jetzt“) steht zuerst
  eine Zeile mit dem mittleren Wind der Fahrzeit, der Himmelsrichtung, aus der er
  kommt, und den Böen (Höchstwert), z. B. **„🧭 Wind 15 km/h aus Südwest, Böen
  bis 36 km/h“**. Sie gilt für alle Orte der Strecke (Wohnort, Wegpunkte,
  Arbeitsort), in der Ansicht „Jetzt“ für den angezeigten Ort.
  - **Je Teilstrecke** steht am Fahrtag darunter, eingerückt, eine eigene Zeile
    mit der Richtung relativ zur Fahrtrichtung und der Stärke, z. B.
    „Musterdorf → Ecke: schräg von hinten rechts 16 km/h“, und zwar seit
    Release 5a zweizeilig: der Name der Teilstrecke („Musterdorf → Ecke“) klein,
    darunter eingerückt in normaler Schrift die Windangabe („schräg von hinten
    rechts 16 km/h“). Grundlage sind die
    Richtung der Teilstrecke (Luftlinie, ohne Wegpunkte von Wohn- zu
    Arbeitsort) und der mittlere Wind der Fahrzeit an ihren beiden Enden. Die
    Stärke ist die volle mittlere Windgeschwindigkeit dort (nicht nur der Anteil
    in Fahrtrichtung). Auch ohne Wegpunkte gibt es eine solche Zeile
    („Musterdorf → Beispielstadt: Gegenwind 20 km/h“).
  - **Acht Abschnitte** zu je 45°: Gegenwind, schräg von vorn links, schräg von
    vorn rechts, von links, von rechts, schräg von hinten links, schräg von
    hinten rechts, Rückenwind. Gegenwind reicht bis 22,5° beiderseits der
    Fahrtrichtung, schräg von vorn bis 67,5°, von links/rechts bis 112,5°,
    schräg von hinten bis 157,5°, darüber Rückenwind. Ein Wind genau auf einer
    Grenze zählt zum Abschnitt weiter vorn (dem ungünstigeren), z. B. 22,5° als
    Gegenwind.
  - Teilstrecken, die nicht für den Wind zählen, werden nicht erwähnt. Zählt
    keine, ohne Arbeitsort und in der Ansicht „Jetzt“ (Richtung der Fahrt
    unbekannt) steht nur die erste Zeile.
  - Die Rückfahrt zeigt die Teilstrecken in umgekehrter Reihenfolge und
    Richtung, z. B. „Beispielstadt → Ecke: schräg von vorn rechts 14 km/h“.
  - **Schwacher Wind** (unter 10 km/h) mit Richtung und dem Zusatz
    „(schwach)“: „🧭 Wind 4 km/h aus Südwest (schwach), Böen bis 12 km/h“ und
    „Ecke → Beispielstadt: Gegenwind 4 km/h (schwach)“. Es entscheidet der
    angezeigte, gerundete Wert (9 km/h ist schwach, 10 km/h nicht). Bei
    gerundet 0 km/h steht **„Windstill“** ohne Richtung, je Teilstrecke
    „windstill“.
  - Beispiel mit dem Wegpunkt „Ecke“ (erst nach Ost, dann nach Nord) bei
    Südwestwind:

    ```
    Hinfahrt:  🧭 Wind 15 km/h aus Südwest, Böen bis 36 km/h
                  Musterdorf → Ecke: schräg von hinten rechts 16 km/h
                  Ecke → Beispielstadt: schräg von hinten links 14 km/h
    Rückfahrt: 🧭 Wind 15 km/h aus Südwest, Böen bis 36 km/h
                  Beispielstadt → Ecke: schräg von vorn rechts 14 km/h
                  Ecke → Musterdorf: schräg von vorn links 16 km/h
    ```
  - Nur zur Info, nicht in der Ampel. Die Kachel in der Übersicht zeigt keinen
    Wind (nur Ampeln und den wichtigsten Grund, z. B. Böen). Bei vergangenen
    Fahrten steht nur die Ampel.
- **Laden und Stand:** Die App lädt beim Start, beim Wechsel in Übersicht oder
  Wetter und beim Zurückkehren in die App neu, wenn die Vorhersage älter als 15
  Minuten oder die Warnungen älter als 10 Minuten sind; sonst mit
  „Aktualisieren“. Unten steht der Stand, z. B. „Stand: Vorhersage 20:15 Uhr ·
  Warnungen 20:15 Uhr“.
- **Wenn eine Quelle ausfällt:**
  - DWD nicht erreichbar: Die Warnungen kommen über Bright Sky; ein Hinweis
    sagt das.
  - Keine Warnungen erreichbar: Hinweis „Amtliche Warnungen nicht erreichbar“;
    die Ampel berücksichtigt dann nur die Vorhersage.
  - Vorhersage nicht erreichbar: Hinweis; die Warnungen werden weiter
    angezeigt.
  - Ohne Netz oder älter als 2 Stunden: der letzte Stand mit Zeitstempel,
    deutlich als „nicht aktuell“ gekennzeichnet.
- **Quellen:** Vorhersage von Open-Meteo.com (Modell ICON des Deutschen
  Wetterdienstes, in Deutschland im 15-Minuten-Raster), amtliche Warnungen vom
  GeoServer des Deutschen Wetterdienstes, bei dessen Ausfall über Bright Sky.

### Wartung

Seit Release 5a arbeitet der Reiter Wartung wie eine kleine Werkstatt (angelehnt
an die Instandhaltung: Auftrag – Vorgang – Meldung).

- **Aufbau des Reiters** (seit Release 5b): oben „+ Mangel“, „+ Reparatur“ und
  „+ Eigenleistung“, darunter der Umschalter **Aktuell | Verlauf**. „Aktuell“
  zeigt, was zu tun ist, „Verlauf“ die erledigten Aufträge und Mängel. Ganz
  unten führt **Wartungsarten verwalten ›** zu Einstellungen → Wartungsarten.

- **Wartungsarten** gibt es in zwei Arten:
  - **Auftrag**, z. B. Erstinspektion (einmalig), Kleine und Große Inspektion
    (mit Intervall bzw. jährlichem Zeitfenster), Reparatur und Eigenleistung
    (ohne Intervall, werden bei Bedarf angelegt). Nur Aufträge haben einen
    Termin.
  - **Aufgabe**, z. B. „Ölwechsel Nabe“, „Bremsbeläge wechseln“, „Reifen und
    Schlauch wechseln vorn“. Mit eigenem Intervall (km und/oder Monate), einem
    **Bauteil** (Textfeld mit Auswahlliste aus den bisher verwendeten Bauteilen,
    z. B. „Bremse vorn“) und einer **Standard-Zuordnung**: ein bestimmter Auftrag
    (z. B. „Große Inspektion“) oder „nächste Inspektion“. Eine Aufgabe hat
    keinen eigenen Termin; erledigt wird sie als Position eines Auftrags.
  - Bei einer Neuinstallation voreingestellt: Erstinspektion (einmalig, 3 Monate
    oder 300 km), Kleine Inspektion (Zeitfenster März–April), Große Inspektion
    (Zeitfenster Oktober–November), Reparatur und Eigenleistung; keine Aufgaben.
  - Die Art (Auftrag oder Aufgabe) lässt sich nur ändern, solange die
    Wartungsart in keinem Auftrag und keiner Position verwendet wird; sonst
    erklärt das Formular, warum nicht. Ein Auftrag, der Standard-Zuordnung einer
    Aufgabe ist, wird nicht zur Aufgabe. Verwendete Wartungsarten lassen sich
    nicht löschen (Umbenennen geht jederzeit); wird ein Auftrag gelöscht, der
    Standard-Zuordnung war, bekommen diese Aufgaben „nächste Inspektion“.
- **Fälligkeit:**
  - Bei km und Monaten gilt, was zuerst eintritt. Grundlage ist die letzte
    Erledigung (Datum und Kilometerstand des Auftrags), ohne Erledigung das
    Startdatum mit dem Start-Kilometerstand.
  - Bei Aufträgen mit Zeitfenster gilt immer das Zeitfenster; die Monate
    werden nicht ausgewertet. Ein km-Intervall gibt dann nur einen **Hinweis**,
    wenn die km-Grenze vor dem Ende des Fensters erreicht wird, z. B. „Hinweis:
    km-Grenze (ca. 4.000 km) voraussichtlich schon im Februar 2027 erreicht“.
  - Große und Kleine Inspektion (wie alle Aufträge) laufen unabhängig
    voneinander: Es zählen nur die erledigten Aufträge derselben Art.
  - Die Texte sind dieselben wie bisher (siehe unten „Fälligkeit mit
    Zeitfenster“ und „Fälligkeit mit Intervall“).
- **Offene Aufträge:** Status „geplant“, optional mit Termin (Datum, auf
  Wunsch mit Uhrzeit), Werkstatt und Notiz.
  - **Uhrzeit:** Im Formular „Termin planen“ bzw. „Termin ändern“ den Schalter
    **„Mit Uhrzeit“** einschalten und die Uhrzeit wählen. Ohne Uhrzeit gilt der
    Termin ganztägig. Angezeigt wird z. B. „Termin am 20.11.2026 um 09:30 Uhr
    bei Beispiel-Werkstatt“. „Termin entfernen“ und „Erledigt eintragen“
    entfernen auch die Uhrzeit.
  - **In Kalender übernehmen:** In der Ansicht eines geplanten Auftrags mit
    Termin steht der Knopf **„📅 In Kalender übernehmen“**. Er zeigt den Termin
    (Titel, Tag, ganztägig bzw. Uhrzeit, Erinnerung) und bietet zwei Wege:
    - **„Im Kalender öffnen“** öffnet die Kalenderdatei (`.ics`); iOS zeigt
      den Termin, ein Tipper auf **„Hinzufügen“** übernimmt ihn.
    - **„Als Datei teilen …“** öffnet das Teilen-Menü mit der Datei (z. B. in
      „Dateien“ sichern und von dort öffnen); ohne Teilen-Menü wird sie
      heruntergeladen.
    - Welcher Weg in der App auf dem Home-Bildschirm zuverlässig funktioniert,
      wird noch auf dem iPhone geprüft; der andere entfällt später.
    - Inhalt: Titel „Kleine Inspektion – Werkstatt“ (ohne Werkstatt nur der
      Name), Termin ganztägig bzw. 1 Stunde ab der Uhrzeit (Ortszeit),
      Beschreibung mit den Positionen (Aufgaben mit Bauteil, Mängel mit Datum),
      der Notiz und dem erwarteten Kilometerstand, Erinnerung **am Vortag um
      18:00**. Die Kennung (UID) ist je Auftrag fest. Hast du den Termin schon
      übernommen und dann geändert, übernimm ihn erneut und lösche im Kalender
      den alten Eintrag, falls er doppelt erscheint.
    - Die Kalenderdatei entsteht nur auf dem Gerät; es geht nichts ins Netz,
      und deine Daten bleiben unverändert.
  - Hat ein Auftrag mit Fälligkeit (Intervall, Zeitfenster oder einmalig) noch
    keinen geplanten Auftrag, zeigt die App trotzdem den nächsten (vorgemerkt,
    ohne Termin). Gespeichert wird er erst, wenn du etwas daran änderst (Termin,
    Position, Mangel). Nach „Erledigt eintragen“ erscheint so automatisch der
    nächste. Je Auftrag mit Fälligkeit gibt es höchstens einen geplanten;
    Reparaturen und Eigenleistungen können mehrere haben.
  - **„+ Reparatur“ / „+ Eigenleistung“** legen einen solchen Auftrag an
    (Termin optional).
  - **Zieldatum** eines offenen Auftrags: der Termin, sonst das Ende des
    Zeitfensters bzw. das Fälligkeitsdatum; liegt es vor heute oder fehlt es
    (Reparatur ohne Termin), gilt heute.
- **Positionen** eines Auftrags sind Aufgaben und Mängel.
  - **Standard-Zuordnung (nur berechnet):** Eine Aufgabe, die in keinem
    geplanten Auftrag steht, erscheint automatisch im Auftrag ihrer Zuordnung,
    wenn sie bis zu dessen Zieldatum fällig wird; „nächste Inspektion“ ist der
    früheste offene Auftrag mit Intervall, Zeitfenster oder einmalig (nicht die
    Reparatur). Die Zuordnung wird nicht gespeichert, sondern bei jeder Anzeige
    angewendet: Die App verändert deine Daten nicht von selbst, und eine
    geänderte Zuordnung oder ein geändertes Intervall wirkt sofort. In der
    Karte steht dann „nach Standard“.
  - Aufgaben, die erst nach dem Zieldatum aller passenden Aufträge fällig
    werden, stehen vorerst ohne Auftrag in der Liste der Aufgaben („noch kein
    Auftrag · Standard: …“), mit ihrer Fälligkeit.
  - Im Auftrag (Knopf **„Positionen“**) kannst du Aufgaben und Mängel
    **hinzufügen**, **entfernen** oder **zu einem anderen offenen Auftrag
    verschieben**. Eine entfernte Aufgabe nimmt die Standard-Zuordnung dort
    nicht wieder auf. Eine Aufgabe und ein Mangel stehen in höchstens einem
    geplanten Auftrag.
  - **Vorschläge:** Aufgaben, die bis zum Zieldatum fällig werden und noch
    keinem offenen Auftrag zugeordnet sind (oder nur nach Standard einem
    späteren), bietet die Karte an, z. B. „💡 Bremsbeläge wechseln bei ca. 5.000
    km fällig – zu diesem Auftrag nehmen? (sonst Große Inspektion)“ mit
    **„Mitnehmen“**.
- **Mängel:** einem offenen Auftrag zuordnen („Zu Auftrag …“); passt keiner,
  legt **„Reparatur anlegen“** eine geplante Reparatur mit diesem Mangel an
  (im Auswahlfenster wahlweise auch eine Eigenleistung).
- **Erledigt eintragen** (Abschluss):
  - Datum (der Termin, wenn er heute oder früher liegt, sonst heute),
    Werkstatt, Kilometerstand (aus den Einträgen berechnet, überschreibbar; mit
    „Berechneten Wert verwenden“ zurück) und Notiz.
  - Je Position „erledigt“ (abgehakt) oder „nicht gemacht“. Mit **„+ Aufgabe“**
    kommt eine weitere Aufgabe dazu (als „erledigt“ abgehakt), mit **×** fällt
    eine Position weg. Dazu lassen sich weitere offene Mängel abhaken, die
    dabei erledigt wurden.
  - Gespeichert wird **genau der angezeigte Stand der Positionen**, auch die
    nur nach Standard berechneten. Spätere Änderungen an Intervallen oder
    Zuordnungen verändern erledigte Aufträge nicht.
  - Erledigte Aufgaben beginnen ihr Intervall neu (Datum und Kilometerstand des
    Auftrags), erledigte Mängel werden geschlossen (mit dem Datum des Auftrags).
    Nicht gemachte Aufgaben tauchen wieder als Position bzw. Vorschlag auf,
    nicht gemachte Mängel bleiben offen und stehen wieder oben ohne Auftrag.
  - Eine erledigte Aufgabe verschwindet aus einem geplanten Auftrag nur, wenn
    dieser Auftrag ihre neueste Erledigung ist.
  - **„Erledigt eintragen“ in der Ansicht einer Aufgabe** fragt, wohin sie
    gehört:
    - **Neuer Auftrag** (z. B. Reifen in der Garage gewechselt): Auftragsart
      wählen – Eigenleistung ist vorgewählt, ebenso möglich sind Reparatur und
      andere Auftragsarten ohne Intervall. Danach das Formular „Erledigt“ mit
      dieser Position.
    - **Zu erledigtem Auftrag …**: Liste der erledigten Aufträge (neueste
      zuerst, mit Datum, Art und km). Es öffnet sich „Auftrag bearbeiten“ mit
      der Aufgabe als erledigter Position; gespeichert wird erst mit
      „Speichern“. Aufträge, in denen die Aufgabe schon erledigt ist, sind
      ausgegraut; steht sie dort als „nicht gemacht“, wird sie „erledigt“.
  - Ein erledigter Auftrag lässt sich ansehen, ändern und löschen (mit
    Rückfrage und „Rückgängig“; Mängel, die mit ihm erledigt wurden, sind dann
    wieder offen).
  - **Auftrag bearbeiten** (erledigter Auftrag, z. B. wenn die durchgeführten
    Arbeiten bisher nur in der Notiz stehen):
    - Je Position „erledigt“ oder „nicht gemacht“ und **×** zum Entfernen.
    - **„+ Aufgabe“**: alle Aufgaben, die noch nicht in diesem Auftrag stehen;
      die neue Position ist „erledigt“ (Haken weg = „nicht gemacht“). Eine
      Aufgabe steht höchstens einmal im Auftrag.
    - **„+ Mangel“**: offene Mängel ohne Auftrag, die bis zum Datum des
      Auftrags erfasst wurden. Beim Speichern wird der Mangel mit dem Datum
      des Auftrags geschlossen. Wird eine Mangel-Position entfernt oder
      abgewählt, ist der Mangel wieder offen (wie beim Löschen des Auftrags).
    - Nach dem Speichern gilt die Fälligkeit der betroffenen Aufgaben ab Datum
      und Kilometerstand dieses Auftrags (bzw. wieder ohne ihn), sofern es keine
      spätere Erledigung gibt. Die Meldung „Auftrag gespeichert“ hat
      **„Rückgängig“**; „Abbrechen“ verwirft alle Änderungen im Formular.
- **Reihenfolge im Reiter Wartung:**
  1. „Bitte Wartungsarten prüfen“ (nur nach der Umwandlung, siehe unten).
  2. „+ Mangel“, „+ Reparatur“, „+ Eigenleistung“ und der Umschalter
     „Aktuell | Verlauf“. In „Aktuell“:
  3. Offene Mängel ohne Auftrag (nur wenn vorhanden).
  4. Offene Aufträge mit ihren Positionen und Vorschlägen: überfällige zuerst
     (am längsten überfällige; auch ein verstrichener Termin), dann
     anstehende nach Termin bzw. Fälligkeit (vor dem Zeitfenster dessen Beginn,
     im Zeitfenster dessen Ende, bei Intervall das (prognostizierte) Datum),
     dann Aufträge mit km-Intervall ohne Prognose, zuletzt solche ohne Datum
     (Reparatur ohne Termin, „Gültig ab Jahr“ noch nicht erreicht).
  5. Aufgaben mit Fälligkeit (überfällige zuerst) und Hinweis auf ihren Auftrag.
  6. In „Verlauf“: erledigte Aufträge (neueste zuerst), darunter die erledigten
     Mängel (zuletzt erledigte zuerst).
  7. Die Wartungsarten (getrennt nach Aufträgen und Aufgaben) stehen unter
     Einstellungen → Wartungsarten.
- **Bitte Wartungsarten prüfen:** Nach der Umwandlung auf Datenversion 8
  steht oben im Reiter Wartung dieser Hinweis (kein Fenster beim Start).
  Antippen öffnet den Prüfbildschirm mit allen Wartungsarten (Art, Intervall
  bzw. Zeitfenster, Bauteil, Standard-Zuordnung); Antippen einer Art öffnet ihr
  Formular. Der Hinweis bleibt, bis du **„Alles geprüft“** tippst. Gemerkt wird
  das unter einem eigenen Schlüssel im Speicher des Browsers, nicht in den
  Daten und nicht in der Sicherung.
- **Einmalig (optional, nur Aufträge):** z. B. die Erstinspektion. Vor der
  Erledigung normale Fälligkeit; danach steht sie nur noch in der Historie und
  bekommt keinen neuen offenen Auftrag. Nicht mit einem Zeitfenster
  kombinierbar.
- **Jährliches Zeitfenster (optional, nur Aufträge):**
  - Monat von und Monat bis, z. B. Oktober bis November. Das Fenster darf
    nicht über den Jahreswechsel gehen.
  - **Gültig ab Jahr (optional):** Vor diesem Jahr zeigt die App keine
    Fälligkeit („noch nicht fällig“). Praktisch beim Umstellen auf den
    saisonalen Rhythmus. Leer = sofort gültig.
- **Fälligkeit mit Zeitfenster:**
  - Vor dem Fenster: „fällig ab 01.10.“
  - Im Fenster ohne Erledigung: „fällig bis 30.11.“
  - Im Fenster erledigt: „erledigt, nächste ab 01.10.2027“. Es zählt nur
    eine Erledigung **innerhalb** des Fensters.
  - Nach dem Fenster ohne Erledigung: „überfällig seit 30.11.2026“. Das
    bleibt auch über den Jahreswechsel und im nächsten Fenster bestehen, bis
    der Auftrag erledigt wird.
  - Eine Erledigung nach dem Ende des Fensters gilt als **Nachholung** für
    das versäumte Jahr: „erledigt (nachgeholt), nächste ab 01.10.2027“. Für
    das Fenster des nächsten Jahres zählt sie nicht.
  - Gezählt werden Fenster ab „Gültig ab Jahr“ und nur, wenn sie nicht vor
    dem Startdatum des Fahrrads enden.
  - Ein Termin hat Vorrang in der Anzeige; die Fälligkeit steht dann klein
    darunter („Ohne Termin: …“).
  - Vor und im Fenster steht der erwartete Kilometerstand zu Beginn bzw. am
    Ende des Fensters dabei.
- **Fälligkeit mit Intervall (ohne Zeitfenster):**
  - Nach Monaten: „fällig in X Tagen“, „heute fällig“ oder „überfällig seit X
    Tagen“, bei einem Auftrag mit dem erwarteten Kilometerstand.
  - Nach km: Den Tag, an dem die km-Grenze erreicht wird, schätzt die App mit
    der Prognose (siehe unten), z. B. „fällig ca. im Mai 2027 bei ca. 7.500
    km“, darunter „Noch ca. 800 km bis zur km-Grenze“. Ist keine Schätzung
    möglich (zu wenige Daten oder keine Fahrten), steht dort nur „fällig bei
    ca. 7.500 km“. Ist die Grenze überschritten: „überfällig: km-Grenze
    (7.500 km) um 120 km überschritten“.
  - Dazu „Seit letzter Wartung gefahren: X km“.
  - Ohne Fahrrad und ohne Erledigung steht dort „noch nicht durchgeführt“.

### Mängel

- **Mangel erfassen** („+ Mangel“ oben im Reiter Wartung): Datum (Standard heute),
  Beschreibung und Status „offen“ oder „erledigt“.
- Offene Mängel ohne Auftrag stehen ganz oben im Reiter Wartung, mit „Zu
  Auftrag …“ und „Reparatur anlegen“; Mängel in einem Auftrag stehen bei
  dessen Positionen. Erledigte Mängel stehen unter Wartung → Verlauf.
- Auf der Übersicht steht die Anzahl offener Mängel, z. B. „3 offene Mängel“.
- Die Ansicht eines Mangels zeigt seinen Auftrag bzw. den Auftrag, mit dem er
  erledigt wurde.
- Wird ein Mangel von Hand auf „erledigt“ gesetzt, verschwindet er aus einem
  geplanten Auftrag. Wird ein mit einem Auftrag erledigter Mangel wieder
  geöffnet, steht er dort als „nicht gemacht“.
- Wird ein Mangel gelöscht, verschwindet er auch aus den Aufträgen (mit
  „Rückgängig“).

### Prognosen und Jahresziel

- **Grundlage aller Prognosen:** die durchschnittlichen km pro Kalendertag der
  letzten 365 Tage bis gestern. Liegt das Startdatum kürzer zurück, zählt die
  Zeit ab dem Startdatum. Einträge vor dem Startdatum zählen nicht mit.
- Prognosen gibt es erst, wenn seit dem Startdatum mindestens 7 Tage vergangen
  sind. Sie werden immer als „ca.“ angezeigt und auf 10 km gerundet.
- **Jahresprognose** (Übersicht): km des laufenden Jahres bis heute +
  Durchschnitt × restliche Tage des Jahres.
- **Kilometerstand für ein Datum** (Übersicht): erwarteter Kilometerstand am
  Ende eines frei wählbaren Tages. Für heute und vergangene Tage zeigt die App
  den tatsächlichen Stand.
- **Jahresziel:** unter **Fahrten → Statistik → Jahresziele** je Kalenderjahr
  ein Ziel in km (bis 5a.1 unter Einstellungen; von dort führt ein Weg
  hierher, ebenso „Jahresziel festlegen“ auf der Übersicht). Die Übersicht zeigt
  für das laufende Jahr:
  - den Fortschritt, z. B. „2.340 von 5.000 km · 47 %“, als Balken; der
    Strich im Balken markiert das zeitanteilige Soll,
  - den Vergleich mit dem zeitanteiligen Soll bis heute (Ziel × vergangene
    Tage ÷ Tage des Jahres), z. B. „ca. 120 km voraus“ oder „ca. 80 km im
    Rückstand“,
  - die Jahresprognose im Vergleich zum Ziel, z. B. „ca. 130 km unter dem
    Ziel“.

### Statistik

Der Reiter **Fahrten** (bis 5a.1 „Statistik“) zeigt unter **Statistik**:

- **km pro Monat** als Säulendiagramm: das laufende Jahr (grün) neben dem
  Vorjahr (grau). Antippen eines Monats zeigt seine Werte und den
  Unterschied zum Vorjahr; „Werte als Tabelle“ zeigt alle Monate als Zahlen.
  Importierte Wochensummen zählen hier mit.
- **Kennzahlen** je Kalenderjahr und gesamt:
  - **km:** alle Einträge des Jahres.
  - **Radtage:** Tage mit mehr als 0 km.
  - **Ø km:** Durchschnitt pro Radtag.
  - **Arbeitstage:** Radtage mit dem Merkmal „Arbeitsweg“.
  - **Serie:** längste Folge aufeinanderfolgender Fahrtage (siehe
    „Einstellungen“), an denen gefahren wurde. Andere Wochentage unterbrechen
    die Serie nicht und verlängern sie nicht; ein Fahrtag ohne Fahrt beendet
    sie. Die Gesamt-Serie kann über den Jahreswechsel gehen.
  - Radtage, Ø km, Arbeitstage und Serie zählen **ohne Wochensummen**, weil
    bei ihnen die einzelnen Tage unbekannt sind. Die App nennt Anzahl und km
    der Wochensummen je Jahr.
- **Wetter auf dem Arbeitsweg** je Jahr und gesamt, nur Einträge mit
  Arbeitsweg und mehr als 0 km:
  - **mit Wetter:** wie viele dieser Tage gespeichertes Wetter haben, z. B.
    „38 von 41“.
  - **km bei Regen:** km der Tage, an denen auf einer der Fahrten mindestens
    0,1 mm Niederschlag fiel.
  - **Tage unter 0 °C:** Tage, an denen auf einer der Fahrten die Temperatur
    unter 0 °C lag.
  - **Ampel der Fahrten:** Verteilung grün / gelb / rot über alle Fahrten als
    Balken mit Zahlen (aus den Wetterwerten, ohne amtliche Warnungen).
  - Darunter **Wetter nachtragen …** mit der Anzahl der Tage, für die es
    möglich ist (siehe „Wetter“).
- **Jahresziele:** Liste der Ziele je Jahr und „+ Jahresziel“ (siehe
  „Prognosen und Jahresziel“).

### Datensicherung

- **Jetzt sichern** (Übersicht, Einstellungen und Einstellungen → Datensicherung):
  1. Die App erzeugt die Sicherungsdatei `rad-km-JJJJ-MM-TT-HHMM.json` (mit
     Uhrzeit, damit mehrere Sicherungen am selben Tag eindeutig sind), liest sie
     sofort wieder ein, prüft sie mit denselben Regeln wie beim Import und
     vergleicht sie mit dem aktuellen Stand.
  2. Nur wenn das stimmt, öffnet sich auf dem iPhone das **Teilen-Menü**.
     Dort z. B. „In Dateien sichern“ wählen, um die Datei in iCloud Drive
     abzulegen. Übergeben wird nur die Datei, ohne Titel oder Text. Wo Teilen
     nicht möglich ist (z. B. am Computer), wird die Datei heruntergeladen.
  3. Ist das Teilen abgeschlossen, erscheint „Sicherung übergeben – Inhalt
     geprüft: N Einträge, X km“ (X = Summe aller Einträge), und das Datum der
     letzten Sicherung wird gesetzt. Bei Abbruch bleibt es unverändert.
  - Schlägt die Prüfung fehl, öffnet sich das Teilen-Menü nicht, und eine
    Meldung nennt den Grund. Eine fehlgeschlagene Prüfung oder ein Problem
    beim Teilen verändert nie die Daten in der App.
  - Verlangt das iPhone für das Teilen-Menü einen frischen Tipper, zeigt die
    App „Sicherung geprüft“ mit der Schaltfläche **Teilen …**.
- **Gespeicherte Sicherung jetzt prüfen:** erscheint direkt nach dem Sichern.
  Wähle die eben gespeicherte Datei aus. Die App liest und prüft sie, **ohne
  etwas zu überschreiben**, und vergleicht sie mit dem aktuellen Stand.
- **Sicherung prüfen …** (Einstellungen → Datensicherung): dasselbe für eine beliebige, auch
  ältere Sicherung. Mögliche Ergebnisse:
  - „Identisch mit dem aktuellen Stand“
  - „Sicherung ist älter: 3 Einträge fehlen (25.–27.10.)“, wenn seitdem nur
    Neues dazugekommen ist
  - „Sicherung weicht vom aktuellen Stand ab“ mit Einzelheiten, z. B. „1
    Eintrag geändert (20.10.)“
  - „Datei beschädigt bzw. keine Rad-km-Sicherung“ mit dem Grund
  - Dazu Zeitpunkt und Inhalt der Sicherung und ein Hinweis, falls die
    Kurzinfo nicht zum Inhalt passt (Datei nachträglich verändert).
- **Daten importieren** (Einstellungen → Datensicherung):
  - Eine Sicherungsdatei auswählen.
  - Die App prüft die Datei und zeigt eine Zusammenfassung.
  - Nach deiner Bestätigung **ersetzt** sie alle vorhandenen Daten.
  - Fehlerhafte Dateien werden mit einer Meldung abgelehnt, z. B. bei einem
    doppelten Datum.

### Einstellungen

- Hauptseite mit den Abschnitten Fahrrad, Datensicherung, Fahrten (Vorlagen,
  Fahrtage und Hinweis), Wetter (Orte und Strecke, Wetter außerhalb der
  Fahrten, Hinfahrt, Rückfahrt, Kleidung, Ampel-Grenzen), Wartung
  (Wartungsarten) und Über Rad-km; siehe „Aufbau: die fünf Reiter“. Welche
  Seite offen ist, merkt sich die App nur, solange sie geöffnet ist.
- **Fahrtage** (Einstellungen → Fahrtage und Hinweis): deine üblichen Fahrtage zum Ankreuzen (Voreinstellung
  Montag, Dienstag, Freitag). Sie gelten für den Hinweis auf fehlende
  Einträge, die längste Serie und den Reiter Wetter. Änderungen werden sofort
  gespeichert.
- **Hinweis schon am selben Tag** (unter den Fahrtagen): Schalter (Standard an)
  und darunter die Uhrzeit (Standard 18:00, nur bei „an“ bedienbar). An: Ab
  dieser Uhrzeit weist die Übersicht schon am selben Tag auf einen fehlenden
  Eintrag hin. Aus: erst ab dem nächsten Tag; die Uhrzeit bleibt für das nächste
  Einschalten. Beides wird sofort gespeichert. (Das Uhrzeitfeld lässt sich auf
  dem iPhone nicht leeren; ein „Zurücksetzen“ ändert die Uhrzeit nicht.)
- **Über Rad-km:** App-Version und Datenversion.

## JSON-Format für Sicherung und Import

Die Datei ist ein JSON-Objekt mit folgenden Teilen:

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `version` | Zahl | ja | Version des Datenmodells, aktuell `9` |
| `kurzinfo` | Objekt | nein | Kurzinfo der Sicherung (ab Version 3, siehe unten); wird beim Import nicht übernommen |
| `exportiertAm` | Text | nein | Nur in Sicherungen bis Version 2: Zeitpunkt des Exports; wird beim Import ignoriert |
| `fahrrad` | Objekt oder `null` | nein | Das Fahrrad (siehe unten) |
| `einstellungen` | Objekt | nein | Fahrtage und Jahresziele (ab Version 3), Wetter (ab Version 4), Hinweis für heute (ab Version 5, Schalter ab Version 7); fehlt das Feld, gelten die Standardwerte |
| `vorlagen` | Liste | nein | Vorlagen in Anzeigereihenfolge |
| `eintraege` | Liste | nein | Kilometer-Einträge |
| `wartungsarten` | Liste | nein | Aufträge und Aufgaben; fehlt das Feld, werden die Standard-Wartungsarten angelegt |
| `auftraege` | Liste | nein | Geplante und erledigte Aufträge mit ihren Positionen (ab Version 8) |
| `maengel` | Liste | nein | Mängelliste (ab Version 2) |
| `wartungsprotokoll`, `termine` | Liste | nein | Nur bis Version 7: durchgeführte Wartungen und geplante Termine; werden beim Einlesen zu `auftraege` (siehe „Versionen“) |

Allgemeine Regeln:

- **Datum** immer als Text im Format `"JJJJ-MM-TT"`, z. B. `"2025-03-17"`.
- **Kilometer** als Zahl mit **Punkt** (JSON-Regel), z. B. `12.5`, nicht
  `"12,5"`. Alle km-Werte müssen ≥ 0 sein.
- **Texte** in Anführungszeichen. Optionale Texte dürfen fehlen, `""` oder
  `null` sein.
- **`id`-Felder** sind beliebige eindeutige Texte. Bei Vorlagen, Einträgen,
  Aufträgen, Positionen und Mängeln dürfen sie fehlen, die App vergibt dann
  eigene.
- **Ja/Nein-Merkmale** (`arbeitsweg`, `einmalig`, `aktiv`) als `true` oder
  `false`; fehlt das Feld, gilt `false`. Ausnahme sind die Schalter
  `hinweisHeuteAn` und `abfahrtAn` (ab Version 7): Fehlen sie, gilt `true`.
- **Uhrzeiten** als Text im Format `"HH:MM"`, z. B. `"06:00"`.

### `kurzinfo` (nur in der Sicherungsdatei)

Steht am Anfang der Datei, damit man den Inhalt auch ohne App erkennt. „Sicherung
prüfen“ vergleicht sie mit dem Inhalt der Datei.

| Feld | Typ | Bedeutung |
|---|---|---|
| `zeitpunkt` | Text | Zeitpunkt der Sicherung (ISO 8601, UTC), z. B. `"2026-10-25T14:03:00.000Z"` |
| `appVersion` | Text | App-Version, mit der gesichert wurde, z. B. `"4b"` |
| `eintraege` | Zahl | Anzahl der Einträge |
| `kmSumme` | Zahl | Summe der km aller Einträge |
| `kmStand` | Zahl oder `null` | Kilometerstand (Start-Kilometerstand + Einträge ab dem Startdatum) |
| `wartungen` | Zahl | Anzahl der erledigten Aufträge (bis Version 7: der Einträge im Wartungsprotokoll; „Sicherung prüfen“ vergleicht bei älteren Dateien damit) |
| `maengel` | Zahl | Anzahl der Mängel |

### `einstellungen` (ab Version 3)

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `fahrtage` | Liste von Zahlen | nein | Übliche Fahrtage, 1 = Montag … 7 = Sonntag; Standard `[1, 2, 5]` (Mo, Di, Fr). Für den Hinweis auf Fahrtage ohne Eintrag und die längste Serie; `[]` = keine |
| `jahresziele` | Liste | nein | Jahresziele, je Jahr höchstens eines: `{ "jahr": 2026, "km": 5000 }` (km > 0) |
| `hinweisHeuteAn` | `true`/`false` | nein | Schalter „Hinweis schon am selben Tag“ (ab Version 7); Standard `true`. `false` = der heutige Fahrtag zählt erst ab dem nächsten Tag als „ohne Eintrag“ |
| `hinweisHeuteAb` | Uhrzeit | nein | Ab dieser Uhrzeit zählt der heutige Fahrtag schon als „ohne Eintrag“, wenn `hinweisHeuteAn` `true` ist (ab Version 5); Standard `"18:00"`. Ab Version 7 immer eine Uhrzeit (bis Version 6: `null` = erst ab dem nächsten Tag) |
| `wetter` | Objekt | nein | Orte, Wegpunkte, Fahrzeiten und Regeln für den Reiter Wetter (ab Version 4, siehe unten); fehlende Teile bekommen die Standardwerte |

### `einstellungen.wetter` (ab Version 4)

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `wohnort` | Ort oder `null` | nein | Wohnort; Beginn der Hinfahrt |
| `arbeitsort` | Ort oder `null` | nein | Arbeitsort; aus Wohnort, Wegpunkten und Arbeitsort ergeben sich die Teilstrecken für den Wind |
| `weitererOrt` | Ort mit `aktiv` oder `null` | nein | z. B. Urlaub; `aktiv: true` = der Reiter Wetter zeigt das Wetter dort, ohne Hin- und Rückfahrt |
| `wegpunkte` | Liste von Orten | nein | Ab Version 6: höchstens 3 Wegpunkte in Fahrtrichtung der Hinfahrt (Wohnort → Arbeitsort); Standard `[]`. Sie zählen nur, wenn Wohn- und Arbeitsort festgelegt sind |
| `windTeilstrecken` | Liste von `true`/`false` | nein | Ab Version 6: je Teilstrecke (Wohnort → Wegpunkt 1 → … → Arbeitsort, also eine mehr als Wegpunkte), ob sie für den Wind zählt; Standard `[true]`. Fehlt das Feld, zählen alle |
| `ortAusserhalb` | `"wohnort"` oder `"standort"` | nein | Ab Version 7: Wetter außerhalb der Fahrten (Ansicht „Jetzt“) am Wohnort oder am aktuellen Standort; Standard `"wohnort"`. Der Standort selbst wird nie gespeichert |
| `hinfahrt` | Fahrzeit | nein | Standard `{ "von": "06:00", "bis": "07:00", "abfahrtAn": true, "abfahrt": "06:00", "dauer": 60 }`; `dauer` gilt auch für die Fahrt ab jetzt außerhalb der Fahrten |
| `rueckfahrt` | Fahrzeit | nein | Standard `{ "von": "16:00", "bis": "17:00", "abfahrtAn": true, "abfahrt": "16:00", "dauer": 60 }`; nach `bis` zählt für den Reiter Wetter der nächste Tag |
| `ampel` | Objekt | nein | Grenzen der Ampel (siehe unten) |
| `kleidung` | Objekt | nein | Kleidungsregeln (siehe unten) |

**Ort:** `{ "name": "Musterdorf", "lat": 51.0, "lon": 10.0 }`. `name` ist ein
Text zur Anzeige, `lat` (−90 bis 90) und `lon` (−180 bis 180) sind Grad und
werden beim Einlesen auf 4 Nachkommastellen gerundet (ca. 10 m; bis Version 4: 2,
Version 5 und 6: 3). Beim weiteren Ort kommt `"aktiv": true` oder `false` dazu.
Wegpunkte sind Orte ohne `aktiv`.

**Fahrzeit:**

| Feld | Typ | Bedeutung |
|---|---|---|
| `von`, `bis` | Uhrzeit | Zeitraum der Fahrt (`von` vor `bis`); dafür gelten Ampel, Kleidung und Wind |
| `abfahrtAn` | `true`/`false` | ab Version 7: Schalter „Übliche Abfahrt“; fehlt das Feld, gilt `true`. `false` = keine übliche Abfahrt, dann nennt die App die beste Abfahrt und die zu meidende Zeit |
| `abfahrt` | Uhrzeit | übliche Abfahrt für „Abfahrt 15:45 statt 16:00“, wenn `abfahrtAn` `true` ist. Ab Version 7 immer eine Uhrzeit (bis Version 6: `null` = keine) |
| `dauer` | ganze Zahl 5–240 | Dauer der Fahrt in Minuten, für das beste Abfahrtsfenster |

**`ampel`** (Vorschlagswerte; jedes fehlende Feld bekommt den Standardwert;
ab Version 5 muss `gelbBoeen` kleiner als `rotBoeen` und `gelbNiederschlag`
kleiner als `rotStarkregen` sein):

| Feld | Standard | Bedeutung |
|---|---|---|
| `rotBoeen` | `60` | rot ab Böen in km/h |
| `rotStarkregen` | `5` | rot ab Niederschlag in mm/h |
| `rotWarnstufe` | `2` | rot ab dieser Stufe einer amtlichen Warnung (1–4); Gewitter und Glätte sind immer rot |
| `gelbRegenWahrscheinlichkeit` | `50` | gelb ab Regenwahrscheinlichkeit in % |
| `gelbNiederschlag` | `0.5` | gelb ab Niederschlag in mm/h |
| `gelbBoeen` | `40` | gelb ab Böen in km/h |
| `gelbTemperatur` | `0` | gelb unter dieser Temperatur in °C |
| `glaetteTemperatur` | `1` | Glätte möglich bis zu dieser Lufttemperatur in °C (dazu nass) |

**`kleidung`** (ab Version 6):

| Feld | Typ | Bedeutung |
|---|---|---|
| `stufen` | Liste | von warm nach kalt, mindestens zwei (siehe unten). Die letzte Stufe hat `"ab": null` und gilt darunter; die Untergrenzen müssen abnehmen |
| `regen` | Liste | Regenzusatz ab einer Regenwahrscheinlichkeit, aufsteigend (jede Schwelle nur einmal): `{ "ab": 60, "bereiche": { "beine": "Regenhose", "fuesse": "Gamaschen" } }`; mindestens ein Bereich ausgefüllt |
| `rueckmeldung` | `true`/`false` | Schalter „Rückmeldung zur Kleidung“: Karte „Wie war die Kleidung?“ und Knöpfe in den Einträgen; Standard `true`. Gespeicherte Rückmeldungen bleiben auch bei `false` |

**Stufe:**

| Feld | Typ | Bedeutung |
|---|---|---|
| `id` | Text | eindeutige Kennung; neue Stufen bekommen eine eigene. Gespeichertes Wetter und Rückmeldungen verweisen darauf |
| `ab` | Zahl oder `null` | die Stufe gilt ab dieser gefühlten Temperatur (°C); `null` bei der letzten Stufe |
| `bereiche` | Objekt | Kleidung je Körperbereich: `kopf`, `hals`, `haende`, `oberkoerper`, `beine`, `fuesse`, je ein Text (mehrere Teile mit Komma); fehlend oder `""` = nichts; mindestens ein Bereich ausgefüllt |
| `haendeBeiRegen` | Text oder `null` | gilt statt `haende`, sobald ein Regenzusatz greift; `null` = wie `haende` |

Standard-Stufen (ab Version 6): `stufe1` ab 20, `stufe2` ab 15, `stufe3` ab 11,
`stufe4` ab 7 (mit `haendeBeiRegen` „Übergangshandschuhe“), `stufe5` ab 3,
`stufe6` ab −1, `stufe7` ab −6, `stufe8` darunter, Kleidung wie in der Tabelle
unter „Wetter“; Regenzusatz: ab 40 % Regenjacke (Oberkörper), ab 60 % Regenhose
(Beine) und Gamaschen (Füße).

Bis Version 5 hatte jede Stufe statt `bereiche` und `haendeBeiRegen` einen
`text` und eine `korrektur` (Verschiebung durch Rückmeldungen, ganze Zahl −5 bis
5; die Stufe galt ab `ab` + `korrektur`), der Regenzusatz einen `text` und es
gab keinen Schalter `rueckmeldung`. Standard in Version 5: `kurz` ab 20, `duenn`
ab 15, `jacke` ab 11, `kuehl` ab 7, `kalt` ab 3, `frost` ab −2, `eis` darunter;
Regenjacke ab 40 %, Regenhose ab 60 %. (Bis Version 4: `kurz` ab 18, `duenn` ab
12, `jacke` ab 6, `kalt` ab 0, `frost` darunter.)

### `fahrrad`

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `name` | Text | ja | Name des Fahrrads |
| `startdatum` | Datum | ja | Ab diesem Tag (einschließlich) werden Einträge gezählt |
| `startKm` | Zahl | ja | Kilometerstand zu Beginn des Startdatums |
| `rahmennummer` | Text | nein | Rahmennummer (ab Version 2) |
| `beschreibung` | Text | nein | Beschreibung, mehrzeilig, z. B. Farbe, Modell (ab Version 2) |

### `vorlagen[]`

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | Text | nein | Eindeutige Kennung |
| `name` | Text | ja | Name der Strecke |
| `km` | Zahl | ja | Gesamt-km für den Tag |
| `arbeitsweg` | `true`/`false` | nein | Strecke zur Arbeit (ab Version 3); wird beim Erfassen in den Eintrag übernommen |

### `eintraege[]`

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | Text | nein | Eindeutige Kennung |
| `datum` | Datum | ja | **Pro Datum nur ein Eintrag** |
| `km` | Zahl | ja | Gefahrene Kilometer; `0` = keine Fahrt |
| `vorlage` | Text | nein | Name der verwendeten Vorlage (nur zur Anzeige) |
| `notiz` | Text | nein | Notiz |
| `typ` | `"tag"` oder `"woche"` | nein | Standard `"tag"`. `"woche"` = importierte Wochensumme, Datum = Montag der Woche bzw. erster Fahrtag |
| `arbeitsweg` | `true`/`false` | nein | Fahrt zur Arbeit (ab Version 3); beim Erfassen aus der Vorlage übernommen. Zählt für die Arbeitstage in der Statistik |
| `wetter` | Objekt oder `null` | nein | Wetter der Hin- und Rückfahrt an diesem Tag (ab Version 4, siehe unten); `null` = keins. Nur bei `"typ": "tag"`. Ändert sich das Datum des Eintrags, gilt es nicht mehr und wird für das neue Datum neu bestimmt |

### `eintraege[].wetter` (ab Version 4)

Seit Release 4b gefüllt, nur bei Einträgen mit `"arbeitsweg": true` und mehr
als 0 km: beim Speichern aus der Vorhersage, mit „Wetter nachtragen …“ aus dem
Rückblick. `ampel` kommt nur aus den Wetterwerten, ohne amtliche Warnungen. Die
Werte sind die ungünstigsten an Wohnort, Wegpunkten und Arbeitsort.

| Feld | Typ | Bedeutung |
|---|---|---|
| `quelle` | `"vorhersage"` oder `"rueckblick"` | aus der Vorhersage übernommen bzw. nachträglich für einen vergangenen Tag geholt |
| `stand` | Text | Zeitpunkt der Daten (ISO 8601) |
| `hin`, `rueck` | Objekt oder `null` | je Fahrt: `temperatur` (niedrigste, °C), `gefuehlt` (niedrigste gefühlte, °C), `niederschlag` (Summe, mm, ≥ 0), `regenWahrscheinlichkeit` (höchste, 0–100 oder `null`), `wind` (Mittel, km/h), `boeen` (höchste, km/h), `ampel` (`"gruen"`, `"gelb"`, `"rot"`), `kleidung` (`id` der empfohlenen Kleidungsstufe oder `null`), `empfehlung` (ab Version 6: die tatsächlich empfohlene Kleidung je Bereich wie bei `bereiche` einer Stufe, mit Zwiebelprinzip, oder `null`), `regenkleidung` (ab Version 6: `true`, wenn ein Regenzusatz galt; fehlt das Feld, gilt `false`), `rueckmeldung` (`"zu-warm"`, `"passte"`, `"zu-kalt"` oder `null`; wird je Stufe ausgewertet) |

### `wartungsarten[]`

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | Text | ja | Eindeutige Kennung, wird von Aufträgen, Positionen und Zuordnungen verwendet |
| `name` | Text | ja | z. B. `"Große Inspektion"`, `"Bremsbeläge wechseln"` |
| `typ` | `"auftrag"` oder `"aufgabe"` | ja | Ab Version 8: Auftrag (mit Termin, z. B. Inspektion, Reparatur) oder Aufgabe (Position in einem Auftrag) |
| `intervallMonate` | ganze Zahl ≥ 1 oder `null` | nein | Intervall in Monaten |
| `intervallKm` | Zahl > 0 oder `null` | nein | Intervall in km (ausgewertet ab Version 3); mit `intervallMonate` gilt, was zuerst erreicht wird. Bei einem Auftrag mit Zeitfenster nur ein Hinweis |
| `fensterVon` | Monat 1–12 oder `null` | nein | Beginn des jährlichen Zeitfensters (ab Version 2); nur bei Aufträgen |
| `fensterBis` | Monat 1–12 oder `null` | nein | Ende des Zeitfensters; nur zusammen mit `fensterVon`, `fensterVon` ≤ `fensterBis` |
| `gueltigAbJahr` | Jahreszahl oder `null` | nein | Nur mit Zeitfenster: vor diesem Jahr keine Fälligkeit; `null` = sofort gültig |
| `einmalig` | `true`/`false` | nein | Einmaliger Auftrag (ab Version 3); nach der ersten Erledigung erledigt. Nicht mit Zeitfenster, nicht bei Aufgaben |
| `bauteil` | Text oder `null` | nein | Ab Version 8, nur bei Aufgaben: Bauteil, z. B. `"Bremse vorn"`; `""` wird zu `null` |
| `zuordnung` | Text oder `null` | bei Aufgaben | Ab Version 8: Standard-Zuordnung einer Aufgabe, `"naechste-inspektion"` oder die `id` einer Wartungsart mit `"typ": "auftrag"`; bei Aufträgen `null` |

Auftrag mit Fälligkeit = Intervall, Zeitfenster oder `einmalig`; sonst (z. B.
Reparatur) wird er bei Bedarf angelegt. Die Standard-Wartungsarten (ab Version
8) haben die IDs `erstinspektion`, `kleine-inspektion`, `grosse-inspektion`,
`reparatur` und `eigenleistung`.

### `auftraege[]` (ab Version 8)

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | Text | nein | Eindeutige Kennung |
| `wartungsartId` | Text | ja | `id` einer Wartungsart mit `"typ": "auftrag"`. Je Auftrag mit Fälligkeit höchstens ein geplanter Auftrag |
| `status` | `"geplant"` oder `"erledigt"` | ja | |
| `termin` | Datum oder `null` | nein | Nur bei geplanten Aufträgen: Termin |
| `terminZeit` | Uhrzeit `"HH:MM"` oder `null` | nein | Ab Version 9, nur zusammen mit einem Termin: Uhrzeit des Termins; `null` = ganztägig |
| `werkstatt` | Text | nein | Werkstatt |
| `datum` | Datum oder `null` | bei erledigten | Datum der Erledigung; bei geplanten `null` |
| `kmStand` | Zahl oder `null` | nein | Nur bei erledigten: Kilometerstand bei der Erledigung |
| `kmManuell` | `true`/`false` | nein | `true` = Wert von Hand eingetragen; `false` = App berechnet ihn selbst. Fehlt das Feld, gilt ein vorhandener `kmStand` als von Hand eingetragen |
| `notiz` | Text | nein | Durchgeführte Arbeiten / Notiz |
| `positionen` | Liste | nein | Positionen (siehe unten); bei geplanten nur die ausdrücklich zugeordneten, bei erledigten der beim Abschluss angezeigte Stand |
| `ausgeschlossen` | Liste von Texten | nein | Nur bei geplanten: `id`s von Aufgaben, die aus diesem Auftrag entfernt wurden (die Standard-Zuordnung nimmt sie dort nicht auf) |

**Position:**

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | Text | nein | Eindeutige Kennung |
| `art` | `"aufgabe"` oder `"mangel"` | ja | |
| `wartungsartId` | Text | bei Aufgaben | `id` einer Wartungsart mit `"typ": "aufgabe"`; je Auftrag einmal, in höchstens einem geplanten Auftrag |
| `mangelId` | Text | bei Mängeln | `id` eines Mangels; je Auftrag einmal, in höchstens einem geplanten Auftrag (nur offene Mängel) und mit höchstens einem Auftrag erledigt |
| `status` | `"offen"`, `"erledigt"` oder `"nicht-gemacht"` | ja | Im geplanten Auftrag `"offen"`, im erledigten `"erledigt"` oder `"nicht-gemacht"`. Ein Mangel mit `"erledigt"` muss selbst erledigt sein |
| `notiz` | Text | nein | Notiz zur Position |

Die Aufgaben, die nur nach der Standard-Zuordnung zu einem geplanten Auftrag
gehören, stehen nicht in den Daten; die App berechnet sie bei jeder Anzeige.
Für Kosten und Belege kommen in einem späteren Release Felder an Auftrag und
Position dazu.

### `maengel[]`

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | Text | nein | Eindeutige Kennung |
| `datum` | Datum | ja | Festgestellt am |
| `beschreibung` | Text | ja | Beschreibung des Mangels |
| `status` | `"offen"` oder `"erledigt"` | nein | Standard `"offen"` |
| `erledigtAm` | Datum oder `null` | nein | Nur bei `"erledigt"` |

Bis Version 7 gab es außerdem `protokollId` (der Protokolleintrag, mit dem der
Mangel erledigt wurde); ab Version 8 steht diese Verknüpfung als Position im
Auftrag.

**Bis Version 7** (wird beim Import umgewandelt): `wartungsprotokoll[]` mit
`id`, `datum`, `wartungsartId`, `werkstatt`, `kmStand`, `kmManuell`, `notiz` je
durchgeführter Wartung und `termine[]` mit `wartungsartId`, `datum`,
`werkstatt` (je Wartungsart höchstens ein Termin); die Wartungsarten hatten
noch keine Felder `typ`, `bauteil` und `zuordnung`.

### Beispiel (erfundene Werte)

```json
{
  "version": 9,
  "kurzinfo": { "zeitpunkt": "2025-03-01T18:00:00.000Z", "appVersion": "5b", "eintraege": 4,
                "kmSumme": 98, "kmStand": 198, "wartungen": 1, "maengel": 2 },
  "fahrrad": { "name": "Mein Rad", "startdatum": "2025-01-01", "startKm": 100,
               "rahmennummer": "AB 12345", "beschreibung": "Blau, 28 Zoll" },
  "einstellungen": {
    "fahrtage": [1, 2, 5],
    "jahresziele": [{ "jahr": 2025, "km": 3000 }],
    "hinweisHeuteAn": true,
    "hinweisHeuteAb": "18:00",
    "wetter": {
      "wohnort": { "name": "Musterdorf", "lat": 51.0004, "lon": 10.0012 },
      "arbeitsort": { "name": "Beispielstadt", "lat": 51.1, "lon": 10.2 },
      "weitererOrt": { "name": "Ferienort", "lat": 54.0, "lon": 9.0, "aktiv": false },
      "wegpunkte": [{ "name": "Brücke", "lat": 51.0305, "lon": 10.0705 }, { "name": "Ortsmitte", "lat": 51.06, "lon": 10.13 }],
      "windTeilstrecken": [true, false, true],
      "ortAusserhalb": "standort",
      "hinfahrt": { "von": "06:00", "bis": "07:00", "abfahrtAn": true, "abfahrt": "06:00", "dauer": 60 },
      "rueckfahrt": { "von": "16:00", "bis": "17:00", "abfahrtAn": false, "abfahrt": "16:00", "dauer": 60 },
      "ampel": { "rotBoeen": 60, "rotStarkregen": 5, "rotWarnstufe": 2, "gelbRegenWahrscheinlichkeit": 50,
                 "gelbNiederschlag": 0.5, "gelbBoeen": 40, "gelbTemperatur": 0, "glaetteTemperatur": 1 },
      "kleidung": {
        "stufen": [
          { "id": "stufe1", "ab": 20, "bereiche": { "oberkoerper": "T-Shirt", "beine": "kurze Hose", "fuesse": "Sneakersocken" },
            "haendeBeiRegen": null },
          { "id": "stufe2", "ab": 15, "bereiche": { "oberkoerper": "T-Shirt, leichter Pullover", "beine": "Hose", "fuesse": "Sneakersocken" },
            "haendeBeiRegen": null },
          { "id": "stufe4", "ab": 7, "bereiche": { "kopf": "leichte Mütze", "hals": "", "haende": "Unterziehhandschuhe",
            "oberkoerper": "2 T-Shirts, warmer Pullover", "beine": "Hose", "fuesse": "Socken" }, "haendeBeiRegen": "Übergangshandschuhe" },
          { "id": "s1a2b3c", "ab": null, "bereiche": { "kopf": "warme Mütze", "hals": "Schal", "haende": "Winterhandschuhe",
            "oberkoerper": "2 T-Shirts, warmer Pullover, Regenjacke als Windschutz", "beine": "Hose, Regenhose als Windschutz",
            "fuesse": "Socken, Gamaschen" }, "haendeBeiRegen": null }
        ],
        "regen": [{ "ab": 40, "bereiche": { "oberkoerper": "Regenjacke" } },
                  { "ab": 60, "bereiche": { "beine": "Regenhose", "fuesse": "Gamaschen" } }],
        "rueckmeldung": true
      }
    }
  },
  "vorlagen": [
    { "name": "Arbeit hin und zurück", "km": 10, "arbeitsweg": true },
    { "name": "Einkauf", "km": 3.5, "arbeitsweg": false }
  ],
  "eintraege": [
    { "datum": "2025-01-06", "km": 40, "typ": "woche", "notiz": "aus Excel" },
    { "datum": "2025-01-13", "km": 35.5, "typ": "woche" },
    { "datum": "2025-01-20", "km": 10, "vorlage": "Arbeit hin und zurück", "arbeitsweg": true,
      "wetter": { "quelle": "vorhersage", "stand": "2025-01-20T04:50:00.000Z",
        "hin": { "temperatur": 0.5, "gefuehlt": -2.5, "niederschlag": 0, "regenWahrscheinlichkeit": 10, "wind": 12,
                 "boeen": 25, "ampel": "gruen", "kleidung": "s1a2b3c",
                 "empfehlung": { "kopf": "warme Mütze", "hals": "Schal", "haende": "Winterhandschuhe",
                   "oberkoerper": "2 T-Shirts, warmer Pullover, Regenjacke als Windschutz", "beine": "Hose, Regenhose als Windschutz",
                   "fuesse": "Socken, Gamaschen" }, "regenkleidung": false, "rueckmeldung": "passte" },
        "rueck": { "temperatur": 9, "gefuehlt": 8.5, "niederschlag": 0.8, "regenWahrscheinlichkeit": 65, "wind": 18,
                   "boeen": 42, "ampel": "gelb", "kleidung": "stufe4",
                   "empfehlung": { "kopf": "leichte Mütze", "hals": "", "haende": "Übergangshandschuhe",
                     "oberkoerper": "T-Shirt, leichter Pullover, Regenjacke", "beine": "Hose, Regenhose", "fuesse": "Socken, Gamaschen" },
                   "regenkleidung": true, "rueckmeldung": "zu-kalt" } } },
    { "datum": "2025-01-21", "km": 12.5, "notiz": "Umweg" }
  ],
  "wartungsarten": [
    { "id": "grosse-inspektion", "name": "Große Inspektion", "typ": "auftrag", "intervallMonate": 12, "intervallKm": null,
      "fensterVon": 10, "fensterBis": 11, "gueltigAbJahr": null, "einmalig": false, "bauteil": null, "zuordnung": null },
    { "id": "kleine-inspektion", "name": "Kleine Inspektion", "typ": "auftrag", "intervallMonate": null, "intervallKm": 3000,
      "fensterVon": 3, "fensterBis": 4, "gueltigAbJahr": 2027, "einmalig": false, "bauteil": null, "zuordnung": null },
    { "id": "reparatur", "name": "Reparatur", "typ": "auftrag", "intervallMonate": null, "intervallKm": null,
      "fensterVon": null, "fensterBis": null, "gueltigAbJahr": null, "einmalig": false, "bauteil": null, "zuordnung": null },
    { "id": "eigenleistung", "name": "Eigenleistung", "typ": "auftrag", "intervallMonate": null, "intervallKm": null,
      "fensterVon": null, "fensterBis": null, "gueltigAbJahr": null, "einmalig": false, "bauteil": null, "zuordnung": null },
    { "id": "erstinspektion", "name": "Erstinspektion", "typ": "auftrag", "intervallMonate": 3, "intervallKm": 300,
      "fensterVon": null, "fensterBis": null, "gueltigAbJahr": null, "einmalig": true, "bauteil": null, "zuordnung": null },
    { "id": "kette", "name": "Kette wechseln", "typ": "aufgabe", "intervallMonate": 24, "intervallKm": 3000,
      "fensterVon": null, "fensterBis": null, "gueltigAbJahr": null, "einmalig": false, "bauteil": "Kette", "zuordnung": "naechste-inspektion" },
    { "id": "bremse-vorn", "name": "Bremsbeläge wechseln vorn", "typ": "aufgabe", "intervallMonate": null, "intervallKm": 2500,
      "fensterVon": null, "fensterBis": null, "gueltigAbJahr": null, "einmalig": false, "bauteil": "Bremse vorn", "zuordnung": "grosse-inspektion" }
  ],
  "auftraege": [
    { "id": "p1", "wartungsartId": "grosse-inspektion", "status": "erledigt", "termin": null, "terminZeit": null, "werkstatt": "Beispiel-Werkstatt",
      "datum": "2025-01-15", "kmStand": 175.5, "kmManuell": true, "notiz": "Bremsen eingestellt",
      "positionen": [
        { "id": "pos1", "art": "aufgabe", "wartungsartId": "kette", "status": "erledigt", "notiz": "" },
        { "id": "pos2", "art": "aufgabe", "wartungsartId": "bremse-vorn", "status": "nicht-gemacht", "notiz": "noch 2 mm" },
        { "id": "pos3", "art": "mangel", "mangelId": "m1", "status": "erledigt", "notiz": "" }
      ], "ausgeschlossen": [] },
    { "id": "a2", "wartungsartId": "kleine-inspektion", "status": "geplant", "termin": "2025-06-02", "terminZeit": "09:30", "werkstatt": "Beispiel-Werkstatt",
      "datum": null, "kmStand": null, "kmManuell": false, "notiz": "",
      "positionen": [
        { "id": "pos4", "art": "aufgabe", "wartungsartId": "bremse-vorn", "status": "offen", "notiz": "" },
        { "id": "pos5", "art": "mangel", "mangelId": "m2", "status": "offen", "notiz": "" }
      ], "ausgeschlossen": ["kette"] }
  ],
  "maengel": [
    { "id": "m1", "datum": "2025-01-10", "beschreibung": "Bremse quietscht", "status": "erledigt", "erledigtAm": "2025-01-15" },
    { "id": "m2", "datum": "2025-02-01", "beschreibung": "Licht hinten wackelt", "status": "offen", "erledigtAm": null }
  ]
}
```

### Versionen

Die Zahl `version` beschreibt den Aufbau der Daten. Ändert eine spätere
App-Version den Aufbau, wandelt sie ältere Daten beim Laden oder Importieren
automatisch um. Daten aus einer *neueren* Version lehnt eine ältere App ab,
damit nichts verloren geht.

- **Version 1 → 2:** Alle Einträge, Vorlagen, Wartungsarten, das
  Wartungsprotokoll und die Termine bleiben unverändert. Ergänzt werden
  `rahmennummer` und `beschreibung` (leer) beim Fahrrad, `fensterVon`,
  `fensterBis` und `gueltigAbJahr` (`null`) bei jeder Wartungsart sowie die
  leere Liste `maengel`. Bestehende Wartungsarten bekommen also kein
  Zeitfenster. Die umgewandelten Daten werden beim nächsten Speichern als
  Version 2 abgelegt.
- **Version 2 → 3:** Alle vorhandenen Angaben bleiben unverändert. Ergänzt
  werden `einstellungen` mit den Standardwerten (Fahrtage Mo, Di, Fr; keine
  Jahresziele), `arbeitsweg: false` bei jeder Vorlage und jedem Eintrag und
  `einmalig: false` bei jeder Wartungsart. `exportiertAm` entfällt; neue
  Sicherungen enthalten stattdessen die `kurzinfo`. Ein vorhandenes
  `intervallKm` wird ab jetzt ausgewertet. Die umgewandelten Daten werden
  beim nächsten Speichern als Version 3 abgelegt.
- **Version 3 → 4:** Alle vorhandenen Angaben bleiben unverändert. Ergänzt
  werden `einstellungen.wetter` mit den Standardwerten (keine Orte; Hinfahrt
  06:00–07:00, Rückfahrt 16:00–17:00, übliche Abfahrt 06:00 bzw. 16:00, Dauer
  60 Minuten; Ampel- und Kleidungsregeln mit den Vorschlagswerten, ohne
  Korrektur) und `wetter: null` bei jedem Eintrag. Die umgewandelten Daten
  werden beim nächsten Speichern als Version 4 abgelegt.
- **Version 4 → 5:** Alle vorhandenen Angaben bleiben unverändert. Ergänzt
  wird `einstellungen.hinweisHeuteAb` mit `"18:00"`. Sind die Kleidungsstufen
  noch genau die alten Standardwerte (in Version 4 ließen sie sich nicht
  ändern), ersetzt die App sie durch die neuen Standardstufen; jede Abweichung
  bleibt erhalten. Koordinaten werden ab jetzt auf 3 statt 2 Nachkommastellen
  gerundet; vorhandene Werte ändern sich dadurch nicht. Die umgewandelten Daten
  werden beim nächsten Speichern als Version 5 abgelegt.
- **Version 5 → 6:** Alle Einträge, Rückmeldungen, Orte, Fahrzeiten,
  Ampel-Grenzen und alle übrigen Angaben bleiben erhalten. Ergänzt werden
  `wegpunkte` (keine) und `windTeilstrecken` (`[true]`) in
  `einstellungen.wetter`.
  - **Kleidungsstufen:** Sind sie (abgesehen von den Verschiebungen aus
    Rückmeldungen) noch die Standardwerte aus 4b, ersetzt die App sie durch die
    neuen Standardstufen nach Körperbereichen; die Verschiebungen gehörten zur
    alten Kleidung und entfallen. Sonst bleibt jede Stufe mit ihrer `id`, ihr
    Text kommt in das Feld Oberkörper (die übrigen Bereiche bleiben leer, zum
    selbst Anpassen) und die Verschiebung wird in die Grenze übernommen
    (`ab` + `korrektur`), die wirksamen Grenzen bleiben also gleich.
  - **Regenzusatz:** ebenso; der Standard (Regenjacke ab 40 %, Regenhose ab
    60 %) wird durch den neuen ersetzt, eigene Texte kommen nach Oberkörper.
  - Der Schalter **Rückmeldung zur Kleidung** ist an.
  - **Gespeichertes Wetter:** Bei jeder Fahrt hält die App in `empfehlung`
    fest, was 4b empfohlen hat (Text der Stufe und gegebenenfalls des
    Regenzusatzes, z. B. „Jacke, lange Hose, leichter Pullover + Regenjacke“,
    im Feld Oberkörper; nach den Regeln zum Zeitpunkt der Umwandlung), und in
    `regenkleidung`, ob ein Regenzusatz galt. Ohne Stufe (oder wenn es sie
    nicht gibt) bleibt `empfehlung` `null`. Rückmeldungen bleiben; die zu
    ersetzten Stufen zählt die Auswertung als „frühere Stufen“.
  - Die umgewandelten Daten werden beim nächsten Speichern als Version 6
    abgelegt.
- **Version 6 → 7:** Alle Einträge, Orte, Wegpunkte, Fahrzeiten, Regeln und
  übrigen Angaben bleiben erhalten; vorhandene Koordinaten bleiben unverändert
  (neue werden mit 4 statt 3 Nachkommastellen gespeichert).
  - **Hinweis für heute:** Eine Uhrzeit in `hinweisHeuteAb` wird zu
    `hinweisHeuteAn: true` mit dieser Uhrzeit; `null` (nie am selben Tag) wird
    zu `hinweisHeuteAn: false` mit `"18:00"` für das spätere Einschalten. Fehlt
    das Feld, gilt an ab 18:00.
  - **Übliche Abfahrt:** ebenso je Hin- und Rückfahrt: eine Uhrzeit wird zu
    `abfahrtAn: true`; `null` wird zu `abfahrtAn: false` mit dem Beginn der
    Fahrzeit (`von`) als Uhrzeit.
  - Ergänzt wird `ortAusserhalb: "wohnort"` in `einstellungen.wetter`.
  - Die umgewandelten Daten werden beim nächsten Speichern als Version 7
    abgelegt.
- **Version 7 → 8 (Werkstatt):** Einträge, Einstellungen, Vorlagen, Fahrrad
  und alle Angaben der Wartungsarten (Intervalle, Zeitfenster, gültig ab,
  einmalig) bleiben erhalten; `wartungsprotokoll` und `termine` werden zu
  `auftraege`. Alle neuen Kennungen werden aus den alten abgeleitet, so dass
  „Sicherung prüfen“ eine alte Sicherung desselben Stands weiter als
  „identisch“ erkennt.
  - **Wartungsarten:** mit Zeitfenster, `einmalig` oder „Inspektion“,
    „Reparatur“ bzw. „Eigenleistung“ im Namen → Auftrag; sonst → Aufgabe
    (`bauteil: null`, `zuordnung: "naechste-inspektion"`). Fehlen eine
    „Reparatur“ bzw. „Eigenleistung“ (Auftrag ohne Fälligkeit), werden sie
    ergänzt (`id` `reparatur` bzw. `eigenleistung`, ist sie belegt, mit „-2“
    usw.). Fehlt `wartungsarten` ganz, gelten die Standardarten bis Version 7
    (Große und Kleine Inspektion mit Zeitfenster, Reparatur).
  - **Protokoll eines Auftrags** → erledigter Auftrag (`id` des
    Protokolleintrags; Datum, Werkstatt, Kilometerstand, Notiz).
  - **Protokoll einer Aufgabe** → erledigte Position (`id` „pos-“ + `id` des
    Eintrags, Notiz übernommen) im erledigten Auftrag vom selben Datum, sonst
    in einer erledigten Reparatur dieses Datums (`id` des ersten Eintrags).
    Damit die Fälligkeit gleich bleibt, nur bei gleichem Kilometerstand (beide
    berechnet oder beide gleich von Hand eingetragen); sonst eine eigene
    Reparatur. Eine abweichende Werkstatt steht in der Notiz der Position
    („Werkstatt: …“).
  - **Mängel mit `protokollId`** → erledigte Position („pos-“ + `id` des
    Mangels) in dem daraus entstandenen Auftrag; `protokollId` entfällt. Offene
    Mängel bleiben ohne Auftrag.
  - **Termin eines Auftrags** → geplanter Auftrag (`id` „termin-“ + `id` der
    Wartungsart). **Termin einer Aufgabe** → offene Position im geplanten
    Inspektions-Auftrag mit demselben Termin, sonst in einem neuen geplanten
    Auftrag der Inspektion, in deren Zeitfenster der Termin liegt, sonst in
    einer geplanten Reparatur mit diesem Termin und dieser Werkstatt.
  - Danach steht im Reiter Wartung „Bitte Wartungsarten prüfen“ (siehe
    „Wartung“).
  - Die umgewandelten Daten werden beim nächsten Speichern als Version 8
    abgelegt.
- **Version 8 → 9** (Release 5b): Alle Daten bleiben unverändert. Ergänzt wird
  `terminZeit` (`null`, also ganztägig) bei jedem Auftrag. Die umgewandelten
  Daten werden beim nächsten Speichern als Version 9 abgelegt; ein Hinweis
  erscheint nicht.
- Daten aus Version 1 bis 7 werden in einem Schritt über die Zwischenversionen
  auf Version 9 gebracht.

## Tests

`tests/test.html` prüft unter anderem:

- die Umwandlung von Version 1 bis 8 auf Version 9 (`tests/daten-v1.json`
  bis `tests/daten-v8.json`, erfundene Werte; auch dass geänderte
  Kleidungsregeln erhalten bleiben und Protokoll und Termine zu Aufträgen
  werden) und die Ablehnung fehlerhafter Daten,
- die Zusammenfassung der Einträge an den Wochen-, Monats- und Jahresgrenzen,
- die saisonale Fälligkeit, Verschleißteile als Aufgaben (km zuerst / Zeit
  zuerst), einmalige Aufträge und die Reihenfolge im Reiter Wartung,
- Prognosen und Jahresziel mit festen Testdaten und Stichtagen,
- Löschen mit „Rückgängig“,
- die Prüfung der Sicherungsdatei vor dem Teilen (das Teilen-Menü wird dabei
  durch einen Platzhalter ersetzt), den Dateinamen mit Uhrzeit und „Sicherung
  prüfen“ (identisch, älter, abweichend, beschädigt),
- Fahrtage ohne Eintrag, „Nachtragen“ und „Keine Fahrt“, das Merkmal
  „Arbeitsweg“, die Kennzahlen (Radtage, Ø, Arbeitstage, längste Serie) und
  das Diagramm,
- den Hinweis „Neue Version verfügbar“,
- das Wetter: Lesen der Antworten von Open-Meteo, DWD, Bright Sky und der
  Ortssuche, Ampel-Grenzfälle, Glätte-Erkennung, Kleidung, bestes
  Abfahrtsfenster, Wind relativ zur Strecke, Umschalten „heute/morgen“ um
  17 Uhr (auch am Tag der Zeitumstellung), Ausfall einer Quelle,
  Offline-Anzeige, Rundung der Koordinaten, die fünf Reiter und die Vorlagen in
  den Einstellungen,
- Release 4b: Formular für die Ampel-Grenzen (Ändern, Prüfung, „Auf Standard
  zurücksetzen“, Wirkung), Wetter je Eintrag beim
  Speichern, „Wetter nachtragen …“ mit dem aufgezeichneten Rückblick
  (Abschnitte, Rückfrage, Ausfall, „Rückgängig“), die Wetter-Statistik mit
  festen Testdaten, Koordinaten direkt eingeben, die Reiterleiste (Farben,
  Kontrast, keine Fläche), Böen in der Ampelzeile und den Hinweis für heute ab
  18:00,
- Release 4c: Kleidung je Körperbereich (Standardstufen, Grenzfälle, Anzeige
  ohne leere Bereiche), das Zwiebelprinzip mit einer Beispieltabelle (u. a.
  8 °C, 16 °C, 0 °C bei 45 % und 70 %, „Hände bei Regen“, Regenzeug schon in
  der Stufe), den Hinweis für die Rückfahrt, die Formulare je Stufe und
  Regenzusatz (Sortieren, Prüfen, Entfernen, Standard, „Rückgängig“), die
  Rückmeldung ohne Verschiebung mit Auswertung je Stufe und dem Schalter, die
  Umwandlung 5 → 6, die Empfehlung erst am Vorabend (auch am Tag der
  Zeitumstellung; der Tagesverlauf von 4c entfällt seit 4d), Wegpunkte (Formular, Reihenfolge, Teilstrecken, Wind
  je Teilstrecke (seit 4e eine Zeile je Teilstrecke statt nach Länge gewichtet), Werte und Warnungen am Wegpunkt, Rückblick), den
  Hinweis auf fehlende Einträge ohne doppelte Tage und die 12 Sekunden für
  „Rückgängig“,
- Release 4d: Datenversion 7 (Umwandlung 6 → 7 mit `tests/daten-v6.json`,
  Prüfung der neuen Felder), die Schalter „Hinweis schon am selben Tag“ und
  „Übliche Abfahrt“ (an/aus, gesperrte Uhrzeit, leeres Uhrzeitfeld ändert
  nichts), Koordinaten mit 4 Nachkommastellen (Formular, Suche, Standort,
  Import; an alle Wetterdienste weiter 3 Stellen; Teilstrecken mit den genauen
  Werten), „In Karten zeigen“ (Adresse, folgt den Feldern, gesperrt ohne
  Koordinaten, kein Abruf), die Ansicht „Jetzt“ (wann sie gilt, Überschrift,
  Viertelstunde und Dauer, über Mitternacht, Kleidung, Wind mit
  Himmelsrichtung, Abfahrtsfenster ab jetzt, Warnungen nur des angezeigten
  Orts, Kachel ohne weitere Werte) und den aktuellen Standort (Ortung durch
  Platzhalter ersetzt: Name aus der DWD-Gemeinde, Ausland, keine Freigabe,
  Zeitüberschreitung, kein Netz, gerundete Koordinaten, nichts gespeichert,
  Ortung nur in der angezeigten Ansicht, Umschalten im Reiter und in den
  Einstellungen),
- Release 4e: die Windrichtung im Reiter Wetter (erste Zeile mit
  Himmelsrichtung und Böen, darunter je Teilstrecke): die acht Abschnitte an
  allen Grenzen (knapp davor, genau darauf, knapp dahinter, beide Seiten, über
  Nord hinweg, mit einer echten Fahrtrichtung), das Mittel mehrerer Werte,
  schwacher Wind mit Richtung, die Rundung 9/10 km/h, „Windstill“, die Karten
  mit und ohne Wegpunkte, eine ausgeschlossene Teilstrecke, die Rückfahrt, die
  vergangene Fahrt, die Karte „Jetzt“ (nur die erste Zeile), Böen nicht doppelt,
  die Kachel und die Hinweise unverändert (dieselben Texte wie in 4d), Daten
  unverändert und den Hinweis in den Einstellungen,
- Release 5a (Werkstatt, Datenversion 8): die Umwandlung 7 → 8 mit
  `tests/daten-v7.json` beim Laden und beim Import (Einordnung in Aufträge und
  Aufgaben, Eigenleistung ergänzt, Aufgaben vom selben Tag mit gleichem bzw.
  abweichendem km-Stand, Reparatur je Tag, Mängel mit protokollId auch zu einer
  Aufgabe, Termine von Aufträgen und Aufgaben, feste Kennungen, „Sicherung
  prüfen“ identisch, Kurzinfo alt und neu, gespeicherte Daten erst beim
  Speichern geändert), den Hinweis „Bitte Wartungsarten prüfen“ (kein Fenster
  beim Start, Prüfbildschirm, Formular und zurück, „Später“, „Alles geprüft“,
  nicht bei „Sicherung prüfen“, beim Import), die Prüfung der Datenversion 8
  (Art, Bauteil, Zuordnung, Status, Termin und Datum, Positionen, höchstens ein
  geplanter Auftrag je Inspektion, Aufgaben und Mängel in höchstens einem
  geplanten Auftrag, Mängel nur einmal erledigt, „ausgeschlossen“), die
  Fälligkeit (Zeitfenster mit km-Hinweis, km oder Monate), die nur berechnete
  Standard-Zuordnung („nächste Inspektion“, bestimmter Auftrag, Zieldatum mit
  und ohne Termin, entfernt, ausdrücklich zugeordnet, sofortige Wirkung,
  Daten unverändert), die Vorschläge („zu diesem Auftrag nehmen?“, „sonst …“),
  Karten, Aufgabenliste und Übersicht, das Bearbeiten (Mitnehmen, Entfernen,
  Verschieben, Hinzufügen, Termin planen, ändern und entfernen, Mangel
  zuordnen, Reparatur und Eigenleistung anlegen, Löschen mit „Rückgängig“),
  „Erledigt eintragen“ (angezeigte Positionen fest gespeichert, auch die
  berechneten; nicht gemacht; Intervall neu ab Datum und km des Auftrags;
  Mängel; spätere Änderungen an Intervallen und Zuordnungen ändern erledigte
  Aufträge nicht; Ändern und Löschen; Eigenleistung an einer Aufgabe), Mängel
  von Hand erledigen bzw. öffnen, das Formular der Wartungsarten (Art, Bauteil
  mit Auswahlliste, Zuordnung, Wechsel nur unbenutzt, Löschen) und den Wind je
  Teilstrecke zweizeilig (W15: Name klein, darunter eingerückt der Wind in
  normaler Schrift),
- Release 5a.1 (Positionen in erledigten Aufträgen, W16): Aufgabe zu einem
  erledigten Auftrag hinzufügen (Fälligkeit ab dessen Datum und km; abgewählt
  = „nicht gemacht“; zu einem älteren Auftrag ohne Wirkung auf die
  Fälligkeit), Position entfernen (Fälligkeit wie vorher), „Abbrechen“, Mangel
  hinzufügen (geschlossen mit dem Auftragsdatum, Auswahl nach Datum) und
  entfernen (wieder offen), „Rückgängig“, geplante Position nur bei neuester
  Erledigung entfernt, „+ Aufgabe“ und × beim Abschluss eines geplanten
  Auftrags, „Erledigt eintragen“ an einer Aufgabe (neue Eigenleistung, neue
  Reparatur, zu erledigtem Auftrag, schon erledigt ausgegraut, „nicht
  gemacht“ wird „erledigt“, nicht doppelt), Export/Import und „Sicherung
  prüfen“ unverändert,
- Release 5b, Dateistruktur: `index.html` bindet CSS und JS ein und enthält
  selbst keinen Code mehr, die Liste `DATEIEN` in `sw.js` stimmt mit den
  eingebundenen Dateien überein, jede Datei ist vorhanden, gültig und
  geladen, das CSS gilt,
- Release 5b, Datenversion 9 und Kalender (D4): die Umwandlung 8 → 9 mit
  `tests/daten-v8.json` beim Laden und beim Import (alle Daten erhalten,
  `terminZeit` = `null`, gespeicherte Daten erst beim Speichern geändert, kein
  Hinweis, „Sicherung prüfen“ identisch, Export → Import), die Prüfung von
  `terminZeit` (Format, nur mit Termin, nicht bei erledigten), das
  Termin-Formular (Schalter „Mit Uhrzeit“, gesperrtes Feld, Anzeige mit
  Uhrzeit, ungültige Uhrzeit, Uhrzeit ohne Datum, „Termin entfernen“,
  „Erledigt eintragen“) und die Kalenderdatei (Aufbau, ganztägig, mit Uhrzeit
  auch über Mitternacht, Erinnerung am Vortag um 18:00, Titel mit und ohne
  Werkstatt, Maskierung, Beschreibung, feste UID, Falten nach 75 Bytes ohne
  geteilte Zeichen, Dateiname, Knopf nur bei geplanten Aufträgen mit Termin,
  Fenster, „Im Kalender öffnen“, „Als Datei teilen …“ mit Abbruch und
  Download, Daten unverändert),
- Release 5b, Aufteilung der Reiter (IA): Reihenfolge der Übersicht (Wetter,
  Erfassen mit Fahrtagen ohne Eintrag, Kilometerstand, Summen, Jahr, diese
  Woche, Sicherungszeile), Ampel und Erfassen ohne Scrollen in der Größe eines
  iPhone 13 mini (375 × 812), Kilometerstand → Wartung, „Alle Einträge ›“,
  Fahrten mit „Einträge | Statistik“ und Jahresziele, Wartung mit Knöpfen oben
  und „Aktuell | Verlauf“, „Wartungsarten verwalten ›“, Einstellungen mit
  Hauptseite und allen Unterseiten (Titel, „‹ Einstellungen“, Reiter erneut
  antippen, Unterseite bleibt beim Reiterwechsel), Wege aus Wetter und
  Übersicht, alle bisherigen Bedienelemente weiter erreichbar, Daten
  unverändert; die bestehenden Tests gehen die neuen Wege.

Die Seite lädt die App unsichtbar mit eigenem Speicherplatz; echte Daten werden
nicht berührt.

**Wetter in den Tests:** Die Wetterdienste werden nicht abgefragt. Die Tests
ersetzen `fetch` durch einen Platzhalter, der mit aufgezeichneten Antworten
antwortet (`tests/wetter-*.json`, aufgezeichnet am 25.10.2026 für erfundene
Koordinaten; Ortsnamen, Warngebiete und Kennungen sind durch erfundene ersetzt;
`tests/wetter-rueckblick.json` ist der Rückblick für den 12.–23.10.2026).
Für die einzelnen Fälle setzen die Tests die aufgezeichnete Vorhersage auf
ruhiges Wetter und ändern dann gezielt einzelne Werte; für Wegpunkte setzen sie
die Vorhersage eines weiteren Orts aus den Aufzeichnungen zusammen. Die Tests laufen in jeder
Zeitzone; eine Prüfung zur Zeitumstellung läuft nur in der Zeitzone
Europe/Berlin.

**Regel:** Jedes Release erweitert `tests/test.html` um Tests für alle neuen
Funktionen, und der Pull Request beschreibt die Ergebnisse.

Aufruf im Browser, z. B. nach der Veröffentlichung unter
`https://aeckert-dev.github.io/rad-km/tests/test.html`, oder lokal über einen
kleinen Webserver (direkt als Datei geöffnet blockiert der Browser den
Zugriff):

```sh
python3 -m http.server 8000
# dann http://localhost:8000/tests/test.html öffnen
```

Oben steht „Alle … Tests bestanden“ oder die Anzahl der Fehler.

**Offline und Updates:** `tests/offline-update-test.js` spielt in einem echten
Browser durch, was der Service Worker tut: erster Start, Start ohne Netz,
Veröffentlichung einer neuen Version, Hinweis „Neue Version verfügbar“, „Neu
laden“, alle Dateien aus dem Zwischenspeicher, nur eine JS-Datei bzw. nur das
CSS geändert, vor „Neu laden“ der bisherige und danach der neue Satz
vollständig, eine auf dem Server fehlende Datei (kein halber Satz), der
Übergang von 5a.1 (eine Datei) auf die aufgeteilte App (5a.1 holt der Test
mit Git aus dem Commit `52cd779`; ohne Git wird dieser Teil übersprungen),
geänderter Service Worker, Wetter beim Start und ohne Netz, die Ansicht
„Jetzt“ am aktuellen Standort mit und ohne Netz (die Wetterdienste antworten
dabei mit den Aufzeichnungen aus `tests/`, der Standort ist vorgegeben). Dabei prüft
er jedes Mal, dass die Daten im `localStorage` unverändert bleiben, und lässt
die Testseite unter dem aktiven Service Worker laufen. Er arbeitet mit einer Kopie der App und einem
eigenen Webserver, der sich wie GitHub Pages verhält. Aufruf (benötigt
Node.js und Playwright):

```sh
node tests/offline-update-test.js
```

## Dateistruktur

Die App ist auf mehrere Dateien verteilt, damit man für eine Änderung nur die
betroffenen Dateien lesen muss. Alle JavaScript-Dateien sind normale Skripte
(keine Module) und teilen sich einen gemeinsamen Bereich: Eine Funktion aus
`js/daten.js` ist in jeder anderen Datei aufrufbar. `index.html` lädt sie in
fester Reihenfolge; Code, der schon beim Laden läuft, steht nur in
`js/grundlagen.js`, `js/daten.js` und `js/start.js` (diese zuletzt).

| Datei | Inhalt |
|---|---|
| `index.html` | Grundgerüst: Überschrift, Inhaltsbereich, untere Reiterleiste, zwei Fenster (Formulare, Rückfragen), Einbindung von CSS und JS |
| `css/app.css` | Aussehen; die Farben stehen als Variablen in `:root`, für den Dunkelmodus werden nur diese ausgetauscht |
| `js/grundlagen.js` | Grundeinstellungen (`APP_VERSION`, `DATEN_VERSION`, Speicherschlüssel, Konstanten) und Hilfsfunktionen für Datum, Zahlen, Text |
| `js/daten.js` | Datenmodell: Standardwerte, Laden, Prüfen, Umwandeln (`MIGRATIONEN`), Speichern |
| `js/berechnungen.js` | Kilometerstand, Summen, Prognosen, Jahresziel, Zusammenfassung der Einträge |
| `js/statistik.js` | Reiter Fahrten (Einträge \| Statistik): Fahrtage und Kennzahlen, Diagramm (SVG, ohne Bibliothek), Jahresziele mit Formular, Wetter-Statistik und „Wetter nachtragen …“ |
| `js/wartung.js` | Werkstatt (Berechnung): Fälligkeit (Zeitfenster, Intervall), offene Aufträge, berechnete Standard-Zuordnung, Vorschläge |
| `js/kalender.js` | Kalenderdatei (`.ics`) zum Termin eines geplanten Auftrags |
| `js/wartung-ansicht.js` | Reiter Wartung (Aktuell \| Verlauf), Wartungsarten (für Einstellungen → Wartungsarten): Aufträge, Termin, „In Kalender übernehmen“, Erledigt eintragen, Aufgaben, Mängel, Wartungsarten, Prüfbildschirm nach der Umwandlung auf Version 8 |
| `js/wetter.js` | Wetter (Logik): Abruf von Open-Meteo, DWD und Bright Sky, Zwischenspeicher, aktueller Standort, Ampel, Glätte, Kleidung, Wind, bestes Abfahrtsfenster, Ansicht „Jetzt“, Wetter je Eintrag, Rückblick |
| `js/wetter-ansicht.js` | Reiter Wetter und Kachel, Wetter-Einstellungen (Zeilen der Hauptseite, Seiten „Orte und Strecke“ und „Außerhalb der Fahrten“, Fahrzeiten), Ampel-Grenzen, Kleidungsregeln, Rückmeldung nach der Fahrt |
| `js/uebersicht.js` | Reiter Übersicht, Eintragsliste (für Fahrten → Einträge), Eintragsformular, Kilometerstand für ein Datum |
| `js/einstellungen.js` | Reiter Einstellungen: Hauptseite, Unterseiten (`EINSTELLUNGEN_SEITEN`), Fahrrad, Vorlagen, Fahrtage |
| `js/sicherung.js` | Datensicherung: Export, Prüfung vor dem Teilen, Vergleich mit einer Sicherung, Import |
| `js/oberflaeche.js` | Bausteine der Oberfläche: Fenster, Rückfrage, Meldung, Rückgängig; `zeichnen()`, Reiter, Umschalter, Wege zu den Einstellungen |
| `js/bedienung.js` | Zuordnung der Klicks und Eingaben (`data-action`, `data-change`) zu den Funktionen |
| `js/start.js` | Anmeldung des Service Workers, Hinweis „Neue Version verfügbar“, Start der App |
| `sw.js` | Service Worker (siehe unten) |
| `tests/` | Testseite, Offline-Test und erfundene Testdateien (siehe „Tests“) |

Neue Dateien müssen in `index.html` **und** in der Liste `DATEIEN` in `sw.js`
eingetragen werden; `tests/test.html` prüft, dass beide übereinstimmen.

`sw.js` ist der Service Worker. Er speichert alle Dateien der App als
vollständigen Satz für den Start ohne Netz, vergleicht sie nach dem Start mit
den Dateien auf dem Server und übernimmt eine neue Version erst nach „Neu
laden“ – immer alle Dateien gemeinsam, alte und neue werden nie gemischt.
Eine neue Version erkennt er am Inhalt der Dateien, eine Versionsnummer muss
dafür nicht gepflegt werden. Abrufe der Wetterdienste gehen an ihm vorbei
direkt ins Netz; ohne Netz nimmt die App den eigenen Zwischenspeicher
`radkm-wetter`.
