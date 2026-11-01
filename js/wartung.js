// Rad-km · Werkstatt (Berechnung): Fälligkeit (Zeitfenster, Intervall), offene Aufträge, Standard-Zuordnung, Vorschläge
"use strict";

// ---------- Fälligkeit: Zeitfenster und Intervall ----------

// Nicht von Hand überschriebene Kilometerstände erledigter Aufträge neu berechnen
function aktualisiereAuftragKm() {
  daten.auftraege.forEach(a => {
    if (a.status === "erledigt" && !a.kmManuell) a.kmStand = kmStandAm(a.datum);
  });
}

function artName(id) {
  const a = daten.wartungsarten.find(a => a.id === id);
  return a ? a.name : "(unbekannt)";
}

function hatZeitfenster(art) { return art.fensterVon !== null && art.fensterVon !== undefined; }
// Erster bzw. letzter Tag des Zeitfensters einer Wartungsart im Jahr "jahr"
function fensterBeginn(art, jahr) { return monatsanfang(jahr, art.fensterVon); }
function fensterEnde(art, jahr) { return monatsende(jahr, art.fensterBis); }
// "Oktober–November" bzw. "Mai"
function fensterText(art) {
  return art.fensterVon === art.fensterBis ? MONATE[art.fensterVon - 1] : MONATE[art.fensterVon - 1] + "–" + MONATE[art.fensterBis - 1];
}

// Fälligkeit einer Wartungsart mit jährlichem Zeitfenster.
//   durchfuehrungen: Datumswerte aus dem Wartungsprotokoll für diese Art
//   startdatum: Startdatum des Fahrrads oder null
//   h: Stichtag ("heute")
// Regeln: Pro Jahr ist die Wartung im Fenster fällig. Zählt ein Fenster und
// gibt es ab seinem Beginn keine Durchführung, ist die Wartung ab dem Tag nach
// dem Fensterende überfällig – auch über den Jahreswechsel, bis sie
// durchgeführt wird. Eine Durchführung nach dem Fensterende ist eine
// Nachholung. Eine Durchführung vor dem Fenster zählt nicht für dieses Fenster.
// Ein Fenster zählt ab "gueltigAbJahr" und nur, wenn es nicht vor dem
// Startdatum des Fahrrads endet (ohne Fahrrad: ab dem laufenden Jahr).
function saisonStatus(art, durchfuehrungen, startdatum, h) {
  const jahr = Number(h.slice(0, 4));
  const ab = art.gueltigAbJahr ?? null;
  if (ab !== null && jahr < ab) {
    return { text: "noch nicht fällig (gültig ab " + ab + ")", klasse: "", datum: null };
  }
  const bisher = durchfuehrungen.filter(d => d <= h).sort();
  const letzte = bisher.length ? bisher[bisher.length - 1] : null;
  const zaehlt = j => (ab === null || j >= ab) && (startdatum ? fensterEnde(art, j) >= startdatum : j >= jahr);
  const imFenster = j => bisher.some(d => d >= fensterBeginn(art, j) && d <= fensterEnde(art, j));

  // Ältestes versäumtes Fenster suchen
  const erstesJahr = ab !== null ? ab : startdatum ? Number(startdatum.slice(0, 4)) : jahr;
  for (let j = erstesJahr; j <= jahr; j++) {
    const ende = fensterEnde(art, j);
    if (zaehlt(j) && ende < h && (letzte === null || letzte < fensterBeginn(art, j))) {
      return { text: "überfällig seit " + datumText(ende), klasse: "status-rot", datum: ende };
    }
  }

  const beginn = fensterBeginn(art, jahr), ende = fensterEnde(art, jahr), naechster = fensterBeginn(art, jahr + 1);
  if (h < beginn) {
    // Vor dem Fenster: Wurde das Vorjahr erst nach dem Fenster nachgeholt, das anzeigen
    if (letzte && zaehlt(jahr - 1) && letzte > fensterEnde(art, jahr - 1) && !imFenster(jahr - 1)) {
      return { text: "erledigt (nachgeholt), nächste ab " + datumText(beginn), klasse: "status-gruen", datum: beginn };
    }
    return { text: "fällig ab " + kurzDatum(beginn), klasse: tageZwischen(h, beginn) <= 30 ? "status-orange" : "status-gruen", datum: beginn };
  }
  if (letzte && letzte >= beginn) {
    return { text: (imFenster(jahr) ? "erledigt" : "erledigt (nachgeholt)") + ", nächste ab " + datumText(naechster), klasse: "status-gruen", datum: naechster };
  }
  if (h <= ende) return { text: "fällig bis " + kurzDatum(ende), klasse: "status-orange", datum: ende };
  // Fenster dieses Jahres zählt nicht (z. B. Fahrrad erst danach angelegt)
  return { text: "fällig ab " + datumText(naechster), klasse: "status-gruen", datum: naechster };
}

