// Rad-km · Reiter Einstellungen: Hauptseite und Unterseiten (Fahrrad, Datensicherung, Vorlagen, Fahrtage), Fahrrad-Formular
"use strict";

/* ---------- Vorlagen (Bereich in den Einstellungen) ---------- */
function vorlagenBereich() {
  let html = '<p class="klein" style="margin-top:8px">Vorlagen sind deine Standard-Strecken. Die Kilometer gelten für den ganzen Tag. ' +
    'Änderungen an Vorlagen verändern bereits erfasste Einträge nicht; nur beim Merkmal „Arbeitsweg“ fragt die App, ob sie bisherige Einträge anpassen soll.</p>' +
    '<div class="liste">';
  if (!daten.vorlagen.length) html += '<div class="leer">Noch keine Vorlagen.</div>';
  daten.vorlagen.forEach((v, i) => {
    html += '<div class="zeile">' +
      '<button type="button" class="inhalt" data-action="vorlage-bearbeiten" data-id="' + v.id + '">' +
      '<div class="text"><div>' + esc(v.name) + '</div>' + (v.arbeitsweg ? '<div class="klein">Arbeitsweg</div>' : "") + '</div>' +
      '<span class="zahl">' + kmText(v.km) + ' km</span></button>' +
      '<div class="pfeile">' +
      '<button type="button" class="symbol" data-action="vorlage-hoch" data-id="' + v.id + '" aria-label="Nach oben"' + (i === 0 ? " disabled" : "") + '>▲</button>' +
      '<button type="button" class="symbol" data-action="vorlage-runter" data-id="' + v.id + '" aria-label="Nach unten"' + (i === daten.vorlagen.length - 1 ? " disabled" : "") + '>▼</button>' +
      '</div></div>';
  });
  html += '</div><div class="knopfreihe"><button type="button" class="primaer" data-action="vorlage-neu">+ Neue Vorlage</button></div>';
  return html;
}
function vorlageFormular(id) {
  const v = id ? daten.vorlagen.find(v => v.id === id) : { name: "", km: null, arbeitsweg: false };
  fensterOeffnen(
    '<h2>' + (id ? "Vorlage bearbeiten" : "Neue Vorlage") + '</h2>' +
    '<label for="v-name">Name</label><input type="text" id="v-name" placeholder="z. B. Arbeit hin und zurück" value="' + esc(v.name) + '">' +
    '<label for="v-km">Kilometer (Gesamt für den Tag)</label>' +
    '<input type="text" id="v-km" inputmode="decimal" placeholder="z. B. 12,5" value="' + kmFeld(v.km) + '">' +
    '<label class="haken"><input type="checkbox" id="v-arbeitsweg"' + (v.arbeitsweg ? " checked" : "") + '>' +
    '<span>Arbeitsweg<br><span class="klein">Fahrten mit dieser Vorlage zählen in der Statistik als Arbeitstage mit dem Rad.</span></span></label>' +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Abbrechen</button>' +
    '<button type="button" class="primaer" data-action="vorlage-speichern" data-id="' + (id || "") + '">Speichern</button></div>' +
    (id ? '<div class="knopfreihe"><button type="button" class="gefahr voll" data-action="vorlage-loeschen" data-id="' + id + '">Vorlage löschen</button></div>' : "")
  );
}
async function vorlageSpeichern(id) {
  const name = wert("v-name").trim();
  const km = kmLesen(wert("v-km"));
  const arbeitsweg = document.getElementById("v-arbeitsweg").checked;
  if (!name) { alert("Bitte einen Namen eingeben."); return; }
  if (km === null) { alert("Bitte die Kilometer als Zahl eingeben, z. B. 12,5."); return; }
  // Merkmal "Arbeitsweg" geändert: Auch bisherige Einträge mit dieser Vorlage
  // (gleicher Name wie bisher) anpassen? Ohne Zustimmung bleiben sie unverändert.
  const alt = id ? daten.vorlagen.find(v => v.id === id) : null;
  const bisherName = alt ? alt.name : name;
  const betroffen = (alt ? alt.arbeitsweg !== arbeitsweg : arbeitsweg)
    ? daten.eintraege.filter(e => e.vorlage === bisherName && e.arbeitsweg !== arbeitsweg) : [];
  let auchBisherige = false;
  if (betroffen.length) {
    const n = betroffen.length;
    auchBisherige = await frage((n === 1 ? "Den bisherigen Eintrag" : "Die " + n + " bisherigen Einträge") + " mit der Vorlage „" + esc(bisherName) + "“ " +
      (arbeitsweg ? "ebenfalls als Arbeitsweg zählen?" : "ebenfalls nicht mehr als Arbeitsweg zählen?"),
      n === 1 ? "Ja" : "Ja, alle " + n, "Nein, nur neue Einträge");
  }
  if (alt) Object.assign(alt, { name, km, arbeitsweg });
  else daten.vorlagen.push({ id: neueId(), name, km, arbeitsweg });
  if (auchBisherige) betroffen.forEach(e => { e.arbeitsweg = arbeitsweg; });
  if (speichern()) {
    fensterSchliessen(); zeichnen();
    meldung(auchBisherige ? "Vorlage gespeichert, " + (betroffen.length === 1 ? "1 Eintrag" : betroffen.length + " Einträge") + " angepasst" : "Vorlage gespeichert");
  }
}
async function vorlageLoeschen(id) {
  const v = daten.vorlagen.find(v => v.id === id);
  if (!await frage("Vorlage „" + esc(v.name) + "“ wirklich löschen? Bereits erfasste Einträge bleiben unverändert.", "Löschen", "Abbrechen", true)) return;
  mitRueckgaengig(() => { daten.vorlagen = daten.vorlagen.filter(x => x.id !== id); }, "Vorlage gelöscht");
}
function vorlageVerschieben(id, richtung) {
  const i = daten.vorlagen.findIndex(v => v.id === id);
  const j = i + richtung;
  if (j < 0 || j >= daten.vorlagen.length) return;
  [daten.vorlagen[i], daten.vorlagen[j]] = [daten.vorlagen[j], daten.vorlagen[i]];
  if (speichern()) zeichnen();
}

