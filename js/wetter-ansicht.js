// Rad-km · Wetter (Ansicht): Reiter Wetter, Kachel, Wetter-Einstellungen, Ampel-Grenzen, Kleidung, Rückmeldung
"use strict";

/* ---------- Wetter ---------- */

function ampelHtml(farbe) { return '<span class="ampel ' + farbe + '" aria-hidden="true"></span>'; }
// "● gelb: 70 % Regen ab 16:30, Böen 45 km/h"
function ampelText(b) {
  return ampelHtml(b.farbe) + '<strong>' + FARBWORT[b.farbe] + ':</strong> ' + esc(b.text.slice(FARBWORT[b.farbe].length + 2));
}
// "Heute, Di 27.10." bzw. "Mo 02.11."
function tagUeberschrift(datum, titel) { return titel === "Heute" || titel === "Morgen" ? titel + ", " + wochentag(datum) + " " + kurzDatum(datum) : titel; }
// Werte einer Fahrt (ohne Böen, die stehen in der Zeile zum Wind)
function werteText(w) {
  return gradText(w.temperatur) + " (gefühlt " + gradText(w.gefuehlt) + ") · Regen " +
    (w.regenWahrscheinlichkeit === null ? "" : w.regenWahrscheinlichkeit + " %, ") + zahl1.format(w.niederschlag) + " mm";
}
function tageswerteText(t) {
  return gradText(t.tmin) + " bis " + gradText(t.tmax) + (t.gefuehltMin === null ? "" : " (gefühlt " + gradText(t.gefuehltMin) + " bis " + gradText(t.gefuehltMax) + ")") +
    " · Regen " + (t.regenWahrscheinlichkeit === null ? "" : t.regenWahrscheinlichkeit + " %, ") + zahl1.format(t.niederschlag) + " mm · " +
    (t.wind === null ? "" : "Wind bis " + kmhText(t.wind) + ", ") + "Böen bis " + kmhText(t.boeen) + (t.gewitter ? " · Gewitter möglich" : "");
}
// "heute 10:00 – 18:00 Uhr", "heute 18:00 – morgen 03:00 Uhr"
function zeitraumText(wn, jetzt) {
  const h = isoAusDate(new Date(jetzt));
  const tag = ms => { const d = isoAusDate(new Date(ms)); return d === h ? "heute" : d === plusTage(h, 1) ? "morgen" : d === plusTage(h, -1) ? "gestern" : wochentag(d) + " " + kurzDatum(d); };
  if (wn.beginn === null && wn.ende === null) return "ohne Zeitangabe";
  const von = wn.beginn === null ? "bis jetzt" : tag(wn.beginn) + " " + uhrzeit(wn.beginn);
  if (wn.ende === null) return "ab " + von + " Uhr";
  const gleicherTag = wn.beginn !== null && tag(wn.beginn) === tag(wn.ende);
  return von + " – " + (gleicherTag ? "" : tag(wn.ende) + " ") + uhrzeit(wn.ende) + " Uhr";
}

function bildWetter(jetzt = Date.now()) {
  let a;
  try { a = wetterAnsicht(jetzt); }
  catch (e) { return '<div class="hinweis fehler" style="margin-top:8px">Das Wetter kann nicht angezeigt werden (' + esc(e.message) + ').</div>' + standKnopf(false); }
  if (a.leer) {
    return '<div class="hinweis info" style="margin-top:8px"><strong>Wetter für deinen Arbeitsweg</strong><br>' +
      'Lege Wohnort und Arbeitsort fest. Dann zeigt die App für deine Fahrtage Ampel, Kleidung, amtliche Warnungen, Wind und die beste Abfahrtszeit.' +
      '<div class="knopfreihe"><button type="button" class="primaer" data-action="ort-bearbeiten" data-rolle="wohnort">Wohnort festlegen</button>' +
      '<button type="button" data-action="ort-bearbeiten" data-rolle="arbeitsort">Arbeitsort festlegen</button></div></div>' +
      '<p class="klein">Orte und Fahrzeiten findest du auch unter Einstellungen → Wetter.</p>' + wegZuEinstellungen("Orte und Strecke", "orte");
  }
  let html = wetterHinweise(a, jetzt);
  if (!a.weitererOrt) html += rueckmeldungKarte(jetzt);
  const alt = a.quellen.vorhersage.aktuell ? "" : " veraltet";
  let warnungen;
  if (a.weitererOrt) {
    html += '<div class="karte" style="margin-top:8px"><div><strong>📍 ' + esc(a.orte[0].ort.name) + '</strong> <span class="klein">(weiterer Ort aktiv)</span></div>' +
      '<div class="klein">Wetter an diesem Ort, ohne Hin- und Rückfahrt.</div>' +
      '<div class="knopfreihe"><button type="button" data-action="weiterer-ort-aus">Zurück zu Wohn- und Arbeitsort</button></div></div>';
    a.tage.forEach(t => {
      html += '<h2>' + tagUeberschrift(t.datum, t.titel) + '</h2><div class="karte' + alt + '">' +
        (t.werte ? tageswerteText(t.werte) : '<span class="klein">Für diesen Tag liegt noch keine Vorhersage vor.</span>') + '</div>';
    });
    warnungen = [...new Set([...a.tage[0].warnungen, ...a.tage[1].warnungen])];
  } else {
    if (a.jetzt) {
      // Außerhalb der Fahrten: heute, eine Fahrt ab jetzt am Wohnort oder am aktuellen Standort
      const j = a.jetzt;
      html += '<h2 style="margin-top:8px">' + tagUeberschrift(j.heute.datum, "Heute") + (j.heute.fahrtag ? "" : " – kein Fahrtag") + '</h2>' +
        '<div class="karte"><div><strong>📍 ' + esc(j.ort.text) + '</strong></div>' + ortAusserhalbUmschalter(j.wahl, j.heimTitel) + '</div>' +
        (j.hinweis ? '<div class="hinweis warn">' + esc(j.hinweis) + '</div>' : "") +
        fahrtKarte(j.fahrt, alt) +
        (a.empfehlungAb ? '<div class="hinweis info">🕔 ' + esc(a.empfehlungAb) + ' (Hin- und Rückfahrt mit Ampel, Kleidung und Wind)</div>' : "");
    } else {
      html += '<h2 style="margin-top:8px">' + tagUeberschrift(a.tag.datum, a.tag.titel) + '</h2>';
      a.fahrten.forEach(f => { html += fahrtKarte(f, alt); });
      if (a.kleidungsHinweis) html += '<div class="hinweis info">👕 ' + esc(a.kleidungsHinweis) + '</div>';
    }
    warnungen = a.warnungen;
  }
  html += warnungenKarte(warnungen, a, jetzt);
  return html + standKarte(a, jetzt) + wegZuEinstellungen("Orte, Fahrzeiten, Kleidung", "", "e-wetter");
}

// Hinweise oben: Quelle nicht erreichbar, nicht aktuell, Ersatzquelle für die Warnungen
function wetterHinweise(a, jetzt) {
  const v = a.quellen.vorhersage, w = a.quellen.warnungen;
  const letzterStand = q => q.vorhanden ? " Angezeigt wird der letzte Stand von " + standText(q.stand, jetzt) + " – <strong>nicht aktuell</strong>." : "";
  let html = "";
  if (a.laeuft && !v.vorhanden) html += '<div class="hinweis info" style="margin-top:8px">Wetter wird geladen …</div>';
  if (v.fehler) {
    html += '<div class="hinweis fehler" style="margin-top:8px"><strong>Vorhersage nicht erreichbar</strong> (Open-Meteo: ' + esc(v.fehler) + ').' +
      (letzterStand(v) || " Es liegt noch keine Vorhersage vor.") + '</div>';
  } else if (v.vorhanden && !v.aktuell) {
    html += '<div class="hinweis warn" style="margin-top:8px"><strong>Nicht aktuell</strong> – Vorhersage Stand: ' + standText(v.stand, jetzt) + '.</div>';
  }
  if (w.fehler) {
    html += '<div class="hinweis fehler"><strong>Amtliche Warnungen nicht erreichbar</strong> (' + esc(w.fehler) + ').' +
      (letzterStand(w) || " Die Ampel berücksichtigt keine amtlichen Warnungen.") + '</div>';
  } else if (w.vorhanden && !w.aktuell) {
    html += '<div class="hinweis warn"><strong>Nicht aktuell</strong> – Warnungen Stand: ' + standText(w.stand, jetzt) + '.</div>';
  } else if (w.vorhanden && w.quelle === "brightsky") {
    html += '<div class="hinweis warn">Der GeoServer des DWD ist nicht erreichbar (' + esc(w.dwdFehler || "Fehler") + '). ' +
      'Die Warnungen kommen deshalb über <strong>Bright Sky</strong> (Ersatzquelle mit den Daten des DWD).</div>';
  }
  return html;
}

