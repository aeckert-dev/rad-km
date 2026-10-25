# Rad-km

Eine kleine Web-App zum Erfassen der gefahrenen Fahrrad-Kilometer und zum
Überblick über Inspektionen und Reparaturen. Sie ersetzt eine Excel-Liste und
ist für das iPhone optimiert.

- Kilometer pro Tag erfassen, mit Vorlagen in zwei Klicks
- Aktueller Kilometerstand und Summen für heute, diese Woche, diesen Monat, dieses Jahr
- Jahresprognose, Jahresziel und Kilometerstand-Prognose für ein beliebiges Datum
- Statistik: km pro Monat im Vergleich zum Vorjahr, Radtage, Arbeitstage mit
  dem Rad und längste Serie
- Hinweis auf übliche Fahrtage ohne Eintrag, mit „Nachtragen“ und „Keine Fahrt“
- Einträge übersichtlich zusammengefasst nach Woche, Monat und Jahr
- Wartungsprotokoll mit Fälligkeit (Intervall in Monaten und/oder km, jährliches
  Zeitfenster oder einmalig) und geplanten Terminen
- Mängelliste, die beim Eintragen einer Wartung abgehakt werden kann
- Löschen mit „Rückgängig“
- Datensicherung als JSON-Datei, die vor dem Teilen geprüft wird; gespeicherte
  Sicherungen lassen sich prüfen, ohne etwas zu überschreiben
- Startet auch ohne Netz; neue Versionen werden angekündigt
- Hell- und Dunkelmodus nach Systemeinstellung

Die ganze App steckt in **einer einzigen Datei: `index.html`**. Dazu kommt nur
der Service Worker `sw.js`, der die App für den Start ohne Netz bereithält. Es
gibt keine externen Bibliotheken und keinen Build-Schritt.

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
  sichern“ auf der Startseite). Die App erinnert dich, wenn die letzte
  Sicherung mehr als 30 Tage zurückliegt.
- Der Service Worker speichert nur die App selbst (`index.html`), damit sie
  auch ohne Netz startet. Auf die Daten im `localStorage` hat er keinen
  Zugriff.

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

## Bedienung

### Erster Start

1. Unter **Einstellungen → Fahrrad anlegen** Namen, Startdatum und
   Start-Kilometerstand eintragen, optional auch Rahmennummer und eine
   Beschreibung (z. B. Farbe, Modell). Der Start-Kilometerstand gilt **zu
   Beginn** des Startdatums.
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
- Pro Datum gibt es genau einen Eintrag. Ist ein Datum schon erfasst, zeigt
  die App den vorhandenen Eintrag an; mit **Ändern** kannst du ihn bearbeiten.
- **Arbeitsweg:** Das Häkchen im Formular übernimmt die App aus der Vorlage
  (siehe „Vorlagen“). Du kannst es für den einzelnen Eintrag ändern.
- **Keine Fahrt:** Ein Eintrag mit 0 km bedeutet „an diesem Tag nicht
  gefahren“. Er erscheint in der Liste dezent als „keine Fahrt“ und zählt in
  der Statistik nicht als Radtag.
- Kilometer mit Komma eingeben, z. B. `12,5`.
- Gibt es in derselben Woche (Montag bis Sonntag) bereits einen
  **Wochen-Eintrag**, warnt die App vor dem Speichern, denn die km würden
  sonst doppelt zählen.

### Übersicht

- **Kilometerstand** = Start-Kilometerstand + alle Einträge ab dem Startdatum.
- **Fahrtage ohne Eintrag:** Fehlt für einen deiner üblichen Fahrtage (siehe
  „Einstellungen“) der letzten 14 Tage (bis gestern, ab dem Startdatum) ein
  Eintrag, erscheint z. B. „2 Fahrtage ohne Eintrag: Di 20.10., Fr 23.10.“.
  Je Tag gibt es zwei Schaltflächen:
  - **Nachtragen** öffnet die Erfassung für diesen Tag.
  - **Keine Fahrt** legt mit einem Tipper einen Eintrag mit 0 km an (mit
    „Rückgängig“).
  - Eine Woche mit einer importierten Wochensumme gilt als erfasst.
