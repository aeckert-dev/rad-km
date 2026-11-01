// Rad-km · Datenmodell: Standardwerte, Laden, Prüfen, Umwandeln (MIGRATIONEN), Speichern
"use strict";

/* =====================================================================
   3. DATENMODELL: Laden, Prüfen, Umwandeln, Speichern
   ===================================================================== */

// Die Standard-Wartungsarten bei einer Neuinstallation (ab Version 8): Aufträge,
// keine Aufgaben (die sind je Fahrrad zu verschieden).
function standardWartungsarten() {
  const auftrag = (id, name, intervallMonate, intervallKm, von, bis, einmalig = false) => ({
    id, name, typ: "auftrag", intervallMonate, intervallKm, fensterVon: von, fensterBis: bis, gueltigAbJahr: null, einmalig, bauteil: null, zuordnung: null
  });
  return [
    auftrag("erstinspektion", "Erstinspektion", 3, 300, null, null, true),
    auftrag("kleine-inspektion", "Kleine Inspektion", null, null, 3, 4),
    auftrag("grosse-inspektion", "Große Inspektion", 12, null, 10, 11),
    auftrag("reparatur", "Reparatur", null, null, null, null),
    auftrag("eigenleistung", "Eigenleistung", null, null, null, null)
  ];
}
// Die Standard-Wartungsarten bis Version 7: mit jährlichem Zeitfenster
// (mitFenster), ohne für die Umwandlung von Version-1-Daten.
function wartungsartenVersion7(mitFenster = true) {
  const art = (id, name, intervallMonate, von, bis) => ({
    id, name, intervallMonate, intervallKm: null,
    fensterVon: mitFenster ? von : null, fensterBis: mitFenster ? bis : null, gueltigAbJahr: null, einmalig: false
  });
  return [
    art("grosse-inspektion", "Große Inspektion", 12, 10, 11),
    art("kleine-inspektion", "Kleine Inspektion", null, 3, 4),
    art("reparatur", "Reparatur", null, null, null)
  ];
}
function standardEinstellungen() {
  return { fahrtage: [...STANDARD_FAHRTAGE], jahresziele: [], hinweisHeuteAn: true, hinweisHeuteAb: STANDARD_HINWEIS_HEUTE_AB, wetter: standardWetter() };
}
// Grenzen der Ampel je Fahrt (Vorschlagswerte)
function standardAmpel() {
  return { rotBoeen: 60, rotStarkregen: 5, rotWarnstufe: 2, gelbRegenWahrscheinlichkeit: 50, gelbNiederschlag: 0.5,
    gelbBoeen: 40, gelbTemperatur: 0, glaetteTemperatur: 1 };
}
// Kleidung je Körperbereich ("" = nichts), aus einem Objekt mit beliebigen Bereichen
function bereicheAus(b = {}) {
  return Object.fromEntries(BEREICH_SCHLUESSEL.map(k => [k, b[k] || ""]));
}
// Kleidung nach gefühlter Temperatur, von warm nach kalt, je Körperbereich. Eine
// Stufe gilt ab ihrer Untergrenze "ab"; die letzte Stufe gilt darunter.
// "haendeBeiRegen" ersetzt die Hände, sobald ein Regenzusatz greift. Der
// Regenzusatz kommt ab der Regenwahrscheinlichkeit "ab" in seinen Bereichen dazu.
// "rueckmeldung": Rückmeldung zur Kleidung nach der Fahrt anbieten.
function standardKleidung() {
  const b = (kopf, hals, haende, oberkoerper, beine, fuesse) => ({ kopf, hals, haende, oberkoerper, beine, fuesse });
  const stufe = (id, ab, bereiche, haendeBeiRegen = null) => ({ id, ab, bereiche, haendeBeiRegen });
  return {
    stufen: [
      stufe("stufe1", 20, b("", "", "", "T-Shirt", "kurze Hose", "Sneakersocken")),
      stufe("stufe2", 15, b("", "", "", "T-Shirt, leichter Pullover", "Hose", "Sneakersocken")),
      stufe("stufe3", 11, b("", "", "", "T-Shirt, warmer Pullover", "Hose", "Socken")),
      stufe("stufe4", 7, b("leichte Mütze", "", "Unterziehhandschuhe", "2 T-Shirts, warmer Pullover", "Hose", "Socken"), "Übergangshandschuhe"),
      stufe("stufe5", 3, b("mittlere Mütze", "Schal", "Übergangshandschuhe", "T-Shirt, leichter Pullover, warmer Pullover", "Hose", "Socken")),
      stufe("stufe6", -1, b("warme Mütze", "Schal", "Unterziehhandschuhe, Übergangshandschuhe", "T-Shirt, leichter Pullover, Regenjacke als Windschutz", "Hose", "Socken")),
      stufe("stufe7", -6, b("warme Mütze, leichte Mütze", "Schal, Tuch", "Winterhandschuhe", "2 T-Shirts, warmer Pullover, Regenjacke als Windschutz",
        "Hose, Regenhose als Windschutz", "Socken, Gamaschen")),
      stufe("stufe8", null, b("warme Mütze, mittlere Mütze", "Schal, Tuch", "Unterziehhandschuhe, Winterhandschuhe",
        "2 T-Shirts, leichter Pullover, warmer Pullover, Regenjacke als Windschutz", "lange Unterhose, Hose, Regenhose als Windschutz", "2 Paar Socken, Gamaschen"))
    ],
    regen: [{ ab: 40, bereiche: b("", "", "", "Regenjacke", "", "") }, { ab: 60, bereiche: b("", "", "", "", "Regenhose", "Gamaschen") }],
    rueckmeldung: true
  };
}
// Die Standard-Kleidungsstufen aus Version 5 (Release 4b; für die Umwandlung auf Version 6)
const KLEIDUNG_VERSION_5 = {
  stufen: [
    { id: "kurz", ab: 20, korrektur: 0, text: "kurz (T-Shirt, kurze Hose)" },
    { id: "duenn", ab: 15, korrektur: 0, text: "lange Hose, Langarmshirt, dünne Jacke" },
    { id: "jacke", ab: 11, korrektur: 0, text: "Jacke, lange Hose, leichter Pullover" },
    { id: "kuehl", ab: 7, korrektur: 0, text: "Jacke, leichter Pullover, dünne Handschuhe, kleiner Schal" },
    { id: "kalt", ab: 3, korrektur: 0, text: "Jacke, leichter und warmer Pullover, Mütze, kleiner Schal, warme Handschuhe" },
    { id: "frost", ab: -2, korrektur: 0, text: "Thermojacke, warmer Pullover, Mütze, Schal, Winterhandschuhe" },
    { id: "eis", ab: null, korrektur: 0, text: "Thermojacke, warmer Pullover, Mütze, Schal, Winterhandschuhe, Überschuhe, lange Unterhose" }
  ],
  regen: [{ ab: 40, text: "Regenjacke" }, { ab: 60, text: "Regenhose" }]
};
// Die Standard-Kleidungsstufen aus Version 4 (für die Umwandlung auf Version 5)
const KLEIDUNG_VERSION_4 = {
  stufen: [
    { id: "kurz", ab: 18, korrektur: 0, text: "kurz" }, { id: "duenn", ab: 12, korrektur: 0, text: "lange dünne Kleidung" },
    { id: "jacke", ab: 6, korrektur: 0, text: "Jacke, lange Hose" }, { id: "kalt", ab: 0, korrektur: 0, text: "Handschuhe, Stirnband, Thermojacke" },
    { id: "frost", ab: null, korrektur: 0, text: "Winterhandschuhe, Mütze, Überschuhe" }
  ],
  regen: [{ ab: 40, text: "Regenjacke" }, { ab: 60, text: "Regenhose" }]
};
// Wetter: Orte, Wegpunkte (Wohnort → Arbeitsort) und je Teilstrecke, ob sie
// für den Wind zählt, Ort für das Wetter außerhalb der Fahrten, Fahrzeiten
// (Zeitraum, Schalter und Uhrzeit der üblichen Abfahrt, Dauer in Minuten), Ampel, Kleidung
function standardWetter() {
  const v4 = wetterVersion4();
  return {
    wohnort: null, arbeitsort: null, weitererOrt: null, wegpunkte: [], windTeilstrecken: [true], ortAusserhalb: "wohnort",
    hinfahrt: fahrzeitMitSchalter(v4.hinfahrt, true), rueckfahrt: fahrzeitMitSchalter(v4.rueckfahrt, true), ampel: v4.ampel, kleidung: standardKleidung()
  };
}
// Fahrzeit ab Version 7: { von, bis, abfahrtAn, abfahrt, dauer }; abfahrt ist immer eine Uhrzeit
function fahrzeitMitSchalter(f, abfahrtAn, abfahrt = f.abfahrt) {
  return { von: f.von, bis: f.bis, abfahrtAn, abfahrt, dauer: f.dauer };
}
// Übliche Abfahrt einer Fahrzeit oder null, wenn der Schalter aus ist
function ueblicheAbfahrt(f) { return f.abfahrtAn ? f.abfahrt : null; }
// Wetter-Einstellungen, wie die Umwandlung 3 → 4 sie anlegt (Aufbau von Version 4)
function wetterVersion4() {
  return {
    wohnort: null, arbeitsort: null, weitererOrt: null,
    hinfahrt: { von: "06:00", bis: "07:00", abfahrt: "06:00", dauer: 60 },
    rueckfahrt: { von: "16:00", bis: "17:00", abfahrt: "16:00", dauer: 60 },
    ampel: standardAmpel(),
    kleidung: JSON.parse(JSON.stringify(KLEIDUNG_VERSION_4))
  };
}
function leereDaten() {
  return {
    version: DATEN_VERSION,
    fahrrad: null,
    einstellungen: standardEinstellungen(),
    vorlagen: [],
    eintraege: [],
    wartungsarten: standardWartungsarten(),
    auftraege: [],
    maengel: []
  };
}