// Umschalter "Wohnort / Aktueller Standort" für das Wetter außerhalb der Fahrten (ein Tipp speichert die Einstellung)
function ortAusserhalbUmschalter(wahl, heimTitel = ORT_TITEL.wohnort) {
  const knopf = (wert, text) => '<button type="button" data-action="ort-ausserhalb" data-wert="' + wert + '" aria-pressed="' + (wahl === wert) + '"' +
    (wahl === wert ? ' class="aktiv"' : "") + '>' + text + '</button>';
  return '<div class="umschalter" role="group" aria-label="Wetter außerhalb der Fahrten">' + knopf("wohnort", heimTitel) + knopf("standort", "Aktueller Standort") + '</div>';
}

function fahrtKarte(f, alt) {
  const b = f.bewertung;
  let html = '<div class="karte' + (f.vorbei ? " veraltet" : alt) + '"><h3>' + f.name + ' <span class="klein">' + f.fahrt.von + '–' + f.fahrt.bis +
    (f.vorbei ? " · vorbei" : "") + '</span></h3>';
  if (!b) return html + '<div class="klein">Für diese Zeit liegt noch keine Vorhersage vor.</div></div>';
  html += '<div class="ampelzeile">' + ampelText(b) + '</div>';
  if (f.vorbei) return html + '</div>';
  html += '<div class="klein">' + werteText(b.werte) + '</div>' +
    '<div style="margin-top:6px">👕 Kleidung <span class="klein">(gefühlt ' + gradText(b.werte.gefuehlt) + ')</span></div>' + kleidungBereicheHtml(f.kleidung) +
    (f.wind ? windHtml(f.wind) : "") +
    (f.abfahrt && f.abfahrt.zeigen ? abfahrtHtml(f.abfahrt, f.fahrt.dauer) : "");
  return html + '</div>';
}

// Wind: erste Zeile mit Himmelsrichtung und Böen, darunter eingerückt je Teilstrecke,
// die zählt, zweizeilig: der Name klein, darunter eingerückt die Richtung relativ
// zur Fahrtrichtung in normaler Schrift (W15)
function windHtml(wind) {
  return '<div>🧭 ' + esc(wind.text) + '</div>' +
    (wind.teile.length ? '<div class="wind-teile">' + wind.teile.map(t =>
      '<div class="wind-teil"><div class="klein">' + esc(t.titel) + '</div><div class="wind-text">' + esc(t.text) + '</div></div>').join("") + '</div>' : "");
}
// Kleidung je Körperbereich; leere Bereiche entfallen, wegen Regen angepasste sind markiert
function kleidungBereicheHtml(kl) {
  return '<dl class="bereiche">' + BEREICHE.filter(([b]) => kl.bereiche[b]).map(([b, name]) => '<dt>' + name + '</dt><dd>' + esc(kl.bereiche[b]) +
    (kl.regenBereiche.includes(b) ? ' <span title="wegen Regen angepasst">☔</span>' : "") + '</dd>').join("") + '</dl>' +
    (kl.regenBereiche.length ? '<div class="klein">☔ wegen Regen angepasst: Regenzeug dazu, bei mehreren Teilen eine Schicht weniger (Zwiebelprinzip)</div>' : "");
}
// Zeitleiste der Viertelstunden (Farbe der Ampel), die beste Fahrt umrandet, darunter der Satz zur Abfahrt
function abfahrtHtml(ab, dauer) {
  const erste = ab.felder[0].minuten, letzte = ab.felder[ab.felder.length - 1].minuten + 15;
  const imBesten = m => m >= ab.beste.minuten && m < ab.beste.minuten + dauer;
  return '<div class="abfahrt"><div class="zeitleiste" role="img" aria-label="' + esc(ab.text) + '">' +
    ab.felder.map(x => '<span class="slot ' + (x.farbe || "leer") + (imBesten(x.minuten) ? " beste" : "") + '"></span>').join("") + '</div>' +
    '<div class="zeitachse"><span>' + uhrzeitAus(erste) + '</span><span>' + uhrzeitAus(Math.round((erste + letzte) / 30) * 15) + '</span><span>' + uhrzeitAus(letzte) + '</span></div>' +
    '<div>🕒 ' + esc(ab.text) + '</div></div>';
}

function warnungenKarte(liste, a, jetzt) {
  const q = a.quellen.warnungen;
  let html = '<h2>Amtliche Warnungen</h2><div class="karte' + (q.aktuell ? "" : " veraltet") + '">';
  if (!q.vorhanden) return html + '<div class="klein">Zurzeit nicht verfügbar.</div></div>';
  const gebiete = q.gebiete || [];
  if (!liste.length) html += '<div>Keine amtlichen Warnungen' + (a.weitererOrt ? " für heute und morgen" : "") + '.</div>';
  liste.forEach(wn => {
    html += '<div class="warnung stufe-' + wn.stufe + '"><div><strong>' + esc(wn.ereignis) + '</strong> <span class="klein">Stufe ' + wn.stufe +
      (wn.art === "gesundheit" ? " · nur zur Info" : "") + '</span></div>' +
      '<div class="klein">' + esc(zeitraumText(wn, jetzt)) + (a.orte.length > 1 && !a.jetzt ? " · " + wn.orte.join(", ") : "") + '</div>' +
      (wn.text ? '<div class="klein">' + esc(wn.text) + '</div>' : "") + '</div>';
  });
  gebiete.filter(x => x.abgedeckt === false).forEach(x => {
    html += '<div class="klein" style="margin-top:6px">Für ' + esc(x.name) + ' gibt es keine Warnungen des DWD (außerhalb Deutschlands).</div>';
  });
  // Warngebiete (Gemeinden des DWD); liegen beide Orte im selben, steht es nur einmal da
  const namen = [...new Set(gebiete.filter(x => x.gebiet).map(x => x.gebiet))];
  const zellen = namen.map(n => esc(n) + (namen.length > 1 ? " (" + gebiete.filter(x => x.gebiet === n).map(x => x.titel).join(", ") + ")" : ""));
  return html + '<div class="klein" style="margin-top:8px">Quelle: ' + QUELLEN_NAME[q.quelle] + (zellen.length ? " · Warngebiet " + zellen.join(", ") : "") +
    ' · Stand: ' + standText(q.stand, jetzt) + '</div></div>';
}

function standKnopf(laeuft) {
  return '<button type="button" class="voll" data-action="wetter-aktualisieren"' + (laeuft ? " disabled" : "") + '>' + (laeuft ? "Wird geladen …" : "Aktualisieren") + '</button>';
}
function standKarte(a, jetzt) {
  const v = a.quellen.vorhersage, w = a.quellen.warnungen;
  const teil = (name, q) => name + " " + (q.vorhanden ? standText(q.stand, jetzt) + (q.aktuell ? "" : " (nicht aktuell)") : "–");
  return '<p class="klein" style="margin-top:16px">Stand: ' + teil("Vorhersage", v) + ' · ' + teil("Warnungen", w) + '</p>' + standKnopf(a.laeuft) +
    '<p class="klein">Vorhersage: Open-Meteo.com (Modell ICON des Deutschen Wetterdienstes, CC BY 4.0). Amtliche Warnungen: Deutscher Wetterdienst' +
    (w.quelle === "brightsky" ? ", zurzeit über Bright Sky" : "") + '.</p>';
}