- **Nächste fällige Wartung:** ein geplanter Termin oder die berechnete
  Fälligkeit, je nachdem, was zuerst kommt. Liegt sie in der Zukunft, steht
  der erwartete Kilometerstand dabei, z. B. „(ca. 4.350 km)“.
- **Summen:**
  - Heute.
  - Woche: Montag bis Sonntag.
  - Monat und Jahr.
  - Ein Wochen-Eintrag zählt dabei vollständig zu seinem Datum.
- **Jahr:** Jahresziel mit Fortschritt und Jahresprognose (siehe
  „Prognosen und Jahresziel“) sowie „Kilometerstand für ein Datum …“.
- **Datensicherung:** Datum der letzten Sicherung und „Jetzt sichern“ (siehe
  „Datensicherung“).
- **Liste der Einträge:** die neuesten zuerst, abgeschlossene Zeiträume
  zusammengefasst (siehe unten). Antippen eines Eintrags öffnet die
  Detailansicht.
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

Antippen eines Eintrags, eines Wartungsprotokoll-Eintrags oder eines Mangels
zeigt ihn zunächst nur an. Erst **Ändern** öffnet das Formular. **Löschen**
gibt es nur im Formular, immer mit Rückfrage. Das Erfassen über eine Vorlage
bleibt bei zwei Klicks (Vorlage antippen, Speichern).

### Rückgängig

Nach dem Löschen eines Eintrags, eines Wartungsprotokoll-Eintrags, eines
Mangels oder einer Vorlage und nach „Keine Fahrt“ erscheint unten etwa 6
Sekunden lang eine Meldung mit **Rückgängig**. Damit kommt der alte Stand vollständig zurück, auch die
Verknüpfungen (z. B. die Mängel eines gelöschten Protokoll-Eintrags). Jede
weitere Änderung beendet das Angebot, damit sie nicht überschrieben wird.

### Vorlagen

Vorlagen anlegen, bearbeiten, löschen, und mit ▲/▼ die Reihenfolge ändern.
Jeder Eintrag speichert seine Kilometer und den Namen der Vorlage selbst. Das
Ändern oder Löschen einer Vorlage verändert also keine bestehenden Einträge.

**Arbeitsweg:** Vorlagen für den Weg zur Arbeit bekommen das Häkchen
„Arbeitsweg“. Beim Erfassen übernimmt der Eintrag das Merkmal (wie die km).
Setzt oder entfernst du das Häkchen an einer Vorlage, fragt die App, ob die
bisherigen Einträge mit dieser Vorlage (gleicher Name) ebenfalls angepasst
werden sollen. Ohne deine Zustimmung bleiben sie unverändert.

### Wartung

- **Reihenfolge im Reiter Wartung:**
  1. Offene Mängel (nur wenn vorhanden).
  2. Überfällige Wartungen, die am längsten überfällige zuerst. Dazu zählt
     auch ein geplanter Termin, der verstrichen ist, ohne dass die Wartung
     eingetragen wurde.
  3. Anstehende Wartungen, chronologisch nach dem maßgeblichen Datum:
     geplanter Termin; vor dem Zeitfenster dessen Beginn, im Zeitfenster
     dessen Ende; bei Intervall das Fälligkeitsdatum, bei km das
     prognostizierte Datum. Danach Wartungen mit km-Intervall, für die noch
     keine Prognose möglich ist.
  4. Wartungsarten ohne Fälligkeit (z. B. Reparatur) oder noch nicht gültig
     („Gültig ab Jahr“).
  5. Einmalige, erledigte Wartungen.
  6. Danach „Mangel erfassen“ (wenn es keine offenen Mängel gibt) und die
     erledigten Mängel, das Wartungsprotokoll und die Wartungsarten.
  - Innerhalb gleicher Daten und in den Gruppen 4 und 5 gilt die Reihenfolge
    der Wartungsarten. Die nächste Wartung auf der Übersicht ist die erste
    überfällige bzw. anstehende.