// Ergänzt in jedem Objekt einer Liste fehlende Felder; vorhandene bleiben unverändert
function felderErgaenzen(liste, felder) {
  return Array.isArray(liste)
    ? liste.map(x => x && typeof x === "object" && !Array.isArray(x) ? Object.assign({}, felder, x) : x)
    : liste;
}

// Umwandlungen für ältere Datenversionen. Jede Funktion hebt die Daten um
// genau eine Version an und lässt alle vorhandenen Angaben unverändert.
const MIGRATIONEN = {
  // Version 1 → 2: Rahmennummer und Beschreibung beim Fahrrad, Zeitfenster
  // bei den Wartungsarten (bleiben leer), neue Mängelliste.
  1: alt => {
    const d = Object.assign({}, alt, { version: 2 });
    if (d.fahrrad && typeof d.fahrrad === "object") {
      d.fahrrad = Object.assign({ rahmennummer: "", beschreibung: "" }, d.fahrrad);
    }
    // In Version 1 bedeutete eine fehlende Liste: die Standard-Wartungsarten (ohne Zeitfenster)
    const arten = d.wartungsarten === undefined ? wartungsartenVersion7(false) : d.wartungsarten;
    d.wartungsarten = Array.isArray(arten)
      ? arten.map(a => a && typeof a === "object" ? Object.assign({ fensterVon: null, fensterBis: null, gueltigAbJahr: null }, a) : a)
      : arten;
    if (d.maengel === undefined) d.maengel = [];
    return d;
  },
  // Version 2 → 3: Einstellungen (Fahrtage, Jahresziele), Merkmal "Arbeitsweg"
  // bei Vorlagen und Einträgen, "einmalig" bei Wartungsarten – alle aus.
  2: alt => {
    const d = Object.assign({}, alt, { version: 3 });
    if (d.einstellungen === undefined) d.einstellungen = { fahrtage: [...STANDARD_FAHRTAGE], jahresziele: [] };
    d.vorlagen = felderErgaenzen(d.vorlagen, { arbeitsweg: false });
    d.eintraege = felderErgaenzen(d.eintraege, { arbeitsweg: false });
    d.wartungsarten = felderErgaenzen(d.wartungsarten, { einmalig: false });
    return d;
  },
  // Version 3 → 4: Wetter in den Einstellungen (noch ohne Orte, Fahrzeiten,
  // Ampel- und Kleidungsregeln mit Standardwerten), Wetter je Eintrag (leer).
  // (Jede Umwandlung legt die Standardwerte ihrer Zielversion an, nicht die aktuellen.)
  3: alt => {
    const d = Object.assign({}, alt, { version: 4 });
    const es = d.einstellungen;
    if (es === undefined) d.einstellungen = { fahrtage: [...STANDARD_FAHRTAGE], jahresziele: [], wetter: wetterVersion4() };
    else if (es && typeof es === "object" && !Array.isArray(es) && es.wetter === undefined) d.einstellungen = Object.assign({}, es, { wetter: wetterVersion4() });
    d.eintraege = felderErgaenzen(d.eintraege, { wetter: null });
    return d;
  },
  // Version 4 → 5: Uhrzeit für den Hinweis auf einen fehlenden Eintrag am selben
  // Tag (18:00). Die Kleidungsstufen waren in Version 4 nicht änderbar; sind es
  // noch genau die alten Standardwerte, kommen die neuen. Alles andere bleibt.
  4: alt => {
    const d = Object.assign({}, alt, { version: 5 });
    if (istObjekt(d.einstellungen)) {
      const es = Object.assign({}, d.einstellungen);
      if (es.hinweisHeuteAb === undefined) es.hinweisHeuteAb = STANDARD_HINWEIS_HEUTE_AB;
      if (istObjekt(es.wetter) && gleicherInhalt(es.wetter.kleidung, KLEIDUNG_VERSION_4)) es.wetter = Object.assign({}, es.wetter, { kleidung: JSON.parse(JSON.stringify(KLEIDUNG_VERSION_5)) });
      d.einstellungen = es;
    }
    return d;
  },
  // Version 5 → 6: Kleidung nach Körperbereichen, Rückmeldung ohne Verschiebung
  // der Grenzen, Wegpunkte. Bei jeder Fahrt mit Wetter wird festgehalten, was
  // 4b empfohlen hat (Text der Stufe und Regenzusatz, im Feld Oberkörper).
  5: alt => {
    const d = Object.assign({}, alt, { version: 6 });
    const es = istObjekt(d.einstellungen) ? d.einstellungen : null;
    const w = es && istObjekt(es.wetter) ? es.wetter : null;
    const k = w && istObjekt(w.kleidung) ? w.kleidung : null;
    const stufen5 = k && Array.isArray(k.stufen) ? k.stufen : KLEIDUNG_VERSION_5.stufen;
    const regen5 = k && Array.isArray(k.regen) ? k.regen : KLEIDUNG_VERSION_5.regen;
    if (Array.isArray(d.eintraege)) d.eintraege = d.eintraege.map(e => istObjekt(e) && istObjekt(e.wetter)
      ? Object.assign({}, e, { wetter: Object.assign({}, e.wetter, { hin: fahrtAusVersion5(e.wetter.hin, stufen5, regen5), rueck: fahrtAusVersion5(e.wetter.rueck, stufen5, regen5) }) })
      : e);
    if (w) {
      const neu = Object.assign({}, w);
      if (neu.wegpunkte === undefined) neu.wegpunkte = [];
      if (neu.windTeilstrecken === undefined) neu.windTeilstrecken = [true];
      if (k) neu.kleidung = kleidungAusVersion5(k);
      d.einstellungen = Object.assign({}, es, { wetter: neu });
    }
    return d;
  },
  // Version 6 → 7: Schalter für den Hinweis am selben Tag und für die übliche
  // Abfahrt (die Uhrzeitfelder lassen sich auf dem iPhone nicht leeren), Ort für
  // das Wetter außerhalb der Fahrten (Wohnort). Eine Uhrzeit bedeutet "an", null
  // "aus" mit einer Uhrzeit zum späteren Einschalten (18:00 bzw. Beginn der Fahrzeit).
  6: alt => {
    const d = Object.assign({}, alt, { version: 7 });
    if (!istObjekt(d.einstellungen)) return d;
    const es = Object.assign({}, d.einstellungen);
    if (es.hinweisHeuteAn === undefined) {
      if (es.hinweisHeuteAb === null) Object.assign(es, { hinweisHeuteAn: false, hinweisHeuteAb: STANDARD_HINWEIS_HEUTE_AB });
      else es.hinweisHeuteAn = true;
    }
    if (istObjekt(es.wetter)) {
      const w = Object.assign({}, es.wetter);
      if (w.ortAusserhalb === undefined) w.ortAusserhalb = "wohnort";
      ["hinfahrt", "rueckfahrt"].forEach(art => {
        const f = w[art];
        if (!istObjekt(f) || f.abfahrtAn !== undefined) return;
        const aus = f.abfahrt === null || f.abfahrt === "";
        w[art] = Object.assign({}, f, aus ? { abfahrtAn: false, abfahrt: f.von !== undefined ? f.von : wetterVersion4()[art].von } : { abfahrtAn: true });
      });
      es.wetter = w;
    }
    d.einstellungen = es;
    return d;
  },
  // Version 7 → 8: Werkstatt. Wartungsarten werden Aufträge oder Aufgaben,
  // Protokoll und Termine werden Aufträge mit Positionen (siehe wartungAusVersion7).
  7: alt => {
    const d = Object.assign({}, alt, { version: 8 }, wartungAusVersion7(alt));
    delete d.wartungsprotokoll;
    delete d.termine;
    return d;
  },
  // Version 8 → 9: optionale Uhrzeit am Termin eines geplanten Auftrags
  // (terminZeit, bei allen vorhandenen Aufträgen leer = ganztägig)
  8: alt => {
    const d = Object.assign({}, alt, { version: 9 });
    if (Array.isArray(alt.auftraege)) d.auftraege = alt.auftraege.map(a => istObjekt(a) ? Object.assign({}, a, { terminZeit: null }) : a);
    return d;
  }
};