// Gefahrene km seit der Durchführung "letzte" bis einschließlich "h"; ohne
// Durchführung seit dem Startdatum. null, wenn es sich nicht berechnen lässt.
function kmSeit(letzte, h) {
  const stand = kmStandAm(h);
  if (letzte) {
    if (letzte.kmStand !== null && stand !== null) return runden(stand - letzte.kmStand);
    return summe(e => e.datum > letzte.datum && e.datum <= h);
  }
  const f = daten.fahrrad;
  return f && stand !== null ? runden(stand - f.startKm) : null;
}

// Tag, an dem seit der Durchführung (bzw. dem Startdatum) "intervallKm" erreicht
// wurden. "seit" = km bis heute; der Unterschied zur Summe der Einträge stammt
// aus einem von Hand eingetragenen Kilometerstand und wird vorab angerechnet.
function kmGrenzeErreichtAm(letzte, intervallKm, seit, h) {
  const basis = letzte ? letzte.datum : daten.fahrrad.startdatum;
  const liste = daten.eintraege
    .filter(e => (letzte ? e.datum > basis : e.datum >= basis) && e.datum <= h)
    .sort((a, b) => a.datum.localeCompare(b.datum));
  let kum = seit - liste.reduce((s, e) => s + e.km, 0);
  if (runden(kum) >= intervallKm) return basis;
  for (const e of liste) {
    kum += e.km;
    if (runden(kum) >= intervallKm) return e.datum;
  }
  return h;
}