- **Wartungsarten:**
  - Bei einer Neuinstallation voreingestellt: „Große Inspektion“ (Zeitfenster
    Oktober–November), „Kleine Inspektion“ (Zeitfenster März–April) und
    „Reparatur“ (ohne Intervall). Wer Daten aus Version 1 übernimmt, behält
    seine Wartungsarten unverändert, also ohne Zeitfenster.
  - Eigene Wartungsarten kannst du anlegen und bearbeiten, z. B. für
    Verschleißteile wie Kette oder Bremsbeläge mit einem Intervall in km.
- **Einmalig (optional):** für Wartungen, die nur einmal anfallen, z. B. die
  Erstinspektion.
  - Vor der Durchführung zeigt die Karte die normale Fälligkeit.
  - Nach der ersten Durchführung zeigt sie nur noch „erledigt am TT.MM.JJJJ“,
    ohne „Termin planen“ und „Erledigt eintragen“, und steht am Ende der
    Liste. Ein noch geplanter Termin wird beim Eintragen entfernt.
  - Nicht mit einem Zeitfenster kombinierbar.
- **Jährliches Zeitfenster (optional):**
  - Monat von und Monat bis, z. B. Oktober bis November. Das Fenster darf
    nicht über den Jahreswechsel gehen.
  - **Gültig ab Jahr (optional):** Vor diesem Jahr zeigt die App keine
    Fälligkeit („noch nicht fällig“). Praktisch beim Umstellen auf den
    saisonalen Rhythmus. Leer = sofort gültig.
  - Ist ein Zeitfenster gesetzt, werden die Intervalle (Monate und km) nicht
    ausgewertet.
- **Termin planen:**
  - Pro Wartungsart ist ein geplanter Termin mit Datum und Werkstatt möglich.
  - Der Termin wird statt der berechneten Fälligkeit angezeigt, zusammen mit
    dem erwarteten Kilometerstand an diesem Tag.
- **Erledigt eintragen:**
  - Gibt es einen geplanten Termin, bietet die App an, ihn ins Protokoll zu
    übernehmen. Danach wird der Termin entfernt.
  - Den **Kilometerstand** berechnet die App automatisch aus allen Einträgen
    bis einschließlich diesem Datum.
  - Du kannst ihn überschreiben. Mit „Berechneten Wert verwenden“ kehrst du
    zur Berechnung zurück.
- **Fälligkeit mit Zeitfenster:**
  - Vor dem Fenster: „fällig ab 01.10.“
  - Im Fenster ohne Durchführung: „fällig bis 30.11.“
  - Im Fenster durchgeführt: „erledigt, nächste ab 01.10.2027“. Es zählt nur
    eine Durchführung **innerhalb** des Fensters.
  - Nach dem Fenster ohne Durchführung: „überfällig seit 30.11.2026“. Das
    bleibt auch über den Jahreswechsel und im nächsten Fenster bestehen, bis
    die Wartung durchgeführt wird.
  - Eine Durchführung nach dem Ende des Fensters gilt als **Nachholung** für
    das versäumte Jahr: „erledigt (nachgeholt), nächste ab 01.10.2027“. Für
    das Fenster des nächsten Jahres zählt sie nicht.
  - Gezählt werden Fenster ab „Gültig ab Jahr“ und nur, wenn sie nicht vor
    dem Startdatum des Fahrrads enden.
  - Ein geplanter Termin hat weiterhin Vorrang in der Anzeige; die Fälligkeit
    nach Zeitfenster steht dann klein darunter.
  - Vor und im Fenster steht der erwartete Kilometerstand zu Beginn bzw. am
    Ende des Fensters dabei.