// Ist eine Wartungsart aus Version 7 ein Auftrag? Mit Zeitfenster, einmalig oder
// mit „Inspektion“, „Reparatur“ bzw. „Eigenleistung“ im Namen; sonst eine Aufgabe.
function istAuftragVersion7(a) {
  return (a.fensterVon ?? null) !== null || a.einmalig === true || /inspektion|reparatur|eigenleistung/i.test(typeof a.name === "string" ? a.name : "");
}
// Hat eine Wartungsart eine Fälligkeit (Intervall, Zeitfenster oder einmalig)?
function hatFaelligkeit(a) {
  return (a.fensterVon ?? null) !== null || !!a.intervallMonate || !!a.intervallKm || a.einmalig === true;
}

// Umwandlung der Wartung aus Version 7. Alle Kennungen werden aus den alten
// abgeleitet, damit eine umgewandelte Sicherung gleich bleibt.
//   - Wartungsarten: Auftrag oder Aufgabe (istAuftragVersion7). Aufgaben bekommen
//     kein Bauteil und die Standard-Zuordnung „nächste Inspektion“. Fehlen
//     „Reparatur“ oder „Eigenleistung“ (Aufträge ohne Fälligkeit), kommen sie dazu.
//   - Protokoll eines Auftrags → erledigter Auftrag (id des Protokolleintrags).
//   - Protokoll einer Aufgabe → erledigte Position im erledigten Auftrag vom
//     selben Datum, sonst in einer erledigten Reparatur dieses Datums. Damit die
//     Fälligkeit gleich bleibt, nur bei gleichem Kilometerstand (beide berechnet
//     oder beide gleich von Hand eingetragen); sonst eine eigene Reparatur. Eine
//     abweichende Werkstatt steht in der Notiz der Position.
//   - Mängel mit protokollId → erledigte Position im daraus entstandenen Auftrag.
//   - Termin eines Auftrags → geplanter Auftrag. Termin einer Aufgabe → Position
//     im geplanten Inspektions-Auftrag mit demselben Termin, sonst in einem neuen
//     geplanten Auftrag der Inspektion, in deren Zeitfenster der Termin liegt,
//     sonst in einer geplanten Reparatur mit diesem Termin.
function wartungAusVersion7(alt) {
  const fehler = msg => { throw new Error(msg); };
  const liste = (v, name) => {
    if (v === undefined) return [];
    if (!Array.isArray(v)) fehler("„" + name + "“ muss eine Liste sein.");
    return v.map((x, i) => istObjekt(x) ? x : fehler("„" + name + "“ Nr. " + (i + 1) + " ist kein Objekt."));
  };
  const arten7 = alt.wartungsarten === undefined ? wartungsartenVersion7(true) : alt.wartungsarten;
  if (!Array.isArray(arten7)) return { wartungsarten: arten7, auftraege: [] }; // meldet die Prüfung
  const protokoll = liste(alt.wartungsprotokoll, "wartungsprotokoll");
  const termine = liste(alt.termine, "termine");
  const maengel = alt.maengel === undefined ? [] : alt.maengel;

  // Wartungsarten einordnen
  const ids = new Set(arten7.filter(istObjekt).map(a => a.id));
  const arten = arten7.map(a => {
    if (!istObjekt(a)) return a;
    return istAuftragVersion7(a)
      ? Object.assign({}, a, { typ: "auftrag", bauteil: null, zuordnung: null })
      : Object.assign({}, a, { typ: "aufgabe", bauteil: null, zuordnung: NAECHSTE_INSPEKTION });
  });
  const artVon = id => arten.find(a => istObjekt(a) && a.id === id) || null;
  const ohneFaelligkeit = (muster) => arten.find(a => istObjekt(a) && a.typ === "auftrag" && muster.test(a.name || "") && !hatFaelligkeit(a));
  const ergaenzen = (basis, name) => {
    let id = basis, n = 2;
    while (ids.has(id)) id = basis + "-" + n++;
    ids.add(id);
    const a = { id, name, typ: "auftrag", intervallMonate: null, intervallKm: null, fensterVon: null, fensterBis: null, gueltigAbJahr: null,
      einmalig: false, bauteil: null, zuordnung: null };
    arten.push(a);
    return a;
  };
  const reparatur = ohneFaelligkeit(/reparatur/i) || ergaenzen("reparatur", "Reparatur");
  if (!ohneFaelligkeit(/eigenleistung/i)) ergaenzen("eigenleistung", "Eigenleistung");
  const istInspektion = a => istObjekt(a) && a.typ === "auftrag" && hatFaelligkeit(a);

  // Mängel: fehlende Kennungen ergänzen, protokollId entfällt
  const mangelListe = Array.isArray(maengel) ? maengel.map(m => istObjekt(m) && !(typeof m.id === "string" && m.id) ? Object.assign({}, m, { id: neueId() }) : m) : maengel;

  // Protokoll prüfen (die übrigen Felder prüft die Prüfung der Aufträge)
  const protIds = new Set();
  const eintraege = protokoll.map((p, i) => {
    const wo = "Wartungsprotokoll Nr. " + (i + 1);
    if (!istGueltigesDatum(p.datum)) fehler(wo + ": Datum ist ungültig (Format JJJJ-MM-TT).");
    if (!artVon(p.wartungsartId)) fehler(wo + " (" + datumText(p.datum) + "): unbekannte wartungsartId „" + p.wartungsartId + "“.");
    const id = typeof p.id === "string" && p.id ? p.id : neueId();
    if (protIds.has(id)) fehler(wo + ": id „" + id + "“ kommt doppelt vor.");
    protIds.add(id);
    const ks = p.kmStand ?? null;
    const manuell = p.kmManuell === undefined ? ks !== null : p.kmManuell;
    return Object.assign({}, p, { id, kmStand: ks, kmManuell: manuell, art: artVon(p.wartungsartId) });
  });
  if (Array.isArray(mangelListe)) mangelListe.forEach((m, i) => {
    if (!istObjekt(m)) return;
    const pid = m.protokollId ?? null;
    if (pid !== null && !protIds.has(pid)) fehler("Mangel Nr. " + (i + 1) + (istGueltigesDatum(m.datum) ? " (" + datumText(m.datum) + ")" : "") + ": unbekannte protokollId „" + pid + "“.");
  });

  const auftraege = [];
  const neuerAuftrag = (id, art, felder) => {
    const a = Object.assign({ id, wartungsartId: art.id, status: "erledigt", termin: null, werkstatt: "", datum: null, kmStand: null, kmManuell: false,
      notiz: "", positionen: [], ausgeschlossen: [] }, felder);
    auftraege.push(a);
    return a;
  };
  // Erledigte Mängel eines Protokolleintrags als Positionen
  const maengelDazu = (auftrag, pid) => {
    if (!Array.isArray(mangelListe)) return;
    mangelListe.filter(m => istObjekt(m) && m.protokollId === pid && m.status === "erledigt")
      .forEach(m => auftrag.positionen.push({ id: "pos-" + m.id, art: "mangel", mangelId: m.id, status: "erledigt", notiz: "" }));
  };
  // Aufträge zuerst, damit Aufgaben vom selben Datum dazukommen
  const ausAuftraegen = [];
  eintraege.filter(p => p.art.typ === "auftrag").forEach(p => {
    const a = neuerAuftrag(p.id, p.art, { werkstatt: p.werkstatt, datum: p.datum, kmStand: p.kmStand, kmManuell: p.kmManuell, notiz: p.notiz });
    ausAuftraegen.push(a);
    maengelDazu(a, p.id);
  });
  const reparaturen = []; // erledigte Reparaturen aus Aufgaben
  const gleicherKm = (a, p) => a.datum === p.datum && a.kmManuell === p.kmManuell && (!p.kmManuell || a.kmStand === p.kmStand);
  eintraege.filter(p => p.art.typ === "aufgabe").forEach(p => {
    let ziel = ausAuftraegen.find(a => gleicherKm(a, p)) || reparaturen.find(a => gleicherKm(a, p)) || null;
    const zusatz = [];
    if (!ziel) {
      ziel = neuerAuftrag(p.id, reparatur, { werkstatt: p.werkstatt, datum: p.datum, kmStand: p.kmStand, kmManuell: p.kmManuell, notiz: "" });
      reparaturen.push(ziel);
    } else {
      const w = typeof p.werkstatt === "string" ? p.werkstatt.trim() : "";
      if (w && w !== (typeof ziel.werkstatt === "string" ? ziel.werkstatt.trim() : "")) zusatz.push("Werkstatt: " + w);
    }
    const notiz = typeof p.notiz === "string" ? p.notiz : "";
    ziel.positionen.push({ id: "pos-" + p.id, art: "aufgabe", wartungsartId: p.art.id, status: "erledigt",
      notiz: [notiz, ...zusatz].filter(Boolean).join("\n") });
    maengelDazu(ziel, p.id);
  });

  // Termine
  const terminArten = new Set();
  const geplante = [];
  termine.forEach((t, i) => {
    const wo = "Termin Nr. " + (i + 1);
    const art = artVon(t.wartungsartId);
    if (!art) fehler(wo + ": unbekannte wartungsartId „" + t.wartungsartId + "“.");
    if (terminArten.has(t.wartungsartId)) fehler(wo + ": pro Wartungsart ist nur ein geplanter Termin erlaubt.");
    terminArten.add(t.wartungsartId);
    if (!istGueltigesDatum(t.datum)) fehler(wo + ": Datum ist ungültig (Format JJJJ-MM-TT).");
    geplante.push({ t, art });
  });
  const geplant = (id, art, t) => neuerAuftrag(id, art, { status: "geplant", termin: t.datum, werkstatt: t.werkstatt });
  geplante.filter(x => x.art.typ === "auftrag").forEach(x => geplant("termin-" + x.art.id, x.art, x.t));
  geplante.filter(x => x.art.typ === "aufgabe").forEach(({ t, art }) => {
    const offen = auftraege.filter(a => a.status === "geplant");
    let ziel = offen.find(a => a.termin === t.datum && istInspektion(artVon(a.wartungsartId)));
    if (!ziel) {
      const jahr = Number(t.datum.slice(0, 4));
      const fenster = arten.find(a => istInspektion(a) && (a.fensterVon ?? null) !== null && Number.isInteger(a.fensterVon) && Number.isInteger(a.fensterBis) &&
        t.datum >= monatsanfang(jahr, a.fensterVon) && t.datum <= monatsende(jahr, a.fensterBis) && !offen.some(o => o.wartungsartId === a.id));
      ziel = geplant("termin-" + (fenster || art).id, fenster || reparatur, t);
    }
    ziel.positionen.push({ id: "pos-termin-" + art.id, art: "aufgabe", wartungsartId: art.id, status: "offen", notiz: "" });
  });

  // Erledigte Aufträge in der Reihenfolge des Protokolls, danach die geplanten
  const stelle = new Map(eintraege.map((p, i) => [p.id, i]));
  auftraege.sort((a, b) => (a.status === "geplant") - (b.status === "geplant") ||
    (a.status === "erledigt" ? stelle.get(a.id) - stelle.get(b.id) : 0));
  const ohneVerknuepfung = Array.isArray(mangelListe)
    ? mangelListe.map(m => { if (!istObjekt(m)) return m; const { protokollId, ...rest } = m; return rest; })
    : mangelListe;
  return { wartungsarten: arten, auftraege, maengel: ohneVerknuepfung };
}