// Kachel auf der Übersicht: Ampeln der nächsten Fahrten; Antippen öffnet den Reiter Wetter
function wetterKachel(jetzt) {
  let a, inhalt;
  try { a = wetterAnsicht(jetzt); }
  catch (e) { return '<button type="button" class="karte wetter-kachel" data-action="tab" data-tab="wetter"><strong>🌦️ Wetter</strong> <span class="klein">kann nicht angezeigt werden</span></button>'; }
  if (a.leer) {
    inhalt = '<div><strong>🌦️ Wetter</strong></div><div class="klein">Wohn- und Arbeitsort festlegen, dann zeigt die App hier die Ampel für deine Fahrten.</div>';
  } else if (a.weitererOrt) {
    const t = a.tage[0];
    inhalt = '<div><strong>🌦️ ' + esc(a.orte[0].ort.name) + ', heute</strong></div><div class="klein">' + (t.werte ? tageswerteText(t.werte) : "noch keine Vorhersage") + '</div>';
  } else if (a.jetzt) {
    // Außerhalb der Fahrten: nur Ort und Ampel für eine Fahrt ab jetzt, keine weiteren Werte
    const j = a.jetzt, b = j.fahrt.bewertung;
    inhalt = '<div><strong>🌦️ Jetzt · ' + esc(j.ort.text) + '</strong></div>' +
      '<div>' + (b ? ampelText(b) : '<span class="klein">' + (a.laeuft ? "Wird geladen …" : "Noch keine Vorhersage") + '</span>') + '</div>' +
      (j.kurz ? '<div class="klein status-orange">📍 ' + esc(j.kurz) + '</div>' : "") +
      (a.empfehlungAb ? '<div class="klein">🕔 ' + esc(a.empfehlungAb) + '</div>' : "");
  } else {
    const offen = a.fahrten.filter(f => !f.vorbei);
    inhalt = '<div><strong>🌦️ ' + tagUeberschrift(a.tag.datum, a.tag.titel) + '</strong></div><div class="kachel-ampeln">' +
      offen.map(f => '<span>' + (f.art === "hinfahrt" ? "Hin" : "Rück") + ' ' + (f.bewertung ? ampelHtml(f.bewertung.farbe) + FARBWORT[f.bewertung.farbe] : "–") + '</span>').join("") + '</div>';
    const problem = offen.filter(f => f.bewertung && f.bewertung.farbe !== "gruen").sort((x, y) => (y.bewertung.farbe === "rot") - (x.bewertung.farbe === "rot"))[0];
    if (problem) inhalt += '<div class="klein">' + problem.name + ' ' + FARBWORT[problem.bewertung.farbe] + ': ' + esc(grundText(problem.bewertung.gruende[0])) + '</div>';
    if (!offen.some(f => f.bewertung)) inhalt += '<div class="klein">' + (a.laeuft ? "Wird geladen …" : "Noch keine Vorhersage") + '</div>';
  }
  if (!a.leer) {
    const v = a.quellen.vorhersage;
    if (v.vorhanden && !v.aktuell) inhalt += '<div class="klein status-orange">Nicht aktuell – Stand: ' + standText(v.stand, jetzt) + '</div>';
    if (a.quellen.warnungen.fehler) inhalt += '<div class="klein status-orange">Amtliche Warnungen nicht erreichbar</div>';
  }
  return '<button type="button" class="karte wetter-kachel" data-action="tab" data-tab="wetter">' + inhalt + '</button>';
}

// ---------- Wetter in den Einstellungen: Orte und Fahrzeiten ----------

// Einstellungen → Wetter: Zeilen auf der Hauptseite (Orte und „Außerhalb der
// Fahrten“ als Unterseiten, Fahrzeiten, Kleidung und Ampel-Grenzen als Fenster)
function wetterEinstellungen() {
  const w = daten.einstellungen.wetter;
  const fahrtZeile = (art, titel) => {
    const f = w[art];
    return '<div class="zeile"><button type="button" class="inhalt" data-action="fahrt-bearbeiten" data-art="' + art + '"><div class="text"><div>' + titel + ' ' + f.von + '–' + f.bis + '</div>' +
      '<div class="klein">' + (ueblicheAbfahrt(f) ? "übliche Abfahrt " + f.abfahrt : "keine übliche Abfahrt") + " · Dauer " + f.dauer + " min</div></div>" +
      '<span class="klein" style="padding-right:16px">›</span></button></div>';
  };
  const orte = [w.wohnort ? "Wohnort " + w.wohnort.name : "Wohnort nicht festgelegt",
    w.wegpunkte.length ? (w.wegpunkte.length === 1 ? "1 Wegpunkt" : w.wegpunkte.length + " Wegpunkte") : "",
    w.arbeitsort ? "Arbeitsort " + w.arbeitsort.name : "Arbeitsort nicht festgelegt",
    w.weitererOrt && w.weitererOrt.aktiv ? "weiterer Ort aktiv" : ""].filter(Boolean).join(" · ");
  return '<h2 id="e-wetter">Wetter</h2><div class="liste">' +
    seitenZeile("orte", "Orte und Strecke", orte) +
    seitenZeile("ausserhalb", "Wetter außerhalb der Fahrten", w.ortAusserhalb === "standort" ? "Aktueller Standort" : ORT_TITEL.wohnort) +
    fahrtZeile("hinfahrt", "Hinfahrt") + fahrtZeile("rueckfahrt", "Rückfahrt") +
    regelZeile("kleidung-bearbeiten", "Kleidung", kleidungKurztext(w.kleidung)) +
    regelZeile("ampel-bearbeiten", "Ampel-Grenzen", ampelKurztext(w.ampel)) + '</div>' +
    '<p class="klein">Ampel, Kleidung und Wind gelten für die Fahrzeit. Hin- und Rückfahrt eines Fahrtags zeigt der Reiter Wetter ab dem Ende der Rückfahrt am Vortag.</p>';
}

// Einstellungen → Orte und Strecke: Wohn- und Arbeitsort, Wegpunkte, Teilstrecken, weiterer Ort
function wetterOrteSeite() {
  const w = daten.einstellungen.wetter;
  const ortZeile = rolle => {
    const o = w[rolle];
    return '<div class="zeile"><button type="button" class="inhalt" data-action="ort-bearbeiten" data-rolle="' + rolle + '"><div class="text"><div>' + ORT_TITEL[rolle] +
      (rolle === "weitererOrt" && o && o.aktiv ? '<span class="abzeichen">aktiv</span>' : "") + '</div>' +
      '<div class="klein">' + (o ? esc(o.name) + " · " + koordinatenText(o) : "nicht festgelegt") + '</div></div>' +
      '<span class="klein" style="padding-right:16px">›</span></button></div>';
  };
  // Wegpunkte zwischen Wohn- und Arbeitsort, mit ▲/▼ für die Reihenfolge
  const wegpunktZeile = (o, i) => '<div class="zeile"><button type="button" class="inhalt" data-action="ort-bearbeiten" data-rolle="wegpunkt" data-i="' + i + '">' +
    '<div class="text"><div>' + wegpunktTitel(i) + '</div><div class="klein">' + esc(o.name) + " · " + koordinatenText(o) + '</div></div></button>' +
    '<div class="pfeile"><button type="button" class="symbol" data-action="wegpunkt-hoch" data-i="' + i + '" aria-label="Nach oben"' + (i === 0 ? " disabled" : "") + '>▲</button>' +
    '<button type="button" class="symbol" data-action="wegpunkt-runter" data-i="' + i + '" aria-label="Nach unten"' + (i === w.wegpunkte.length - 1 ? " disabled" : "") + '>▼</button></div></div>';
  const strecken = teilstrecken(w);
  const teilstreckenHtml = strecken.length ? '<h3 style="margin-top:16px">Teilstrecken für den Wind</h3><div class="karte">' + strecken.map((t, i) =>
    '<label class="haken"><input type="checkbox" data-change="teilstrecke-wind" data-i="' + i + '"' + (t.wind ? " checked" : "") + '>' +
    '<span>' + esc(teilstreckeTitel(t, false)) + '<br><span class="klein">' + zahl1.format(Math.round(t.laenge * 10) / 10) + ' km Luftlinie nach ' +
    HIMMELSRICHTUNGEN[Math.round(t.kursHin / 45) % 8] + ' · ' + (t.wind ? "zählt für den Wind" : "zählt nicht für den Wind") + '</span></span></label>').join("") +
    '<div class="feldhinweis">Der Reiter Wetter zeigt je Teilstrecke, die zählt, eine Zeile mit dem Wind relativ zu ihrer Fahrtrichtung (z. B. Gegenwind); ' +
    'die Rückfahrt in umgekehrter Reihenfolge und Richtung. ' +
    'Nimm z. B. eine Strecke durch ein Wohngebiet heraus.</div></div>' : "";
  return '<div class="liste" style="margin-top:8px">' + ortZeile("wohnort") + w.wegpunkte.map(wegpunktZeile).join("") + ortZeile("arbeitsort") + '</div>' +
    '<div class="knopfreihe"><button type="button" data-action="wegpunkt-neu"' + (w.wegpunkte.length >= MAX_WEGPUNKTE ? " disabled" : "") + '>+ Wegpunkt</button></div>' +
    '<div class="feldhinweis">Bis zu ' + MAX_WEGPUNKTE + ' Wegpunkte zwischen Wohn- und Arbeitsort, in Fahrtrichtung der Hinfahrt. Sie zählen für Wind, Temperatur, Regen und Warnungen, ' +
    'sobald Wohn- und Arbeitsort festgelegt sind.</div>' + teilstreckenHtml +
    '<div class="liste" style="margin-top:12px">' + ortZeile("weitererOrt") + '</div>' +
    (w.weitererOrt ? '<label class="haken"><input type="checkbox" data-change="weiterer-ort-aktiv"' + (w.weitererOrt.aktiv ? " checked" : "") + '>' +
      '<span>Weiteren Ort zeigen (aktiv)<br><span class="klein">Der Reiter Wetter zeigt dann das Wetter dort, ohne Hin- und Rückfahrt.</span></span></label>' : "") +
    '<p class="klein">Koordinaten (auch die der Wegpunkte) werden mit 4 Nachkommastellen gespeichert (ca. 10 m); an Open-Meteo (Vorhersage, Rückblick) und an den Deutschen Wetterdienst bzw. Bright Sky (Warnungen) ' +
    'gehen sie nur auf 3 Nachkommastellen gerundet (ca. 100 m). ' +
    'Für die Ortssuche geht nur der eingegebene Name an Open-Meteo.</p>';
}