- **Fälligkeit mit Intervall (ohne Zeitfenster):**
  - Intervall in Monaten und/oder in km. **Fällig ist, was zuerst erreicht
    wird.**
  - Grundlage ist die letzte Durchführung (Datum und Kilometerstand). Ohne
    bisherige Durchführung zählt das Intervall ab dem Startdatum und dem
    Start-Kilometerstand.
  - Nach Monaten: „fällig in X Tagen“, „heute fällig“ oder „überfällig seit X
    Tagen“, bei einem Datum in der Zukunft mit dem erwarteten Kilometerstand.
  - Nach km: Den Tag, an dem die km-Grenze erreicht wird, schätzt die App mit
    der Prognose (siehe unten), z. B. „fällig ca. im Mai 2027 bei ca. 7.500
    km“, darunter „Noch ca. 800 km bis zur km-Grenze“. Ist keine Schätzung
    möglich (zu wenige Daten oder keine Fahrten), steht dort nur „fällig bei
    ca. 7.500 km“. Ist die Grenze überschritten: „überfällig: km-Grenze
    (7.500 km) um 120 km überschritten“.
  - Dazu „Seit letzter Wartung gefahren: X km“.
  - Ohne Fahrrad und ohne Durchführung steht dort „noch nicht durchgeführt“.
- Eine Wartungsart, die im Protokoll verwendet wird, kann nicht gelöscht
  werden. Umbenennen geht jederzeit.

### Mängel

- **Mangel erfassen** im Reiter Wartung: Datum (Standard heute),
  Beschreibung und Status „offen“ oder „erledigt“.
- Offene Mängel stehen ganz oben im Reiter Wartung, erledigte unter den
  Wartungen in einem einklappbaren Bereich.
- Auf der Übersicht steht bei der nächsten Wartung die Anzahl offener Mängel,
  z. B. „3 offene Mängel“.
- **Erledigt eintragen** einer Wartung bietet die offenen Mängel zum Abhaken
  an. Abgehakte Mängel werden erledigt, mit dem Datum der Wartung und dem
  Protokoll-Eintrag verknüpft. Beim Ändern des Protokoll-Eintrags lassen sie
  sich wieder abwählen (dann sind sie wieder offen).
- Wird ein Protokoll-Eintrag gelöscht, werden die verknüpften Mängel wieder
  auf „offen“ gesetzt. Die Rückfrage nennt sie.

### Prognosen und Jahresziel

- **Grundlage aller Prognosen:** die durchschnittlichen km pro Kalendertag der
  letzten 365 Tage bis gestern. Liegt das Startdatum kürzer zurück, zählt die
  Zeit ab dem Startdatum. Einträge vor dem Startdatum zählen nicht mit.
- Prognosen gibt es erst, wenn seit dem Startdatum mindestens 7 Tage vergangen
  sind. Sie werden immer als „ca.“ angezeigt und auf 10 km gerundet.
- **Jahresprognose** (Startseite): km des laufenden Jahres bis heute +
  Durchschnitt × restliche Tage des Jahres.
- **Kilometerstand für ein Datum** (Startseite): erwarteter Kilometerstand am
  Ende eines frei wählbaren Tages. Für heute und vergangene Tage zeigt die App
  den tatsächlichen Stand.
- **Jahresziel:** unter **Einstellungen → Jahresziele** je Kalenderjahr ein
  Ziel in km. Die Startseite zeigt für das laufende Jahr:
  - den Fortschritt, z. B. „2.340 von 5.000 km · 47 %“, als Balken; der
    Strich im Balken markiert das zeitanteilige Soll,
  - den Vergleich mit dem zeitanteiligen Soll bis heute (Ziel × vergangene
    Tage ÷ Tage des Jahres), z. B. „ca. 120 km voraus“ oder „ca. 80 km im
    Rückstand“,
  - die Jahresprognose im Vergleich zum Ziel, z. B. „ca. 130 km unter dem
    Ziel“.

### Statistik

Der Reiter **Statistik** zeigt:

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

### Datensicherung

- **Jetzt sichern** (Startseite und Einstellungen):
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
- **Sicherung prüfen …** (Einstellungen): dasselbe für eine beliebige, auch
  ältere Sicherung. Mögliche Ergebnisse:
  - „Identisch mit dem aktuellen Stand“
  - „Sicherung ist älter: 3 Einträge fehlen (25.–27.10.)“, wenn seitdem nur
    Neues dazugekommen ist
  - „Sicherung weicht vom aktuellen Stand ab“ mit Einzelheiten, z. B. „1
    Eintrag geändert (20.10.)“
  - „Datei beschädigt bzw. keine Rad-km-Sicherung“ mit dem Grund
  - Dazu Zeitpunkt und Inhalt der Sicherung und ein Hinweis, falls die
    Kurzinfo nicht zum Inhalt passt (Datei nachträglich verändert).
