// Rad-km · Wartung (Ansicht): Reiter Wartung, Aufträge, Abschluss, Aufgaben, Mängel, Wartungsarten, Prüfbildschirm
"use strict";

/* ---------- Wartung (Werkstatt: Aufträge, Aufgaben, Mängel) ---------- */

// Kennung eines offenen Auftrags in der Oberfläche: die id eines gespeicherten
// Auftrags oder "neu:<Auftragsart>" für einen vorgemerkten
function auftragKey(o) { return o.auftrag.id || "neu:" + o.art.id; }
function offenerVon(key, lage = werkstattLage()) { return lage.offene.find(o => auftragKey(o) === key) || null; }
// Vorgemerkten Auftrag bei der ersten Änderung speichern; liefert den gespeicherten Auftrag
function auftragFestlegen(key) {
  const vorhanden = daten.auftraege.find(a => a.id === key && a.status === "geplant");
  if (vorhanden) return vorhanden;
  const artId = key.startsWith("neu:") ? key.slice(4) : key.startsWith("anlegen:") ? key.slice(8) : null;
  const art = artVon(artId);
  if (!art || art.typ !== "auftrag") return null;
  // Eine Auftragsart mit Fälligkeit hat höchstens einen geplanten Auftrag
  const geplant = hatFaelligkeit(art) && daten.auftraege.find(a => a.status === "geplant" && a.wartungsartId === artId);
  if (geplant) return geplant;
  const a = { id: neueId(), wartungsartId: artId, status: "geplant", termin: null, terminZeit: null, werkstatt: "", datum: null, kmStand: null, kmManuell: false,
    notiz: "", positionen: [], ausgeschlossen: [] };
  daten.auftraege.push(a);
  return a;
}
// Auftragsarten ohne Fälligkeit (Reparatur, Eigenleistung): bei Bedarf angelegt
const bedarfsArten = () => auftragsArten().filter(a => !hatFaelligkeit(a));
function bedarfsArt(muster) { return bedarfsArten().find(a => muster.test(a.name)) || bedarfsArten()[0] || null; }
const reparaturArt = () => bedarfsArt(/reparatur/i);
const eigenleistungArt = () => bedarfsArt(/eigenleistung/i);

// Kurze Fälligkeit einer Aufgabe: "überfällig", "bei ca. 5.000 km fällig", "am 20.11.2026 fällig"
function aufgabeKurz(st) {
  if (st.klasse === "status-rot") return st.text.startsWith("heute") ? "heute fällig" : "überfällig";
  if (st.kmGeschaetzt && st.grenzeKm !== null) return "bei " + caKm(st.grenzeKm) + " fällig";
  if (st.datum) return "am " + datumText(st.datum) + " fällig";
  return st.text;
}
// Name einer Aufgabe mit Bauteil: "Bremsbeläge wechseln · Bremse vorn"
function aufgabeTitel(art) { return esc(art.name) + (art.bauteil ? ' <span class="klein">· ' + esc(art.bauteil) + '</span>' : ""); }
// Kurzer Name eines offenen Auftrags mit Termin bzw. Fälligkeit
function auftragKurz(o) {
  return esc(o.art.name) + (o.termin ? " am " + datumText(o.termin) : o.regel && o.regel.datum && !o.regel.erledigt ? " (" + esc(o.regel.text) + ")" : "");
}
function zuordnungText(art) {
  return art.zuordnung === NAECHSTE_INSPEKTION ? "nächste Inspektion" : artName(art.zuordnung);
}

// Eine Position als HTML (Aufgabe mit Bauteil und Fälligkeit bzw. Mangel)
function positionHtml(p, lage) {
  if (p.art === "aufgabe") {
    const x = lage && lage.aufgabeVon(p.wartungsartId);
    const art = artVon(p.wartungsartId);
    return '<div class="position">🔧 ' + aufgabeTitel(art) +
      (x && p.status === "offen" ? '<div class="klein"><span class="' + x.st.klasse + '">' + esc(x.st.text) + '</span>' + (p.berechnet ? " · nach Standard" : "") + '</div>' : "") +
      (p.notiz ? '<div class="klein umbrueche">' + esc(p.notiz) + '</div>' : "") + '</div>';
  }
  const m = daten.maengel.find(m => m.id === p.mangelId);
  return '<div class="position">⚠️ ' + esc(m ? m.beschreibung : "(unbekannt)") +
    (m ? '<div class="klein">festgestellt am ' + datumText(m.datum) + '</div>' : "") +
    (p.notiz ? '<div class="klein umbrueche">' + esc(p.notiz) + '</div>' : "") + '</div>';
}
// Vorschlag: "Bremsbeläge wechseln bei ca. 5.000 km fällig – zu diesem Auftrag nehmen?"
function vorschlagHtml(x, o) {
  return '<div class="vorschlag">💡 ' + esc(x.art.name) + ' ' + esc(aufgabeKurz(x.st)) + ' – zu diesem Auftrag nehmen?' +
    (x.offen ? ' <span class="klein">(sonst ' + esc(x.offen.art.name) + ')</span>' : "") +
    '<button type="button" data-action="vorschlag-annehmen" data-key="' + esc(auftragKey(o)) + '" data-id="' + esc(x.art.id) + '">Mitnehmen</button></div>';
}

function bildWartung(h = heute()) {
  const lage = werkstattLage(h);
  let html = "";

  if (pruefungVorgemerkt()) {
    html += '<div class="hinweis warn"><strong>Bitte Wartungsarten prüfen</strong><br>Nach dem Update sind die Wartungsarten in Aufträge und ' +
      'Aufgaben eingeteilt. Bitte Art, Intervall, Bauteil und Standard-Zuordnung prüfen.<br>' +
      '<button type="button" data-action="pruefung-oeffnen">Wartungsarten prüfen</button></div>';
  }

  // Offene Mängel ohne Auftrag ganz oben (nur wenn vorhanden)
  const ohne = lage.maengelOhneAuftrag;
  if (ohne.length) {
    html += '<h2 style="margin-top:8px">Offene Mängel ohne Auftrag <span class="klein">(' + ohne.length + ')</span></h2><div class="liste">' +
      ohne.map(m => mangelZeile(m, true)).join("") + '</div>' +
      '<div class="knopfreihe" style="margin-bottom:12px"><button type="button" data-action="mangel-neu">+ Mangel erfassen</button></div>';
  }

  // Offene Aufträge mit ihren Positionen und Vorschlägen
  html += '<h2>Offene Aufträge</h2>';
  if (!lage.offene.length) html += '<div class="liste"><div class="leer">Keine offenen Aufträge.</div></div>';
  lage.offene.forEach(o => { html += auftragKarte(o, lage, h); });
  const neu = bedarfsArten();
  if (neu.length) {
    html += '<div class="knopfreihe" style="margin-bottom:12px">' + neu.map(a =>
      '<button type="button" data-action="auftrag-neu" data-id="' + esc(a.id) + '">+ ' + esc(a.name) + '</button>').join("") + '</div>';
  }

  // Aufgaben mit Fälligkeit und Hinweis auf ihren Auftrag
  html += '<h2>Aufgaben</h2><div class="liste">';
  if (!lage.aufgaben.length) html += '<div class="leer">Noch keine Aufgaben. Lege unter „Wartungsarten“ eine Wartungsart der Art „Aufgabe“ an, z. B. „Bremsbeläge wechseln“.</div>';
  lage.aufgaben.forEach(x => {
    const auftrag = x.offen ? "→ " + auftragKurz(x.offen) + (x.berechnet ? " · nach Standard" : "")
      : "noch kein Auftrag · Standard: " + esc(zuordnungText(x.art));
    html += '<div class="zeile"><button type="button" class="inhalt" data-action="aufgabe-ansehen" data-id="' + esc(x.art.id) + '">' +
      '<div class="text"><div>' + aufgabeTitel(x.art) + '</div>' +
      '<div class="umbrechen"><span class="' + x.st.klasse + '">' + esc(x.st.text) + '</span></div>' +
      '<div class="klein umbrechen">' + auftrag + '</div></div>' +
      '<span class="klein" style="padding-right:16px">›</span></button></div>';
  });
  html += '</div>';

  // Historie: erledigte Aufträge
  const erledigte = daten.auftraege.filter(a => a.status === "erledigt").sort((a, b) => b.datum.localeCompare(a.datum));
  html += '<h2>Erledigte Aufträge</h2><div class="liste">';
  if (!erledigte.length) html += '<div class="leer">Noch kein Auftrag erledigt.</div>';
  erledigte.forEach(a => {
    const n = a.positionen.filter(p => p.status === "erledigt").length;
    const unten = [a.werkstatt, n ? positionenText(n) : "", a.notiz].filter(Boolean).map(esc).join(" · ");
    html += '<div class="zeile">' +
      '<button type="button" class="inhalt" data-action="auftrag-ansehen" data-key="' + esc(a.id) + '">' +
      '<div class="text"><div>' + datumText(a.datum) + ' · <strong>' + esc(artName(a.wartungsartId)) + '</strong></div>' +
      (unten ? '<div class="klein">' + unten + '</div>' : "") +
      '</div><span class="zahl" style="padding-right:16px">' + (a.kmStand !== null ? kmText(a.kmStand) + ' km' : "") + '</span></button>' +
      '</div>';
  });
  html += '</div>';

  // Mängel erfassen (ohne offene Mängel ohne Auftrag) und erledigte Mängel
  const erledigt = daten.maengel.filter(m => m.status === "erledigt")
    .sort((a, b) => (b.erledigtAm || b.datum).localeCompare(a.erledigtAm || a.datum));
  if (!ohne.length || erledigt.length) html += '<h2>Mängel</h2>';
  if (!ohne.length) {
    html += '<div class="liste"><div class="leer">' + (offeneMaengel().length ? "Alle offenen Mängel stehen in einem Auftrag." : "Keine offenen Mängel.") + '</div></div>' +
      '<div class="knopfreihe"><button type="button" data-action="mangel-neu">+ Mangel erfassen</button></div>';
  }
  if (erledigt.length) {
    html += '<div class="liste"' + (ohne.length ? "" : ' style="margin-top:12px"') + '><div class="zeile gruppe">' +
      '<button type="button" class="inhalt" data-action="maengel-erledigt-umschalten" aria-expanded="' + erledigteMaengelOffen + '">' +
      CHEVRON +
      '<div class="text"><div class="titel">Erledigte Mängel (' + erledigt.length + ')</div></div></button></div>' +
      (erledigteMaengelOffen ? erledigt.map(m => mangelZeile(m, false)).join("") : "") + '</div>';
  }

  // Wartungsarten verwalten
  html += '<h2>Wartungsarten</h2>';
  [["auftrag", "Aufträge"], ["aufgabe", "Aufgaben"]].forEach(([typ, titel]) => {
    const arten = daten.wartungsarten.filter(a => a.typ === typ);
    html += '<h3>' + titel + '</h3><div class="liste">' + (arten.length ? "" : '<div class="leer">Keine.</div>') +
      arten.map(a => '<div class="zeile"><button type="button" class="inhalt" data-action="art-bearbeiten" data-id="' + esc(a.id) + '">' +
        '<div class="text"><div>' + esc(a.name) + '</div><div class="klein umbrechen">' + esc(artRegelText(a)) + '</div></div>' +
        '<span class="klein" style="padding-right:16px">›</span></button></div>').join("") + '</div>';
  });
  html += '<div class="knopfreihe"><button type="button" data-action="art-neu">+ Neue Wartungsart</button></div>';
  return html;
}