/* ---------- Einstellungen ---------- */
// Hauptseite mit Abschnitten; jede Zeile mit „›“ öffnet eine Unterseite im
// Reiter (zurück mit „‹ Einstellungen“ oder erneutem Antippen des Reiters)
// oder ein Fenster. Welche Unterseite offen ist, merkt sich die App nur im
// Arbeitsspeicher (einstellungenSeite).
const EINSTELLUNGEN_SEITEN = {
  fahrrad: { titel: "Fahrrad", bild: () => fahrradSeite() },
  sicherung: { titel: "Datensicherung", bild: () => sicherungSeite() },
  vorlagen: { titel: "Vorlagen", bild: () => vorlagenBereich() },
  fahrtage: { titel: "Fahrtage", bild: () => fahrtageSeite() },
  orte: { titel: "Orte und Strecke", bild: () => wetterOrteSeite() },
  ausserhalb: { titel: "Außerhalb der Fahrten", bild: () => wetterAusserhalbSeite() },
  wartungsarten: { titel: "Wartungsarten", bild: () => wartungsartenBereich() }
};

// Zeile, die eine Unterseite öffnet
function seitenZeile(seite, titel, text) {
  return '<div class="zeile"><button type="button" class="inhalt" data-action="einstellungen-seite" data-seite="' + seite + '"><div class="text"><div>' + titel + '</div>' +
    (text ? '<div class="klein">' + esc(text) + '</div>' : "") + '</div><span class="klein" style="padding-right:16px">›</span></button></div>';
}

function bildEinstellungen() {
  const seite = einstellungenSeite && EINSTELLUNGEN_SEITEN[einstellungenSeite];
  if (seite) return '<button type="button" class="leise zurueck" data-action="einstellungen-seite" data-seite="">‹ Einstellungen</button>' + seite.bild();
  const f = daten.fahrrad, es = daten.einstellungen;
  let html = '<h2 style="margin-top:8px">Fahrrad</h2>';
  html += f ? '<div class="liste">' + seitenZeile("fahrrad", esc(f.name), "seit " + datumText(f.startdatum) + " · Start-Kilometerstand " + kmText(f.startKm) + " km") + '</div>'
    : '<div class="karte"><p style="margin-top:0">Noch kein Fahrrad angelegt.</p>' +
      '<button type="button" class="primaer voll" data-action="fahrrad-aendern">Fahrrad anlegen</button></div>';

  // Datensicherung weit oben: Die Daten liegen nur auf diesem Gerät
  html += '<h2>Datensicherung</h2>' + sicherungsZeile(heute()) +
    '<div class="liste">' + seitenZeile("sicherung", "Sicherung prüfen, Daten importieren") + '</div>';

  html += '<h2>Fahrten</h2><div class="liste">' +
    seitenZeile("vorlagen", "Vorlagen", daten.vorlagen.length ? daten.vorlagen.map(v => v.name).join(", ") : "noch keine") +
    seitenZeile("fahrtage", "Fahrtage und Hinweis", (es.fahrtage.length ? es.fahrtage.map(t => WOCHENTAGE[t % 7]).join(", ") : "keine Fahrtage") +
      " · " + (es.hinweisHeuteAn ? "Hinweis am selben Tag ab " + es.hinweisHeuteAb : "Hinweis ab dem nächsten Tag")) + '</div>' +
    '<button type="button" class="leise weg" data-action="zu-fahrten" data-wert="statistik">Jahresziele (Fahrten → Statistik) ›</button>';

  html += wetterEinstellungen();

  const auftraege = daten.wartungsarten.filter(a => a.typ === "auftrag").length, aufgaben = daten.wartungsarten.length - auftraege;
  html += '<h2>Wartung</h2><div class="liste">' +
    seitenZeile("wartungsarten", "Wartungsarten", auftraege + (auftraege === 1 ? " Auftrag" : " Aufträge") + ", " + aufgaben + (aufgaben === 1 ? " Aufgabe" : " Aufgaben")) + '</div>';

  html += '<h2>Über Rad-km</h2><div class="karte">' +
    detailListe([["App-Version", APP_VERSION], ["Datenversion", String(DATEN_VERSION)]]) + '</div>';
  return html;
}

