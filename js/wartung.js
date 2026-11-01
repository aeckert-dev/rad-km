// Rad-km · Werkstatt (Berechnung): Fälligkeit, offene Aufträge, Standard-Zuordnung, Vorschläge
"use strict";

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

// Text zum Termin eines geplanten Auftrags
function terminText(termin, werkstatt, h) {
  const t = tageZwischen(h, termin);
  return "Termin am " + datumText(termin) + (werkstatt ? " bei " + werkstatt : "") +
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
    offene.push(offenerAuftrag({ id: null, wartungsartId: art.id, status: "geplant", termin: null, werkstatt: "", datum: null, kmStand: null,
      kmManuell: false, notiz: "", positionen: [], ausgeschlossen: [] }, art, true, h, regel));
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
    o.text = terminText(auftrag.termin, auftrag.werkstatt, h);
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