// Einstellungen → Wetter außerhalb der Fahrten: Wohnort oder aktueller Standort
function wetterAusserhalbSeite() {
  const w = daten.einstellungen.wetter;
  return ortAusserhalbUmschalter(w.ortAusserhalb) +
    '<div class="feldhinweis">Zu allen Zeiten ohne Hin- und Rückfahrt zeigen Übersicht und Reiter Wetter die Ampel für eine Fahrt ab jetzt (Dauer wie die Hinfahrt): ' +
    'am Wohnort oder am aktuellen Standort des iPhones. Der Standort wird nur bestimmt, während diese Ansicht angezeigt wird; seine Koordinaten gehen auf 3 Nachkommastellen ' +
    'gerundet an Open-Meteo und den Deutschen Wetterdienst und werden nicht gespeichert. Ohne Freigabe, Ortung oder Netz gilt der Wohnort.</div>';
}

function regelZeile(aktion, titel, text) {
  return '<div class="zeile"><button type="button" class="inhalt" data-action="' + aktion + '"><div class="text"><div>' + titel + '</div>' +
    '<div class="klein">' + esc(text) + '</div></div><span class="klein" style="padding-right:16px">›</span></button></div>';
}
function kleidungKurztext(k) {
  const std = standardKleidung();
  return k.stufen.length + " Stufen · Regenzusatz " + (k.regen.length ? "ab " + k.regen.map(r => r.ab + " %").join(" / ") : "keiner") +
    " · Rückmeldung " + (k.rueckmeldung ? "an" : "aus") + (gleicherInhalt([k.stufen, k.regen], [std.stufen, std.regen]) ? " · Standard" : "");
}
function ampelKurztext(g) {
  return "Böen " + zahlFeld(g.gelbBoeen) + " / " + zahlFeld(g.rotBoeen) + " km/h · Niederschlag " + zahlFeld(g.gelbNiederschlag) + " / " + zahlFeld(g.rotStarkregen) +
    " mm/h · Regen ab " + zahlFeld(g.gelbRegenWahrscheinlichkeit) + " %" + (gleicherInhalt(g, standardAmpel()) ? " · Standard" : "");
}

// Zustand des Ort-Formulars; die Koordinaten stehen in den Feldern "Breite" und "Länge"
let formOrt = null; // { rolle, index (nur Wegpunkt; null = neu), treffer }

// Ort des Formulars: Wohnort, Arbeitsort, weiterer Ort oder ein Wegpunkt
function ortVon(rolle, index) {
  const w = daten.einstellungen.wetter;
  return rolle === "wegpunkt" ? (index === null ? null : w.wegpunkte[index] || null) : w[rolle];
}
function ortFormular(rolle, index = null) {
  const o = ortVon(rolle, index);
  const titel = rolle === "wegpunkt" ? (index === null ? "Neuer Wegpunkt" : wegpunktTitel(index)) : ORT_TITEL[rolle];
  formOrt = { rolle, index, treffer: [], titel };
  fensterOeffnen(
    '<h2>' + titel + '</h2>' +
    (rolle === "wegpunkt" ? '<p class="klein" style="margin-top:0">Ein Punkt auf deinem Weg zwischen Wohn- und Arbeitsort. Ein neuer Wegpunkt kommt ans Ende, direkt vor den Arbeitsort; ' +
      'die Reihenfolge änderst du in den Einstellungen mit ▲/▼.</p>' : "") +
    '<label for="o-suche">Ort suchen</label>' +
    '<div class="suchzeile"><input type="search" id="o-suche" enterkeyhint="search" autocomplete="off" placeholder="Name des Orts" data-enter="ort-suchen">' +
    '<button type="button" data-action="ort-suchen">Suchen</button></div>' +
    '<div id="o-treffer"></div>' +
    '<div class="knopfreihe"><button type="button" class="voll" data-action="ort-standort">📍 Aktueller Standort</button></div>' +
    '<label for="o-lat">Koordinaten (Breite und Länge in Grad)</label>' +
    // Ohne Zifferntastatur: auf dem iPhone fehlt dort das Minus (Süd und West)
    '<div class="suchzeile"><input type="text" id="o-lat" autocomplete="off" placeholder="Breite, z. B. 51,1234" aria-label="Breite" data-input="ort-karte" value="' + (o ? koordinateFeld(o.lat) : "") + '">' +
    '<input type="text" id="o-lon" autocomplete="off" placeholder="Länge, z. B. 10,4567" aria-label="Länge" data-input="ort-karte" value="' + (o ? koordinateFeld(o.lon) : "") + '"></div>' +
    '<div class="feldhinweis" id="o-gewaehlt">Aus der Suche, vom Standort oder direkt eingeben (Komma oder Punkt, Süd und West mit Minus).</div>' +
    // Öffnet Apple Karten mit den Werten in den Feldern (auch vor dem Speichern); vorher geht nichts an Apple
    '<div class="knopfreihe"><a class="knopf voll" id="o-karte" target="_blank" rel="noopener noreferrer">🗺️ In Karten zeigen</a></div>' +
    '<label for="o-name">Name (zur Anzeige)</label><input type="text" id="o-name" data-input="ort-karte" value="' + esc(o ? o.name : "") + '">' +
    (rolle === "weitererOrt" ? '<label class="haken"><input type="checkbox" id="o-aktiv"' + (o && o.aktiv ? " checked" : "") + '>' +
      '<span>Aktiv<br><span class="klein">Der Reiter Wetter zeigt dann das Wetter an diesem Ort (ohne Hin- und Rückfahrt).</span></span></label>' : "") +
    '<div class="feldhinweis">Gespeichert werden die Koordinaten mit 4 Nachkommastellen (ca. 10 m); an die Wetterdienste gehen sie nur auf 3 Nachkommastellen gerundet (ca. 100 m). ' +
    'Für die Suche geht nur der eingegebene Name an Open-Meteo. „In Karten zeigen“ öffnet Apple Karten an dieser Stelle; erst dann gehen Koordinaten und Name an Apple.</div>' +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Abbrechen</button>' +
    '<button type="button" class="primaer" data-action="ort-speichern">Speichern</button></div>' +
    (o ? '<div class="knopfreihe"><button type="button" class="gefahr voll" data-action="ort-entfernen">' + (rolle === "wegpunkt" ? "Wegpunkt entfernen" : "Ort entfernen") + '</button></div>' : "")
  );
  ortKarteAktualisieren();
}
// "In Karten zeigen" folgt den Feldern; ohne gültige Koordinaten ist der Knopf gesperrt.
// Ohne Namen trägt die Markierung die Bezeichnung des Orts (z. B. "Wohnort").
function ortKarteAktualisieren() {
  const a = document.getElementById("o-karte");
  if (!a || !formOrt) return;
  const lat = zahlLesen(wert("o-lat")), lon = zahlLesen(wert("o-lon"));
  if (lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    a.href = kartenUrl({ name: wert("o-name").trim() || formOrt.titel, lat, lon });
    a.removeAttribute("aria-disabled");
  } else {
    a.removeAttribute("href");
    a.setAttribute("aria-disabled", "true");
  }
}
function ortGewaehltAnzeigen(text) {
  const el = document.getElementById("o-gewaehlt");
  if (el) el.textContent = text;
}
// Koordinaten in die Felder übernehmen (auf 4 Nachkommastellen gerundet)
function ortKoordinatenSetzen(lat, lon, text) {
  document.getElementById("o-lat").value = koordinateFeld(lat);
  document.getElementById("o-lon").value = koordinateFeld(lon);
  ortGewaehltAnzeigen(text);
  ortKarteAktualisieren();
}
async function ortSuchen() {
  const text = wert("o-suche").trim();
  const ziel = document.getElementById("o-treffer");
  if (text.length < 2) { ziel.innerHTML = '<div class="feldhinweis warn">Bitte mindestens 2 Buchstaben eingeben.</div>'; return; }
  ziel.innerHTML = '<div class="feldhinweis">Suche …</div>';
  let treffer;
  try {
    treffer = ortsTrefferLesen(await jsonAbrufen(ortssucheUrl(text)));
  } catch (e) {
    if (document.getElementById("o-treffer")) ziel.innerHTML = '<div class="feldhinweis warn">Ortssuche nicht möglich (' + esc(e.message) + ').</div>';
    return;
  }
  // Fenster inzwischen geschlossen oder ein anderes geöffnet
  if (!formOrt || !document.getElementById("o-treffer")) return;
  formOrt.treffer = treffer;
  ziel.innerHTML = treffer.length
    ? '<div class="liste" style="margin-top:8px">' + treffer.map((t, i) => '<div class="zeile"><button type="button" class="inhalt" data-action="ort-waehlen" data-i="' + i + '">' +
        '<div class="text"><div>' + esc(t.name) + '</div><div class="klein">' + esc(t.zusatz) + '</div></div></button></div>').join("") + '</div>'
    : '<div class="feldhinweis warn">Kein Ort gefunden.</div>';
}
function ortWaehlen(i) {
  const t = formOrt.treffer[i];
  if (!t) return;
  document.getElementById("o-name").value = t.name;
  document.getElementById("o-treffer").innerHTML = "";
  ortKoordinatenSetzen(t.lat, t.lon, "Übernommen aus der Suche: " + t.name + (t.zusatz ? ", " + t.zusatz : "") + ".");
}
function ortStandort() {
  if (!navigator.geolocation) { ortGewaehltAnzeigen("Der Standort ist auf diesem Gerät nicht verfügbar."); return; }
  ortGewaehltAnzeigen("Standort wird bestimmt …");
  navigator.geolocation.getCurrentPosition(pos => {
    if (!formOrt || !document.getElementById("o-name")) return;
    const name = document.getElementById("o-name");
    if (!name.value.trim()) name.value = "Aktueller Standort";
    ortKoordinatenSetzen(pos.coords.latitude, pos.coords.longitude, "Übernommen vom aktuellen Standort (auf 4 Nachkommastellen gerundet).");
  }, err => {
    ortGewaehltAnzeigen("Standort nicht verfügbar" + (err && err.code === 1 ? " (Zugriff nicht erlaubt)." : "."));
  }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 });
}
function ortSpeichern() {
  const name = wert("o-name").trim();
  const lat = zahlLesen(wert("o-lat")), lon = zahlLesen(wert("o-lon"));
  if (lat === null || lon === null) { alert("Bitte einen Ort suchen und auswählen, den aktuellen Standort verwenden oder Breite und Länge eingeben, z. B. 51,1234 und 10,4567."); return; }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) { alert("Die Breite muss zwischen −90 und 90 liegen, die Länge zwischen −180 und 180."); return; }
  if (!name) { alert("Bitte einen Namen für den Ort eingeben."); return; }
  const ort = { name, lat: koordinateSpeichern(lat), lon: koordinateSpeichern(lon) };
  const w = daten.einstellungen.wetter;
  if (formOrt.rolle === "wegpunkt") {
    if (formOrt.index !== null) w.wegpunkte[formOrt.index] = ort;
    else {
      if (w.wegpunkte.length >= MAX_WEGPUNKTE) { alert("Es sind höchstens " + MAX_WEGPUNKTE + " Wegpunkte möglich."); return; }
      // Neuer Wegpunkt vor dem Arbeitsort: Die letzte Teilstrecke wird geteilt, beide Teile zählen wie bisher
      w.wegpunkte.push(ort);
      w.windTeilstrecken.splice(w.windTeilstrecken.length - 1, 0, w.windTeilstrecken[w.windTeilstrecken.length - 1]);
    }
  } else {
    if (formOrt.rolle === "weitererOrt") ort.aktiv = document.getElementById("o-aktiv").checked;
    w[formOrt.rolle] = ort;
  }
  if (speichern()) { fensterSchliessen(); zeichnen(); meldung(formOrt.rolle === "wegpunkt" ? "Wegpunkt gespeichert" : "Ort gespeichert"); wetterBeiBedarf(); }
}
async function ortEntfernen() {
  const { rolle, index } = formOrt;
  const w = daten.einstellungen.wetter, o = ortVon(rolle, index);
  if (!o) return;
  const titel = rolle === "wegpunkt" ? wegpunktTitel(index) : ORT_TITEL[rolle];
  if (!await frage(titel + " „" + esc(o.name) + "“ wirklich entfernen?", "Entfernen", "Abbrechen", true)) return;
  if (rolle === "wegpunkt") {
    // Die beiden Teilstrecken am Wegpunkt werden eine; sie zählt, wenn eine der beiden zählte
    w.wegpunkte.splice(index, 1);
    w.windTeilstrecken.splice(index, 2, w.windTeilstrecken[index] || w.windTeilstrecken[index + 1]);
  } else w[rolle] = null;
  if (speichern()) { fensterSchliessen(); zeichnen(); meldung(rolle === "wegpunkt" ? "Wegpunkt entfernt" : "Ort entfernt"); wetterBeiBedarf(); }
}
// Reihenfolge der Wegpunkte; die Schalter der Teilstrecken bleiben an ihrer Stelle
function wegpunktVerschieben(i, richtung) {
  const wp = daten.einstellungen.wetter.wegpunkte, j = i + richtung;
  if (j < 0 || j >= wp.length) return;
  [wp[i], wp[j]] = [wp[j], wp[i]];
  if (speichern()) { zeichnen(); wetterBeiBedarf(); }
}
// Teilstrecke zählt für den Wind (Schalter in den Einstellungen, sofort gespeichert)
function teilstreckeWind(i, an) {
  const t = daten.einstellungen.wetter.windTeilstrecken;
  if (!(i >= 0 && i < t.length)) return;
  t[i] = an;
  if (speichern()) { zeichnen(); meldung(an ? "Teilstrecke zählt für den Wind" : "Teilstrecke zählt nicht für den Wind"); }
}
// Wetter außerhalb der Fahrten: Wohnort oder aktueller Standort (Reiter Wetter und
// Einstellungen). Im Reiter Wetter und auf der Übersicht wird der Standort sofort
// bestimmt (auch erneut, wenn er schon gewählt ist, z. B. nach einer Ablehnung).
function ortAusserhalbSetzen(wahl) {
  const w = daten.einstellungen.wetter;
  if (!ORT_AUSSERHALB.includes(wahl)) return Promise.resolve();
  if (w.ortAusserhalb !== wahl) {
    w.ortAusserhalb = wahl;
    if (!speichern()) return Promise.resolve();
    meldung(wahl === "standort" ? "Wetter außerhalb der Fahrten: aktueller Standort" : "Wetter außerhalb der Fahrten: Wohnort");
  }
  zeichnen();
  return wahl === "standort" ? standortBeiBedarf(true) : Promise.resolve();
}
// Weiterer Ort an/aus (Einstellungen und Reiter Wetter)
function weitererOrtAktiv(aktiv) {
  const o = daten.einstellungen.wetter.weitererOrt;
  if (!o) return;
  o.aktiv = aktiv;
  if (speichern()) { zeichnen(); meldung(aktiv ? "Weiterer Ort aktiv" : "Wieder Wohn- und Arbeitsort"); wetterBeiBedarf(); }
}