// Einstellungen → Fahrrad
function fahrradSeite() {
  const f = daten.fahrrad;
  if (!f) return '<div class="karte"><p style="margin-top:0">Noch kein Fahrrad angelegt.</p>' +
    '<button type="button" class="primaer voll" data-action="fahrrad-aendern">Fahrrad anlegen</button></div>';
  return '<div class="karte">' + detailListe([
    ["Name", esc(f.name)],
    ["Rahmennummer", esc(f.rahmennummer)],
    ["Beschreibung", f.beschreibung ? '<span class="umbrueche">' + esc(f.beschreibung) + '</span>' : ""],
    ["Startdatum", datumText(f.startdatum)],
    ["Start-Kilometerstand", kmText(f.startKm) + " km"]
  ]) +
    '<div class="feldhinweis">Der Start-Kilometerstand gilt zu Beginn des Startdatums. Einträge ab diesem Tag (einschließlich) werden dazugezählt.</div>' +
    '<div class="knopfreihe"><button type="button" class="primaer" data-action="fahrrad-aendern">Ändern</button></div></div>';
}

// Einstellungen → Datensicherung: sichern, prüfen, importieren
function sicherungSeite() {
  const le = letzterExport();
  return '<div class="karte">' +
    '<p style="margin-top:0">Deine Daten liegen nur auf diesem Gerät im Speicher des Browsers. Sichere sie regelmäßig als Datei, z. B. in „Dateien“ oder iCloud. ' +
    'Vor dem Teilen prüft die App die Datei.</p>' +
    '<p class="klein">Letzte Sicherung: ' + (le ? datumText(le) : "noch nie") + '</p>' +
    '<button type="button" class="primaer voll" data-action="sichern">Jetzt sichern</button>' +
    sicherungsErgebnisHtml() +
    '<div style="height:10px"></div>' +
    '<button type="button" class="voll" data-action="sicherung-pruefen">Sicherung prüfen …</button>' +
    '<p class="klein">Liest eine gespeicherte Sicherung und vergleicht sie mit dem aktuellen Stand. Dabei wird nichts verändert.</p>' +
    '<button type="button" class="voll" data-action="import">Daten importieren …</button>' +
    '<p class="klein">Beim Import werden alle vorhandenen Daten ersetzt. Vorher wird nachgefragt.</p></div>';
}

// Einstellungen → Fahrtage (1 = Montag … 7 = Sonntag) und Hinweis am selben Tag
function fahrtageSeite() {
  const es = daten.einstellungen;
  return '<div class="karte" style="margin-top:8px"><div class="fahrtage">' +
    [1, 2, 3, 4, 5, 6, 7].map(t => '<label class="fahrtag"><input type="checkbox" value="' + t + '" data-change="fahrtag"' +
      (es.fahrtage.includes(t) ? " checked" : "") + '><span>' + WOCHENTAGE[t % 7] + '</span></label>').join("") +
    '</div><div class="feldhinweis">Deine üblichen Fahrtage. Die Übersicht weist auf Fahrtage der letzten 14 Tage ohne Eintrag hin, ' +
    'die Statistik zählt damit die längste Serie, und der Reiter Wetter zeigt dafür Hin- und Rückfahrt.</div>' +
    // Schalter und Uhrzeit (das Uhrzeitfeld lässt sich auf dem iPhone nicht leeren)
    '<label class="haken"><input type="checkbox" id="e-hinweis-an" data-change="hinweis-heute-an"' + (es.hinweisHeuteAn ? " checked" : "") + '>' +
    '<span>Hinweis schon am selben Tag</span></label>' +
    '<label for="e-hinweis-ab">ab Uhrzeit</label>' +
    '<input type="time" id="e-hinweis-ab" value="' + es.hinweisHeuteAb + '" data-change="hinweis-heute-ab"' + (es.hinweisHeuteAn ? "" : " disabled") + '>' +
    '<div class="feldhinweis">An: Fehlt an einem Fahrtag der Eintrag, weist die Übersicht ab dieser Uhrzeit schon am selben Tag darauf hin. Aus: erst ab dem nächsten Tag.</div></div>';
}