// Regel einer Wartungsart als Text: "Zeitfenster: März–April, ab 2027", "Intervall: 24 Monate oder 5.000 km · Bremse · Standard: nächste Inspektion"
function artRegelText(a) {
  let regel;
  if (hatZeitfenster(a)) {
    regel = "Zeitfenster: " + fensterText(a) + (a.gueltigAbJahr ? ", ab " + a.gueltigAbJahr : "") +
      (a.intervallKm ? " (Hinweis bei " + kmText(a.intervallKm) + " km)" : "");
  } else {
    const iv = [a.intervallMonate ? a.intervallMonate + " Monate" : "", a.intervallKm ? kmText(a.intervallKm) + " km" : ""].filter(Boolean).join(" oder ");
    regel = iv ? "Intervall: " + iv : a.typ === "auftrag" ? "ohne Intervall, bei Bedarf" : "ohne Intervall";
  }
  if (a.einmalig) regel = "einmalig · " + regel;
  if (a.typ === "aufgabe") regel += (a.bauteil ? " · " + a.bauteil : "") + " · Standard: " + zuordnungText(a);
  return regel;
}

// Karte eines offenen Auftrags im Reiter Wartung
function auftragKarte(o, lage, h) {
  const art = o.art, r = o.regel;
  let html = '<div class="karte"><h3>' + esc(art.name) + '</h3>' +
    '<div class="' + o.klasse + '">' + esc(o.text) + '</div>';
  if (o.erwartet) html += '<div class="klein">Erwarteter Kilometerstand am ' + datumText(o.erwartet.datum) + ': ' + caKm(o.erwartet.km) + '</div>';
  if (r) {
    // Bei geplantem Termin zusätzlich die Fälligkeit nach Regel klein zeigen
    if (o.termin && r.datum) html += '<div class="klein">Ohne Termin: ' + esc(r.text) + '</div>';
    if (r.kmHinweis) html += '<div class="klein status-orange">Hinweis: ' + esc(r.kmHinweis) + '</div>';
    if (r.restKm > 0) html += '<div class="klein">' + (rund10(r.restKm) > 0 ? "Noch " + caKm(r.restKm) : "Weniger als 10 km") + ' bis zur km-Grenze</div>';
    if (hatZeitfenster(art)) html += '<div class="klein">Zeitfenster: ' + fensterText(art) + (art.gueltigAbJahr ? ", gültig ab " + art.gueltigAbJahr : "") + '</div>';
    if (r.letzte) {
      html += '<div class="klein">Zuletzt: ' + datumText(r.letzte.datum) + (r.letzte.werkstatt ? " bei " + esc(r.letzte.werkstatt) : "") +
        (r.letzte.kmStand !== null ? " · " + kmText(r.letzte.kmStand) + " km" : "") + '</div>' +
        '<div class="klein">Seit letzter Wartung gefahren: ' + kmText(r.seitKm) + ' km</div>';
    } else if (r.abStart) {
      html += '<div class="klein">Noch nicht durchgeführt – gerechnet ab dem Startdatum (' + datumText(daten.fahrrad.startdatum) +
        ', ' + kmText(daten.fahrrad.startKm) + ' km)</div>';
    } else if (!r.nochNie && hatFaelligkeit(art)) {
      html += '<div class="klein">Noch nicht durchgeführt</div>';
    }
  }
  html += '<div class="positionen"><div class="klein">' + (o.positionen.length ? "Positionen (" + o.positionen.length + ")" : "Keine Positionen") + '</div>' +
    o.positionen.map(p => positionHtml(p, lage)).join("") + '</div>';
  html += o.vorschlaege.map(x => vorschlagHtml(x, o)).join("");
  const key = esc(auftragKey(o));
  return html + '<div class="knopfreihe">' +
    '<button type="button" data-action="auftrag-termin" data-key="' + key + '">' + (o.termin ? "Termin ändern" : "Termin planen") + '</button>' +
    '<button type="button" data-action="auftrag-ansehen" data-key="' + key + '">Positionen</button>' +
    '<button type="button" class="primaer" data-action="auftrag-erledigen" data-key="' + key + '">Erledigt eintragen</button>' +
    '</div></div>';
}

// Zeile eines Mangels; offene ohne Auftrag mit "Zu Auftrag …" und "Reparatur anlegen"
function mangelZeile(m, mitKnoepfen) {
  const unten = m.status === "erledigt"
    ? "erledigt" + (m.erledigtAm ? " am " + datumText(m.erledigtAm) : "")
    : "festgestellt am " + datumText(m.datum);
  const rep = reparaturArt();
  return '<div class="zeile' + (mitKnoepfen ? " mit-knoepfen" : "") + '"><button type="button" class="inhalt" data-action="mangel-ansehen" data-id="' + m.id + '">' +
    '<div class="text"><div>' + esc(m.beschreibung) + '</div><div class="klein">' + unten + '</div></div>' +
    '<span class="klein" style="padding-right:16px">›</span></button>' +
    (mitKnoepfen ? '<div class="knopfreihe">' +
      '<button type="button" data-action="mangel-zuordnen" data-id="' + m.id + '">Zu Auftrag …</button>' +
      (rep ? '<button type="button" data-action="mangel-auftrag-neu" data-id="' + m.id + '" data-art="' + esc(rep.id) + '">' + esc(rep.name) + ' anlegen</button>' : "") +
      '</div>' : "") + '</div>';
}

// ---------- Offener Auftrag: Ansicht mit Positionen ----------
function auftragAnsicht(key) {
  const erledigt = daten.auftraege.find(a => a.id === key && a.status === "erledigt");
  if (erledigt) { erledigterAuftragAnsicht(erledigt); return; }
  const lage = werkstattLage();
  const o = offenerVon(key, lage);
  if (!o) { fensterSchliessen(); return; }
  const k = esc(key);
  const andere = lage.offene.filter(x => x !== o);
  const zeilen = o.positionen.map(p => {
    const pk = p.art === "aufgabe" ? "aufgabe:" + p.wartungsartId : "mangel:" + p.mangelId;
    return '<div class="position-zeile">' + positionHtml(p, lage) + '<div class="knopfreihe">' +
      (andere.length ? '<button type="button" data-action="position-verschieben" data-key="' + k + '" data-pos="' + esc(pk) + '">Verschieben …</button>' : "") +
      '<button type="button" data-action="position-entfernen" data-key="' + k + '" data-pos="' + esc(pk) + '">Entfernen</button></div></div>';
  }).join("");
  const imAuftrag = new Set(o.positionen.map(p => p.art === "aufgabe" ? p.wartungsartId : p.mangelId));
  const aufgabenWahl = lage.aufgaben.filter(x => !imAuftrag.has(x.art.id));
  const maengelWahl = offeneMaengel().filter(m => !imAuftrag.has(m.id));
  fensterOeffnen(
    '<h2>' + esc(o.art.name) + '</h2>' +
    '<div class="' + o.klasse + '">' + esc(o.text) + '</div>' +
    (o.regel && o.termin && o.regel.datum ? '<div class="klein">Ohne Termin: ' + esc(o.regel.text) + '</div>' : "") +
    (o.auftrag.notiz ? '<div class="klein umbrueche">' + esc(o.auftrag.notiz) + '</div>' : "") +
    (o.auftrag.id && o.termin ? '<div class="knopfreihe"><button type="button" data-action="kalender" data-key="' + k + '">📅 In Kalender übernehmen</button></div>' : "") +
    '<h3>Positionen</h3>' + (zeilen || '<div class="klein">Noch keine Positionen.</div>') +
    o.vorschlaege.map(x => vorschlagHtml(x, o)).join("") +
    (aufgabenWahl.length ? '<label for="ap-aufgabe">Aufgabe hinzufügen</label><div class="suchzeile"><select id="ap-aufgabe">' +
      aufgabenWahl.map(x => '<option value="' + esc(x.art.id) + '">' + esc(x.art.name) + ' – ' + esc(aufgabeKurz(x.st)) +
        (x.offen ? " (jetzt: " + esc(x.offen.art.name) + ")" : "") + '</option>').join("") +
      '</select><button type="button" data-action="position-aufgabe-dazu" data-key="' + k + '">Hinzufügen</button></div>' : "") +
    (maengelWahl.length ? '<label for="ap-mangel">Mangel hinzufügen</label><div class="suchzeile"><select id="ap-mangel">' +
      maengelWahl.map(m => { const in_ = lage.mangelAuftrag(m.id); return '<option value="' + esc(m.id) + '">' + esc(m.beschreibung) +
        (in_ ? " (jetzt: " + esc(in_.art.name) + ")" : "") + '</option>'; }).join("") +
      '</select><button type="button" data-action="position-mangel-dazu" data-key="' + k + '">Hinzufügen</button></div>' : "") +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Schließen</button>' +
    '<button type="button" data-action="auftrag-termin" data-key="' + k + '">' + (o.termin ? "Termin ändern" : "Termin planen") + '</button>' +
    '<button type="button" class="primaer" data-action="auftrag-erledigen" data-key="' + k + '">Erledigt eintragen</button></div>' +
    (o.auftrag.id ? '<div class="knopfreihe"><button type="button" class="gefahr voll" data-action="auftrag-loeschen" data-key="' + k + '">Auftrag löschen</button></div>' : "")
  );
}