// Fahrzeit (Hin- oder Rückfahrt): Zeitraum, übliche Abfahrt, Dauer
let formFahrt = null; // "hinfahrt" | "rueckfahrt"
function fahrtFormular(art) {
  const f = daten.einstellungen.wetter[art];
  formFahrt = art;
  fensterOeffnen(
    '<h2>' + (art === "hinfahrt" ? "Hinfahrt" : "Rückfahrt") + '</h2>' +
    '<label for="fz-von">Fahrzeit von</label><input type="time" id="fz-von" value="' + f.von + '">' +
    '<label for="fz-bis">bis</label><input type="time" id="fz-bis" value="' + f.bis + '">' +
    '<div class="feldhinweis">Für diesen Zeitraum gelten Ampel, Kleidung und Wind.' +
    (art === "rueckfahrt" ? " Nach seinem Ende zeigt der Reiter Wetter den nächsten Fahrtag." : "") + '</div>' +
    // Schalter und Uhrzeit (das Uhrzeitfeld lässt sich auf dem iPhone nicht leeren)
    '<label class="haken"><input type="checkbox" id="fz-abfahrt-an" data-change="fahrt-abfahrt-an"' + (f.abfahrtAn ? " checked" : "") + '><span>Übliche Abfahrt</span></label>' +
    '<label for="fz-abfahrt">Uhrzeit der üblichen Abfahrt</label><input type="time" id="fz-abfahrt" value="' + f.abfahrt + '"' + (f.abfahrtAn ? "" : " disabled") + '>' +
    '<label for="fz-dauer">Dauer der Fahrt (Minuten)</label><input type="text" id="fz-dauer" inputmode="numeric" value="' + f.dauer + '">' +
    '<div class="feldhinweis">Für das beste Abfahrtsfenster prüft die App Abfahrten im 15-Minuten-Raster von 30 Minuten vor bis 30 Minuten nach der Fahrzeit. ' +
    'Mit üblicher Abfahrt (Schalter an) heißt es z. B. „Abfahrt 15:45 statt 16:00“; aus: Die App nennt die beste Abfahrt und die Zeit, die du meiden solltest.</div>' +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Abbrechen</button>' +
    '<button type="button" class="primaer" data-action="fahrt-speichern">Speichern</button></div>'
  );
}
function fahrtSpeichern() {
  const alt = daten.einstellungen.wetter[formFahrt];
  const von = wert("fz-von").slice(0, 5), bis = wert("fz-bis").slice(0, 5), abfahrtAn = document.getElementById("fz-abfahrt-an").checked;
  // Leeres Uhrzeitfeld (z. B. "Zurücksetzen" auf dem iPhone): die bisherige Uhrzeit bleibt
  const abfahrt = wert("fz-abfahrt").slice(0, 5) || alt.abfahrt;
  const dauerText = wert("fz-dauer").trim(), dauer = Number(dauerText);
  if (!istUhrzeit(von) || !istUhrzeit(bis)) { alert("Bitte Beginn und Ende der Fahrzeit als Uhrzeit eingeben, z. B. 06:00."); return; }
  if (von >= bis) { alert("Der Beginn der Fahrzeit muss vor ihrem Ende liegen."); return; }
  if (!istUhrzeit(abfahrt)) { alert("Die übliche Abfahrt muss eine Uhrzeit sein, z. B. 16:00."); return; }
  if (!(/^\d+$/.test(dauerText) && dauer >= 5 && dauer <= 240)) { alert("Bitte die Dauer in Minuten von 5 bis 240 eingeben, z. B. 60."); return; }
  daten.einstellungen.wetter[formFahrt] = { von, bis, abfahrtAn, abfahrt, dauer };
  if (speichern()) { fensterSchliessen(); zeichnen(); meldung("Fahrzeit gespeichert"); }
}