// Schalter "Hinweis schon am selben Tag": sofort speichern; die Uhrzeit ist nur bei "an" bedienbar
function hinweisHeuteAnGeaendert(an) {
  const es = daten.einstellungen;
  es.hinweisHeuteAn = an;
  const feld = document.getElementById("e-hinweis-ab");
  if (feld) feld.disabled = !an;
  if (speichern()) meldung(an ? "Hinweis schon am selben Tag ab " + es.hinweisHeuteAb + " Uhr" : "Hinweis erst ab dem nächsten Tag");
}
// Uhrzeit für den Hinweis am selben Tag geändert: sofort speichern. Ein leeres
// Feld (z. B. "Zurücksetzen" auf dem iPhone) ändert nichts, die Uhrzeit bleibt.
function hinweisHeuteAbGeaendert(wertText) {
  const es = daten.einstellungen, t = String(wertText || "").slice(0, 5);
  const feld = document.getElementById("e-hinweis-ab");
  if (!istUhrzeit(t)) { if (feld) feld.value = es.hinweisHeuteAb; return; }
  es.hinweisHeuteAb = t;
  if (speichern()) meldung("Hinweis für heute ab " + t + " Uhr");
}

// Fahrtage geändert: sofort speichern (aufsteigend sortiert)
function fahrtageGeaendert() {
  daten.einstellungen.fahrtage = [...document.querySelectorAll('input[data-change="fahrtag"]:checked')].map(el => Number(el.value)).sort((a, b) => a - b);
  if (speichern()) meldung("Fahrtage gespeichert");
}

function fahrradFormular() {
  const f = daten.fahrrad || { name: "", startdatum: heute(), startKm: null, rahmennummer: "", beschreibung: "" };
  fensterOeffnen(
    '<h2>' + (daten.fahrrad ? "Fahrrad bearbeiten" : "Fahrrad anlegen") + '</h2>' +
    '<label for="r-name">Name</label><input type="text" id="r-name" placeholder="z. B. Mein Stadtrad" value="' + esc(f.name) + '">' +
    '<label for="r-rahmen">Rahmennummer (optional)</label><input type="text" id="r-rahmen" autocomplete="off" value="' + esc(f.rahmennummer) + '">' +
    '<label for="r-beschreibung">Beschreibung (optional)</label>' +
    '<textarea id="r-beschreibung" placeholder="z. B. Farbe, Modell, Ausstattung">' + esc(f.beschreibung) + '</textarea>' +
    '<label for="r-datum">Startdatum</label><input type="date" id="r-datum" value="' + f.startdatum + '">' +
    '<label for="r-km">Start-Kilometerstand</label>' +
    '<input type="text" id="r-km" inputmode="decimal" placeholder="z. B. 1234,5" value="' + kmFeld(f.startKm) + '">' +
    '<div class="feldhinweis">Der Start-Kilometerstand gilt zu Beginn des Startdatums. Einträge ab diesem Tag (einschließlich) werden dazugezählt.</div>' +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Abbrechen</button>' +
    '<button type="button" class="primaer" data-action="fahrrad-speichern">Speichern</button></div>'
  );
}
function fahrradSpeichern() {
  const name = wert("r-name").trim();
  const startdatum = wert("r-datum");
  const startKm = kmLesen(wert("r-km"));
  if (!name) { alert("Bitte einen Namen für das Fahrrad eingeben."); return; }
  if (!istGueltigesDatum(startdatum)) { alert("Bitte ein gültiges Startdatum wählen."); return; }
  if (startKm === null) { alert("Bitte den Start-Kilometerstand als Zahl eingeben, z. B. 1234,5."); return; }
  daten.fahrrad = { name, startdatum, startKm, rahmennummer: wert("r-rahmen").trim(), beschreibung: wert("r-beschreibung").trim() };
  if (speichern()) { fensterSchliessen(); zeichnen(); meldung("Fahrrad gespeichert"); }
}