- **Daten importieren:**
  - Eine Sicherungsdatei auswählen.
  - Die App prüft die Datei und zeigt eine Zusammenfassung.
  - Nach deiner Bestätigung **ersetzt** sie alle vorhandenen Daten.
  - Fehlerhafte Dateien werden mit einer Meldung abgelehnt, z. B. bei einem
    doppelten Datum.

### Einstellungen

- Fahrrad, Fahrtage, Jahresziele, Datensicherung.
- **Fahrtage:** deine üblichen Fahrtage zum Ankreuzen (Voreinstellung
  Montag, Dienstag, Freitag). Sie gelten für den Hinweis auf fehlende
  Einträge und die längste Serie. Änderungen werden sofort gespeichert.
- **Über Rad-km:** App-Version und Datenversion.

## JSON-Format für Sicherung und Import

Die Datei ist ein JSON-Objekt mit folgenden Teilen:

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `version` | Zahl | ja | Version des Datenmodells, aktuell `3` |
| `kurzinfo` | Objekt | nein | Kurzinfo der Sicherung (ab Version 3, siehe unten); wird beim Import nicht übernommen |
| `exportiertAm` | Text | nein | Nur in Sicherungen bis Version 2: Zeitpunkt des Exports; wird beim Import ignoriert |
| `fahrrad` | Objekt oder `null` | nein | Das Fahrrad (siehe unten) |
| `einstellungen` | Objekt | nein | Fahrtage und Jahresziele (ab Version 3); fehlt das Feld, gelten die Standardwerte |
| `vorlagen` | Liste | nein | Vorlagen in Anzeigereihenfolge |
| `eintraege` | Liste | nein | Kilometer-Einträge |
| `wartungsarten` | Liste | nein | Fehlt das Feld, werden die drei Standard-Wartungsarten angelegt |
| `wartungsprotokoll` | Liste | nein | Durchgeführte Wartungen |
| `termine` | Liste | nein | Geplante Termine |
| `maengel` | Liste | nein | Mängelliste (ab Version 2) |

Allgemeine Regeln:

- **Datum** immer als Text im Format `"JJJJ-MM-TT"`, z. B. `"2025-03-17"`.
- **Kilometer** als Zahl mit **Punkt** (JSON-Regel), z. B. `12.5`, nicht
  `"12,5"`. Alle km-Werte müssen ≥ 0 sein.
- **Texte** in Anführungszeichen. Optionale Texte dürfen fehlen, `""` oder
  `null` sein.
- **`id`-Felder** sind beliebige eindeutige Texte. Bei Vorlagen, Einträgen und
  Protokolleinträgen dürfen sie fehlen, die App vergibt dann eigene.
- **Ja/Nein-Merkmale** (`arbeitsweg`, `einmalig`) als `true` oder `false`;
  fehlt das Feld, gilt `false`.

### `kurzinfo` (nur in der Sicherungsdatei)

Steht am Anfang der Datei, damit man den Inhalt auch ohne App erkennt. „Sicherung
prüfen“ vergleicht sie mit dem Inhalt der Datei.

| Feld | Typ | Bedeutung |
|---|---|---|
| `zeitpunkt` | Text | Zeitpunkt der Sicherung (ISO 8601, UTC), z. B. `"2026-10-25T14:03:00.000Z"` |
| `appVersion` | Text | App-Version, mit der gesichert wurde, z. B. `"3b"` |
| `eintraege` | Zahl | Anzahl der Einträge |
| `kmSumme` | Zahl | Summe der km aller Einträge |
| `kmStand` | Zahl oder `null` | Kilometerstand (Start-Kilometerstand + Einträge ab dem Startdatum) |
| `wartungen` | Zahl | Anzahl der Einträge im Wartungsprotokoll |
| `maengel` | Zahl | Anzahl der Mängel |