// ---------- Ampel-Grenzen (Einstellungen → Wetter) ----------

// [Feld, Gruppe, Bezeichnung, Einheit, Tastatur]; Temperaturen dürfen negativ sein (iPhone: keine Zifferntastatur)
const AMPEL_FELDER = [
  ["gelbRegenWahrscheinlichkeit", "Regen", "Gelb ab Regenwahrscheinlichkeit", "%", "decimal"],
  ["gelbNiederschlag", "Regen", "Gelb ab Niederschlag", "mm/h", "decimal"],
  ["rotStarkregen", "Regen", "Rot ab Niederschlag (Starkregen)", "mm/h", "decimal"],
  ["gelbBoeen", "Böen", "Gelb ab Böen", "km/h", "decimal"],
  ["rotBoeen", "Böen", "Rot ab Böen", "km/h", "decimal"],
  ["gelbTemperatur", "Temperatur und Glätte", "Gelb bei Temperatur unter", "°C", ""],
  ["glaetteTemperatur", "Temperatur und Glätte", "Glätte möglich bis Lufttemperatur", "°C", ""]
];
function ampelFormular() {
  const g = daten.einstellungen.wetter.ampel;
  let gruppe = "";
  const felder = AMPEL_FELDER.map(([feld, gr, text, einheit, tastatur]) =>
    (gr !== gruppe ? (gruppe = gr, '<h3 style="margin-top:16px">' + gr + '</h3>') : "") +
    '<label for="ag-' + feld + '">' + text + ' (' + einheit + ')</label>' +
    '<input type="text" id="ag-' + feld + '"' + (tastatur ? ' inputmode="' + tastatur + '"' : "") + ' autocomplete="off" value="' + zahlFeld(g[feld]) + '">').join("");
  fensterOeffnen(
    '<h2>Ampel-Grenzen</h2><p class="klein" style="margin-top:0">Gelten für die Ampel jeder Fahrt; gelb unter rot. ' +
    'Das schon in Einträgen gespeicherte Wetter bleibt, wie es ist.</p>' + felder +
    '<div class="feldhinweis">Glätte: kalt (Luft bis zu dieser Temperatur oder Boden höchstens 0 °C) und nass.</div>' +
    '<h3 style="margin-top:16px">Amtliche Warnungen</h3><label for="ag-rotWarnstufe">Rot ab</label><select id="ag-rotWarnstufe">' +
    [1, 2, 3, 4].map(n => '<option value="' + n + '"' + (g.rotWarnstufe === n ? " selected" : "") + '>Stufe ' + n + '</option>').join("") + '</select>' +
    '<div class="feldhinweis">Niedrigere Stufen sind gelb. Warnungen vor Gewitter und Glätte sind bei jeder Stufe rot, Hitze und UV nur zur Info.</div>' +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Abbrechen</button>' +
    '<button type="button" class="primaer" data-action="ampel-speichern">Speichern</button></div>' +
    '<div class="knopfreihe"><button type="button" class="voll" data-action="ampel-standard">Auf Standard zurücksetzen</button></div>'
  );
}
function ampelSpeichern() {
  const g = standardAmpel();
  for (const [feld, , text] of AMPEL_FELDER) {
    const v = zahlLesen(wert("ag-" + feld));
    if (v === null) { alert("Bitte bei „" + text + "“ eine Zahl eingeben."); return; }
    g[feld] = v;
  }
  g.rotWarnstufe = Number(wert("ag-rotWarnstufe"));
  if (!(g.gelbRegenWahrscheinlichkeit >= 0 && g.gelbRegenWahrscheinlichkeit <= 100)) { alert("Die Regenwahrscheinlichkeit muss zwischen 0 und 100 % liegen."); return; }
  if (!(g.gelbNiederschlag > 0 && g.gelbNiederschlag < g.rotStarkregen)) { alert("Beim Niederschlag muss die Grenze für Gelb größer als 0 und kleiner als die für Rot sein."); return; }
  if (!(g.gelbBoeen > 0 && g.gelbBoeen < g.rotBoeen)) { alert("Bei den Böen muss die Grenze für Gelb größer als 0 und kleiner als die für Rot sein."); return; }
  daten.einstellungen.wetter.ampel = g;
  if (speichern()) { fensterSchliessen(); zeichnen(); meldung("Ampel-Grenzen gespeichert"); }
}
async function ampelStandard() {
  if (!await frage("Ampel-Grenzen auf die Standardwerte zurücksetzen?", "Zurücksetzen", "Abbrechen")) return;
  mitRueckgaengig(() => { daten.einstellungen.wetter.ampel = standardAmpel(); }, "Ampel-Grenzen zurückgesetzt");
}

// ---------- Kleidungsregeln (Einstellungen → Wetter) ----------

// Bereich einer Stufe: "ab 20 °C", "7–11 °C", "unter −6 °C"
function stufeBereich(k, i) {
  const s = k.stufen[i], oben = k.stufen[i - 1];
  const grenze = x => minus(zahlFeld(x.ab));
  if (s.ab === null) return "unter " + grenze(oben) + " °C";
  return oben ? grenze(s) + "–" + grenze(oben) + " °C" : "ab " + grenze(s) + " °C";
}
// Kurztext je Bereich für die Liste: "Oberkörper T-Shirt · Beine kurze Hose"
function bereicheKurz(bereiche) {
  return BEREICHE.filter(([b]) => bereiche[b]).map(([b, name]) => name + " " + bereiche[b]).join(" · ");
}
// Eingabefelder der sechs Bereiche (in den Einstellungen immer alle)
function bereichFelder(praefix, bereiche) {
  return BEREICHE.map(([b, name]) => '<label for="' + praefix + '-' + b + '">' + name + '</label>' +
    '<input type="text" id="' + praefix + '-' + b + '" autocomplete="off" placeholder="leer = nichts" value="' + esc(bereiche[b]) + '">').join("");
}
function bereicheLesen(praefix) {
  return Object.fromEntries(BEREICH_SCHLUESSEL.map(b => [b, teileVon(wert(praefix + "-" + b)).join(", ")]));
}