// Kleidungsregeln aus Version 5: Sind die Stufen (ohne die Verschiebungen aus
// Rückmeldungen) noch die Standardwerte aus 4b, kommen die neuen Standardstufen;
// die Verschiebungen gehörten zur alten Kleidung und entfallen. Sonst bleibt
// jede Stufe mit ihrer id; ihr Text kommt nach Oberkörper, die Verschiebung in
// die Grenze (die wirksame Grenze bleibt gleich). Beim Regenzusatz ebenso.
function kleidungAusVersion5(k) {
  const std = standardKleidung();
  const ohneKorrektur = liste => liste.map(s => istObjekt(s) ? { id: s.id, ab: s.ab, text: s.text } : s);
  const neu = {};
  if (k.stufen !== undefined) {
    if (Array.isArray(k.stufen) && gleicherInhalt(ohneKorrektur(k.stufen), ohneKorrektur(KLEIDUNG_VERSION_5.stufen))) neu.stufen = std.stufen;
    else if (Array.isArray(k.stufen)) neu.stufen = k.stufen.map((s, i) => {
      if (!istObjekt(s)) return s;
      const korrektur = s.korrektur ?? 0;
      if (!(Number.isInteger(korrektur) && Math.abs(korrektur) <= 5)) throw new Error("Wetter, Kleidung, Stufe " + (i + 1) + ": korrektur muss eine ganze Zahl von -5 bis 5 sein.");
      return { id: s.id, ab: istEndlich(s.ab) ? s.ab + korrektur : s.ab, bereiche: { oberkoerper: s.text }, haendeBeiRegen: null };
    });
    else neu.stufen = k.stufen;
  }
  if (k.regen !== undefined) {
    if (Array.isArray(k.regen) && gleicherInhalt(k.regen, KLEIDUNG_VERSION_5.regen)) neu.regen = std.regen;
    else if (Array.isArray(k.regen)) neu.regen = k.regen.map(r => istObjekt(r) ? { ab: r.ab, bereiche: { oberkoerper: r.text } } : r);
    else neu.regen = k.regen;
  }
  neu.rueckmeldung = true;
  return neu;
}
// Eine Fahrt mit Wetter aus Version 5: empfohlene Kleidung festhalten, wie 4b
// sie angezeigt hat ("Jacke, lange Hose + Regenjacke"), und ob Regenkleidung galt
function fahrtAusVersion5(f, stufen5, regen5) {
  if (!istObjekt(f)) return f;
  const s = typeof f.kleidung === "string" ? stufen5.find(x => istObjekt(x) && x.id === f.kleidung) : null;
  const p = istEndlich(f.regenWahrscheinlichkeit) ? f.regenWahrscheinlichkeit : null;
  const regen = p === null ? [] : regen5.filter(r => istObjekt(r) && istEndlich(r.ab) && p >= r.ab && typeof r.text === "string").map(r => r.text.trim());
  const text = s && typeof s.text === "string" ? s.text.trim() + (regen.length ? " + " + regen.join(", ") : "") : null;
  return Object.assign({}, f, {
    empfehlung: f.empfehlung !== undefined ? f.empfehlung : text ? bereicheAus({ oberkoerper: text }) : null,
    regenkleidung: f.regenkleidung !== undefined ? f.regenkleidung : !!f.kleidung && regen.length > 0
  });
}

function migrieren(roh) {
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) throw new Error("Die Datei enthält keine Rad-km-Daten.");
  if (!Number.isInteger(roh.version) || roh.version < 1) throw new Error("Die Versionsnummer („version“) fehlt oder ist ungültig.");
  if (roh.version > DATEN_VERSION) throw new Error("Die Daten stammen aus einer neueren App-Version (" + roh.version + "). Bitte die App aktualisieren.");
  let d = roh;
  while (d.version < DATEN_VERSION) {
    const schritt = MIGRATIONEN[d.version];
    if (!schritt) throw new Error("Keine Umwandlung für Version " + d.version + " vorhanden.");
    d = schritt(d);
  }
  return d;
}

const istObjekt = v => !!v && typeof v === "object" && !Array.isArray(v);
const istEndlich = v => typeof v === "number" && Number.isFinite(v);