// Aufgabe in einen offenen Auftrag nehmen (aus einem anderen geplanten Auftrag verschoben)
function aufgabeZuAuftrag(key, aufgabeId) {
  if (!istAufgabe(artVon(aufgabeId))) return null;
  const ziel = auftragFestlegen(key);
  if (!ziel) return null;
  daten.auftraege.filter(a => a.status === "geplant" && a !== ziel).forEach(a => {
    a.positionen = a.positionen.filter(p => !(p.art === "aufgabe" && p.wartungsartId === aufgabeId));
  });
  ziel.ausgeschlossen = ziel.ausgeschlossen.filter(id => id !== aufgabeId);
  if (!ziel.positionen.some(p => p.art === "aufgabe" && p.wartungsartId === aufgabeId)) {
    ziel.positionen.push({ id: neueId(), art: "aufgabe", wartungsartId: aufgabeId, status: "offen", notiz: "" });
  }
  return ziel;
}
// Mangel in einen offenen Auftrag nehmen (aus einem anderen geplanten Auftrag verschoben)
function mangelZuAuftrag(key, mangelId) {
  if (!daten.maengel.some(m => m.id === mangelId && m.status === "offen")) return null;
  const ziel = auftragFestlegen(key);
  if (!ziel) return null;
  daten.auftraege.filter(a => a.status === "geplant" && a !== ziel).forEach(a => {
    a.positionen = a.positionen.filter(p => !(p.art === "mangel" && p.mangelId === mangelId));
  });
  if (!ziel.positionen.some(p => p.art === "mangel" && p.mangelId === mangelId)) {
    ziel.positionen.push({ id: neueId(), art: "mangel", mangelId, status: "offen", notiz: "" });
  }
  return ziel;
}
// Position aus einem offenen Auftrag entfernen. Eine Aufgabe wird dort
// ausgeschlossen, damit die Standard-Zuordnung sie nicht wieder hineinnimmt.
function positionEntfernen(key, pos) {
  const [art, id] = [pos.slice(0, pos.indexOf(":")), pos.slice(pos.indexOf(":") + 1)];
  const a = auftragFestlegen(key);
  if (!a) return null;
  a.positionen = a.positionen.filter(p => !(p.art === art && (art === "aufgabe" ? p.wartungsartId : p.mangelId) === id));
  if (art === "aufgabe" && !a.ausgeschlossen.includes(id)) a.ausgeschlossen.push(id);
  return a;
}
// Nach einer Änderung an einem offenen Auftrag: speichern und die Ansicht neu zeigen
function auftragGeaendert(a, text) {
  if (!speichern()) return;
  zeichnen();
  if (a && fenster.open) auftragAnsicht(a.id);
  if (text) meldung(text);
}