// Fälligkeit nach Intervall in Monaten und/oder km (ohne Zeitfenster). Fällig
// ist, was zuerst erreicht wird. Grundlage ist die letzte Durchführung, ohne
// Durchführung das Startdatum mit dem Start-Kilometerstand. Den Tag, an dem
// die km-Grenze erreicht wird, schätzt die Prognose (kmGeschaetzt).
function intervallStatus(art, letzte, h) {
  const st = { text: "", klasse: "", datum: null, nochNie: false, restKm: null, grenzeKm: null, abStart: false, kmGeschaetzt: false };
  if (!art.intervallMonate && !art.intervallKm) return Object.assign(st, { text: "ohne Intervall" });
  const f = daten.fahrrad;
  if (!letzte && !f) return Object.assign(st, { text: "noch nicht durchgeführt", klasse: "status-orange", nochNie: true });
  const basis = letzte ? letzte.datum : f.startdatum;
  st.abStart = !letzte;

  const nachMonaten = art.intervallMonate ? plusMonate(basis, art.intervallMonate) : null;
  let nachKm = null, geschaetzt = false;
  if (art.intervallKm) {
    const seit = kmSeit(letzte, h);
    if (seit !== null) {
      st.restKm = runden(art.intervallKm - seit);
      const stand = kmStandAm(h);
      st.grenzeKm = stand === null ? null : runden(stand + st.restKm);
      if (st.restKm <= 0) {
        nachKm = kmGrenzeErreichtAm(letzte, art.intervallKm, seit, h);
      } else {
        const g = prognoseGrundlage(h);
        if (g && g.rate > 0) { nachKm = plusTage(h, Math.ceil(st.restKm / g.rate)); geschaetzt = true; }
      }
    }
  }

  if (nachKm !== null && (nachMonaten === null || nachKm < nachMonaten)) {
    st.datum = nachKm;
    st.kmGeschaetzt = geschaetzt;
    if (geschaetzt) {
      st.text = "fällig ca. im " + monatJahrText(nachKm) + (st.grenzeKm !== null ? " bei " + caKm(st.grenzeKm) : "");
      st.klasse = tageZwischen(h, nachKm) <= 30 ? "status-orange" : "status-gruen";
    } else {
      const grenze = st.grenzeKm !== null ? " (" + kmText(st.grenzeKm) + " km)" : "";
      st.text = nachKm === h ? "heute fällig (km-Grenze" + grenze + " erreicht)"
        : st.restKm < 0 ? "überfällig: km-Grenze" + grenze + " um " + kmText(-st.restKm) + " km überschritten"
        : "überfällig: km-Grenze" + grenze + " erreicht";
      st.klasse = "status-rot";
    }
    return st;
  }
  if (nachMonaten === null) {
    // Nur km-Intervall, aber keine Schätzung möglich (zu wenige Daten oder keine Fahrten)
    st.text = st.grenzeKm !== null ? "fällig bei " + caKm(st.grenzeKm) : "fällig nach " + kmText(art.intervallKm) + " km";
    st.klasse = "status-gruen";
    return st;
  }
  const t = tageZwischen(h, nachMonaten);
  st.datum = nachMonaten;
  if (t > 0) Object.assign(st, { text: "fällig in " + tageText(t) + " (" + datumText(nachMonaten) + ")", klasse: t <= 30 ? "status-orange" : "status-gruen" });
  else if (t === 0) Object.assign(st, { text: "heute fällig", klasse: "status-rot" });
  else Object.assign(st, { text: "überfällig seit " + tageText(-t) + " (" + datumText(nachMonaten) + ")", klasse: "status-rot" });
  return st;
}

// ---------- Werkstatt: Aufträge, Aufgaben, Positionen ----------

function artVon(id) { return daten.wartungsarten.find(a => a.id === id) || null; }
const istAufgabe = art => !!art && art.typ === "aufgabe";
// Inspektion = Auftrag mit Fälligkeit (Intervall, Zeitfenster oder einmalig), z. B. nicht die Reparatur
const istInspektion = art => !!art && art.typ === "auftrag" && hatFaelligkeit(art);
const aufgabenArten = () => daten.wartungsarten.filter(istAufgabe);
const auftragsArten = () => daten.wartungsarten.filter(a => a.typ === "auftrag");

// Erledigte Aufträge einer Auftragsart, der neueste zuerst
function erledigteAuftraege(artId) {
  return daten.auftraege.filter(a => a.status === "erledigt" && a.wartungsartId === artId).sort((a, b) => b.datum.localeCompare(a.datum));
}
// Letzte Erledigung einer Aufgabe: { datum, kmStand, werkstatt, auftrag } oder null
function letzteErledigung(aufgabeId) {
  let letzte = null;
  daten.auftraege.forEach(a => {
    if (a.status === "erledigt" && a.positionen.some(p => p.art === "aufgabe" && p.wartungsartId === aufgabeId && p.status === "erledigt") &&
      (!letzte || a.datum > letzte.datum)) letzte = { datum: a.datum, kmStand: a.kmStand, werkstatt: a.werkstatt, auftrag: a };
  });
  return letzte;
}
// Anzahl der Positionen als Text: "1 Position", "3 Positionen"
function positionenText(n) { return n === 1 ? "1 Position" : n + " Positionen"; }
// "3 erledigte Aufträge, 1 geplanter Auftrag"
function auftraegeText(liste) {
  const e = liste.filter(a => a.status === "erledigt").length, g = liste.length - e;
  return (e === 1 ? "1 erledigter Auftrag" : e + " erledigte Aufträge") + ", " + (g === 1 ? "1 geplanter Auftrag" : g + " geplante Aufträge");
}

