// Rad-km · Reiter Einstellungen: Fahrrad, Vorlagen, Fahrtage, Jahresziele
"use strict";

/* ---------- Vorlagen (Bereich in den Einstellungen) ---------- */
function vorlagenBereich() {
  let html = '<p class="klein" style="margin-top:0">Vorlagen sind deine Standard-Strecken. Die Kilometer gelten für den ganzen Tag. ' +
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
function bildEinstellungen() {
  const f = daten.fahrrad;
  const le = letzterExport();
  let html = '<h2 style="margin-top:8px">Fahrrad</h2><div class="karte">';
  if (f) {
    html += detailListe([
      ["Name", esc(f.name)],
      ["Rahmennummer", esc(f.rahmennummer)],
      ["Beschreibung", f.beschreibung ? '<span class="umbrueche">' + esc(f.beschreibung) + '</span>' : ""],
      ["Startdatum", datumText(f.startdatum)],
      ["Start-Kilometerstand", kmText(f.startKm) + " km"]
    ]) +
      '<div class="feldhinweis">Der Start-Kilometerstand gilt zu Beginn des Startdatums. Einträge ab diesem Tag (einschließlich) werden dazugezählt.</div>' +
      '<div class="knopfreihe"><button type="button" class="primaer" data-action="fahrrad-aendern">Ändern</button></div>';
  } else {
    html += '<p style="margin-top:0">Noch kein Fahrrad angelegt.</p>' +
      '<button type="button" class="primaer voll" data-action="fahrrad-aendern">Fahrrad anlegen</button>';
  }
  html += '</div>';

  html += '<h2>Vorlagen</h2>' + vorlagenBereich();

  // Übliche Fahrtage (1 = Montag … 7 = Sonntag)
  const fahrtage = daten.einstellungen.fahrtage;
  html += '<h2>Fahrtage</h2><div class="karte"><div class="fahrtage">' +
    [1, 2, 3, 4, 5, 6, 7].map(t => '<label class="fahrtag"><input type="checkbox" value="' + t + '" data-change="fahrtag"' +
      (fahrtage.includes(t) ? " checked" : "") + '><span>' + WOCHENTAGE[t % 7] + '</span></label>').join("") +
    '</div><div class="feldhinweis">Deine üblichen Fahrtage. Die Übersicht weist auf Fahrtage der letzten 14 Tage ohne Eintrag hin, ' +
    'die Statistik zählt damit die längste Serie, und der Reiter Wetter zeigt dafür Hin- und Rückfahrt.</div>' +
    // Schalter und Uhrzeit (das Uhrzeitfeld lässt sich auf dem iPhone nicht leeren)
    '<label class="haken"><input type="checkbox" id="e-hinweis-an" data-change="hinweis-heute-an"' + (daten.einstellungen.hinweisHeuteAn ? " checked" : "") + '>' +
    '<span>Hinweis schon am selben Tag</span></label>' +
    '<label for="e-hinweis-ab">ab Uhrzeit</label>' +
    '<input type="time" id="e-hinweis-ab" value="' + daten.einstellungen.hinweisHeuteAb + '" data-change="hinweis-heute-ab"' + (daten.einstellungen.hinweisHeuteAn ? "" : " disabled") + '>' +
    '<div class="feldhinweis">An: Fehlt an einem Fahrtag der Eintrag, weist die Übersicht ab dieser Uhrzeit schon am selben Tag darauf hin. Aus: erst ab dem nächsten Tag.</div></div>';

  html += wetterEinstellungen();

  // Jahresziele
  const ziele = [...daten.einstellungen.jahresziele].sort((a, b) => b.jahr - a.jahr);
  html += '<h2>Jahresziele</h2><div class="liste">';
  if (!ziele.length) html += '<div class="leer">Noch kein Jahresziel.</div>';
  ziele.forEach(z => {
    html += '<div class="zeile"><button type="button" class="inhalt" data-action="jahresziel-bearbeiten" data-jahr="' + z.jahr + '">' +
      '<div class="text"><div>' + z.jahr + '</div></div><span class="zahl" style="padding-right:16px">' + kmText(z.km) + ' km</span></button></div>';
  });
  html += '</div><div class="knopfreihe"><button type="button" data-action="jahresziel-neu">+ Jahresziel</button></div>';

  html += '<h2>Datensicherung</h2><div class="karte">' +
    '<p style="margin-top:0">Deine Daten liegen nur auf diesem Gerät im Speicher des Browsers. Sichere sie regelmäßig als Datei, z. B. in „Dateien“ oder iCloud. ' +
    'Vor dem Teilen prüft die App die Datei.</p>' +
    '<p class="klein">Letzte Sicherung: ' + (le ? datumText(le) : "noch nie") + '</p>' +
    '<button type="button" class="primaer voll" data-action="sichern">Jetzt sichern</button>' +
    sicherungsErgebnisHtml() +
    '<div style="height:10px"></div>' +
    '<button type="button" class="voll" data-action="sicherung-pruefen">Sicherung prüfen …</button>' +
    '<p class="klein">Liest eine gespeicherte Sicherung und vergleicht sie mit dem aktuellen Stand. Dabei wird nichts verändert.</p>' +
    '<button type="button" class="voll" data-action="import">Daten importieren …</button>' +
    '<p class="klein">Beim Import werden alle vorhandenen Daten ersetzt. Vorher wird nachgefragt.</p></div>' +

    '<h2>Über Rad-km</h2><div class="karte">' +
    detailListe([["App-Version", APP_VERSION], ["Datenversion", String(DATEN_VERSION)]]) + '</div>';
  return html;
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

// Jahresziel anlegen oder ändern ("jahr" = vorhandenes Ziel bzw. Vorschlag für ein neues)
function jahreszielFormular(jahr, vorhanden) {
  const z = vorhanden ? daten.einstellungen.jahresziele.find(z => z.jahr === jahr) : null;
  let vorschlag = jahr || Number(heute().slice(0, 4));
  if (!z && !jahr) while (daten.einstellungen.jahresziele.some(x => x.jahr === vorschlag)) vorschlag++;
  fensterOeffnen(
    '<h2>' + (z ? "Jahresziel bearbeiten" : "Jahresziel festlegen") + '</h2>' +
    '<label for="z-jahr">Jahr</label><input type="text" id="z-jahr" inputmode="numeric" value="' + vorschlag + '">' +
    '<label for="z-km">Ziel in km</label><input type="text" id="z-km" inputmode="decimal" placeholder="z. B. 5000" value="' + (z ? kmFeld(z.km) : "") + '">' +
    '<div class="feldhinweis">Die Startseite zeigt den Fortschritt und vergleicht ihn mit dem zeitanteiligen Soll und der Jahresprognose.</div>' +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Abbrechen</button>' +
    '<button type="button" class="primaer" data-action="jahresziel-speichern" data-jahr="' + (z ? z.jahr : "") + '">Speichern</button></div>' +
    (z ? '<div class="knopfreihe"><button type="button" class="gefahr voll" data-action="jahresziel-loeschen" data-jahr="' + z.jahr + '">Jahresziel entfernen</button></div>' : "")
  );
}
function jahreszielSpeichern(altesJahr) {
  const jahr = Number(wert("z-jahr").trim());
  const km = kmLesen(wert("z-km"));
  if (!(Number.isInteger(jahr) && jahr >= 1900 && jahr <= 9999)) { alert("Bitte eine Jahreszahl eingeben, z. B. 2027."); return; }
  if (!(km > 0)) { alert("Bitte das Ziel als Zahl größer 0 eingeben, z. B. 5000."); return; }
  const ziele = daten.einstellungen.jahresziele.filter(z => z.jahr !== altesJahr);
  if (ziele.some(z => z.jahr === jahr)) { alert("Für " + jahr + " gibt es schon ein Jahresziel. Bitte dieses ändern."); return; }
  ziele.push({ jahr, km });
  daten.einstellungen.jahresziele = ziele.sort((a, b) => a.jahr - b.jahr);
  if (speichern()) { fensterSchliessen(); zeichnen(); meldung("Jahresziel gespeichert"); }
}
async function jahreszielLoeschen(jahr) {
  if (!await frage("Jahresziel für " + jahr + " wirklich entfernen?", "Entfernen", "Abbrechen", true)) return;
  daten.einstellungen.jahresziele = daten.einstellungen.jahresziele.filter(z => z.jahr !== jahr);
  if (speichern()) { fensterSchliessen(); zeichnen(); }
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