// Auswahl eines Ziel-Auftrags (Verschieben, Mangel zuordnen, Aufgabe zuordnen)
function zielAuswahl(titel, text, ziele, aktion, daten_) {
  fensterOeffnen('<h2>' + titel + '</h2><p>' + text + '</p>' +
    (ziele.length ? '<div class="liste">' + ziele.map(o => '<div class="zeile"><button type="button" class="inhalt" data-action="' + aktion + '" data-ziel="' +
      esc(auftragKey(o)) + '"' + Object.entries(daten_).map(([k, v]) => ' data-' + k + '="' + esc(v) + '"').join("") + '>' +
      '<div class="text"><div>' + esc(o.art.name) + '</div><div class="klein umbrechen">' + esc(o.text) + ' · ' + positionenText(o.positionen.length) + '</div></div>' +
      '<span class="klein" style="padding-right:16px">›</span></button></div>').join("") + '</div>' : '<p class="klein">Kein anderer offener Auftrag.</p>') +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Abbrechen</button></div>');
}
function positionVerschiebenWahl(key, pos) {
  const lage = werkstattLage();
  zielAuswahl("Position verschieben", "In welchen Auftrag?", lage.offene.filter(o => auftragKey(o) !== key), "position-verschieben-ziel", { key, pos });
}
function positionVerschieben(key, pos, zielKey) {
  const [art, id] = [pos.slice(0, pos.indexOf(":")), pos.slice(pos.indexOf(":") + 1)];
  positionEntfernen(key, pos);
  const ziel = art === "aufgabe" ? aufgabeZuAuftrag(zielKey, id) : mangelZuAuftrag(zielKey, id);
  auftragGeaendert(ziel, "Position verschoben");
}

// ---------- Termin eines offenen Auftrags ----------
function auftragTerminFormular(key) {
  const neu = key.startsWith("anlegen:");
  const o = neu ? null : offenerVon(key);
  const art = neu ? artVon(key.slice(8)) : o && o.art;
  if (!art) return;
  const a = o ? o.auftrag : { termin: null, terminZeit: null, werkstatt: "", notiz: "" };
  fensterOeffnen(
    '<h2>' + (neu ? "Neuer Auftrag: " : "Termin: ") + esc(art.name) + '</h2>' +
    '<label for="t-datum">Termin' + (neu ? " (optional)" : "") + '</label><input type="date" id="t-datum" value="' + (a.termin || "") + '">' +
    // Schalter und Uhrzeit (das Uhrzeitfeld lässt sich auf dem iPhone nicht leeren)
    '<label class="haken"><input type="checkbox" id="t-zeit-an" data-change="termin-zeit-an"' + (a.terminZeit ? " checked" : "") + '><span>Mit Uhrzeit</span></label>' +
    '<label for="t-zeit">Uhrzeit</label><input type="time" id="t-zeit" value="' + (a.terminZeit || "09:00") + '"' + (a.terminZeit ? "" : " disabled") + '>' +
    '<div class="feldhinweis">Ohne Uhrzeit gilt der Termin ganztägig, auch im Kalender.</div>' +
    '<label for="t-werkstatt">Werkstatt</label><input type="text" id="t-werkstatt" value="' + esc(a.werkstatt) + '">' +
    '<label for="t-notiz">Notiz</label><textarea id="t-notiz">' + esc(a.notiz) + '</textarea>' +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Abbrechen</button>' +
    '<button type="button" class="primaer" data-action="auftrag-termin-speichern" data-key="' + esc(key) + '">' + (neu ? "Anlegen" : "Speichern") + '</button></div>' +
    (a.termin ? '<div class="knopfreihe"><button type="button" class="gefahr voll" data-action="auftrag-termin-entfernen" data-key="' + esc(key) + '">Termin entfernen</button></div>' : "")
  );
}
function auftragTerminSpeichern(key) {
  const datum = wert("t-datum");
  if (datum !== "" && !istGueltigesDatum(datum)) { alert("Bitte ein gültiges Datum wählen."); return; }
  if (!key.startsWith("anlegen:") && datum === "") { alert("Bitte ein Datum wählen. Ohne Termin: „Termin entfernen“."); return; }
  const mitZeit = document.getElementById("t-zeit-an").checked;
  const zeit = wert("t-zeit");
  if (mitZeit && datum === "") { alert("Eine Uhrzeit geht nur zusammen mit einem Termin."); return; }
  if (mitZeit && !istUhrzeit(zeit)) { alert("Bitte eine gültige Uhrzeit eingeben, z. B. 09:30."); return; }
  const a = auftragFestlegen(key);
  if (!a) return;
  Object.assign(a, { termin: datum || null, terminZeit: mitZeit ? zeit : null, werkstatt: wert("t-werkstatt").trim(), notiz: wert("t-notiz").trim() });
  if (!speichern()) return;
  zeichnen();
  if (key.startsWith("anlegen:")) { auftragAnsicht(a.id); meldung(artName(a.wartungsartId) + " angelegt"); }
  else { fensterSchliessen(); meldung("Termin gespeichert"); }
}
async function auftragTerminEntfernen(key) {
  if (!await frage("Termin wirklich entfernen?", "Entfernen", "Abbrechen", true)) return;
  const a = auftragFestlegen(key);
  if (!a) return;
  a.termin = null;
  a.terminZeit = null;
  if (speichern()) { fensterSchliessen(); zeichnen(); }
}
async function auftragLoeschen(key) {
  const a = daten.auftraege.find(x => x.id === key && x.status === "geplant");
  if (!a) return;
  const m = a.positionen.filter(p => p.art === "mangel").length;
  if (!await frage("Geplanten Auftrag „" + esc(artName(a.wartungsartId)) + "“ wirklich löschen?" +
    (m ? "<br><br>" + (m === 1 ? "Der Mangel steht" : "Die " + m + " Mängel stehen") + " danach wieder ohne Auftrag oben im Reiter Wartung." : ""),
    "Löschen", "Abbrechen", true)) return;
  mitRueckgaengig(() => { daten.auftraege = daten.auftraege.filter(x => x !== a); }, "Auftrag gelöscht");
}

// ---------- Termin in den Kalender (Kalenderdatei .ics, siehe kalender.js) ----------
// Zwei Wege, weil nicht sicher ist, welcher aus der App auf dem Home-Bildschirm
// zuverlässig in die Kalender-App führt: öffnen (iOS zeigt die Datei mit
// „Hinzufügen“) oder teilen (wie bei der Sicherung).
function kalenderFenster(key) {
  const o = offenerVon(key);
  if (!o || !o.auftrag.id || !o.termin) return;
  const a = o.auftrag;
  const wann = WOCHENTAGE[new Date(a.termin + "T12:00:00").getDay()] + ". " + datumText(a.termin) +
    (a.terminZeit ? ", " + a.terminZeit + " Uhr (1 Stunde)" : ", ganztägig");
  const k = esc(key);
  fensterOeffnen('<h2>In Kalender übernehmen</h2>' +
    '<div class="karte"><div><strong>' + esc(kalenderTitel(o)) + '</strong></div><div>' + esc(wann) + '</div>' +
    '<div class="klein">Erinnerung am Vortag um ' + KALENDER_ERINNERUNG + ' Uhr · ' + (o.positionen.length ? positionenText(o.positionen.length) : "noch keine Positionen") + '</div></div>' +
    '<button type="button" class="primaer voll" data-action="kalender-oeffnen" data-key="' + k + '">Im Kalender öffnen</button>' +
    '<p class="klein">Öffnet die Kalenderdatei; tippe dort auf „Hinzufügen“.</p>' +
    '<button type="button" class="voll" data-action="kalender-teilen" data-key="' + k + '">Als Datei teilen …</button>' +
    '<p class="klein">Falls das Öffnen nicht klappt: Datei z. B. in „Dateien“ sichern und von dort öffnen.</p>' +
    '<p class="klein">Hast du den Termin schon einmal übernommen und dann geändert, übernimm ihn erneut und lösche im Kalender den alten Eintrag, falls er doppelt erscheint.</p>' +
    '<div class="knopfreihe"><button type="button" data-action="auftrag-ansehen" data-key="' + k + '">Zurück</button></div>');
}
// Kalenderdatei als Blob bzw. Datei; ohne vorheriges "await" (iPhone: Teilen nur direkt nach einem Tipper)
function kalenderInhalt(key) {
  const o = offenerVon(key);
  if (!o || !o.auftrag.id || !o.termin) return null;
  return { text: kalenderDatei(o), dateiname: kalenderDateiname(o) };
}
function kalenderOeffnen(key) {
  const k = kalenderInhalt(key);
  if (!k) return;
  const url = URL.createObjectURL(new Blob([k.text], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
async function kalenderTeilen(key) {
  const k = kalenderInhalt(key);
  if (!k) return;
  let datei = null;
  try { datei = new File([k.text], k.dateiname, { type: "text/calendar" }); } catch (e) { /* ohne File: herunterladen */ }
  if (datei && navigator.canShare && navigator.canShare({ files: [datei] })) {
    try {
      await navigator.share({ files: [datei] });
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
      if (err && err.name === "NotAllowedError") { meldung("Bitte noch einmal auf „Als Datei teilen …“ tippen"); return; }
    }
  }
  const url = URL.createObjectURL(new Blob([k.text], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = k.dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ---------- Erledigt eintragen (Abschluss) und erledigte Aufträge ----------

// Zustand des Abschluss-Formulars: { key (offener Auftrag) | id (erledigter Auftrag) |
// artId (neuer Auftrag, z. B. Eigenleistung zu einer Aufgabe), manuell, positionen, f (Formularwerte) }.
// "positionen" ist der beim Öffnen angezeigte Stand (auch die nach der
// Standard-Zuordnung berechneten) mit den im Formular hinzugefügten bzw.
// entfernten Positionen; so wird er gespeichert.
let formAuftrag = null;

function auftragErledigen(key) {
  const o = offenerVon(key);
  if (!o) return;
  const t = o.termin;
  abschlussFormular({ key, art: o.art, datum: t && t <= heute() ? t : heute(), werkstatt: o.auftrag.werkstatt, kmStand: null, kmManuell: false,
    notiz: o.auftrag.notiz, positionen: o.positionen.map(p => ({ id: p.id, art: p.art, wartungsartId: p.wartungsartId, mangelId: p.mangelId, notiz: p.notiz, status: "erledigt" })) });
}
// "Erledigt eintragen" an einer Aufgabe: Auswahl zwischen einem neuen Auftrag
// ohne Fälligkeit (Eigenleistung als Vorgabe, Reparatur …) und einem schon
// erledigten Auftrag, zu dem die Aufgabe als erledigte Position kommt.
function aufgabeErledigen(aufgabeId) {
  const art = artVon(aufgabeId);
  if (!istAufgabe(art)) return;
  const arten = bedarfsArten();
  const vorgabe = eigenleistungArt();
  const erledigte = daten.auftraege.filter(a => a.status === "erledigt")
    .sort((a, b) => b.datum.localeCompare(a.datum) || daten.auftraege.indexOf(b) - daten.auftraege.indexOf(a));
  const zeile = a => {
    const p = a.positionen.find(p => p.art === "aufgabe" && p.wartungsartId === aufgabeId);
    const schon = !!p && p.status === "erledigt";
    return '<div class="zeile"><button type="button" class="inhalt" data-action="aufgabe-zu-erledigtem" data-id="' + esc(a.id) + '" data-aufgabe="' + esc(aufgabeId) + '"' +
      (schon ? " disabled" : "") + '><div class="text"><div>' + datumText(a.datum) + ' · ' + esc(artName(a.wartungsartId)) + '</div>' +
      '<div class="klein umbrechen">' + (a.kmStand === null ? "km unbekannt" : kmText(a.kmStand) + " km") +
      (schon ? " · schon erledigt" : p ? " · dort nicht gemacht" : "") + '</div></div>' +
      '<span class="klein" style="padding-right:16px">›</span></button></div>';
  };
  fensterOeffnen(
    '<h2>Erledigt: ' + esc(art.name) + '</h2>' +
    '<h3>Neuer Auftrag</h3>' +
    (arten.length
      ? '<label for="ae-art">Auftragsart</label><div class="suchzeile"><select id="ae-art">' + arten.map(a =>
          '<option value="' + esc(a.id) + '"' + (a === vorgabe ? " selected" : "") + '>' + esc(a.name) + '</option>').join("") + '</select>' +
        '<button type="button" class="primaer" data-action="aufgabe-erledigen-neu" data-id="' + esc(aufgabeId) + '">Weiter</button></div>'
      : '<p class="klein">Bitte zuerst eine Wartungsart „Eigenleistung“ (Auftrag ohne Intervall) anlegen.</p>') +
    '<h3 style="margin-top:20px">Zu erledigtem Auftrag …</h3>' +
    (erledigte.length ? '<div class="liste">' + erledigte.map(zeile).join("") + '</div>' : '<p class="klein">Noch keine erledigten Aufträge.</p>') +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Abbrechen</button></div>'
  );
}
// Neuer erledigter Auftrag (z. B. Eigenleistung) mit dieser Aufgabe
function aufgabeErledigenNeu(aufgabeId, artId) {
  const art = bedarfsArten().find(a => a.id === artId);
  if (!art || !istAufgabe(artVon(aufgabeId))) return;
  abschlussFormular({ artId: art.id, art, datum: heute(), werkstatt: "", kmStand: null, kmManuell: false, notiz: "",
    positionen: [{ id: null, art: "aufgabe", wartungsartId: aufgabeId, notiz: "", status: "erledigt" }] });
}
// Formular "Auftrag bearbeiten"; mit aufgabeId steht diese Aufgabe schon als
// erledigte Position darin (eine "nicht gemacht"-Position wird "erledigt").
function erledigterAuftragAendern(id, aufgabeId) {
  const a = daten.auftraege.find(a => a.id === id && a.status === "erledigt");
  if (!a) return;
  const positionen = a.positionen.map(p => Object.assign({}, p));
  if (aufgabeId && istAufgabe(artVon(aufgabeId))) {
    const p = positionen.find(p => p.art === "aufgabe" && p.wartungsartId === aufgabeId);
    if (p) p.status = "erledigt";
    else positionen.push({ id: null, art: "aufgabe", wartungsartId: aufgabeId, notiz: "", status: "erledigt" });
  }
  abschlussFormular({ id, art: artVon(a.wartungsartId), datum: a.datum, werkstatt: a.werkstatt, kmStand: a.kmStand, kmManuell: a.kmManuell, notiz: a.notiz, positionen });
}

// Formular "Erledigt" bzw. "Auftrag bearbeiten". Positionen lassen sich
// abhaken, entfernen (×) und hinzufügen („+ Aufgabe“; beim Bearbeiten eines
// erledigten Auftrags auch „+ Mangel“). Geändert werden die Daten erst beim Speichern.
function abschlussFormular(f) {
  formAuftrag = { key: f.key || null, id: f.id || null, artId: f.artId || null, manuell: f.kmManuell, positionen: f.positionen, f };
  const name = p => p.art === "aufgabe" ? esc(artName(p.wartungsartId))
    : esc((daten.maengel.find(m => m.id === p.mangelId) || { beschreibung: "(unbekannt)" }).beschreibung);
  const imAuftrag = new Set(f.positionen.map(p => p.art + ":" + (p.art === "aufgabe" ? p.wartungsartId : p.mangelId)));
  // Mangel, der schon mit einem anderen Auftrag erledigt wurde, lässt sich hier nicht abhaken
  const gesperrt = p => p.art === "mangel" && p.status !== "erledigt" &&
    (daten.maengel.find(m => m.id === p.mangelId) || {}).status === "erledigt";
  const aufgabenWahl = aufgabenArten().filter(a => !imAuftrag.has("aufgabe:" + a.id));
  // Beim Abschluss: alle weiteren offenen Mängel zum Abhaken. Beim Bearbeiten
  // eines erledigten Auftrags: „+ Mangel“ mit den offenen Mängeln ohne Auftrag,
  // die bis zum Datum des Auftrags erfasst wurden.
  const inGeplantem = new Set(daten.auftraege.filter(a => a.status === "geplant")
    .flatMap(a => a.positionen.filter(p => p.art === "mangel").map(p => p.mangelId)));
  const weitere = f.id ? [] : offeneMaengel().filter(m => !imAuftrag.has("mangel:" + m.id));
  const maengelWahl = f.id ? offeneMaengel().filter(m => !imAuftrag.has("mangel:" + m.id) && !inGeplantem.has(m.id) &&
    (!istGueltigesDatum(f.datum) || m.datum <= f.datum)) : [];
  const gewaehlt = new Set(f.weitereGewaehlt || []);
  const scroll = fenster.open ? fenster.scrollTop : 0;
  fensterOeffnen(
    '<h2>' + (f.id ? "Auftrag bearbeiten: " : "Erledigt: ") + esc(f.art.name) + '</h2>' +
    '<label for="p-datum">Datum</label><input type="date" id="p-datum" value="' + esc(f.datum) + '" data-change="protokoll-datum">' +
    '<label for="p-werkstatt">Werkstatt</label><input type="text" id="p-werkstatt" value="' + esc(f.werkstatt) + '">' +
    '<label for="p-km">Kilometerstand</label>' +
    '<input type="text" id="p-km" inputmode="decimal" autocomplete="off" data-input="protokoll-km">' +
    '<div class="feldhinweis" id="p-km-hinweis"></div>' +
    '<label for="p-notiz">Durchgeführte Arbeiten / Notiz</label><textarea id="p-notiz">' + esc(f.notiz) + '</textarea>' +
    (f.positionen.length ? '<label>Positionen: erledigt abhaken (nicht abgehakt = nicht gemacht)</label>' + f.positionen.map((p, i) =>
      '<div class="haken-zeile"><label class="haken"><input type="checkbox" name="p-position" value="' + i + '"' + (p.status === "erledigt" ? " checked" : "") + (gesperrt(p) ? " disabled" : "") + '>' +
      '<span>' + (p.art === "aufgabe" ? "🔧 " : "⚠️ ") + name(p) + (p.notiz ? ' <span class="klein">(' + esc(p.notiz) + ')</span>' : "") + '</span></label>' +
      '<button type="button" class="leise entfernen" data-action="abschluss-position-entfernen" data-i="' + i + '" aria-label="' + name(p) + ' entfernen">×</button></div>').join("")
      : '<div class="feldhinweis">Keine Positionen.</div>') +
    (aufgabenWahl.length ? '<label for="p-aufgabe-neu">+ Aufgabe</label><div class="suchzeile"><select id="p-aufgabe-neu">' +
      aufgabenWahl.map(a => '<option value="' + esc(a.id) + '">' + esc(a.name) + (a.bauteil ? " · " + esc(a.bauteil) : "") + '</option>').join("") +
      '</select><button type="button" data-action="abschluss-aufgabe-dazu">Hinzufügen</button></div>' : "") +
    (maengelWahl.length ? '<label for="p-mangel-neu">+ Mangel</label><div class="suchzeile"><select id="p-mangel-neu">' +
      maengelWahl.map(m => '<option value="' + esc(m.id) + '">' + esc(m.beschreibung) + ' (' + datumText(m.datum) + ')</option>').join("") +
      '</select><button type="button" data-action="abschluss-mangel-dazu">Hinzufügen</button></div>' : "") +
    (weitere.length ? '<label>Weitere offene Mängel, die dabei erledigt wurden</label>' + weitere.map(m =>
      '<label class="haken"><input type="checkbox" name="p-mangel" value="' + esc(m.id) + '"' + (gewaehlt.has(m.id) ? " checked" : "") + '>' +
      '<span>' + esc(m.beschreibung) + ' <span class="klein">(' + datumText(m.datum) + ')</span></span></label>').join("") : "") +
    '<div class="knopfreihe">' +
    (f.id ? '<button type="button" data-action="auftrag-ansehen" data-key="' + esc(f.id) + '">Abbrechen</button>'
          : '<button type="button" data-action="fenster-zu">Abbrechen</button>') +
    '<button type="button" class="primaer" data-action="abschluss-speichern">Speichern</button></div>' +
    (f.id ? '<div class="knopfreihe"><button type="button" class="gefahr voll" data-action="erledigt-loeschen" data-id="' + esc(f.id) + '">Auftrag löschen</button></div>' : "")
  );
  fenster.scrollTop = scroll;
  document.getElementById("p-km").value = f.kmEingabe !== undefined ? f.kmEingabe : f.kmManuell ? kmFeld(f.kmStand) : kmFeld(kmStandAm(f.datum));
  protokollKmHinweis();
}
// Eingaben des offenen Formulars übernehmen und es neu zeigen (nach + bzw. ×)
function abschlussNeuZeigen(aendern) {
  const f = formAuftrag.f;
  const abgehakt = new Set([...document.querySelectorAll('input[name="p-position"]:checked')].map(el => Number(el.value)));
  f.positionen.forEach((p, i) => { if (!document.querySelector('input[name="p-position"][value="' + i + '"]').disabled) p.status = abgehakt.has(i) ? "erledigt" : "nicht-gemacht"; });
  Object.assign(f, { datum: wert("p-datum"), werkstatt: wert("p-werkstatt"), notiz: wert("p-notiz"), kmEingabe: wert("p-km"), kmManuell: formAuftrag.manuell,
    weitereGewaehlt: [...document.querySelectorAll('input[name="p-mangel"]:checked')].map(el => el.value) });
  aendern(f);
  abschlussFormular(f);
}
function abschlussPositionEntfernen(i) { abschlussNeuZeigen(f => f.positionen.splice(i, 1)); }
function abschlussAufgabeDazu() {
  const id = wert("p-aufgabe-neu");
  abschlussNeuZeigen(f => {
    if (istAufgabe(artVon(id)) && !f.positionen.some(p => p.art === "aufgabe" && p.wartungsartId === id)) {
      f.positionen.push({ id: null, art: "aufgabe", wartungsartId: id, notiz: "", status: "erledigt" });
    }
  });
}
function abschlussMangelDazu() {
  const id = wert("p-mangel-neu");
  abschlussNeuZeigen(f => {
    if (daten.maengel.some(m => m.id === id && m.status === "offen") && !f.positionen.some(p => p.art === "mangel" && p.mangelId === id)) {
      f.positionen.push({ id: null, art: "mangel", mangelId: id, notiz: "", status: "erledigt" });
    }
  });
}

function protokollKmHinweis() {
  const d = wert("p-datum");
  const berechnet = istGueltigesDatum(d) ? kmStandAm(d) : null;
  const el = document.getElementById("p-km-hinweis");
  if (formAuftrag.manuell) {
    el.innerHTML = "Von Hand eingetragen. Berechnet wären: " + kmText(berechnet) + " km " +
      '<button type="button" class="leise" data-action="protokoll-km-neu">Berechneten Wert verwenden</button>';
  } else if (berechnet === null) {
    el.textContent = "Kann nicht berechnet werden (kein Fahrrad angelegt oder Datum vor dem Startdatum). Du kannst den Wert von Hand eintragen.";
  } else {
    el.textContent = "Automatisch berechnet aus den Einträgen bis einschließlich diesem Datum. Du kannst den Wert überschreiben.";
  }
}
function protokollDatumGeaendert() {
  if (!formAuftrag.manuell) {
    const d = wert("p-datum");
    document.getElementById("p-km").value = istGueltigesDatum(d) ? kmFeld(kmStandAm(d)) : "";
  }
  protokollKmHinweis();
  // Beim Bearbeiten hängt die Auswahl „+ Mangel“ vom Datum ab
  if (formAuftrag.id) abschlussNeuZeigen(() => {});
}
function protokollKmEingabe() {
  if (!formAuftrag.manuell) { formAuftrag.manuell = true; protokollKmHinweis(); }
}
function protokollKmNeu() {
  formAuftrag.manuell = false;
  protokollDatumGeaendert();
}

// Mangel als erledigt bzw. wieder offen markieren
function mangelErledigen(id, datum) { Object.assign(daten.maengel.find(m => m.id === id), { status: "erledigt", erledigtAm: datum }); }
function mangelWiederOeffnen(id) { Object.assign(daten.maengel.find(m => m.id === id), { status: "offen", erledigtAm: null }); }

function abschlussSpeichern() {
  const datum = wert("p-datum");
  if (!istGueltigesDatum(datum)) { alert("Bitte ein gültiges Datum wählen."); return; }
  const kmEingabe = wert("p-km").trim();
  const manuell = formAuftrag.manuell && kmEingabe !== "";
  let kmStand = null;
  if (manuell) {
    kmStand = kmLesen(kmEingabe);
    if (kmStand === null) { alert("Bitte den Kilometerstand als Zahl eingeben, z. B. 1234,5."); return; }
  }
  const abgehakt = new Set([...document.querySelectorAll('input[name="p-position"]:checked')].map(el => Number(el.value)));
  const weitere = [...document.querySelectorAll('input[name="p-mangel"]:checked')].map(el => el.value);
  const vorher = formAuftrag.id ? daten.auftraege.find(a => a.id === formAuftrag.id) : null;
  const vorherErledigt = vorher ? vorher.positionen.filter(p => p.art === "mangel" && p.status === "erledigt").map(p => p.mangelId) : [];
  const positionen = formAuftrag.positionen.map((p, i) => {
    const pos = { id: p.id || neueId(), art: p.art, status: abgehakt.has(i) ? "erledigt" : "nicht-gemacht", notiz: p.notiz || "" };
    if (p.art === "aufgabe") pos.wartungsartId = p.wartungsartId; else pos.mangelId = p.mangelId;
    return pos;
  }).concat(weitere.map(id => ({ id: neueId(), art: "mangel", mangelId: id, status: "erledigt", notiz: "" })));
  const satz = { status: "erledigt", termin: null, terminZeit: null, werkstatt: wert("p-werkstatt").trim(), datum, kmStand, kmManuell: manuell,
    notiz: wert("p-notiz").trim(), positionen, ausgeschlossen: [] };
  const key = formAuftrag.key, artId = formAuftrag.artId;

  const aenderung = () => {
    let auftrag;
    if (vorher) {
      auftrag = Object.assign(vorher, satz);
    } else if (key && daten.auftraege.some(a => a.id === key && a.status === "geplant")) {
      auftrag = Object.assign(daten.auftraege.find(a => a.id === key), satz);
    } else {
      auftrag = Object.assign({ id: neueId(), wartungsartId: artId || key.slice(4) }, satz);
      daten.auftraege.push(auftrag);
    }
    // Mängel: erledigte Positionen schließen (Datum des Auftrags); mit diesem
    // Auftrag erledigte, die jetzt abgewählt oder entfernt sind, wieder öffnen
    const erledigtJetzt = new Set(positionen.filter(p => p.art === "mangel" && p.status === "erledigt").map(p => p.mangelId));
    erledigtJetzt.forEach(id => mangelErledigen(id, datum));
    vorherErledigt.filter(id => !erledigtJetzt.has(id)).forEach(mangelWiederOeffnen);
    // Erledigte Mängel stehen in keinem geplanten Auftrag mehr; erledigte
    // Aufgaben nur dann nicht, wenn dieser Auftrag ihre neueste Erledigung ist
    const neueste = id => !daten.auftraege.some(a => a !== auftrag && a.status === "erledigt" && a.datum > datum &&
      a.positionen.some(p => p.art === "aufgabe" && p.wartungsartId === id && p.status === "erledigt"));
    const fertig = new Set(positionen.filter(p => p.status === "erledigt" && (p.art === "mangel" || neueste(p.wartungsartId)))
      .map(p => p.art + ":" + (p.wartungsartId || p.mangelId)));
    daten.auftraege.filter(a => a.status === "geplant").forEach(a => {
      a.positionen = a.positionen.filter(p => !fertig.has(p.art + ":" + (p.wartungsartId || p.mangelId)));
    });
  };
  if (vorher) { mitRueckgaengig(aenderung, "Auftrag gespeichert"); return; }
  aenderung();
  if (speichern()) {
    fensterSchliessen(); zeichnen();
    const n = positionen.filter(p => p.status === "erledigt").length;
    meldung("Erledigt eingetragen" + (n ? ", " + positionenText(n) + " erledigt" : ""));
  }
}

function erledigterAuftragAnsicht(a) {
  const pos = st => a.positionen.filter(p => p.status === st).map(p => {
    const name = p.art === "aufgabe" ? artName(p.wartungsartId) : (daten.maengel.find(m => m.id === p.mangelId) || { beschreibung: "(unbekannt)" }).beschreibung;
    return (st === "erledigt" ? "✓ " : "– ") + (p.art === "mangel" ? "Mangel: " : "") + esc(name) + (p.notiz ? ' <span class="klein umbrueche">(' + esc(p.notiz) + ')</span>' : "");
  }).join("<br>");
  fensterOeffnen(
    '<h2>' + esc(artName(a.wartungsartId)) + '</h2>' +
    detailListe([
      ["Datum", wochentag(a.datum) + ", " + datumText(a.datum)],
      ["Werkstatt", esc(a.werkstatt)],
      ["Kilometerstand", a.kmStand === null ? "–" : kmText(a.kmStand) + " km" + (a.kmManuell ? " (von Hand eingetragen)" : " (berechnet)")],
      ["Durchgeführte Arbeiten / Notiz", a.notiz ? '<span class="umbrueche">' + esc(a.notiz) + '</span>' : ""],
      ["Erledigte Positionen", pos("erledigt")],
      ["Nicht gemacht", pos("nicht-gemacht")]
    ]) +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Schließen</button>' +
    '<button type="button" class="primaer" data-action="erledigt-aendern" data-id="' + esc(a.id) + '">Ändern</button></div>'
  );
}
async function erledigtLoeschen(id) {
  const a = daten.auftraege.find(x => x.id === id && x.status === "erledigt");
  if (!a) return;
  const verknuepft = a.positionen.filter(p => p.art === "mangel" && p.status === "erledigt").map(p => daten.maengel.find(m => m.id === p.mangelId)).filter(Boolean);
  const zusatz = verknuepft.length
    ? "<br><br>" + (verknuepft.length === 1 ? "Der erledigte Mangel wird" : "Die " + verknuepft.length + " erledigten Mängel werden") +
      " wieder auf <strong>offen</strong> gesetzt:<br>" + verknuepft.map(m => "• " + esc(m.beschreibung)).join("<br>")
    : "";
  if (!await frage("Auftrag „" + esc(artName(a.wartungsartId)) + "“ vom " + datumText(a.datum) + " wirklich löschen?" + zusatz, "Löschen", "Abbrechen", true)) return;
  mitRueckgaengig(() => {
    verknuepft.forEach(m => mangelWiederOeffnen(m.id));
    daten.auftraege = daten.auftraege.filter(x => x.id !== id);
  }, "Auftrag gelöscht");
}

// ---------- Aufgabe ansehen ----------
function aufgabeAnsicht(id) {
  const lage = werkstattLage();
  const x = lage.aufgabeVon(id);
  if (!x) return;
  const st = x.st;
  fensterOeffnen(
    '<h2>' + esc(x.art.name) + '</h2>' +
    detailListe([
      ["Bauteil", esc(x.art.bauteil || "")],
      ["Regel", esc(artRegelText(x.art))],
      ["Fälligkeit", '<span class="' + st.klasse + '">' + esc(st.text) + '</span>' +
        (st.restKm > 0 ? '<br><span class="klein">' + (rund10(st.restKm) > 0 ? "Noch " + caKm(st.restKm) : "Weniger als 10 km") + ' bis zur km-Grenze</span>' : "")],
      ["Zuletzt erledigt", st.letzte ? datumText(st.letzte.datum) + " (" + esc(artName(st.letzte.auftrag.wartungsartId)) + ")" +
        (st.letzte.kmStand !== null ? " · " + kmText(st.letzte.kmStand) + " km" : "") + "<br>Seit dem gefahren: " + kmText(st.seitKm) + " km" : "noch nicht"],
      ["Auftrag", x.offen ? auftragKurz(x.offen) + (x.berechnet ? " · nach Standard" : "") : "noch kein Auftrag (Standard: " + esc(zuordnungText(x.art)) + ")"]
    ]) +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Schließen</button>' +
    '<button type="button" data-action="aufgabe-zuordnen" data-id="' + esc(id) + '">Zu Auftrag …</button>' +
    '<button type="button" class="primaer" data-action="aufgabe-erledigen" data-id="' + esc(id) + '">Erledigt eintragen</button></div>' +
    '<div class="feldhinweis">„Erledigt eintragen“: als neuer Auftrag (z. B. Eigenleistung, selbst gewechselt) oder als Position eines schon erledigten Auftrags.</div>' +
    '<div class="knopfreihe"><button type="button" class="voll" data-action="art-bearbeiten" data-id="' + esc(id) + '">Wartungsart bearbeiten</button></div>'
  );
}

/* ---------- Mängel ---------- */
function mangelAnsicht(id) {
  const m = daten.maengel.find(m => m.id === id);
  if (!m) return;
  const lage = werkstattLage();
  const offen = lage.mangelAuftrag(m.id);
  const erledigtMit = daten.auftraege.find(a => a.status === "erledigt" && a.positionen.some(p => p.art === "mangel" && p.mangelId === m.id && p.status === "erledigt"));
  const link = (key, text) => '<button type="button" class="leise" style="padding:0;min-height:0" data-action="auftrag-ansehen" data-key="' + esc(key) + '">' + text + '</button>';
  fensterOeffnen(
    '<h2>Mangel</h2>' +
    detailListe([
      ["Festgestellt am", datumText(m.datum)],
      ["Beschreibung", '<span class="umbrueche">' + esc(m.beschreibung) + '</span>'],
      ["Status", m.status === "erledigt" ? '<span class="status-gruen">erledigt</span>' : '<span class="status-orange">offen</span>'],
      ["Erledigt am", m.erledigtAm ? datumText(m.erledigtAm) : ""],
      ["Im Auftrag", offen ? link(auftragKey(offen), auftragKurz(offen)) : m.status === "offen" ? "noch keinem Auftrag zugeordnet" : ""],
      ["Erledigt mit Auftrag", erledigtMit ? link(erledigtMit.id, esc(artName(erledigtMit.wartungsartId)) + " vom " + datumText(erledigtMit.datum)) : ""]
    ]) +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Schließen</button>' +
    (m.status === "offen" ? '<button type="button" data-action="mangel-zuordnen" data-id="' + m.id + '">Zu Auftrag …</button>' : "") +
    '<button type="button" class="primaer" data-action="mangel-aendern" data-id="' + m.id + '">Ändern</button></div>'
  );
}
// Mangel einem offenen Auftrag zuordnen oder einen Auftrag ohne Fälligkeit (Reparatur, Eigenleistung) dafür anlegen
function mangelZuordnenWahl(id) {
  const lage = werkstattLage();
  const m = daten.maengel.find(m => m.id === id);
  const jetzt = lage.mangelAuftrag(id);
  zielAuswahl("Mangel zuordnen", "„" + esc(m.beschreibung) + "“ in welchen Auftrag?", lage.offene.filter(o => o !== jetzt), "mangel-zuordnen-ziel", { id });
  fensterInhalt.querySelector(".knopfreihe").insertAdjacentHTML("afterbegin", bedarfsArten().map(a =>
    '<button type="button" data-action="mangel-auftrag-neu" data-id="' + esc(id) + '" data-art="' + esc(a.id) + '">Neu: ' + esc(a.name) + '</button>').join(""));
}
// Neuer Auftrag ohne Fälligkeit (z. B. Reparatur) mit diesem Mangel
function mangelAuftragNeu(id, artId) {
  const a = mangelZuAuftrag("anlegen:" + artId, id);
  if (!a) return;
  if (speichern()) { zeichnen(); auftragAnsicht(a.id); meldung(artName(artId) + " angelegt"); }
}
function aufgabeZuordnenWahl(id) {
  const lage = werkstattLage();
  const x = lage.aufgabeVon(id);
  zielAuswahl("Aufgabe zuordnen", "„" + esc(x.art.name) + "“ in welchen Auftrag?", lage.offene.filter(o => !(x.offen === o && !x.berechnet)), "aufgabe-zuordnen-ziel", { id });
}

function mangelFormular(id) {
  const m = id ? daten.maengel.find(m => m.id === id) : { datum: heute(), beschreibung: "", status: "offen", erledigtAm: null };
  fensterOeffnen(
    '<h2>' + (id ? "Mangel bearbeiten" : "Mangel erfassen") + '</h2>' +
    '<label for="m-datum">Festgestellt am</label><input type="date" id="m-datum" value="' + m.datum + '">' +
    '<label for="m-text">Beschreibung</label><textarea id="m-text" placeholder="z. B. Vorderbremse quietscht">' + esc(m.beschreibung) + '</textarea>' +
    '<label for="m-status">Status</label><select id="m-status" data-change="mangel-status">' +
    '<option value="offen"' + (m.status === "offen" ? " selected" : "") + '>offen</option>' +
    '<option value="erledigt"' + (m.status === "erledigt" ? " selected" : "") + '>erledigt</option></select>' +
    '<div id="m-erledigt-feld"' + (m.status === "erledigt" ? "" : " hidden") + '>' +
    '<label for="m-am">Erledigt am</label><input type="date" id="m-am" value="' + (m.erledigtAm || heute()) + '">' +
    '<div class="feldhinweis">Ein Mangel, der in einem geplanten Auftrag steht, wird dort entfernt. Wird ein mit einem Auftrag erledigter Mangel wieder ' +
    'geöffnet, steht er dort als „nicht gemacht“.</div>' +
    '</div>' +
    '<div class="knopfreihe">' +
    (id ? '<button type="button" data-action="mangel-ansehen" data-id="' + id + '">Abbrechen</button>'
        : '<button type="button" data-action="fenster-zu">Abbrechen</button>') +
    '<button type="button" class="primaer" data-action="mangel-speichern" data-id="' + (id || "") + '">Speichern</button></div>' +
    (id ? '<div class="knopfreihe"><button type="button" class="gefahr voll" data-action="mangel-loeschen" data-id="' + id + '">Mangel löschen</button></div>' : "")
  );
}
function mangelStatusGeaendert() {
  document.getElementById("m-erledigt-feld").hidden = wert("m-status") !== "erledigt";
}
function mangelSpeichern(id) {
  const datum = wert("m-datum");
  const beschreibung = wert("m-text").trim();
  const status = wert("m-status");
  if (!istGueltigesDatum(datum)) { alert("Bitte ein gültiges Datum wählen."); return; }
  if (!beschreibung) { alert("Bitte den Mangel beschreiben."); return; }
  let erledigtAm = null;
  if (status === "erledigt") {
    erledigtAm = wert("m-am");
    if (!istGueltigesDatum(erledigtAm)) { alert("Bitte ein gültiges Erledigt-Datum wählen."); return; }
  }
  const m = id ? daten.maengel.find(m => m.id === id) : null;
  if (m) {
    Object.assign(m, { datum, beschreibung, status, erledigtAm });
    daten.auftraege.forEach(a => {
      // Von Hand erledigt: aus geplanten Aufträgen entfernen; wieder geöffnet: dort „nicht gemacht“
      if (status === "erledigt" && a.status === "geplant") a.positionen = a.positionen.filter(p => !(p.art === "mangel" && p.mangelId === id));
      if (status === "offen" && a.status === "erledigt") a.positionen.forEach(p => { if (p.art === "mangel" && p.mangelId === id) p.status = "nicht-gemacht"; });
    });
  } else {
    daten.maengel.push({ id: neueId(), datum, beschreibung, status, erledigtAm });
  }
  if (speichern()) { fensterSchliessen(); zeichnen(); meldung("Mangel gespeichert"); }
}
async function mangelLoeschen(id) {
  const m = daten.maengel.find(m => m.id === id);
  if (!m) return;
  const in_ = daten.auftraege.filter(a => a.positionen.some(p => p.art === "mangel" && p.mangelId === id));
  if (!await frage("Mangel „" + esc(m.beschreibung) + "“ wirklich löschen?" +
    (in_.length ? "<br><br>Er wird auch aus " + (in_.length === 1 ? "dem Auftrag" : "den " + in_.length + " Aufträgen") + " entfernt." : ""), "Löschen", "Abbrechen", true)) return;
  mitRueckgaengig(() => {
    daten.maengel = daten.maengel.filter(x => x.id !== id);
    daten.auftraege.forEach(a => { a.positionen = a.positionen.filter(p => !(p.art === "mangel" && p.mangelId === id)); });
  }, "Mangel gelöscht");
}

// ---------- Wartungsarten ----------

// Wird eine Wartungsart verwendet (Aufträge, Positionen, Standard-Zuordnung)? Text oder null
function artVerwendung(id) {
  if (daten.auftraege.some(a => a.wartungsartId === id)) return "in Aufträgen verwendet";
  if (daten.auftraege.some(a => a.positionen.some(p => p.art === "aufgabe" && p.wartungsartId === id))) return "als Position in Aufträgen verwendet";
  return null;
}
// Bisher verwendete Bauteile (Auswahlliste)
function bauteile() {
  return [...new Set(daten.wartungsarten.map(a => a.bauteil).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
}
// Nach dem Speichern einer Wartungsart zurück zum Prüfbildschirm?
let artAusPruefung = false;

function artFormular(id, ausPruefung = false) {
  artAusPruefung = ausPruefung;
  const a = id ? daten.wartungsarten.find(a => a.id === id)
    : { name: "", typ: "aufgabe", intervallMonate: null, intervallKm: null, fensterVon: null, fensterBis: null, gueltigAbJahr: null, einmalig: false,
      bauteil: null, zuordnung: NAECHSTE_INSPEKTION };
  const verwendet = id ? artVerwendung(id) : null;
  const monatsAuswahl = (feld, wert) => '<select id="' + feld + '" data-change="art-fenster"><option value="">– kein Zeitfenster –</option>' +
    MONATE.map((n, i) => '<option value="' + (i + 1) + '"' + (wert === i + 1 ? " selected" : "") + '>' + n + '</option>').join("") + '</select>';
  const zuordnungen = [[NAECHSTE_INSPEKTION, "nächste Inspektion"]].concat(auftragsArten().filter(x => x.id !== id).map(x => [x.id, x.name]));
  fensterOeffnen(
    '<h2>' + (id ? "Wartungsart bearbeiten" : "Neue Wartungsart") + '</h2>' +
    '<label for="a-name">Name</label><input type="text" id="a-name" value="' + esc(a.name) + '">' +
    '<label for="a-typ">Art</label><select id="a-typ" data-change="art-typ"' + (verwendet ? " disabled" : "") + '>' +
    '<option value="auftrag"' + (a.typ === "auftrag" ? " selected" : "") + '>Auftrag (z. B. Inspektion, Reparatur; mit Termin)</option>' +
    '<option value="aufgabe"' + (a.typ === "aufgabe" ? " selected" : "") + '>Aufgabe (z. B. Bremsbeläge wechseln; Position in einem Auftrag)</option></select>' +
    (verwendet ? '<div class="feldhinweis">Die Art lässt sich nicht mehr ändern, weil die Wartungsart ' + verwendet + ' wird.</div>' : "") +
    '<div id="a-auftrag-feld"' + (a.typ === "auftrag" ? "" : " hidden") + '>' +
    '<label class="haken"><input type="checkbox" id="a-einmalig"' + (a.einmalig ? " checked" : "") + '>' +
    '<span>Einmalig (z. B. Erstinspektion)<br><span class="klein">Nach der ersten Erledigung erledigt. Nicht mit Zeitfenster möglich.</span></span></label>' +
    '<label for="a-von">Jährliches Zeitfenster: Monat von (optional)</label>' + monatsAuswahl("a-von", a.fensterVon) +
    '<label for="a-bis">Monat bis</label>' + monatsAuswahl("a-bis", a.fensterBis) +
    '<div id="a-fenster-feld"' + (a.fensterVon ? "" : " hidden") + '>' +
    '<label for="a-ab">Gültig ab Jahr (optional)</label>' +
    '<input type="text" id="a-ab" inputmode="numeric" placeholder="z. B. 2027" value="' + (a.gueltigAbJahr ?? "") + '">' +
    '<div class="feldhinweis">Vor diesem Jahr wird keine Fälligkeit angezeigt. Leer = sofort gültig.</div></div></div>' +
    '<label for="a-monate">Intervall in Monaten (optional)</label>' +
    '<input type="text" id="a-monate" inputmode="numeric" value="' + (a.intervallMonate ?? "") + '">' +
    '<label for="a-km">Intervall in km (optional)</label>' +
    '<input type="text" id="a-km" inputmode="decimal" value="' + kmFeld(a.intervallKm) + '">' +
    '<div class="feldhinweis">Fällig ist, was zuerst erreicht wird: Monate oder km. Ohne bisherige Erledigung zählt ab Startdatum und ' +
    'Start-Kilometerstand. Mit Zeitfenster gilt das Fenster; die Monate werden dann nicht ausgewertet, die km nur als Hinweis. ' +
    'Ein Auftrag ohne Intervall und Zeitfenster (z. B. Reparatur) wird bei Bedarf angelegt.</div>' +
    '<div id="a-aufgabe-feld"' + (a.typ === "aufgabe" ? "" : " hidden") + '>' +
    '<label for="a-bauteil">Bauteil (optional)</label><input type="text" id="a-bauteil" list="a-bauteile" autocomplete="off" placeholder="z. B. Bremse vorn" value="' + esc(a.bauteil || "") + '">' +
    '<datalist id="a-bauteile">' + bauteile().map(b => '<option value="' + esc(b) + '">').join("") + '</datalist>' +
    '<label for="a-zuordnung">Standard-Zuordnung</label><select id="a-zuordnung">' +
    zuordnungen.map(([v, n]) => '<option value="' + esc(v) + '"' + (a.zuordnung === v ? " selected" : "") + '>' + esc(n) + '</option>').join("") + '</select>' +
    '<div class="feldhinweis">Die Aufgabe kommt automatisch in diesen Auftrag, wenn sie bis zu seinem Termin bzw. bis zum Ende seines Zeitfensters ' +
    'fällig wird. „Nächste Inspektion“ = der nächste offene Auftrag mit Intervall, Zeitfenster oder einmalig.</div></div>' +
    '<div class="knopfreihe"><button type="button" data-action="' + (ausPruefung ? "pruefung-oeffnen" : "fenster-zu") + '">Abbrechen</button>' +
    '<button type="button" class="primaer" data-action="art-speichern" data-id="' + esc(id || "") + '">Speichern</button></div>' +
    (id ? '<div class="knopfreihe"><button type="button" class="gefahr voll" data-action="art-loeschen" data-id="' + esc(id) + '">Wartungsart löschen</button></div>' : "")
  );
}
function artFensterGeaendert() {
  document.getElementById("a-fenster-feld").hidden = !(wert("a-von") || wert("a-bis"));
}
function artTypGeaendert() {
  const typ = wert("a-typ");
  document.getElementById("a-auftrag-feld").hidden = typ !== "auftrag";
  document.getElementById("a-aufgabe-feld").hidden = typ !== "aufgabe";
}
function artSpeichern(id) {
  const name = wert("a-name").trim();
  if (!name) { alert("Bitte einen Namen eingeben."); return; }
  const typ = wert("a-typ");
  const aufgabe = typ === "aufgabe";
  const von = !aufgabe && wert("a-von") ? Number(wert("a-von")) : null;
  const bis = !aufgabe && wert("a-bis") ? Number(wert("a-bis")) : null;
  const einmalig = !aufgabe && document.getElementById("a-einmalig").checked;
  if ((von === null) !== (bis === null)) { alert("Für das Zeitfenster bitte beide Monate wählen (oder beide leer lassen)."); return; }
  if (einmalig && von !== null) { alert("Eine einmalige Wartung kann kein jährliches Zeitfenster haben. Bitte das Zeitfenster leeren oder „Einmalig“ abwählen."); return; }
  if (von !== null && von > bis) { alert("Das Zeitfenster darf nicht über den Jahreswechsel gehen: „Monat von“ muss vor oder gleich „Monat bis“ sein."); return; }
  let ab = null;
  if (von !== null) {
    const abText = wert("a-ab").trim();
    ab = abText === "" ? null : Number(abText);
    if (ab !== null && !(Number.isInteger(ab) && ab >= 1900 && ab <= 9999)) { alert("„Gültig ab Jahr“ muss eine Jahreszahl sein, z. B. 2027 (oder leer)."); return; }
  }
  const mText = wert("a-monate").trim();
  const monate = mText === "" ? null : Number(mText);
  if (monate !== null && !(Number.isInteger(monate) && monate >= 1)) { alert("Das Intervall in Monaten muss eine ganze Zahl ab 1 sein (oder leer)."); return; }
  const kText = wert("a-km").trim();
  const km = kText === "" ? null : kmLesen(kText);
  if (kText !== "" && !(km > 0)) { alert("Das Intervall in km muss eine Zahl größer 0 sein (oder leer)."); return; }
  const vorher = id ? daten.wartungsarten.find(a => a.id === id) : null;
  if (vorher && vorher.typ !== typ) {
    const verwendet = artVerwendung(id);
    if (verwendet) { alert("Die Art lässt sich nicht ändern, weil die Wartungsart " + verwendet + " wird."); return; }
    const ziele = daten.wartungsarten.filter(a => a.zuordnung === id);
    if (ziele.length) {
      alert("Die Art lässt sich nicht ändern, weil „" + name + "“ Standard-Zuordnung dieser Aufgaben ist: " + ziele.map(a => a.name).join(", ") + ". Bitte dort zuerst eine andere Zuordnung wählen.");
      return;
    }
  }
  const satz = { name, typ, intervallMonate: monate, intervallKm: km, fensterVon: von, fensterBis: bis, gueltigAbJahr: ab, einmalig,
    bauteil: aufgabe ? wert("a-bauteil").trim() || null : null, zuordnung: aufgabe ? wert("a-zuordnung") : null };
  // Ein Auftrag mit Fälligkeit hat höchstens einen geplanten Auftrag
  if (vorher && hatFaelligkeit(satz) && daten.auftraege.filter(a => a.status === "geplant" && a.wartungsartId === id).length > 1) {
    alert("Es gibt mehrere geplante Aufträge dieser Art. Ein Intervall, Zeitfenster oder „einmalig“ ist erst möglich, wenn höchstens einer geplant ist.");
    return;
  }
  if (vorher) {
    Object.assign(vorher, satz);
    if (!aufgabe) daten.auftraege.forEach(a => { a.ausgeschlossen = a.ausgeschlossen.filter(x => x !== id); });
  } else {
    daten.wartungsarten.push(Object.assign({ id: neueId() }, satz));
  }
  if (!speichern()) return;
  zeichnen();
  if (artAusPruefung) pruefungAnsicht(); else fensterSchliessen();
}
async function artLoeschen(id) {
  const verwendet = artVerwendung(id);
  if (verwendet) {
    alert("Diese Wartungsart wird " + verwendet + " und kann deshalb nicht gelöscht werden. Du kannst sie aber umbenennen.");
    return;
  }
  const ziele = daten.wartungsarten.filter(a => a.zuordnung === id);
  if (!await frage("Wartungsart „" + esc(artName(id)) + "“ wirklich löschen?" +
    (ziele.length ? "<br><br>Diese Aufgaben bekommen die Standard-Zuordnung „nächste Inspektion“: " + ziele.map(a => esc(a.name)).join(", ") : ""),
    "Löschen", "Abbrechen", true)) return;
  daten.wartungsarten = daten.wartungsarten.filter(a => a.id !== id);
  ziele.forEach(a => { a.zuordnung = NAECHSTE_INSPEKTION; });
  daten.auftraege.forEach(a => { a.ausgeschlossen = a.ausgeschlossen.filter(x => x !== id); });
  if (speichern()) { zeichnen(); if (artAusPruefung) pruefungAnsicht(); else fensterSchliessen(); }
}

// ---------- Prüfbildschirm nach der Umwandlung auf Version 8 ----------
function pruefungAnsicht() {
  artAusPruefung = false;
  const zeile = a => '<div class="zeile"><button type="button" class="inhalt" data-action="pruefung-art" data-id="' + esc(a.id) + '">' +
    '<div class="text"><div><strong>' + esc(a.name) + '</strong> · ' + (a.typ === "auftrag" ? "Auftrag" : "Aufgabe") + '</div>' +
    '<div class="klein umbrechen">' + esc(artRegelText(a)) + '</div></div>' +
    '<span class="klein" style="padding-right:16px">›</span></button></div>';
  fensterOeffnen(
    '<h2>Bitte Wartungsarten prüfen</h2>' +
    '<p>Mit dem Update sind Inspektionen und Reparaturen <strong>Aufträge</strong> mit Termin, die übrigen Wartungsarten <strong>Aufgaben</strong>, ' +
    'die als Positionen in einem Auftrag erledigt werden. Eingeteilt hat die App nach Zeitfenster, „einmalig“ und Namen. ' +
    'Bitte prüfe Art, Intervall, Bauteil und Standard-Zuordnung; Antippen öffnet das Formular.</p>' +
    '<div class="liste">' + daten.wartungsarten.map(zeile).join("") + '</div>' +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Später</button>' +
    '<button type="button" class="primaer" data-action="pruefung-fertig">Alles geprüft</button></div>'
  );
}
function pruefungFertig() {
  pruefungVormerken(false);
  fensterSchliessen();
  zeichnen();
  meldung("Wartungsarten geprüft");
}