// Fälligkeit einer Auftragsart nach ihren erledigten Aufträgen (ohne Termin).
// Mit Zeitfenster gilt das Fenster; ein km-Intervall gibt dann nur einen Hinweis
// (kmHinweis), wenn die km-Grenze vor dem maßgeblichen Datum erreicht wird.
// Einmalige Aufträge sind nach der ersten Erledigung erledigt.
function auftragsartStatus(art, h = heute()) {
  const erledigte = erledigteAuftraege(art.id).filter(a => a.datum <= h);
  const letzte = erledigte[0] || null;
  if (art.einmalig && letzte) {
    const erste = erledigte[erledigte.length - 1];
    return { erledigt: true, letzte, erste, datum: null, text: "erledigt am " + datumText(erste.datum), klasse: "status-gruen", nochNie: false,
      restKm: null, abStart: false, kmGeschaetzt: false, kmHinweis: null, seitKm: null };
  }
  if (!hatFaelligkeit(art)) {
    return { erledigt: false, letzte, datum: null, text: "ohne Intervall", klasse: "", nochNie: false, restKm: null, abStart: false, kmGeschaetzt: false,
      kmHinweis: null, seitKm: letzte ? kmSeit(letzte, h) : null };
  }
  let st;
  if (hatZeitfenster(art)) {
    st = Object.assign({ nochNie: false, restKm: null, abStart: false, kmGeschaetzt: false },
      saisonStatus(art, erledigte.map(a => a.datum), daten.fahrrad ? daten.fahrrad.startdatum : null, h));
    st.kmHinweis = null;
    if (art.intervallKm) {
      const km = intervallStatus(Object.assign({}, art, { intervallMonate: null }), letzte, h);
      if (km.datum && km.datum < regelZiel(art, Object.assign({}, st, { erledigt: false }), h)) {
        st.kmHinweis = km.restKm <= 0
          ? "km-Grenze" + (km.grenzeKm !== null ? " (" + kmText(km.grenzeKm) + " km)" : "") + " schon erreicht"
          : "km-Grenze (" + (km.grenzeKm !== null ? caKm(km.grenzeKm) : kmText(art.intervallKm) + " km") + ") voraussichtlich schon im " + monatJahrText(km.datum) + " erreicht";
      }
    }
  } else {
    st = Object.assign({ kmHinweis: null }, intervallStatus(art, letzte, h));
  }
  return Object.assign(st, { erledigt: false, letzte, seitKm: letzte ? kmSeit(letzte, h) : null });
}

// Fälligkeit einer Aufgabe ab ihrer letzten Erledigung (Datum und Kilometerstand
// des Auftrags), ohne Erledigung ab Startdatum und Start-Kilometerstand
function aufgabeStatus(art, h = heute()) {
  const l = letzteErledigung(art.id);
  const letzte = l && l.datum <= h ? l : null;
  const st = intervallStatus(art, letzte, h);
  return Object.assign(st, { letzte, seitKm: letzte ? kmSeit(letzte, h) : null });
}

// Text zum Termin eines geplanten Auftrags (mit Uhrzeit, falls eingetragen)
function terminText(termin, werkstatt, h, zeit = null) {
  const t = tageZwischen(h, termin);
  return "Termin am " + datumText(termin) + (zeit ? " um " + zeit + " Uhr" : "") + (werkstatt ? " bei " + werkstatt : "") +
    (t > 0 ? " (in " + tageText(t) + ")" : t === 0 ? " (heute)" : " (vor " + tageText(-t) + ", noch nicht als erledigt eingetragen)");
}