// Prüft die Wetter-Einstellungen (ab Version 4) und gibt eine bereinigte Kopie
// zurück. Fehlende Teile bekommen die Standardwerte; Koordinaten werden auf 4
// Nachkommastellen gerundet.
function wetterPruefen(w, fehler) {
  const std = standardWetter();
  if (w === undefined || w === null) return std;
  if (!istObjekt(w)) fehler("Einstellungen: „wetter“ muss ein Objekt sein.");

  const ortLesen = (o, wo) => {
    if (!istObjekt(o)) fehler(wo + ": muss ein Objekt oder null sein.");
    if (typeof o.name !== "string" || !o.name.trim()) fehler(wo + ": Name fehlt.");
    if (!(istEndlich(o.lat) && Math.abs(o.lat) <= 90)) fehler(wo + ": lat muss eine Zahl von -90 bis 90 sein.");
    if (!(istEndlich(o.lon) && Math.abs(o.lon) <= 180)) fehler(wo + ": lon muss eine Zahl von -180 bis 180 sein.");
    return { name: o.name.trim(), lat: koordinateSpeichern(o.lat), lon: koordinateSpeichern(o.lon) };
  };
  const ort = (feld, name) => {
    const o = w[feld], wo = "Wetter, " + name;
    if (o === undefined || o === null) return null;
    const erg = ortLesen(o, wo);
    if (feld === "weitererOrt") {
      if (o.aktiv !== undefined && o.aktiv !== null && typeof o.aktiv !== "boolean") fehler(wo + " (aktiv): muss true oder false sein.");
      erg.aktiv = o.aktiv === true;
    }
    return erg;
  };

  // Wegpunkte (höchstens 3, vom Wohnort zum Arbeitsort) und je Teilstrecke, ob sie für den Wind zählt
  let wegpunkte = [];
  if (w.wegpunkte !== undefined && w.wegpunkte !== null) {
    if (!Array.isArray(w.wegpunkte)) fehler("Wetter: „wegpunkte“ muss eine Liste sein.");
    if (w.wegpunkte.length > MAX_WEGPUNKTE) fehler("Wetter: Es sind höchstens " + MAX_WEGPUNKTE + " Wegpunkte möglich.");
    wegpunkte = w.wegpunkte.map((o, i) => ortLesen(o, "Wetter, Wegpunkt " + (i + 1)));
  }
  let windTeilstrecken = wegpunkte.map(() => true).concat(true);
  if (w.windTeilstrecken !== undefined && w.windTeilstrecken !== null) {
    const t = w.windTeilstrecken;
    if (!Array.isArray(t) || t.length !== wegpunkte.length + 1 || t.some(x => typeof x !== "boolean")) {
      fehler("Wetter: „windTeilstrecken“ muss eine Liste mit " + (wegpunkte.length + 1) + " Werten true oder false sein (eine Teilstrecke mehr als Wegpunkte).");
    }
    windTeilstrecken = [...t];
  }

  // Fahrzeit: fehlende Felder bekommen den Standardwert; abfahrtAn false = keine übliche Abfahrt
  const fahrt = (feld, name) => {
    const f = w[feld], s = std[feld], wo = "Wetter, " + name;
    if (f === undefined) return s;
    if (!istObjekt(f)) fehler(wo + ": muss ein Objekt sein.");
    const von = f.von === undefined ? s.von : f.von, bis = f.bis === undefined ? s.bis : f.bis;
    if (!istUhrzeit(von) || !istUhrzeit(bis)) fehler(wo + ": von und bis müssen Uhrzeiten im Format HH:MM sein.");
    if (von >= bis) fehler(wo + ": „von“ muss vor „bis“ liegen.");
    const abfahrtAn = f.abfahrtAn === undefined ? s.abfahrtAn : f.abfahrtAn;
    if (typeof abfahrtAn !== "boolean") fehler(wo + ": abfahrtAn muss true oder false sein.");
    const abfahrt = f.abfahrt === undefined ? s.abfahrt : f.abfahrt;
    if (!istUhrzeit(abfahrt)) fehler(wo + ": abfahrt muss eine Uhrzeit im Format HH:MM sein (ohne übliche Abfahrt: abfahrtAn false).");
    const dauer = f.dauer === undefined ? s.dauer : f.dauer;
    if (!(Number.isInteger(dauer) && dauer >= 5 && dauer <= 240)) fehler(wo + ": dauer muss eine ganze Zahl von 5 bis 240 (Minuten) sein.");
    return { von, bis, abfahrtAn, abfahrt, dauer };
  };
  const ortAusserhalb = w.ortAusserhalb === undefined ? std.ortAusserhalb : w.ortAusserhalb;
  if (!ORT_AUSSERHALB.includes(ortAusserhalb)) fehler("Wetter: „ortAusserhalb“ muss „wohnort“ oder „standort“ sein.");

  let ampel = std.ampel;
  if (w.ampel !== undefined) {
    if (!istObjekt(w.ampel)) fehler("Wetter, Ampel: muss ein Objekt sein.");
    const groesser0 = [v => istEndlich(v) && v > 0, "eine Zahl > 0"];
    const regeln = {
      rotBoeen: groesser0, rotStarkregen: groesser0, rotWarnstufe: [v => Number.isInteger(v) && v >= 1 && v <= 4, "eine Warnstufe von 1 bis 4"],
      gelbRegenWahrscheinlichkeit: [v => istEndlich(v) && v >= 0 && v <= 100, "eine Zahl von 0 bis 100"], gelbNiederschlag: groesser0, gelbBoeen: groesser0,
      gelbTemperatur: [istEndlich, "eine Zahl"], glaetteTemperatur: [istEndlich, "eine Zahl"]
    };
    ampel = {};
    Object.keys(std.ampel).forEach(k => {
      const v = w.ampel[k] === undefined ? std.ampel[k] : w.ampel[k];
      if (!regeln[k][0](v)) fehler("Wetter, Ampel: " + k + " muss " + regeln[k][1] + " sein.");
      ampel[k] = v;
    });
    if (!(ampel.gelbBoeen < ampel.rotBoeen)) fehler("Wetter, Ampel: gelbBoeen muss kleiner als rotBoeen sein.");
    if (!(ampel.gelbNiederschlag < ampel.rotStarkregen)) fehler("Wetter, Ampel: gelbNiederschlag muss kleiner als rotStarkregen sein.");
  }

  let kleidung = std.kleidung;
  if (w.kleidung !== undefined) {
    const k = w.kleidung, wo = "Wetter, Kleidung";
    if (!istObjekt(k)) fehler(wo + ": muss ein Objekt sein.");
    let stufen = std.kleidung.stufen;
    if (k.stufen !== undefined) {
      if (!Array.isArray(k.stufen) || k.stufen.length < 2) fehler(wo + ": „stufen“ muss eine Liste mit mindestens zwei Stufen sein.");
      const ids = new Set();
      stufen = k.stufen.map((s, i) => {
        const letzte = i === k.stufen.length - 1, wn = wo + ", Stufe " + (i + 1);
        if (!istObjekt(s)) fehler(wn + ": ist kein Objekt.");
        if (typeof s.id !== "string" || !s.id) fehler(wn + ": id fehlt.");
        if (ids.has(s.id)) fehler(wn + ": id „" + s.id + "“ kommt doppelt vor.");
        ids.add(s.id);
        const ab = s.ab ?? null;
        if (letzte && ab !== null) fehler(wn + ": Die letzte Stufe gilt unterhalb der vorigen und hat kein „ab“ (null).");
        if (!letzte && !istEndlich(ab)) fehler(wn + ": ab muss eine Zahl (°C) sein.");
        const bereiche = bereichePruefen(s.bereiche, wn, fehler);
        const hr = s.haendeBeiRegen ?? null;
        if (hr !== null && typeof hr !== "string") fehler(wn + ": haendeBeiRegen muss ein Text oder null sein.");
        return { id: s.id, ab, bereiche, haendeBeiRegen: hr && hr.trim() ? hr.trim() : null };
      });
      for (let i = 1; i < stufen.length - 1; i++) {
        if (!(stufen[i].ab < stufen[i - 1].ab)) fehler(wo + ": Die Untergrenzen der Stufen müssen von warm nach kalt abnehmen.");
      }
    }
    let regen = std.kleidung.regen;
    if (k.regen !== undefined) {
      if (!Array.isArray(k.regen)) fehler(wo + ": „regen“ muss eine Liste sein.");
      regen = k.regen.map((r, i) => {
        const wn = wo + ", Regen Nr. " + (i + 1);
        if (!istObjekt(r)) fehler(wn + ": ist kein Objekt.");
        if (!(istEndlich(r.ab) && r.ab >= 0 && r.ab <= 100)) fehler(wn + ": ab muss eine Regenwahrscheinlichkeit von 0 bis 100 sein.");
        return { ab: r.ab, bereiche: bereichePruefen(r.bereiche, wn, fehler) };
      });
      regen.forEach((r, i) => { if (i && !(r.ab > regen[i - 1].ab)) fehler(wo + ": Die Regenschwellen müssen aufsteigend sein."); });
    }
    const rueckmeldung = k.rueckmeldung ?? true;
    if (typeof rueckmeldung !== "boolean") fehler(wo + ": rueckmeldung muss true oder false sein.");
    kleidung = { stufen, regen, rueckmeldung };
  }

  return {
    wohnort: ort("wohnort", "Wohnort"), arbeitsort: ort("arbeitsort", "Arbeitsort"), weitererOrt: ort("weitererOrt", "weiterer Ort"),
    wegpunkte, windTeilstrecken, ortAusserhalb, hinfahrt: fahrt("hinfahrt", "Hinfahrt"), rueckfahrt: fahrt("rueckfahrt", "Rückfahrt"), ampel, kleidung
  };
}