// Übersicht der Kleidungsregeln: Schalter für die Rückmeldung, Stufen mit
// Auswertung der Rückmeldungen, Regenzusatz. Jede Stufe und jeder Regenzusatz
// hat ein eigenes Formular; Änderungen werden dort sofort gespeichert.
function kleidungFormular() {
  const k = daten.einstellungen.wetter.kleidung, aus = rueckmeldungenAuswerten();
  const frueher = Object.keys(aus).filter(id => !k.stufen.some(s => s.id === id)).reduce((x, id) => x + aus[id].anzahl, 0);
  const zeile = (aktion, i, titel, unten) => '<div class="zeile"><button type="button" class="inhalt" data-action="' + aktion + '" data-i="' + i + '">' +
    '<div class="text"><div>' + titel + '</div>' + unten.map(u => '<div class="klein umbrechen">' + u + '</div>').join("") + '</div>' +
    '<span class="klein" style="padding-right:16px">›</span></button></div>';
  fensterOeffnen(
    '<h2>Kleidung</h2>' +
    '<label class="haken"><input type="checkbox" id="k-rueckmeldung" data-change="kleidung-rueckmeldung"' + (k.rueckmeldung ? " checked" : "") + '>' +
    '<span>Rückmeldung zur Kleidung<br><span class="klein">Karte „Wie war die Kleidung?“ im Reiter Wetter und die Knöpfe in den Einträgen. ' +
    'Ausgeschaltet bleiben gegebene Rückmeldungen und die Auswertung erhalten.</span></span></label>' +
    '<h3 style="margin-top:16px">Stufen</h3><p class="klein" style="margin-top:0">Nach der niedrigsten gefühlten Temperatur der Fahrt, von warm nach kalt. ' +
    'Eine Stufe gilt ab ihrer Grenze, die letzte darunter. Antippen zum Ändern.</p>' +
    '<div class="liste">' + k.stufen.map((s, i) => zeile("kleidung-stufe", i, stufeBereich(k, i),
      [esc(bereicheKurz(s.bereiche)) + (s.haendeBeiRegen ? " · bei Regen Hände " + esc(s.haendeBeiRegen) : ""), "Rückmeldungen: " + auswertungText(aus[s.id])])).join("") + '</div>' +
    (frueher ? '<p class="klein">' + (frueher === 1 ? "1 Rückmeldung" : frueher + " Rückmeldungen") + ' zu früheren Stufen (gibt es nicht mehr, werden nicht zugeordnet).</p>' : "") +
    '<div class="knopfreihe"><button type="button" data-action="kleidung-stufe-neu">+ Stufe</button></div>' +
    '<h3 style="margin-top:16px">Regenzusatz</h3><p class="klein" style="margin-top:0">Ab dieser Regenwahrscheinlichkeit kommt das Regenzeug in seinem Bereich dazu. ' +
    'Zwiebelprinzip: In Oberkörper, Beinen und Füßen gilt dann bei mehreren Teilen die Kleidung der nächstwärmeren Stufe (eine Schicht weniger); ' +
    'steht das Regenzeug schon in der Stufe, bleibt der Bereich, wie er ist. Kopf, Hals und Hände bleiben wie in der Stufe („Hände bei Regen“ je Stufe).</p>' +
    (k.regen.length ? '<div class="liste">' + k.regen.map((r, i) => zeile("kleidung-regen", i, "ab " + zahlFeld(r.ab) + " %", [esc(bereicheKurz(r.bereiche))])).join("") + '</div>'
      : '<div class="liste"><div class="leer">Kein Regenzusatz.</div></div>') +
    '<div class="knopfreihe"><button type="button" data-action="kleidung-regen-neu">+ Regenzusatz</button></div>' +
    '<div class="knopfreihe"><button type="button" class="primaer" data-action="fenster-zu">Fertig</button></div>' +
    '<div class="knopfreihe"><button type="button" class="voll" data-action="kleidung-standard">Auf Standard zurücksetzen</button></div>'
  );
}
// Schalter "Rückmeldung zur Kleidung" (sofort gespeichert; Rückmeldungen und Auswertung bleiben)
function kleidungRueckmeldungSchalten(an) {
  daten.einstellungen.wetter.kleidung.rueckmeldung = an;
  if (speichern()) { zeichnen(); meldung(an ? "Rückmeldung zur Kleidung an" : "Rückmeldung zur Kleidung aus – deine Rückmeldungen bleiben gespeichert"); }
}
function rueckmeldungAn() { return daten.einstellungen.wetter.kleidung.rueckmeldung; }

// Formular einer Stufe (i = Nummer in der Liste; null = neue Stufe)
function kleidungStufeFormular(i) {
  const k = daten.einstellungen.wetter.kleidung, n = k.stufen.length;
  const neu = i === null, letzte = !neu && i === n - 1;
  const vorschlag = k.stufen[n - 2].ab - 3;
  const s = neu ? { ab: vorschlag, bereiche: bereicheAus(), haendeBeiRegen: null } : k.stufen[i];
  const z = neu ? null : rueckmeldungenAuswerten()[s.id];
  fensterOeffnen(
    '<h2>' + (neu ? "Neue Stufe" : "Stufe " + stufeBereich(k, i)) + '</h2>' +
    (letzte ? '<p class="klein" style="margin-top:0">Die letzte Stufe gilt unterhalb der vorigen (' + stufeBereich(k, i) + ').</p>'
      : '<label for="ks-ab">Ab gefühlter Temperatur (°C)</label><input type="text" id="ks-ab" class="kurzfeld" autocomplete="off" value="' + zahlFeld(s.ab) + '">' +
        '<div class="feldhinweis">Ein Grenzwert gehört zu dieser Stufe; die Stufen werden nach ihrer Grenze sortiert.</div>') +
    bereichFelder("ks", s.bereiche) +
    '<label for="ks-haende-regen">Hände bei Regen (optional)</label>' +
    '<input type="text" id="ks-haende-regen" autocomplete="off" placeholder="leer = wie bei Hände" value="' + esc(s.haendeBeiRegen || "") + '">' +
    '<div class="feldhinweis">Gilt statt „Hände“, sobald ein Regenzusatz greift, z. B. regenfeste Handschuhe. Mehrere Teile mit Komma trennen.</div>' +
    (z ? '<p class="klein">Rückmeldungen: ' + auswertungText(z) + '</p>' : "") +
    '<div class="knopfreihe"><button type="button" data-action="kleidung-bearbeiten">Abbrechen</button>' +
    '<button type="button" class="primaer" data-action="kleidung-stufe-speichern" data-i="' + (neu ? "" : i) + '">Speichern</button></div>' +
    (!neu && n > 2 ? '<div class="knopfreihe"><button type="button" class="gefahr voll" data-action="kleidung-stufe-weg" data-i="' + i + '">Stufe entfernen</button></div>' : "")
  );
}
function kleidungStufeSpeichern(iText) {
  const k = daten.einstellungen.wetter.kleidung, n = k.stufen.length;
  const i = iText === "" ? null : Number(iText), letzte = i !== null && i === n - 1;
  const ab = letzte ? null : zahlLesen(wert("ks-ab"));
  if (!letzte && ab === null) { alert("Bitte die gefühlte Temperatur eingeben, ab der die Stufe gilt, z. B. 7 oder −2."); return; }
  const bereiche = bereicheLesen("ks");
  if (!BEREICH_SCHLUESSEL.some(b => bereiche[b])) { alert("Bitte mindestens einen Bereich ausfüllen (Kopf, Hals, Hände, Oberkörper, Beine oder Füße)."); return; }
  const andere = k.stufen.filter((s, j) => j !== i);
  if (!letzte && andere.some(s => s.ab === ab)) { alert("Es gibt schon eine Stufe ab " + minus(zahlFeld(ab)) + " °C."); return; }
  const stufe = { id: i === null ? "s" + neueId() : k.stufen[i].id, ab, bereiche, haendeBeiRegen: teileVon(wert("ks-haende-regen")).join(", ") || null };
  // Nach der Grenze sortieren; die Stufe "darunter" bleibt die letzte
  const darunter = letzte ? stufe : andere.find(s => s.ab === null);
  const stufen = andere.filter(s => s.ab !== null).concat(letzte ? [] : [stufe]).sort((a, b) => b.ab - a.ab).concat(darunter);
  if (!kleidungPruefen({ stufen, regen: k.regen, rueckmeldung: k.rueckmeldung })) return;
  k.stufen = stufen;
  if (speichern()) { kleidungFormular(); zeichnen(); meldung(i === null ? "Stufe hinzugefügt" : "Stufe gespeichert"); }
}
async function kleidungStufeWeg(i) {
  const k = daten.einstellungen.wetter.kleidung;
  if (k.stufen.length <= 2 || !k.stufen[i]) return;
  const letzte = i === k.stufen.length - 1;
  const text = "Stufe „" + esc(stufeBereich(k, i)) + "“ entfernen?" +
    (letzte ? " Die Stufe " + esc(stufeBereich(k, i - 1)) + " gilt dann darunter." : "");
  if (!await frage(text, "Entfernen", "Abbrechen", true)) return;
  mitRueckgaengig(() => {
    const st = daten.einstellungen.wetter.kleidung.stufen;
    st.splice(i, 1);
    st[st.length - 1].ab = null;
  }, "Stufe entfernt", () => kleidungFormular());
}