// Ziel einer Fälligkeit für die Positionen: Ende des Zeitfensters bzw.
// Fälligkeitsdatum; liegt es vor heute oder fehlt es, gilt heute.
function regelZiel(art, regel, h) {
  if (!regel || regel.erledigt) return h;
  if (hatZeitfenster(art)) {
    const jahr = regel.datum ? Number(regel.datum.slice(0, 4)) : art.gueltigAbJahr;
    if (regel.datum && regel.datum < h) return h;
    return jahr ? fensterEnde(art, jahr) : h;
  }
  return regel.datum && regel.datum > h ? regel.datum : h;
}

// Lage der Werkstatt am Tag h: offene Aufträge (gespeicherte und vorgemerkte)
// mit Fälligkeit, Zieldatum und Positionen, Aufgaben mit Fälligkeit und Auftrag,
// Vorschläge und Mängel ohne Auftrag. Rechnet nur, verändert nichts.
//   Vorgemerkter Auftrag: Hat eine Auftragsart mit Fälligkeit keinen geplanten
//   Auftrag, gilt der nächste als offen (ohne Termin); gespeichert wird er erst
//   bei der ersten Änderung.
//   Standard-Zuordnung (nur berechnet): Eine Aufgabe, die in keinem geplanten
//   Auftrag steht, gehört zum Auftrag ihrer Zuordnung („nächste Inspektion“ = der
//   früheste offene Auftrag einer Inspektion), wenn sie bis zu dessen Zieldatum
//   fällig wird und dort nicht entfernt wurde.
function werkstattLage(h = heute()) {
  const offene = [];
  daten.auftraege.filter(a => a.status === "geplant").forEach(a => offene.push(offenerAuftrag(a, artVon(a.wartungsartId), false, h)));
  auftragsArten().forEach(art => {
    if (!hatFaelligkeit(art) || offene.some(o => o.art.id === art.id)) return;
    const regel = auftragsartStatus(art, h);
    if (regel.erledigt) return;
    offene.push(offenerAuftrag({ id: null, wartungsartId: art.id, status: "geplant", termin: null, terminZeit: null, werkstatt: "", datum: null,
      kmStand: null, kmManuell: false, notiz: "", positionen: [], ausgeschlossen: [] }, art, true, h, regel));
  });
  // Reihenfolge: überfällig, mit Datum, ohne Datum (km ohne Schätzung), ohne Fälligkeit
  const reihenfolge = new Map(daten.wartungsarten.map((a, i) => [a.id, i]));
  offene.sort((a, b) => a.gruppe - b.gruppe || (a.gruppe <= 2 ? a.datum.localeCompare(b.datum) : 0) ||
    reihenfolge.get(a.art.id) - reihenfolge.get(b.art.id));

  // Aufgaben mit Fälligkeit
  const aufgaben = aufgabenArten().map((art, i) => ({ art, i, st: aufgabeStatus(art, h), offen: null, berechnet: false }));
  const aufgabeVon = id => aufgaben.find(x => x.art.id === id);
  const faelligBis = (x, ziel) => !!x.st.datum && x.st.datum <= ziel;
  // Ausdrücklich zugeordnet
  offene.forEach(o => o.auftrag.positionen.forEach(p => {
    if (p.art === "aufgabe" && aufgabeVon(p.wartungsartId)) Object.assign(aufgabeVon(p.wartungsartId), { offen: o, berechnet: false });
  }));
  // Nach der Standard-Zuordnung (Kandidaten nach Zieldatum)
  const nachZiel = [...offene].sort((a, b) => a.ziel.localeCompare(b.ziel) || offene.indexOf(a) - offene.indexOf(b));
  aufgaben.forEach(x => {
    if (x.offen) return;
    const passt = o => (x.art.zuordnung === NAECHSTE_INSPEKTION ? istInspektion(o.art) : o.art.id === x.art.zuordnung) &&
      !o.auftrag.ausgeschlossen.includes(x.art.id) && faelligBis(x, o.ziel);
    const o = nachZiel.find(passt);
    if (o) Object.assign(x, { offen: o, berechnet: true });
  });
  aufgaben.sort((a, b) => (a.st.datum ? 0 : 1) - (b.st.datum ? 0 : 1) || (a.st.datum && b.st.datum ? a.st.datum.localeCompare(b.st.datum) : 0) || a.i - b.i);

  // Positionen und Vorschläge je offenem Auftrag
  offene.forEach(o => {
    o.positionen = o.auftrag.positionen.map(p => Object.assign({}, p, { berechnet: false }))
      .concat(aufgaben.filter(x => x.offen === o && x.berechnet)
        .map(x => ({ id: null, art: "aufgabe", wartungsartId: x.art.id, status: "offen", notiz: "", berechnet: true })));
    o.vorschlaege = aufgaben.filter(x => x.offen !== o && faelligBis(x, o.ziel) && !o.auftrag.ausgeschlossen.includes(x.art.id) &&
      (!x.offen || (x.berechnet && x.offen.ziel > o.ziel)));
  });

  const imAuftrag = new Set(offene.flatMap(o => o.auftrag.positionen.filter(p => p.art === "mangel").map(p => p.mangelId)));
  return {
    offene,
    aufgaben,
    aufgabeVon,
    maengelOhneAuftrag: offeneMaengel().filter(m => !imAuftrag.has(m.id)),
    mangelAuftrag: id => offene.find(o => o.auftrag.positionen.some(p => p.art === "mangel" && p.mangelId === id)) || null
  };
}