### `einstellungen` (ab Version 3)

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `fahrtage` | Liste von Zahlen | nein | Übliche Fahrtage, 1 = Montag … 7 = Sonntag; Standard `[1, 2, 5]` (Mo, Di, Fr). Für den Hinweis auf Fahrtage ohne Eintrag und die längste Serie; `[]` = keine |
| `jahresziele` | Liste | nein | Jahresziele, je Jahr höchstens eines: `{ "jahr": 2026, "km": 5000 }` (km > 0) |

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

### `wartungsarten[]`

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | Text | ja | Eindeutige Kennung, wird von Protokoll und Terminen verwendet |
| `name` | Text | ja | z. B. `"Große Inspektion"` |
| `intervallMonate` | ganze Zahl ≥ 1 oder `null` | nein | Intervall in Monaten |
| `intervallKm` | Zahl > 0 oder `null` | nein | Intervall in km (ausgewertet ab Version 3); mit `intervallMonate` gilt, was zuerst erreicht wird |
| `fensterVon` | Monat 1–12 oder `null` | nein | Beginn des jährlichen Zeitfensters (ab Version 2) |
| `fensterBis` | Monat 1–12 oder `null` | nein | Ende des Zeitfensters; nur zusammen mit `fensterVon`, `fensterVon` ≤ `fensterBis` |
| `gueltigAbJahr` | Jahreszahl oder `null` | nein | Nur mit Zeitfenster: vor diesem Jahr keine Fälligkeit; `null` = sofort gültig |
| `einmalig` | `true`/`false` | nein | Einmalige Wartung (ab Version 3); nach der ersten Durchführung erledigt. Nicht mit Zeitfenster |

Die Standard-Wartungsarten haben die IDs `grosse-inspektion`,
`kleine-inspektion` und `reparatur`.

### `wartungsprotokoll[]`

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | Text | nein | Eindeutige Kennung (wird von Mängeln verwendet) |
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

### `maengel[]`

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `id` | Text | nein | Eindeutige Kennung |
| `datum` | Datum | ja | Festgestellt am |
| `beschreibung` | Text | ja | Beschreibung des Mangels |
| `status` | `"offen"` oder `"erledigt"` | nein | Standard `"offen"` |
| `erledigtAm` | Datum oder `null` | nein | Nur bei `"erledigt"` |
| `protokollId` | Text oder `null` | nein | Nur bei `"erledigt"`: `id` des Wartungsprotokoll-Eintrags, mit dem der Mangel erledigt wurde |

### Beispiel (erfundene Werte)