// Kleidung je Körperbereich prüfen: sechs Texte (fehlend = ""), mindestens einer ausgefüllt
function bereichePruefen(b, wo, fehler, mindestensEiner = true, feld = "bereiche") {
  if (!istObjekt(b)) fehler(wo + ": „" + feld + "“ muss ein Objekt sein (kopf, hals, haende, oberkoerper, beine, fuesse).");
  const erg = {};
  BEREICH_SCHLUESSEL.forEach(k => {
    const v = b[k] ?? "";
    if (typeof v !== "string") fehler(wo + ": " + k + " muss ein Text sein.");
    erg[k] = v.trim();
  });
  if (mindestensEiner && !BEREICH_SCHLUESSEL.some(k => erg[k])) fehler(wo + ": Mindestens ein Bereich (Kopf, Hals, Hände, Oberkörper, Beine, Füße) muss ausgefüllt sein.");
  return erg;
}

// Wetter der Hin- und Rückfahrt eines Tageseintrags (ab Version 4; null = keins)
const AMPELFARBEN = ["gruen", "gelb", "rot"];
const RUECKMELDUNGEN = ["zu-warm", "passte", "zu-kalt"];
function eintragWetterPruefen(ew, wo, fehler) {
  if (ew === undefined || ew === null) return null;
  if (!istObjekt(ew)) fehler(wo + ": muss ein Objekt oder null sein.");
  if (ew.quelle !== "vorhersage" && ew.quelle !== "rueckblick") fehler(wo + ": quelle muss „vorhersage“ oder „rueckblick“ sein.");
  if (typeof ew.stand !== "string" || isNaN(Date.parse(ew.stand))) fehler(wo + ": stand muss ein Zeitpunkt sein (ISO 8601).");
  const fahrt = (f, name) => {
    if (f === undefined || f === null) return null;
    const wn = wo + ", " + name;
    if (!istObjekt(f)) fehler(wn + ": muss ein Objekt oder null sein.");
    const zahl = (k, min) => { if (!(istEndlich(f[k]) && (min === undefined || f[k] >= min))) fehler(wn + ": " + k + " muss eine Zahl" + (min === undefined ? "" : " ≥ " + min) + " sein."); return f[k]; };
    const w = f.regenWahrscheinlichkeit ?? null;
    if (w !== null && !(istEndlich(w) && w >= 0 && w <= 100)) fehler(wn + ": regenWahrscheinlichkeit muss eine Zahl von 0 bis 100 oder null sein.");
    if (!AMPELFARBEN.includes(f.ampel)) fehler(wn + ": ampel muss „gruen“, „gelb“ oder „rot“ sein.");
    const kleidung = f.kleidung ?? null;
    if (kleidung !== null && (typeof kleidung !== "string" || !kleidung)) fehler(wn + ": kleidung muss die id einer Kleidungsstufe oder null sein.");
    const em = f.empfehlung ?? null;
    const empfehlung = em === null ? null : bereichePruefen(em, wn, fehler, false, "empfehlung");
    const regenkleidung = f.regenkleidung ?? false;
    if (typeof regenkleidung !== "boolean") fehler(wn + ": regenkleidung muss true oder false sein.");
    const rm = f.rueckmeldung ?? null;
    if (rm !== null && !RUECKMELDUNGEN.includes(rm)) fehler(wn + ": rueckmeldung muss „zu-warm“, „passte“, „zu-kalt“ oder null sein.");
    return { temperatur: zahl("temperatur"), gefuehlt: zahl("gefuehlt"), niederschlag: zahl("niederschlag", 0), regenWahrscheinlichkeit: w,
      wind: zahl("wind", 0), boeen: zahl("boeen", 0), ampel: f.ampel, kleidung, empfehlung, regenkleidung, rueckmeldung: rm };
  };
  return { quelle: ew.quelle, stand: ew.stand, hin: fahrt(ew.hin, "hin"), rueck: fahrt(ew.rueck, "rueck") };
}