// Offener Auftrag mit Fälligkeit: "datum" ist das maßgebliche Datum (Termin,
// sonst Fälligkeit), "ziel" das Zieldatum für Positionen und Vorschläge (Termin,
// sonst Ende des Zeitfensters bzw. Fälligkeit; frühestens heute). "erwartet" =
// erwarteter Kilometerstand zum Termin bzw. zur Fälligkeit.
function offenerAuftrag(auftrag, art, vorgemerkt, h, regel = hatFaelligkeit(art) ? auftragsartStatus(art, h) : null) {
  const o = { auftrag, art, vorgemerkt, regel, termin: auftrag.termin, datum: null, text: "", klasse: "" };
  if (auftrag.termin) {
    o.datum = auftrag.termin;
    o.text = terminText(auftrag.termin, auftrag.werkstatt, h, auftrag.terminZeit);
    o.klasse = auftrag.termin < h ? "status-orange" : "status-gruen";
  } else if (regel) {
    Object.assign(o, { datum: regel.datum, text: regel.text, klasse: regel.klasse });
  } else {
    o.text = "noch kein Termin";
  }
  const zielTermin = auftrag.termin && auftrag.termin > h ? auftrag.termin : auftrag.termin ? h : null;
  o.ziel = zielTermin || regelZiel(art, regel, h);
  o.gruppe = o.datum ? (o.datum < h ? 1 : 2) : regel && !regel.erledigt && (art.intervallMonate || art.intervallKm) && !hatZeitfenster(art) ? 3 : 4;
  // Steht der km-Wert schon im Text ("fällig ca. im Mai 2027 bei ca. 7.500 km"), entfällt er hier
  const zielKm = auftrag.termin ? auftrag.termin : regel && regel.kmGeschaetzt ? null : o.datum;
  const km = zielKm && zielKm > h ? kmPrognose(zielKm, h) : null;
  o.erwartet = km === null ? null : { datum: zielKm, km };
  return o;
}

// Nächster fälliger Auftrag für die Übersicht: der erste überfällige bzw. anstehende
function naechsterAuftrag(lage, h = heute()) {
  return lage.offene.find(o => o.gruppe <= 3) || null;
}

function offeneMaengel() {
  return daten.maengel.filter(m => m.status === "offen").sort((a, b) => b.datum.localeCompare(a.datum));
}
function maengelText(n) { return n === 1 ? "1 offener Mangel" : n + " offene Mängel"; }