```json
{
  "version": 3,
  "kurzinfo": { "zeitpunkt": "2025-03-01T18:00:00.000Z", "appVersion": "3b", "eintraege": 4,
                "kmSumme": 98, "kmStand": 198, "wartungen": 1, "maengel": 2 },
  "fahrrad": { "name": "Mein Rad", "startdatum": "2025-01-01", "startKm": 100,
               "rahmennummer": "AB 12345", "beschreibung": "Blau, 28 Zoll" },
  "einstellungen": { "fahrtage": [1, 2, 5], "jahresziele": [{ "jahr": 2025, "km": 3000 }] },
  "vorlagen": [
    { "name": "Arbeit hin und zurück", "km": 10, "arbeitsweg": true },
    { "name": "Einkauf", "km": 3.5, "arbeitsweg": false }
  ],
  "eintraege": [
    { "datum": "2025-01-06", "km": 40, "typ": "woche", "notiz": "aus Excel" },
    { "datum": "2025-01-13", "km": 35.5, "typ": "woche" },
    { "datum": "2025-01-20", "km": 10, "vorlage": "Arbeit hin und zurück", "arbeitsweg": true },
    { "datum": "2025-01-21", "km": 12.5, "notiz": "Umweg" }
  ],
  "wartungsarten": [
    { "id": "grosse-inspektion", "name": "Große Inspektion", "intervallMonate": 12, "intervallKm": null,
      "fensterVon": 10, "fensterBis": 11, "gueltigAbJahr": null, "einmalig": false },
    { "id": "kleine-inspektion", "name": "Kleine Inspektion", "intervallMonate": null, "intervallKm": null,
      "fensterVon": 3, "fensterBis": 4, "gueltigAbJahr": 2027, "einmalig": false },
    { "id": "reparatur", "name": "Reparatur", "intervallMonate": null, "intervallKm": null,
      "fensterVon": null, "fensterBis": null, "gueltigAbJahr": null, "einmalig": false },
    { "id": "kette", "name": "Kette", "intervallMonate": 24, "intervallKm": 3000,
      "fensterVon": null, "fensterBis": null, "gueltigAbJahr": null, "einmalig": false },
    { "id": "erstinspektion", "name": "Erstinspektion", "intervallMonate": 3, "intervallKm": 300,
      "fensterVon": null, "fensterBis": null, "gueltigAbJahr": null, "einmalig": true }
  ],
  "wartungsprotokoll": [
    { "id": "p1", "datum": "2025-01-15", "wartungsartId": "grosse-inspektion", "werkstatt": "Beispiel-Werkstatt",
      "kmStand": 175.5, "kmManuell": true, "notiz": "Bremsen eingestellt" }
  ],
  "termine": [
    { "wartungsartId": "kleine-inspektion", "datum": "2025-06-02", "werkstatt": "Beispiel-Werkstatt" }
  ],
  "maengel": [
    { "datum": "2025-01-10", "beschreibung": "Bremse quietscht", "status": "erledigt",
      "erledigtAm": "2025-01-15", "protokollId": "p1" },
    { "datum": "2025-02-01", "beschreibung": "Licht hinten wackelt", "status": "offen" }
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
- Daten aus Version 1 werden in einem Schritt über Version 2 auf Version 3
  gebracht.

## Tests

`tests/test.html` prüft unter anderem:

- die Umwandlung von Version 1 und 2 auf Version 3 (`tests/daten-v1.json`,
  `tests/daten-v2.json`, erfundene Werte) und die Ablehnung fehlerhafter Daten,
- die Zusammenfassung der Einträge an den Wochen-, Monats- und Jahresgrenzen,
- die saisonale Fälligkeit, Verschleißteile (km zuerst / Zeit zuerst),
  einmalige Wartungen und die Reihenfolge im Reiter Wartung,
- Prognosen und Jahresziel mit festen Testdaten und Stichtagen,
- Löschen mit „Rückgängig“,
- die Prüfung der Sicherungsdatei vor dem Teilen (das Teilen-Menü wird dabei
  durch einen Platzhalter ersetzt), den Dateinamen mit Uhrzeit und „Sicherung
  prüfen“ (identisch, älter, abweichend, beschädigt),
- Fahrtage ohne Eintrag, „Nachtragen“ und „Keine Fahrt“, das Merkmal
  „Arbeitsweg“, die Kennzahlen (Radtage, Ø, Arbeitstage, längste Serie) und
  das Diagramm,
- den Hinweis „Neue Version verfügbar“.

Die Seite lädt die App unsichtbar mit eigenem Speicherplatz; echte Daten werden
nicht berührt.

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
laden“, geänderter Service Worker. Dabei prüft er jedes Mal, dass die Daten im
`localStorage` unverändert bleiben, und lässt am Ende die Testseite unter dem
aktiven Service Worker laufen. Er arbeitet mit einer Kopie der App und einem
eigenen Webserver, der sich wie GitHub Pages verhält. Aufruf (benötigt
Node.js und Playwright):

```sh
node tests/offline-update-test.js
```

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
   4. Berechnungen: Kilometerstand, Summen, Prognosen, Fälligkeit, Zusammenfassung
   5. Fenster, Rückfragen, Meldungen, Rückgängig
   6. Die fünf Bildschirme und ihre Formulare (das Diagramm ist ein SVG,
      ohne Bibliothek)
   7. Datensicherung: Export, Prüfung, Import
   8. Zuordnung der Klicks zu den Funktionen
   9. Offline und neue Versionen (Anmeldung des Service Workers)
   10. Start

`sw.js` ist der Service Worker. Er speichert `index.html` für den Start ohne
Netz, vergleicht sie nach dem Start mit der Fassung auf dem Server und
übernimmt eine neue Version erst nach „Neu laden“. Eine neue Version erkennt er
am Inhalt von `index.html`, eine Versionsnummer muss dafür nicht gepflegt
werden.