// Prüft die Daten vollständig und gibt eine bereinigte Kopie zurück.
// Bei einem Fehler wird eine verständliche Meldung geworfen.
function pruefen(d) {
  const fehler = msg => { throw new Error(msg); };
  const istText = v => typeof v === "string";
  const istZahl = v => typeof v === "number" && Number.isFinite(v) && v >= 0;
  const optText = (v, wo) => {
    if (v === undefined || v === null) return "";
    if (!istText(v)) fehler(wo + ": muss ein Text sein.");
    return v;
  };
  // Ja/Nein-Merkmal; fehlt es, gilt "nein"
  const jaNein = (v, wo) => {
    if (v === undefined || v === null) return false;
    if (typeof v !== "boolean") fehler(wo + ": muss true oder false sein.");
    return v;
  };
  const liste = (v, name) => {
    if (v === undefined) return [];
    if (!Array.isArray(v)) fehler("„" + name + "“ muss eine Liste sein.");
    return v;
  };
  const objekte = (v, name) => liste(v, name).map((x, i) => {
    if (!x || typeof x !== "object" || Array.isArray(x)) fehler("„" + name + "“ Nr. " + (i + 1) + " ist kein Objekt.");
    return x;
  });

  const erg = { version: DATEN_VERSION };

  // Fahrrad
  if (d.fahrrad === null || d.fahrrad === undefined) {
    erg.fahrrad = null;
  } else {
    const f = d.fahrrad;
    if (typeof f !== "object" || Array.isArray(f)) fehler("Fahrrad: muss ein Objekt oder null sein.");
    if (!istText(f.name) || !f.name.trim()) fehler("Fahrrad: Name fehlt.");
    if (!istGueltigesDatum(f.startdatum)) fehler("Fahrrad: Startdatum ist ungültig (Format JJJJ-MM-TT).");
    if (!istZahl(f.startKm)) fehler("Fahrrad: Start-Kilometerstand muss eine Zahl ≥ 0 sein.");
    erg.fahrrad = {
      name: f.name.trim(),
      startdatum: f.startdatum,
      startKm: runden(f.startKm),
      rahmennummer: optText(f.rahmennummer, "Fahrrad (rahmennummer)").trim(),
      beschreibung: optText(f.beschreibung, "Fahrrad (beschreibung)").trim()
    };
  }

  // Einstellungen (fehlen sie, gelten die Standardwerte). Die Reihenfolge der
  // Listen bleibt unverändert; die App speichert sie aufsteigend sortiert.
  const es = d.einstellungen ?? {};
  if (typeof es !== "object" || Array.isArray(es)) fehler("„einstellungen“ muss ein Objekt sein.");
  let fahrtage = [...STANDARD_FAHRTAGE];
  if (es.fahrtage !== undefined) {
    if (!Array.isArray(es.fahrtage)) fehler("Einstellungen: „fahrtage“ muss eine Liste sein.");
    es.fahrtage.forEach(t => { if (!(Number.isInteger(t) && t >= 1 && t <= 7)) fehler("Einstellungen: Fahrtage müssen Zahlen von 1 (Montag) bis 7 (Sonntag) sein."); });
    if (new Set(es.fahrtage).size !== es.fahrtage.length) fehler("Einstellungen: ein Fahrtag kommt doppelt vor.");
    fahrtage = [...es.fahrtage];
  }
  const zielJahre = new Set();
  const jahresziele = objekte(es.jahresziele, "jahresziele").map((z, i) => {
    const wo = "Jahresziel Nr. " + (i + 1);
    if (!(Number.isInteger(z.jahr) && z.jahr >= 1900 && z.jahr <= 9999)) fehler(wo + ": jahr muss eine Jahreszahl sein.");
    if (zielJahre.has(z.jahr)) fehler(wo + ": Für " + z.jahr + " gibt es mehr als ein Jahresziel.");
    zielJahre.add(z.jahr);
    if (!(istZahl(z.km) && z.km > 0)) fehler(wo + " (" + z.jahr + "): km muss eine Zahl > 0 sein.");
    return { jahr: z.jahr, km: runden(z.km) };
  });
  // Hinweis auf einen fehlenden Eintrag am selben Tag: Schalter und Uhrzeit (ab Version 7 immer eine Uhrzeit)
  const hinweisHeuteAn = es.hinweisHeuteAn === undefined ? true : es.hinweisHeuteAn;
  if (typeof hinweisHeuteAn !== "boolean") fehler("Einstellungen: „hinweisHeuteAn“ muss true oder false sein.");
  const hinweisHeuteAb = es.hinweisHeuteAb === undefined ? STANDARD_HINWEIS_HEUTE_AB : es.hinweisHeuteAb;
  if (!istUhrzeit(hinweisHeuteAb)) fehler("Einstellungen: „hinweisHeuteAb“ muss eine Uhrzeit im Format HH:MM sein (ohne Hinweis am selben Tag: hinweisHeuteAn false).");
  erg.einstellungen = { fahrtage, jahresziele, hinweisHeuteAn, hinweisHeuteAb, wetter: wetterPruefen(es.wetter, fehler) };

  // Vorlagen
  erg.vorlagen = objekte(d.vorlagen, "vorlagen").map((v, i) => {
    const wo = "Vorlage Nr. " + (i + 1);
    if (!istText(v.name) || !v.name.trim()) fehler(wo + ": Name fehlt.");
    if (!istZahl(v.km)) fehler(wo + " („" + v.name + "“): km muss eine Zahl ≥ 0 sein.");
    return { id: istText(v.id) && v.id ? v.id : neueId(), name: v.name.trim(), km: runden(v.km), arbeitsweg: jaNein(v.arbeitsweg, wo + " (arbeitsweg)") };
  });

  // Einträge
  const daten = new Set();
  erg.eintraege = objekte(d.eintraege, "eintraege").map((e, i) => {
    const wo = "Eintrag Nr. " + (i + 1);
    if (!istGueltigesDatum(e.datum)) fehler(wo + ": Datum ist ungültig (Format JJJJ-MM-TT).");
    if (daten.has(e.datum)) fehler("Doppeltes Datum " + datumText(e.datum) + ": pro Tag ist nur ein Eintrag erlaubt.");
    daten.add(e.datum);
    if (!istZahl(e.km)) fehler("Eintrag vom " + datumText(e.datum) + ": km muss eine Zahl ≥ 0 sein.");
    const typ = e.typ === undefined ? "tag" : e.typ;
    if (typ !== "tag" && typ !== "woche") fehler("Eintrag vom " + datumText(e.datum) + ": typ muss „tag“ oder „woche“ sein.");
    const vorlage = optText(e.vorlage, "Eintrag vom " + datumText(e.datum) + " (vorlage)");
    const wetter = eintragWetterPruefen(e.wetter, "Eintrag vom " + datumText(e.datum) + " (wetter)", fehler);
    if (wetter && typ === "woche") fehler("Eintrag vom " + datumText(e.datum) + ": Eine Wochensumme hat kein Wetter (wetter: null).");
    return {
      id: istText(e.id) && e.id ? e.id : neueId(),
      datum: e.datum,
      km: runden(e.km),
      vorlage: vorlage || null,
      notiz: optText(e.notiz, "Eintrag vom " + datumText(e.datum) + " (notiz)"),
      typ: typ,
      arbeitsweg: jaNein(e.arbeitsweg, "Eintrag vom " + datumText(e.datum) + " (arbeitsweg)"),
      wetter
    };
  });

  // Wartungsarten: Aufträge (mit Zeitfenster, Intervall, einmalig oder ohne
  // Fälligkeit) und Aufgaben (Intervall, Bauteil, Standard-Zuordnung)
  const artIds = new Set();
  const istMonat = v => Number.isInteger(v) && v >= 1 && v <= 12;
  erg.wartungsarten = d.wartungsarten === undefined ? standardWartungsarten() : objekte(d.wartungsarten, "wartungsarten").map((a, i) => {
    const wo = "Wartungsart Nr. " + (i + 1);
    if (!istText(a.id) || !a.id) fehler(wo + ": id fehlt.");
    if (artIds.has(a.id)) fehler(wo + ": id „" + a.id + "“ kommt doppelt vor.");
    artIds.add(a.id);
    if (!istText(a.name) || !a.name.trim()) fehler(wo + ": Name fehlt.");
    const wn = wo + " („" + a.name + "“)";
    if (a.typ !== "auftrag" && a.typ !== "aufgabe") fehler(wn + ": typ muss „auftrag“ oder „aufgabe“ sein.");
    const aufgabe = a.typ === "aufgabe";
    const im = a.intervallMonate ?? null;
    if (im !== null && !(Number.isInteger(im) && im >= 1)) fehler(wn + ": intervallMonate muss eine ganze Zahl ≥ 1 oder null sein.");
    const ik = a.intervallKm ?? null;
    if (ik !== null && !(istZahl(ik) && ik > 0)) fehler(wn + ": intervallKm muss eine Zahl > 0 oder null sein.");
    const von = a.fensterVon ?? null, bis = a.fensterBis ?? null;
    if ((von === null) !== (bis === null)) fehler(wn + ": fensterVon und fensterBis müssen beide gesetzt oder beide null sein.");
    if (von !== null && !(istMonat(von) && istMonat(bis))) fehler(wn + ": fensterVon und fensterBis müssen Monate von 1 bis 12 sein.");
    if (von !== null && von > bis) fehler(wn + ": Das Zeitfenster darf nicht über den Jahreswechsel gehen (fensterVon ≤ fensterBis).");
    if (von !== null && aufgabe) fehler(wn + ": Eine Aufgabe kann kein Zeitfenster haben.");
    const ab = a.gueltigAbJahr ?? null;
    if (ab !== null && !(Number.isInteger(ab) && ab >= 1900 && ab <= 9999)) fehler(wn + ": gueltigAbJahr muss eine Jahreszahl oder null sein.");
    if (ab !== null && von === null) fehler(wn + ": gueltigAbJahr ist nur mit Zeitfenster erlaubt.");
    const einmalig = jaNein(a.einmalig, wn + " (einmalig)");
    if (einmalig && von !== null) fehler(wn + ": Eine einmalige Wartung kann kein jährliches Zeitfenster haben.");
    if (einmalig && aufgabe) fehler(wn + ": Eine Aufgabe kann nicht einmalig sein.");
    const bauteil = optText(a.bauteil, wn + " (bauteil)").trim() || null;
    if (bauteil !== null && !aufgabe) fehler(wn + ": Ein Bauteil gibt es nur bei Aufgaben.");
    const zu = a.zuordnung ?? null;
    if (aufgabe ? !istText(zu) || !zu : zu !== null) fehler(wn + ": zuordnung muss bei Aufgaben „" + NAECHSTE_INSPEKTION + "“ oder die id eines Auftrags sein, bei Aufträgen null.");
    return {
      id: a.id, name: a.name.trim(), typ: a.typ, intervallMonate: im, intervallKm: ik === null ? null : runden(ik),
      fensterVon: von, fensterBis: bis, gueltigAbJahr: ab, einmalig, bauteil, zuordnung: zu
    };
  });
  const artVon = id => erg.wartungsarten.find(a => a.id === id) || null;
  erg.wartungsarten.forEach((a, i) => {
    if (a.typ === "aufgabe" && a.zuordnung !== NAECHSTE_INSPEKTION && !(artVon(a.zuordnung) && artVon(a.zuordnung).typ === "auftrag")) {
      fehler("Wartungsart Nr. " + (i + 1) + " („" + a.name + "“): zuordnung „" + a.zuordnung + "“ ist kein Auftrag.");
    }
  });

  // Mängel
  const mangelIds = new Set();
  erg.maengel = objekte(d.maengel, "maengel").map((m, i) => {
    const wo = "Mangel Nr. " + (i + 1);
    if (!istGueltigesDatum(m.datum)) fehler(wo + ": Datum ist ungültig (Format JJJJ-MM-TT).");
    if (!istText(m.beschreibung) || !m.beschreibung.trim()) fehler(wo + " (" + datumText(m.datum) + "): Beschreibung fehlt.");
    const status = m.status === undefined ? "offen" : m.status;
    if (status !== "offen" && status !== "erledigt") fehler(wo + " (" + datumText(m.datum) + "): status muss „offen“ oder „erledigt“ sein.");
    const am = m.erledigtAm ?? null;
    if (am !== null && !istGueltigesDatum(am)) fehler(wo + " (" + datumText(m.datum) + "): erledigtAm ist ungültig (Format JJJJ-MM-TT).");
    const id = istText(m.id) && m.id ? m.id : neueId();
    if (mangelIds.has(id)) fehler(wo + ": id „" + id + "“ kommt doppelt vor.");
    mangelIds.add(id);
    return {
      id,
      datum: m.datum,
      beschreibung: m.beschreibung.trim(),
      status,
      // Bei offenen Mängeln gibt es kein Erledigt-Datum
      erledigtAm: status === "erledigt" ? am : null
    };
  });
  const mangelVon = id => erg.maengel.find(m => m.id === id) || null;

  // Aufträge: geplant (Termin, Positionen offen) oder erledigt (Datum,
  // Kilometerstand, Positionen erledigt bzw. nicht gemacht)
  const auftragIds = new Set(), posIds = new Set();
  const geplanteArten = new Set(), geplanteAufgaben = new Set(), geplanteMaengel = new Set(), erledigteMaengel = new Set();
  erg.auftraege = objekte(d.auftraege, "auftraege").map((x, i) => {
    let wo = "Auftrag Nr. " + (i + 1);
    const art = artVon(x.wartungsartId);
    if (!art || art.typ !== "auftrag") fehler(wo + ": wartungsartId „" + x.wartungsartId + "“ ist kein Auftrag.");
    wo += " („" + art.name + "“)";
    const id = istText(x.id) && x.id ? x.id : neueId();
    if (auftragIds.has(id)) fehler(wo + ": id „" + id + "“ kommt doppelt vor.");
    auftragIds.add(id);
    if (x.status !== "geplant" && x.status !== "erledigt") fehler(wo + ": status muss „geplant“ oder „erledigt“ sein.");
    const erledigt = x.status === "erledigt";
    const termin = x.termin ?? null;
    if (termin !== null && (erledigt || !istGueltigesDatum(termin))) fehler(wo + ": termin muss bei geplanten Aufträgen ein Datum (JJJJ-MM-TT) oder null sein, bei erledigten null.");
    const terminZeit = x.terminZeit ?? null;
    if (terminZeit !== null && (termin === null || !istUhrzeit(terminZeit))) fehler(wo + ": terminZeit muss eine Uhrzeit im Format HH:MM oder null sein (nur zusammen mit einem Termin).");
    const datum = x.datum ?? null;
    if (erledigt ? !istGueltigesDatum(datum) : datum !== null) fehler(wo + ": datum muss bei erledigten Aufträgen ein gültiges Datum (JJJJ-MM-TT) sein, bei geplanten null.");
    if (erledigt) wo += " vom " + datumText(datum);
    const ks = x.kmStand ?? null;
    if (ks !== null && (!erledigt || !istZahl(ks))) fehler(wo + ": kmStand muss eine Zahl ≥ 0 oder null sein (nur bei erledigten Aufträgen).");
    let manuell = x.kmManuell;
    if (manuell === undefined) manuell = ks !== null; // fehlt die Angabe, gilt ein vorhandener Wert als von Hand eingetragen
    if (typeof manuell !== "boolean") fehler(wo + ": kmManuell muss true oder false sein.");
    if (!erledigt) {
      if (hatFaelligkeit(art) && geplanteArten.has(art.id)) fehler(wo + ": Für einen Auftrag mit Intervall, Zeitfenster oder einmalig ist nur ein geplanter Auftrag erlaubt.");
      geplanteArten.add(art.id);
    }
    const aufgabenHier = new Set(), maengelHier = new Set();
    const positionen = liste(x.positionen, "positionen").map((p, j) => {
      const wp = wo + ", Position Nr. " + (j + 1);
      if (!istObjekt(p)) fehler(wp + ": ist kein Objekt.");
      const pid = istText(p.id) && p.id ? p.id : neueId();
      if (posIds.has(pid)) fehler(wp + ": id „" + pid + "“ kommt doppelt vor.");
      posIds.add(pid);
      const status = p.status;
      if (erledigt ? status !== "erledigt" && status !== "nicht-gemacht" : status !== "offen") {
        fehler(wp + ": status muss " + (erledigt ? "„erledigt“ oder „nicht-gemacht“" : "„offen“") + " sein.");
      }
      const notiz = optText(p.notiz, wp + " (notiz)");
      if (p.art === "aufgabe") {
        const a = artVon(p.wartungsartId);
        if (!a || a.typ !== "aufgabe") fehler(wp + ": wartungsartId „" + p.wartungsartId + "“ ist keine Aufgabe.");
        if (aufgabenHier.has(a.id)) fehler(wp + ": Die Aufgabe „" + a.name + "“ steht doppelt im Auftrag.");
        aufgabenHier.add(a.id);
        if (!erledigt) {
          if (geplanteAufgaben.has(a.id)) fehler(wp + ": Die Aufgabe „" + a.name + "“ steht schon in einem anderen geplanten Auftrag.");
          geplanteAufgaben.add(a.id);
        }
        return { id: pid, art: "aufgabe", wartungsartId: a.id, status, notiz };
      }
      if (p.art === "mangel") {
        const m = mangelVon(p.mangelId);
        if (!m) fehler(wp + ": unbekannte mangelId „" + p.mangelId + "“.");
        if (maengelHier.has(m.id)) fehler(wp + ": Der Mangel „" + m.beschreibung + "“ steht doppelt im Auftrag.");
        maengelHier.add(m.id);
        if (!erledigt) {
          if (m.status !== "offen") fehler(wp + ": Der Mangel „" + m.beschreibung + "“ ist erledigt und kann nicht in einem geplanten Auftrag stehen.");
          if (geplanteMaengel.has(m.id)) fehler(wp + ": Der Mangel „" + m.beschreibung + "“ steht schon in einem anderen geplanten Auftrag.");
          geplanteMaengel.add(m.id);
        } else if (status === "erledigt") {
          if (m.status !== "erledigt") fehler(wp + ": Der Mangel „" + m.beschreibung + "“ ist als erledigt eingetragen, aber noch offen.");
          if (erledigteMaengel.has(m.id)) fehler(wp + ": Der Mangel „" + m.beschreibung + "“ ist schon mit einem anderen Auftrag erledigt.");
          erledigteMaengel.add(m.id);
        }
        return { id: pid, art: "mangel", mangelId: m.id, status, notiz };
      }
      fehler(wp + ": art muss „aufgabe“ oder „mangel“ sein.");
    });
    const ausgeschlossen = liste(x.ausgeschlossen, "ausgeschlossen").map(aid => {
      const a = artVon(aid);
      if (erledigt || !a || a.typ !== "aufgabe" || aufgabenHier.has(aid)) fehler(wo + ": ausgeschlossen darf nur bei geplanten Aufträgen Aufgaben enthalten, die nicht im Auftrag stehen.");
      return aid;
    });
    if (new Set(ausgeschlossen).size !== ausgeschlossen.length) fehler(wo + ": ausgeschlossen enthält eine Aufgabe doppelt.");
    return {
      id, wartungsartId: art.id, status: x.status, termin, terminZeit, werkstatt: optText(x.werkstatt, wo + " (werkstatt)"),
      datum, kmStand: ks === null ? null : runden(ks), kmManuell: manuell && ks !== null, notiz: optText(x.notiz, wo + " (notiz)"),
      positionen, ausgeschlossen
    };
  });

  return erg;
}

