# Rad-km

Eine kleine Web-App zum Erfassen der gefahrenen Fahrrad-Kilometer und zum
Überblick über Inspektionen und Reparaturen. Sie ersetzt eine Excel-Liste und
ist für das iPhone optimiert.

- Kilometer pro Tag erfassen, mit Vorlagen in zwei Klicks
- Wetter für den Arbeitsweg: Ampel, Kleidung je Körperbereich, amtliche Warnungen
  des DWD, beste Abfahrtszeit und Wind je Hin- und Rückfahrt, ab dem Vorabend für
  den nächsten Fahrtag; an anderen Tagen das Wetter am Wohnort im Tagesverlauf
- Bis zu 3 Wegpunkte: Wind je Teilstrecke, Temperatur, Regen und Warnungen auch
  unterwegs
- Kleidung (Kopf, Hals, Hände, Oberkörper, Beine, Füße) und Ampel-Grenzen selbst
  einstellen; bei Regen nach dem Zwiebelprinzip; die Rückmeldung „zu warm /
  passte / zu kalt“ nach der Fahrt wird je Stufe ausgewertet
- Wetter jeder Fahrt zur Arbeit beim Eintrag gespeichert, auf Wunsch auch
  nachträglich; Statistik „km bei Regen“, „Tage unter 0 °C“ und Ampelverteilung
- Aktueller Kilometerstand und Summen für heute, diese Woche, diesen Monat, dieses Jahr
- Jahresprognose, Jahresziel und Kilometerstand-Prognose für ein beliebiges Datum
- Statistik: km pro Monat im Vergleich zum Vorjahr, Radtage, Arbeitstage mit
  dem Rad und längste Serie
- Hinweis auf übliche Fahrtage ohne Eintrag (für heute ab 18:00), mit „Nachtragen“ und „Keine Fahrt“
- Einträge übersichtlich zusammengefasst nach Woche, Monat und Jahr
- Wartungsprotokoll mit Fälligkeit (Intervall in Monaten und/oder km, jährliches
  Zeitfenster oder einmalig) und geplanten Terminen
- Mängelliste, die beim Eintragen einer Wartung abgehakt werden kann
- Löschen mit „Rückgängig“
- Datensicherung als JSON-Datei, die vor dem Teilen geprüft wird; gespeicherte
  Sicherungen lassen sich prüfen, ohne etwas zu überschreiben
- Startet auch ohne Netz (dann mit dem zuletzt geladenen Wetter); neue Versionen werden angekündigt
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

### Was geht beim Wetter ins Netz?

Nur für das Wetter fragt die App Wetterdienste ab, und nur, wenn du Orte
festgelegt hast:

| Dienst | Wofür | Was gesendet wird |
|---|---|---|
| [Open-Meteo](https://open-meteo.com/) (`api.open-meteo.com`) | Vorhersage, Modell ICON des Deutschen Wetterdienstes | die auf 3 Nachkommastellen gerundeten Koordinaten (ca. 100 m) von Wohn- und Arbeitsort und den Wegpunkten bzw. des weiteren Orts |
| [Deutscher Wetterdienst](https://www.dwd.de/) (GeoServer `maps.dwd.de`) | amtliche Warnungen für die Gemeinde jedes Orts (auch der Wegpunkte) | dieselben gerundeten Koordinaten |
| [Bright Sky](https://brightsky.dev/) (`api.brightsky.dev`) | nur wenn der DWD nicht erreichbar ist: dieselben amtlichen Warnungen des DWD | dieselben gerundeten Koordinaten |
| Ortssuche von Open-Meteo (`geocoding-api.open-meteo.com`) | Ort beim Festlegen suchen | nur der eingegebene Name |
| Rückblick von Open-Meteo (`historical-forecast-api.open-meteo.com`) | nur nach „Wetter nachtragen …“ und deiner Bestätigung: das Wetter vergangener Fahrten zur Arbeit | die gerundeten Koordinaten von Wohn- und Arbeitsort und den Wegpunkten und der Zeitraum (Datum von–bis) |

- Gespeichert werden Orte nur mit gerundeten Koordinaten; ungerundete Werte (aus
  der Ortssuche, vom aktuellen Standort, von Hand eingegeben oder aus einer
  importierten Datei) rundet die App sofort.
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
  sichtbar zurück.

## Bedienung

### Erster Start

1. Unter **Einstellungen → Fahrrad anlegen** Namen, Startdatum und
   Start-Kilometerstand eintragen, optional auch Rahmennummer und eine
   Beschreibung (z. B. Farbe, Modell). Der Start-Kilometerstand gilt **zu
   Beginn** des Startdatums.
2. Unter **Einstellungen → Vorlagen** die Standard-Strecken anlegen, z. B.
   „Arbeit hin und zurück – 14,2 km“. Die km gelten jeweils für den ganzen Tag.
3. Für das Wetter unter **Einstellungen → Wetter** Wohnort und Arbeitsort
   festlegen und die Fahrzeiten prüfen (siehe „Wetter“).
4. Wenn du schon Daten hast, kannst du sie unter **Einstellungen →
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

- **Kilometerstand** = Start-Kilometerstand + alle Einträge ab dem Startdatum.
- **Wetter-Kachel:** die Ampeln der nächsten Hin- und Rückfahrt (desselben
  Tages wie im Reiter Wetter; nach der Hinfahrt nur noch die Rückfahrt) und der
  wichtigste Grund, z. B. „Rückfahrt rot: Gewitter ab 16:45“. Antippen öffnet
  den Reiter Wetter. Gibt es noch keine Empfehlung für den nächsten Fahrtag
  (siehe „Wetter“), steht dort z. B. „Heute, Sa 31.10. · kein Fahrtag“ mit dem
  Wetter am Wohnort und „Empfehlung für Mo 02.11. ab So 17:00“.
- **Fahrtage ohne Eintrag:** Fehlt für einen deiner üblichen Fahrtage (siehe
  „Einstellungen“) der letzten 14 Tage (bis gestern, ab dem Startdatum) ein
  Eintrag, erscheint z. B. „2 Fahrtage ohne Eintrag“ und darunter je Tag eine
  Zeile, z. B. „Di 20.10.“ und „Fr 23.10.“. Der heutige Fahrtag kommt ab 18:00
  dazu (Zeile „heute“); die Uhrzeit lässt sich unter Einstellungen → Fahrtage
  ändern. Jeder Tag steht nur einmal da. Je Tag gibt es zwei Schaltflächen:
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
Mangels oder einer Vorlage, nach „Keine Fahrt“, einer Rückmeldung zur Kleidung,
„Wetter nachtragen …“, dem Entfernen einer Kleidungsstufe oder eines
Regenzusatzes und „Auf Standard zurücksetzen“ (Kleidung, Ampel-Grenzen)
erscheint unten 12 Sekunden lang eine Meldung mit **Rückgängig**. Damit kommt der alte Stand vollständig zurück, auch die
Verknüpfungen (z. B. die Mängel eines gelöschten Protokoll-Eintrags). Jede
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

- **Orte** (Einstellungen → Wetter): Wohnort, Arbeitsort und optional ein
  weiterer Ort (z. B. Urlaub). Antippen öffnet das Formular:
  - **Ort suchen:** Namen eingeben, „Suchen“ (oder Eingabetaste), Treffer
    antippen.
  - **📍 Aktueller Standort:** übernimmt den Standort des iPhones (es fragt
    einmal nach der Erlaubnis). Den Namen vergibst du selbst.
  - **Koordinaten direkt:** Breite und Länge in Grad eingeben, z. B. `51,123`
    und `10,456` (Komma oder Punkt, Süd und West mit Minus). Suche und Standort
    tragen ihre Koordinaten in dieselben Felder ein.
  - Die Koordinaten werden auf 3 Nachkommastellen gerundet (ca. 100 m), siehe
    „Was geht beim Wetter ins Netz?“.
  - **Weiterer Ort „aktiv“:** Dann zeigt der Reiter das Wetter dort für heute
    und morgen, ohne Hin- und Rückfahrt. Ausschalten mit dem Schalter in den
    Einstellungen oder mit „Zurück zu Wohn- und Arbeitsort“ im Reiter.
- **Wegpunkte** (Einstellungen → Wetter, zwischen Wohn- und Arbeitsort): bis zu
  3 Punkte auf deinem Weg, in Fahrtrichtung der Hinfahrt. **+ Wegpunkt** öffnet
  dasselbe Formular wie bei den Orten (Suche, Standort oder Koordinaten, auf 3
  Nachkommastellen gerundet); ein neuer Wegpunkt kommt direkt vor den
  Arbeitsort, mit ▲/▼ änderst du die Reihenfolge, im Formular entfernst du ihn.
  - Aus Wohnort, Wegpunkten und Arbeitsort ergeben sich bis zu 4
    **Teilstrecken**. Darunter stehen sie mit Länge (Luftlinie) und Richtung,
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
  - **Übliche Abfahrt** (Standard 06:00 bzw. 16:00, darf leer sein) und
    **Dauer** der Fahrt (Standard 60 Minuten): für das beste Abfahrtsfenster.
- **Welcher Tag:** Bis zum Ende der Rückfahrt (Standard 17:00) zeigt der Reiter
  den heutigen Tag, danach den morgigen. Hin- und Rückfahrt mit Ampel, Kleidung
  und Wind gibt es nur, wenn dieser Tag ein Fahrtag ist (siehe „Fahrtage“), für
  einen Fahrtag also erst ab dem Ende der Rückfahrt am Vortag. Nach dem Ende der
  Hinfahrt ist sie als „vorbei“ zurückgenommen.
  - Sonst steht dort z. B. **„Heute, Sa 31.10. – kein Fahrtag“** (nach 17:00
    „Morgen, So 01.11. – kein Fahrtag“) mit dem Wetter am Wohnort für diesen
    Tag: Temperatur von–bis, gefühlte Temperatur von–bis, Regen
    (Wahrscheinlichkeit und Menge), Wind und Böen, dazu der **Tagesverlauf** in
    3-Stunden-Blöcken von 06 bis 24 Uhr (Temperatur, gefühlt, Regen, Wind /
    Böen; jeweils die niedrigsten bis höchsten bzw. die höchsten Werte) und die
    amtlichen Warnungen.
  - Darunter der Hinweis, ab wann es die Empfehlung gibt, z. B. **„Empfehlung
    für Mo 02.11. ab So 17:00“** (am Vortag selbst „ab heute 17:00“).
  - Beispiel mit den Fahrtagen Mo, Di, Fr: Freitag bis 17:00 die Fahrten am
    Freitag; Freitag ab 17:00 und Samstag bis 17:00 das Wetter am Samstag,
    Samstag ab 17:00 und Sonntag bis 17:00 das Wetter am Sonntag; ab Sonntag
    17:00 Hin- und Rückfahrt am Montag.
- **Je Fahrt:** Ampel mit kurzer Begründung, die Werte (niedrigste Temperatur
  und gefühlte Temperatur, Regenwahrscheinlichkeit und Niederschlag, Böen),
  Kleidung, Wind und, wenn nötig, das beste Abfahrtsfenster.
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
    nur bei den Werten.
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
  (auch Wegpunkten, z. B. „Wohnort, Wegpunkt 1“) und Text. Dieselbe Warnung an
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
- **Wind relativ zur Strecke:** je Teilstrecke aus ihrer Richtung (Luftlinie,
  ohne Wegpunkte von Wohn- zu Arbeitsort) und dem mittleren Wind der Fahrzeit an
  ihren beiden Enden, nach der Länge der Teilstrecken gewichtet; nur
  Teilstrecken, die für den Wind zählen. Ergebnis z. B. „Gegenwind 20 km/h“,
  „Rückenwind 15 km/h“, „Seitenwind von links 20 km/h“, „Seitenwind wechselnd
  15 km/h“ (wenn er auf den Teilstrecken von beiden Seiten kommt) oder
  „schwacher Wind“ (unter 10 km/h).
  - Gegen- bzw. Rückenwind ist der gewichtete Mittelwert, beim Seitenwind zählt
    die Stärke; überwiegt der Gegen- oder Rückenwind, wird er genannt.
  - Mit mehreren Teilstrecken steht klein darunter das Ergebnis je
    Teilstrecke, z. B. „Musterdorf → Ecke: zählt nicht · Ecke → Beispielstadt:
    Gegenwind 20 km/h“.
  - Die Rückfahrt rechnet in umgekehrter Richtung und Reihenfolge.
  - Nur zur Info, nicht in der Ampel. Ohne Arbeitsort oder wenn keine
    Teilstrecke zählt: Wind mit Himmelsrichtung.
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

- Fahrrad, Vorlagen, Fahrtage, Wetter (Orte, Fahrzeiten, Kleidung,
  Ampel-Grenzen), Jahresziele, Datensicherung.
- **Fahrtage:** deine üblichen Fahrtage zum Ankreuzen (Voreinstellung
  Montag, Dienstag, Freitag). Sie gelten für den Hinweis auf fehlende
  Einträge, die längste Serie und den Reiter Wetter. Änderungen werden sofort
  gespeichert.
- **Hinweis für heute ab** (unter den Fahrtagen, Standard 18:00): ab dieser
  Uhrzeit weist die Übersicht schon am selben Tag auf einen fehlenden Eintrag
  hin. Leer = erst ab dem nächsten Tag. Wird sofort gespeichert.
- **Über Rad-km:** App-Version und Datenversion.

## JSON-Format für Sicherung und Import

Die Datei ist ein JSON-Objekt mit folgenden Teilen:

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `version` | Zahl | ja | Version des Datenmodells, aktuell `6` |
| `kurzinfo` | Objekt | nein | Kurzinfo der Sicherung (ab Version 3, siehe unten); wird beim Import nicht übernommen |
| `exportiertAm` | Text | nein | Nur in Sicherungen bis Version 2: Zeitpunkt des Exports; wird beim Import ignoriert |
| `fahrrad` | Objekt oder `null` | nein | Das Fahrrad (siehe unten) |
| `einstellungen` | Objekt | nein | Fahrtage und Jahresziele (ab Version 3), Wetter (ab Version 4), Hinweis für heute (ab Version 5); fehlt das Feld, gelten die Standardwerte |
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
- **Ja/Nein-Merkmale** (`arbeitsweg`, `einmalig`, `aktiv`) als `true` oder
  `false`; fehlt das Feld, gilt `false`.
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
| `wartungen` | Zahl | Anzahl der Einträge im Wartungsprotokoll |
| `maengel` | Zahl | Anzahl der Mängel |

### `einstellungen` (ab Version 3)

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `fahrtage` | Liste von Zahlen | nein | Übliche Fahrtage, 1 = Montag … 7 = Sonntag; Standard `[1, 2, 5]` (Mo, Di, Fr). Für den Hinweis auf Fahrtage ohne Eintrag und die längste Serie; `[]` = keine |
| `jahresziele` | Liste | nein | Jahresziele, je Jahr höchstens eines: `{ "jahr": 2026, "km": 5000 }` (km > 0) |
| `hinweisHeuteAb` | Uhrzeit oder `null` | nein | Ab dieser Uhrzeit zählt der heutige Fahrtag schon als „ohne Eintrag“ (ab Version 5); Standard `"18:00"`, `null` = erst ab dem nächsten Tag |
| `wetter` | Objekt | nein | Orte, Wegpunkte, Fahrzeiten und Regeln für den Reiter Wetter (ab Version 4, siehe unten); fehlende Teile bekommen die Standardwerte |

### `einstellungen.wetter` (ab Version 4)

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `wohnort` | Ort oder `null` | nein | Wohnort; Beginn der Hinfahrt |
| `arbeitsort` | Ort oder `null` | nein | Arbeitsort; aus Wohnort, Wegpunkten und Arbeitsort ergeben sich die Teilstrecken für den Wind |
| `weitererOrt` | Ort mit `aktiv` oder `null` | nein | z. B. Urlaub; `aktiv: true` = der Reiter Wetter zeigt das Wetter dort, ohne Hin- und Rückfahrt |
| `wegpunkte` | Liste von Orten | nein | Ab Version 6: höchstens 3 Wegpunkte in Fahrtrichtung der Hinfahrt (Wohnort → Arbeitsort); Standard `[]`. Sie zählen nur, wenn Wohn- und Arbeitsort festgelegt sind |
| `windTeilstrecken` | Liste von `true`/`false` | nein | Ab Version 6: je Teilstrecke (Wohnort → Wegpunkt 1 → … → Arbeitsort, also eine mehr als Wegpunkte), ob sie für den Wind zählt; Standard `[true]`. Fehlt das Feld, zählen alle |
| `hinfahrt` | Fahrzeit | nein | Standard `{ "von": "06:00", "bis": "07:00", "abfahrt": "06:00", "dauer": 60 }` |
| `rueckfahrt` | Fahrzeit | nein | Standard `{ "von": "16:00", "bis": "17:00", "abfahrt": "16:00", "dauer": 60 }`; nach `bis` zeigt der Reiter Wetter den nächsten Tag |
| `ampel` | Objekt | nein | Grenzen der Ampel (siehe unten) |
| `kleidung` | Objekt | nein | Kleidungsregeln (siehe unten) |

**Ort:** `{ "name": "Musterdorf", "lat": 51.0, "lon": 10.0 }`. `name` ist ein
Text zur Anzeige, `lat` (−90 bis 90) und `lon` (−180 bis 180) sind Grad und
werden beim Einlesen auf 3 Nachkommastellen gerundet (bis Version 4: 2). Beim
weiteren Ort kommt `"aktiv": true` oder `false` dazu. Wegpunkte sind Orte ohne
`aktiv`.

**Fahrzeit:**

| Feld | Typ | Bedeutung |
|---|---|---|
| `von`, `bis` | Uhrzeit | Zeitraum der Fahrt (`von` vor `bis`); dafür gelten Ampel, Kleidung und Wind |
| `abfahrt` | Uhrzeit oder `null` | übliche Abfahrt für „Abfahrt 15:45 statt 16:00“; `null` = keine, dann nennt die App die beste Abfahrt und die zu meidende Zeit |
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
  "version": 6,
  "kurzinfo": { "zeitpunkt": "2025-03-01T18:00:00.000Z", "appVersion": "4c", "eintraege": 4,
                "kmSumme": 98, "kmStand": 198, "wartungen": 1, "maengel": 2 },
  "fahrrad": { "name": "Mein Rad", "startdatum": "2025-01-01", "startKm": 100,
               "rahmennummer": "AB 12345", "beschreibung": "Blau, 28 Zoll" },
  "einstellungen": {
    "fahrtage": [1, 2, 5],
    "jahresziele": [{ "jahr": 2025, "km": 3000 }],
    "hinweisHeuteAb": "18:00",
    "wetter": {
      "wohnort": { "name": "Musterdorf", "lat": 51.0, "lon": 10.0 },
      "arbeitsort": { "name": "Beispielstadt", "lat": 51.1, "lon": 10.2 },
      "weitererOrt": { "name": "Ferienort", "lat": 54.0, "lon": 9.0, "aktiv": false },
      "wegpunkte": [{ "name": "Brücke", "lat": 51.03, "lon": 10.07 }, { "name": "Ortsmitte", "lat": 51.06, "lon": 10.13 }],
      "windTeilstrecken": [true, false, true],
      "hinfahrt": { "von": "06:00", "bis": "07:00", "abfahrt": "06:00", "dauer": 60 },
      "rueckfahrt": { "von": "16:00", "bis": "17:00", "abfahrt": null, "dauer": 60 },
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
- Daten aus Version 1 bis 4 werden in einem Schritt über die Zwischenversionen
  auf Version 6 gebracht.

## Tests

`tests/test.html` prüft unter anderem:

- die Umwandlung von Version 1, 2, 3, 4 und 5 auf Version 6 (`tests/daten-v1.json`
  bis `tests/daten-v5.json`, erfundene Werte; auch dass geänderte
  Kleidungsregeln erhalten bleiben) und die Ablehnung fehlerhafter Daten,
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
  Umwandlung 5 → 6, die Empfehlung erst am Vorabend mit Tagesverlauf (auch am
  Tag der Zeitumstellung), Wegpunkte (Formular, Reihenfolge, Teilstrecken, Wind
  nach Länge gewichtet, Werte und Warnungen am Wegpunkt, Rückblick), den
  Hinweis auf fehlende Einträge ohne doppelte Tage und die 12 Sekunden für
  „Rückgängig“.

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
laden“, geänderter Service Worker, Wetter beim Start und ohne Netz (die
Wetterdienste antworten dabei mit den Aufzeichnungen aus `tests/`). Dabei prüft
er jedes Mal, dass die Daten im `localStorage` unverändert bleiben, und lässt
die Testseite unter dem aktiven Service Worker laufen. Er arbeitet mit einer Kopie der App und einem
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
   5. Wetter: Abruf von Open-Meteo, DWD und Bright Sky, Zwischenspeicher,
      Ampel, Glätte, Kleidung, bestes Abfahrtsfenster, Wind, Wetter je Eintrag
      und Rückblick
   6. Fenster, Rückfragen, Meldungen, Rückgängig
   7. Die fünf Bildschirme (Übersicht, Wetter, Wartung, Statistik,
      Einstellungen) und ihre Formulare (das Diagramm ist ein SVG, ohne
      Bibliothek)
   8. Datensicherung: Export, Prüfung, Import
   9. Zuordnung der Klicks zu den Funktionen
   10. Offline und neue Versionen (Anmeldung des Service Workers)
   11. Start

`sw.js` ist der Service Worker. Er speichert `index.html` für den Start ohne
Netz, vergleicht sie nach dem Start mit der Fassung auf dem Server und
übernimmt eine neue Version erst nach „Neu laden“. Eine neue Version erkennt er
am Inhalt von `index.html`, eine Versionsnummer muss dafür nicht gepflegt
werden. Abrufe der Wetterdienste gehen an ihm vorbei direkt ins Netz; ohne Netz
nimmt die App den eigenen Zwischenspeicher `radkm-wetter`.