// Formular eines Regenzusatzes (i = Nummer; null = neu)
function kleidungRegenFormular(i) {
  const k = daten.einstellungen.wetter.kleidung, neu = i === null;
  const r = neu ? { ab: k.regen.length ? Math.min(100, k.regen[k.regen.length - 1].ab + 10) : 40, bereiche: bereicheAus() } : k.regen[i];
  fensterOeffnen(
    '<h2>' + (neu ? "Neuer Regenzusatz" : "Regenzusatz ab " + zahlFeld(r.ab) + " %") + '</h2>' +
    '<label for="kr-ab">Ab Regenwahrscheinlichkeit (%)</label><input type="text" id="kr-ab" class="kurzfeld" inputmode="numeric" autocomplete="off" value="' + zahlFeld(r.ab) + '">' +
    '<div class="feldhinweis">Das Regenzeug kommt in seinem Bereich dazu (siehe Zwiebelprinzip in der Übersicht).</div>' +
    bereichFelder("kr", r.bereiche) +
    '<div class="knopfreihe"><button type="button" data-action="kleidung-bearbeiten">Abbrechen</button>' +
    '<button type="button" class="primaer" data-action="kleidung-regen-speichern" data-i="' + (neu ? "" : i) + '">Speichern</button></div>' +
    (neu ? "" : '<div class="knopfreihe"><button type="button" class="gefahr voll" data-action="kleidung-regen-weg" data-i="' + i + '">Regenzusatz entfernen</button></div>')
  );
}
function kleidungRegenSpeichern(iText) {
  const k = daten.einstellungen.wetter.kleidung, i = iText === "" ? null : Number(iText);
  const ab = zahlLesen(wert("kr-ab"));
  if (ab === null || ab < 0 || ab > 100) { alert("Bitte eine Regenwahrscheinlichkeit von 0 bis 100 % eingeben."); return; }
  const bereiche = bereicheLesen("kr");
  if (!BEREICH_SCHLUESSEL.some(b => bereiche[b])) { alert("Bitte das Regenzeug in mindestens einem Bereich eintragen, z. B. Oberkörper „Regenjacke“."); return; }
  const andere = k.regen.filter((r, j) => j !== i);
  if (andere.some(r => r.ab === ab)) { alert("Es gibt schon einen Regenzusatz ab " + zahlFeld(ab) + " %. Trage das Regenzeug dort ein."); return; }
  const regen = andere.concat({ ab, bereiche }).sort((a, b) => a.ab - b.ab);
  if (!kleidungPruefen({ stufen: k.stufen, regen, rueckmeldung: k.rueckmeldung })) return;
  k.regen = regen;
  if (speichern()) { kleidungFormular(); zeichnen(); meldung(i === null ? "Regenzusatz hinzugefügt" : "Regenzusatz gespeichert"); }
}
async function kleidungRegenWeg(i) {
  const k = daten.einstellungen.wetter.kleidung;
  if (!k.regen[i]) return;
  if (!await frage("Regenzusatz ab " + zahlFeld(k.regen[i].ab) + " % entfernen?", "Entfernen", "Abbrechen", true)) return;
  mitRueckgaengig(() => { daten.einstellungen.wetter.kleidung.regen.splice(i, 1); }, "Regenzusatz entfernt", () => kleidungFormular());
}
// Dieselben Regeln wie beim Einlesen einer Sicherung
function kleidungPruefen(neu) {
  try { wetterPruefen(Object.assign({}, daten.einstellungen.wetter, { kleidung: neu }), msg => { throw new Error(msg); }); return true; }
  catch (e) { alert("Bitte prüfen: " + e.message.replace(/^Wetter, Kleidung(: |, )/, "")); return false; }
}
async function kleidungStandard() {
  if (!await frage("Kleidungsregeln (Stufen und Regenzusatz) auf die Standardwerte zurücksetzen? Deine Rückmeldungen bleiben gespeichert.", "Zurücksetzen", "Abbrechen")) return;
  mitRueckgaengig(() => {
    const k = daten.einstellungen.wetter.kleidung, std = standardKleidung();
    Object.assign(k, { stufen: std.stufen, regen: std.regen });
  }, "Kleidungsregeln zurückgesetzt", () => kleidungFormular());
}

// ---------- Rückmeldung nach einer Fahrt ----------

const RUECKMELDUNG_TEXT = { "zu-warm": "zu warm", "passte": "passte", "zu-kalt": "zu kalt" };
// Rückmeldungen aus allen Einträgen je Kleidungsstufe (id), getrennt auch die
// Fahrten mit Regenkleidung: { id: { anzahl, "zu-warm", passte, "zu-kalt", regen: { … } } }
function rueckmeldungenAuswerten() {
  const leer = () => ({ anzahl: 0, "zu-warm": 0, passte: 0, "zu-kalt": 0 });
  const erg = {};
  daten.eintraege.forEach(e => e.wetter && ["hin", "rueck"].forEach(art => {
    const f = e.wetter[art];
    if (!f || !f.kleidung || !f.rueckmeldung) return;
    const z = erg[f.kleidung] || (erg[f.kleidung] = Object.assign(leer(), { regen: leer() }));
    z.anzahl++; z[f.rueckmeldung]++;
    if (f.regenkleidung) { z.regen.anzahl++; z.regen[f.rueckmeldung]++; }
  }));
  return erg;
}
// "3× zu kalt, 1× passte (bei Regen: 1× zu kalt)"
function auswertungText(z) {
  if (!z || !z.anzahl) return "noch keine";
  const teil = x => ["zu-kalt", "passte", "zu-warm"].filter(u => x[u]).map(u => x[u] + "× " + RUECKMELDUNG_TEXT[u]).join(", ");
  return teil(z) + (z.regen.anzahl ? " (bei Regen: " + teil(z.regen) + ")" : "");
}
// Rückmeldung zu einer Fahrt eines Eintrags (mit "Rückgängig"). Sie wird nur
// gespeichert und ausgewertet; die Grenzen der Stufen bleiben, wie sie sind.
function rueckmeldungGeben(id, fahrt, urteil, ausDetail) {
  const e = daten.eintraege.find(x => x.id === id);
  const fw = e && e.wetter && e.wetter[fahrt];
  if (!fw || !(urteil in RUECKMELDUNG_TEXT) || fw.rueckmeldung === urteil) return;
  mitRueckgaengig(() => { fw.rueckmeldung = urteil; }, () => {
    const k = daten.einstellungen.wetter.kleidung, i = k.stufen.findIndex(s => s.id === fw.kleidung);
    return "Rückmeldung „" + RUECKMELDUNG_TEXT[urteil] + "“ gespeichert" + (i < 0 ? "" : " · Stufe " + stufeBereich(k, i) + ": " + auswertungText(rueckmeldungenAuswerten()[fw.kleidung]));
  }, ausDetail ? () => { const y = fenster.scrollTop; eintragAnsicht(id); fenster.scrollTop = y; } : null);
}
function rueckmeldungKnoepfe(e, fahrt, fw, ausDetail) {
  return '<div class="rueckmeldung" role="group" aria-label="Kleidung bei der ' + (fahrt === "hin" ? "Hinfahrt" : "Rückfahrt") + '">' +
    ["zu-warm", "passte", "zu-kalt"].map(u => '<button type="button" data-action="rueckmeldung" data-id="' + e.id + '" data-fahrt="' + fahrt + '" data-urteil="' + u + '"' +
      (ausDetail ? ' data-detail="1"' : "") + ' aria-pressed="' + (fw.rueckmeldung === u) + '"' + (fw.rueckmeldung === u ? ' class="primaer"' : "") + '>' +
      RUECKMELDUNG_TEXT[u] + '</button>').join("") + '</div>';
}
// Kleidung einer Stufe in einer Zeile (für Fahrten ohne festgehaltene Empfehlung)
function stufeText(id, k = daten.einstellungen.wetter.kleidung) {
  const s = k.stufen.find(x => x.id === id);
  return s ? empfehlungText(s.bereiche) : "(Kleidungsstufe gibt es nicht mehr)";
}
// Die bei einer Fahrt empfohlene Kleidung, wie sie damals empfohlen wurde
function fahrtKleidungText(fw) {
  return fw.empfehlung && empfehlungText(fw.empfehlung) ? empfehlungText(fw.empfehlung) : stufeText(fw.kleidung);
}
// Fahrten von heute und den zwei Tagen davor, die vorbei sind und noch keine
// Rückmeldung haben (nur, wenn die Rückmeldung eingeschaltet ist)
function offeneRueckmeldungen(jetzt) {
  if (!rueckmeldungAn()) return [];
  const h = isoAusDate(new Date(jetzt)), w = daten.einstellungen.wetter;
  const liste = [];
  daten.eintraege.filter(e => e.wetter && e.datum <= h && e.datum >= plusTage(h, -2))
    .sort((a, b) => b.datum.localeCompare(a.datum)).forEach(e => {
      [["hin", "Hinfahrt", w.hinfahrt], ["rueck", "Rückfahrt", w.rueckfahrt]].forEach(([art, name, f]) => {
        const fw = e.wetter[art];
        if (fw && fw.kleidung && !fw.rueckmeldung && zeitpunktAm(e.datum, minutenAus(f.bis)) <= jetzt) liste.push({ e, art, name, fw, h });
      });
    });
  return liste.slice(0, 2);
}
function rueckmeldungKarte(jetzt) {
  const liste = offeneRueckmeldungen(jetzt);
  if (!liste.length) return "";
  return '<div class="karte" style="margin-top:8px"><h3>Wie war die Kleidung?</h3>' + liste.map(x =>
    '<div class="klein" style="margin-top:8px">' + tagTitel(x.e.datum, x.h) + ', ' + x.name + ': ' + esc(fahrtKleidungText(x.fw)) + '</div>' +
    rueckmeldungKnoepfe(x.e, x.art, x.fw, false)).join("") +
    '<div class="feldhinweis">Die Auswertung je Stufe steht unter Einstellungen → Wetter → Kleidung. Die Grenzen ändern sich dadurch nicht.</div></div>';
}