// JSON-Text (aus dem Speicher oder einer Datei) → geprüfte Daten der aktuellen Version
function datenEinlesen(text) {
  let roh;
  try { roh = JSON.parse(text); } catch (e) { throw new Error("Die Datei ist keine gültige JSON-Datei."); }
  return pruefen(migrieren(roh));
}

// Die Daten der App – alles, was angezeigt wird, kommt von hier.
let daten = leereDaten();
let ladeFehler = null;

function laden() {
  let text;
  try {
    text = localStorage.getItem(SPEICHER_SCHLUESSEL);
  } catch (e) {
    ladeFehler = "Der Speicher des Browsers ist nicht verfügbar (privater Modus?). Daten können nicht gespeichert werden.";
    return;
  }
  if (!text) return; // erster Start
  try {
    daten = datenEinlesen(text);
    // Nach der Umwandlung auf Version 8 die Wartungsarten prüfen lassen
    if (JSON.parse(text).version < 8) pruefungVormerken(true);
  } catch (e) {
    // Defekte Daten nicht überschreiben, sondern beiseitelegen
    try { localStorage.setItem(SPEICHER_SCHLUESSEL + "-defekt-" + Date.now(), text); } catch (_) {}
    ladeFehler = "Die gespeicherten Daten konnten nicht gelesen werden (" + e.message + "). Eine Kopie wurde beiseitegelegt. Bitte eine Sicherung importieren.";
    daten = leereDaten();
  }
}

function speichern() {
  // Jede Änderung beendet ein offenes "Rückgängig" (es würde sie sonst überschreiben)
  rueckgaengigVerwerfen();
  aktualisiereAuftragKm();
  try {
    localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(daten));
    return true;
  } catch (e) {
    alert("Speichern fehlgeschlagen: " + e.message);
    return false;
  }
}

// Hinweis „Bitte Wartungsarten prüfen“ (nach der Umwandlung auf Version 8)
function pruefungVorgemerkt() {
  try { return localStorage.getItem(PRUEF_SCHLUESSEL) === "ja"; } catch (e) { return false; }
}
function pruefungVormerken(an) {
  try { if (an) localStorage.setItem(PRUEF_SCHLUESSEL, "ja"); else localStorage.removeItem(PRUEF_SCHLUESSEL); } catch (e) {}
}

function letzterExport() {
  try { return localStorage.getItem(EXPORT_SCHLUESSEL); } catch (e) { return null; }
}
