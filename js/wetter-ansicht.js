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
// Werte einer Fahrt (ohne Böen, die stehen in der Zeile zum Wind). Die Klammer
// „(gefühlt …)“ nur ohne Kleidungszeile mit „gefühlt“ daneben (B15, ab 5f).
function werteText(w, mitGefuehlt = true) {
  return gradText(w.temperatur) + (mitGefuehlt ? " (gefühlt " + gradText(w.gefuehlt) + ")" : "") + " · Regen " +
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
  const wahl = a.auswahl.wert, h = isoAusDate(new Date(jetzt));
  let html = wetterHinweise(a, jetzt);
  if (wahl !== "ort") html += rueckmeldungKarte(jetzt);
  html += auswahlUmschalter(a.auswahl);
  const alt = a.quellen.vorhersage.aktuell ? "" : " veraltet";
  let warnungen = [];
  if (wahl === "ort") {
    // Weiterer Ort: heute und morgen, ohne Hin- und Rückfahrt
    html += '<div class="karte" style="margin-top:8px"><div><strong>📍 ' + esc(a.ort.name) + '</strong> <span class="klein">(weiterer Ort)</span></div>' +
      '<div class="klein">Wetter an diesem Ort für heute und morgen, ohne Hin- und Rückfahrt.</div>' +
      '<div class="knopfreihe"><button type="button" data-action="weiterer-ort-aus">Nicht mehr zeigen</button></div></div>';
    a.ort.tage.forEach(t => {
      html += '<h2>' + tagUeberschrift(t.datum, t.titel) + '</h2><div class="karte' + alt + '">' +
        (t.werte ? tageswerteText(t.werte) : '<span class="klein">Für diesen Tag liegt noch keine Vorhersage vor.</span>') + '</div>';
    });
    warnungen = a.ort.warnungen;
  } else if (wahl === "heute") {
    html += fahrtagHtml(a.heute, "Heute, " + wochentag(h) + " " + kurzDatum(h), null, alt, jetzt);
    warnungen = a.heute.warnungen;
  } else if (a.fahrtageLeer) {
    html += '<div class="hinweis info" style="margin-top:8px"><strong>Keine Fahrtage eingestellt</strong><br>' +
      'Lege fest, an welchen Wochentagen du zur Arbeit fährst. Dann zeigen Übersicht und Reiter Wetter immer den nächsten Fahrtag.</div>' +
      wegZuEinstellungen("Fahrtage festlegen", "fahrtage");
  } else if (!a.naechster) {
    html += '<div class="hinweis info" style="margin-top:8px">Kein Fahrtag in Sicht: Alle Fahrtage des nächsten Jahres sind als „Keine Fahrt“ eingetragen.</div>';
  } else if (!a.naechsterTag) {
    // Außerhalb der 8 Tage der Vorhersage
    html += '<h2 style="margin-top:8px">' + esc(fahrtagTitel(a.naechster)) + '</h2><div class="hinweis info">🕔 ' + esc(vorhersageAbText(a.naechster)) + '</div>';
  } else {
    html += fahrtagHtml(a.naechsterTag, fahrtagTitel(a.naechster), a.naechster, alt, jetzt);
    warnungen = a.naechsterTag.warnungen;
  }
  html += warnungenKarte(warnungen, a, jetzt, wahl === "ort");
  return html + standKarte(a, jetzt) + wegZuEinstellungen("Orte, Fahrzeiten, Kleidung", "", "e-wetter");
}

// Ein Fahrtag im Reiter: Überschrift, ggf. „vorläufig“, Hin- und Rückfahrt, Hinweis zum Einpacken
function fahrtagHtml(t, titel, n, alt, jetzt) {
  let html = '<h2 style="margin-top:8px">' + esc(titel) + '</h2>';
  if (n && n.vorlaeufig) html += '<div class="klein">' + esc(endgueltigText(n, isoAusDate(new Date(jetzt)))) + '</div>';
  t.fahrten.forEach(f => { html += fahrtKarte(f, alt); });
  if (t.kleidungsHinweis) html += '<div class="hinweis info">👕 ' + esc(t.kleidungsHinweis) + '</div>';
  return html;
}

// Umschalter oben im Reiter Wetter: „Heute · Sa 21.11. | Nächster · Mo 23.11. | 📍 Ort“
// (nur, wenn es mehr als eine Auswahl gibt; ein Tipp gilt nur im Arbeitsspeicher)
function auswahlUmschalter(aw) {
  if (aw.optionen.length < 2) return "";
  return '<div class="umschalter wetter-auswahl" role="group" aria-label="Tag oder Ort">' + aw.optionen.map(o =>
    '<button type="button" data-action="wetter-wahl" data-wert="' + o.wert + '" aria-pressed="' + (aw.wert === o.wert) + '"' + (aw.wert === o.wert ? ' class="aktiv"' : "") + '>' +
    '<span class="auswahl-titel">' + (o.wert === "ort" ? "📍 " : "") + esc(o.titel) + '</span>' +
    (o.datum ? '<span class="auswahl-datum">' + wochentag(o.datum) + " " + kurzDatum(o.datum) + '</span>' : "") + '</button>').join("") + '</div>';
}
// Auswahl im Umschalter (gilt, bis sich die Voreinstellung ändert)
function wetterWahlSetzen(wert, jetzt = Date.now()) {
  const a = wetterAnsicht(jetzt);
  if (!a.auswahl || !a.auswahl.optionen.some(o => o.wert === wert)) return;
  wetterWahl = { wert, schluessel: a.auswahl.schluessel };
  zeichnen();
  nachOben();
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

// Aufgeklappte vorbeigegangene Fahrten ("datum|art"), nur im Arbeitsspeicher
const fahrtAufgeklappt = new Set();
function fahrtKarte(f, alt) {
  const b = f.bewertung, schluessel = f.datum + "|" + f.art, zeit = f.fahrt.von + '–' + f.fahrt.bis;
  // Vorbei: eingeklappt als „vorbei ›“, ein Tipp klappt die ganze Karte auf
  if (f.vorbei && !fahrtAufgeklappt.has(schluessel)) {
    return '<button type="button" class="karte fahrt-vorbei veraltet" data-action="fahrt-aufklappen" data-schluessel="' + schluessel + '" aria-expanded="false">' +
      '<strong>' + f.name + '</strong> <span class="klein">' + zeit + ' · vorbei ›</span></button>';
  }
  const kopf = f.vorbei
    ? '<button type="button" class="leise fahrt-kopf" data-action="fahrt-aufklappen" data-schluessel="' + schluessel + '" aria-expanded="true">' +
      f.name + ' <span class="klein">' + zeit + ' · vorbei ⌄</span></button>'
    : f.name + ' <span class="klein">' + zeit + '</span>';
  let html = '<div class="karte' + (f.vorbei ? " veraltet" : alt) + '"><h3>' + kopf + '</h3>';
  // Verschobene Abfahrt von heute direkt unter dem Titel (nicht mit dem Abfahrtsfenster zu verwechseln)
  if (f.heute && f.zeit.verschoben) {
    html += '<div class="verschoben">⏰ Abfahrt heute ' + f.zeit.abfahrt + ' statt ' + f.zeit.geplant +
      ' · <button type="button" class="link" data-action="spaeter-zuruecksetzen" data-art="' + f.art + '">zurücksetzen</button></div>';
  }
  if (!b) html += '<div class="klein">Für diese Zeit liegt noch keine Vorhersage vor.</div>';
  else {
    html += '<div class="ampelzeile">' + ampelText(b) + '</div>' +
      '<div class="klein">' + werteText(b.werte, false) + '</div>' +
      (f.sonne ? '<div class="sonne">' + esc(f.sonne) + '</div>' : "") +
      '<div style="margin-top:6px">👕 Kleidung</div><div class="klein">' + gefuehltZeileHtml(f, b.werte.gefuehlt) + '</div>' + kleidungBereicheHtml(f.kleidung) +
      fahrtHinweisHtml(f.kleidung) +
      (f.wind ? windHtml(f.wind) : "") +
      (f.abfahrt && f.abfahrt.zeigen ? abfahrtHtml(f.abfahrt, f.fahrt.dauer) : "");
  }
  return html + (f.heute ? heuteFahrtHtml(f) : "") + '</div>';
}
// Nur in den Karten von heute, unten: „Heute später los …“ bzw. „Andere Zeit …“ und
// der Weg zum gespeicherten Wetter dieser Fahrt
function heuteFahrtHtml(f) {
  let html = '<div class="knopfreihe"><button type="button" data-action="spaeter-los" data-art="' + f.art + '">' +
    (f.zeit.verschoben ? "Andere Zeit …" : "Heute später los …") + '</button></div>';
  const e = eintragAm(f.datum), fw = e && e.wetter && e.wetter[f.art === "hinfahrt" ? "hin" : "rueck"];
  if (fw) html += '<button type="button" class="leise weg" data-action="eintrag-ansehen" data-id="' + e.id + '">Gespeichertes Wetter dieser Fahrt ›</button>';
  return html;
}
// ---------- „Heute später los …“ (B14.2) ----------

// Fenster von unten: Abfahrt, Schnellwahl ab der geplanten Abfahrt (die Tasten
// addieren nicht auf), Vorschau der Ampel. Gilt nur für heute; die Einstellungen
// bleiben. Gespeichert wird nur auf dem Gerät (radkm-heute-abfahrt).
let formSpaeter = null; // { art, datum, geplant, jetzt }
function spaeterText(min) { return "+" + (min < 60 ? min + " min" : zahl1.format(min / 60) + " h"); }
function spaeterFormular(art, jetzt = Date.now()) {
  const w = daten.einstellungen.wetter, h = isoAusDate(new Date(jetzt));
  const zf = fahrtZeitfenster(art, h, w, abweichungFuer(jetzt, w)), plan = fahrtZeitfenster(art, h, w, null);
  formSpaeter = { art, datum: h, geplant: zf.geplant, jetzt };
  fensterOeffnen('<h2>' + FAHRT_NAME[art] + ': heute später los</h2>' +
    '<div class="klein">Geplant: Abfahrt ' + plan.geplant + ', Fahrt ' + plan.von + '–' + plan.bis + '. Die Dauer bleibt. Gilt nur für heute; die Einstellungen bleiben.</div>' +
    '<label for="sp-abfahrt">Abfahrt</label><input type="time" id="sp-abfahrt" value="' + (zf.abfahrt || zf.geplant) + '" data-change="spaeter-zeit" data-input="spaeter-zeit">' +
    '<div class="schnellwahl" role="group" aria-label="Später als geplant">' + SPAETER_MINUTEN.map(m =>
      '<button type="button" data-action="spaeter-plus" data-min="' + m + '" aria-pressed="false">' + spaeterText(m) + '</button>').join("") + '</div>' +
    '<div id="sp-vorschau" class="sp-vorschau" aria-live="polite"></div>' +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Abbrechen</button>' +
    '<button type="button" class="primaer" data-action="spaeter-uebernehmen">Übernehmen</button></div>', { unten: true });
  spaeterAktualisieren();
}
// Schnellwahl: immer ab der geplanten Abfahrt (ein erneuter Tipp ändert nichts)
function spaeterPlus(min) {
  const el = document.getElementById("sp-abfahrt");
  if (!el || !formSpaeter) return;
  el.value = uhrzeitAus(minutenAus(formSpaeter.geplant) + min);
  spaeterAktualisieren();
}
// Hervorhebung der Schnellwahl und Vorschau der Ampel für die gewählte Abfahrt
function spaeterAktualisieren() {
  const el = document.getElementById("sp-abfahrt"), f = formSpaeter;
  if (!el || !f) return;
  const neu = el.value.slice(0, 5), gueltig = istUhrzeit(neu), diff = gueltig ? minutenAus(neu) - minutenAus(f.geplant) : null;
  document.querySelectorAll('#fensterinhalt [data-action="spaeter-plus"]').forEach(b => {
    const an = Number(b.dataset.min) === diff;
    b.classList.toggle("aktiv", an);
    b.setAttribute("aria-pressed", String(an));
  });
  const vorschau = document.getElementById("sp-vorschau"), w = daten.einstellungen.wetter;
  const fehler = gueltig ? abweichungPruefen(f.art, neu, f.datum, w, abweichungFuer(f.jetzt, w)) : "Bitte eine Uhrzeit eingeben, z. B. 18:30.";
  if (fehler) { vorschau.innerHTML = '<div class="hinweis warn">' + esc(fehler) + '</div>'; return; }
  const v = spaeterVorschau(f.art, neu, f.datum, f.jetzt);
  vorschau.innerHTML = '<div class="klein">Vorschau ' + FAHRT_NAME[f.art] + ' ' + v.zf.von + '–' + v.zf.bis + (diff === 0 ? " (wie geplant)" : "") + '</div>' +
    (v.bewertung ? '<div class="ampelzeile">' + ampelText(v.bewertung) + '</div>' : '<div class="klein">Für diese Zeit liegt noch keine Vorhersage vor.</div>');
}
// „Übernehmen“: Ampel, Kleidung, Wind, Sonne und Abfahrtsfenster rechnen dann mit
// dem neuen Zeitfenster. Die geplante Zeit gilt wie „zurücksetzen“.
async function spaeterUebernehmen() {
  const f = formSpaeter, el = document.getElementById("sp-abfahrt");
  if (!f || !el) return;
  const w = daten.einstellungen.wetter, neu = el.value.slice(0, 5), abw = abweichungFuer(f.jetzt, w);
  const fehler = abweichungPruefen(f.art, neu, f.datum, w, abw);
  if (fehler) { alert(fehler); return; }
  abw[f.art] = neu === f.geplant ? null : neu;
  if (!abweichungSchreiben(abw)) { alert("Die Abfahrt lässt sich auf diesem Gerät nicht speichern."); return; }
  fensterSchliessen();
  formSpaeter = null;
  zeichnen();
  meldung(abw[f.art] ? FAHRT_NAME[f.art] + " heute ab " + neu + " statt " + f.geplant : FAHRT_NAME[f.art] + " wieder wie geplant");
  await eintragWetterNachVerschiebung(f.art, f.datum, f.jetzt);
}
// „zurücksetzen“: zurück zur Planung (nur so)
async function spaeterZuruecksetzen(art, jetzt = Date.now()) {
  const w = daten.einstellungen.wetter, abw = abweichungFuer(jetzt, w);
  if (!abw[art]) return;
  abw[art] = null;
  if (!abweichungSchreiben(abw)) return;
  zeichnen();
  meldung(FAHRT_NAME[art] + " wieder wie geplant");
  await eintragWetterNachVerschiebung(art, abw.datum, jetzt);
}
// Ist für heute schon ein Eintrag mit Wetter aus der Vorhersage gespeichert, fragt
// die App, ob das Wetter dieser Fahrt für das neue Zeitfenster neu berechnet wird.
// Die Rückmeldung zur Kleidung bleibt; ohne Zustimmung bleibt alles, wie es ist.
async function eintragWetterNachVerschiebung(art, datum, jetzt = Date.now()) {
  const e = eintragAm(datum), k = art === "hinfahrt" ? "hin" : "rueck";
  if (!e || !mitWetter(e) || !e.wetter || e.wetter.quelle !== "vorhersage") return false;
  const neu = wetterAusVorhersage(datum, null, jetzt), z = neu && neu[k];
  if (!z) return false;
  const alt = e.wetter[k];
  if (alt && alt.von === z.von && alt.bis === z.bis && alt.abfahrt === z.abfahrt) return false;
  if (!await frage("Für heute ist schon ein Eintrag mit Wetter gespeichert. Das gespeicherte Wetter der " + FAHRT_NAME[art] + " für die neue Zeit (" + z.von + "–" + z.bis +
    ") neu berechnen?<br><br>Deine Rückmeldung zur Kleidung bleibt.", "Neu berechnen", "Nein")) return false;
  mitRueckgaengig(() => {
    const x = daten.eintraege.find(y => y.id === e.id);
    x.wetter = Object.assign({}, x.wetter, { stand: neu.stand, [k]: Object.assign({}, z, { rueckmeldung: x.wetter[k] ? x.wetter[k].rueckmeldung : null }) });
  }, "Gespeichertes Wetter der " + FAHRT_NAME[art] + " neu berechnet", () => {});
  return true;
}

// Vorbeigegangene Fahrt auf- bzw. zuklappen
function fahrtAufklappen(schluessel) {
  if (fahrtAufgeklappt.has(schluessel)) fahrtAufgeklappt.delete(schluessel); else fahrtAufgeklappt.add(schluessel);
  zeichnen();
}

// Werte für die Kleidung: „gefühlt 2 °C · beim Fahren −1 °C (Gegenwind)“; fett der
// Wert, nach dem die Stufe gewählt ist. Ohne Fahrtrichtung (ohne Arbeitsort) das
// Mittel aller Richtungen mit der Spanne: „beim Fahren ca. −1 °C (−2 °C bei
// Gegen-, 2 °C bei Rückenwind)“. Ohne Luftfeuchte: „beim Fahren –“.
function gefuehltZeileHtml(f, gefuehlt) {
  const g = f.beimFahren, fett = (an, text) => an ? "<strong>" + text + "</strong>" : text;
  const fahren = !g ? "beim Fahren –"
    : g.ohneRichtung ? fett(f.grundlage === "fahrt", "beim Fahren ca. " + gradText(g.beimFahren)) + " (" + gradText(g.gegen) + " bei Gegen-, " + gradText(g.ruecken) + " bei Rückenwind)"
    : fett(f.grundlage === "fahrt", "beim Fahren " + gradText(g.beimFahren)) + (g.lage ? " (" + g.lage + ")" : "");
  return fett(f.grundlage === "gefuehlt" && !!g, "gefühlt " + gradText(gefuehlt)) + " · " + fahren;
}

// Wind: erste Zeile mit Himmelsrichtung und Böen (nur Text), darunter je
// Teilstrecke, die zählt, eine Zeile mit ihrem Namen und einem farbigen Pfeil
// (B8): der Fahrer fährt nach oben, der Pfeil zeigt, wohin der Wind weht.
// Die Pfeile stehen untereinander hinter dem längsten Namen.
function windHtml(wind) {
  return '<div>🧭 ' + esc(wind.text) + '</div>' +
    (wind.teile.length ? '<div class="wind-teile">' + wind.teile.map(t =>
      '<span class="wind-name">' + esc(t.titel) + '</span>' + windPfeilHtml(t)).join("") + '</div>' : "");
}
// Pfeil im genauen Winkel als kleines SVG, mit Beschriftung für VoiceOver;
// windstill ohne Pfeil
function windPfeilHtml(t) {
  if (t.windstill) return '<span class="klein windstill">windstill</span>';
  return '<svg class="wind-pfeil ' + t.farbe + (t.schwach ? " schwach" : "") + '" viewBox="0 0 24 24" role="img" aria-label="' + esc(t.text) + '">' +
    '<g transform="rotate(' + t.drehung + ' 12 12)"><path d="M12 20.5V4M5.5 10.5L12 4l6.5 6.5"/></g></svg>';
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

// "nurOrt": Warnungen des weiteren Orts (heute und morgen), sonst die der Strecke am angezeigten Tag
function warnungenKarte(liste, a, jetzt, nurOrt = false) {
  const q = a.quellen.warnungen;
  let html = '<h2>Amtliche Warnungen</h2><div class="karte' + (q.aktuell ? "" : " veraltet") + '">';
  if (!q.vorhanden) return html + '<div class="klein">Zurzeit nicht verfügbar.</div></div>';
  const gebiete = q.gebiete || [];
  if (!liste.length) html += '<div>Keine amtlichen Warnungen' + (nurOrt ? " für heute und morgen" : "") + '.</div>';
  liste.forEach(wn => {
    html += '<div class="warnung stufe-' + wn.stufe + '"><div><strong>' + esc(wn.ereignis) + '</strong> <span class="klein">Stufe ' + wn.stufe +
      (wn.art === "gesundheit" ? " · nur zur Info" : "") + '</span></div>' +
      '<div class="klein">' + esc(zeitraumText(wn, jetzt)) + (a.orte.length > 1 && !nurOrt ? " · " + wn.orte.join(", ") : "") + '</div>' +
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

// Kachel auf der Übersicht: der nächste Fahrtag knapp in einer Zeile, z. B.
// „Mo 23.11. (vorläufig) · Hin ● grün · Rück ● gelb“, darunter der wichtigste
// Grund; ist der weitere Ort aktiv, darunter eine Zeile zu ihm. Die Kachel wechselt
// direkt nach dem Ende der Fahrt zum nächsten Fahrtag. Antippen öffnet den Reiter Wetter.
function wetterKachel(jetzt) {
  let a, inhalt = "";
  try { a = wetterAnsicht(jetzt); }
  catch (e) { return '<button type="button" class="karte wetter-kachel" data-action="tab" data-tab="wetter"><strong>🌦️ Wetter</strong> <span class="klein">kann nicht angezeigt werden</span></button>'; }
  const laden = '<div class="klein">' + (a.laeuft ? "Wird geladen …" : "Noch keine Vorhersage") + '</div>';
  if (a.leer || !a.orte.length) {
    if (a.leer || !a.ort) inhalt = '<div><strong>🌦️ Wetter</strong></div><div class="klein">Wohn- und Arbeitsort festlegen, dann zeigt die App hier die Ampel für deine Fahrten.</div>';
  } else if (a.fahrtageLeer) {
    inhalt = '<div><strong>🌦️ Wetter</strong></div><div class="klein">Keine Fahrtage eingestellt – unter Einstellungen → Fahrtage festlegen.</div>';
  } else if (!a.naechster) {
    inhalt = '<div><strong>🌦️ Wetter</strong></div><div class="klein">Kein Fahrtag in Sicht.</div>';
  } else if (!a.naechsterTag) {
    inhalt = '<div><strong>🌦️ ' + esc(fahrtagKurz(a.naechster)) + '</strong></div><div class="klein">' + esc(vorhersageAbText(a.naechster)) + '</div>';
  } else {
    const offen = a.naechsterTag.fahrten.filter(f => !f.vorbei);
    inhalt = '<div class="kachel-zeile"><strong>🌦️ ' + esc(fahrtagKurz(a.naechster)) + '</strong>' +
      offen.map(f => ' · <span class="kachel-ampel">' + (f.art === "hinfahrt" ? "Hin" : "Rück") + ' ' + (f.bewertung ? ampelHtml(f.bewertung.farbe) + FARBWORT[f.bewertung.farbe] : "–") + '</span>').join("") + '</div>';
    const problem = offen.filter(f => f.bewertung && f.bewertung.farbe !== "gruen").sort((x, y) => (y.bewertung.farbe === "rot") - (x.bewertung.farbe === "rot"))[0];
    if (problem) inhalt += '<div class="klein">' + problem.name + ' ' + FARBWORT[problem.bewertung.farbe] + ': ' + esc(grundText(problem.bewertung.gruende[0])) + '</div>';
    if (!offen.some(f => f.bewertung)) inhalt += laden;
  }
  if (a.ort) {
    // Weiterer Ort: eine Zeile für heute
    const t = a.ort.tage[0];
    inhalt += '<div class="klein">📍 ' + esc(a.ort.name) + ' heute: ' + (t.werte ? esc(tageswerteKurz(t.werte)) : a.laeuft ? "wird geladen …" : "noch keine Vorhersage") + '</div>';
  }
  if (!a.leer) {
    const q = a.quellenStrecke || a.quellenOrt, v = q.vorhersage;
    if (v.vorhanden && !v.aktuell) inhalt += '<div class="klein status-orange">Nicht aktuell – Stand: ' + standText(v.stand, jetzt) + '</div>';
    if (q.warnungen.fehler) inhalt += '<div class="klein status-orange">Amtliche Warnungen nicht erreichbar</div>';
  }
  return '<button type="button" class="karte wetter-kachel" data-action="tab" data-tab="wetter">' + inhalt + '</button>';
}
// "2 bis 7 °C · Regen 30 %" (Tageswerte knapp, für die Kachel)
function tageswerteKurz(t) {
  return gradText(t.tmin) + " bis " + gradText(t.tmax) + " · Regen " + (t.regenWahrscheinlichkeit === null ? zahl1.format(t.niederschlag) + " mm" : t.regenWahrscheinlichkeit + " %") +
    (t.gewitter ? " · Gewitter möglich" : "");
}

// ---------- Wetter in den Einstellungen: Orte und Fahrzeiten ----------

// Einstellungen → Wetter: Zeilen auf der Hauptseite (Orte, Kleidung und
// Ampel-Grenzen als Unterseiten, Fahrzeiten als Fenster)
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
    fahrtZeile("hinfahrt", "Hinfahrt") + fahrtZeile("rueckfahrt", "Rückfahrt") +
    regelZeile("kleidung-bearbeiten", "Kleidung", kleidungKurztext(w.kleidung)) +
    regelZeile("ampel-bearbeiten", "Ampel-Grenzen", ampelKurztext(w.ampel)) + '</div>' +
    '<p class="klein">Ampel, Kleidung und Wind gelten für die Fahrzeit. Übersicht und Reiter Wetter zeigen immer den nächsten Fahrtag; bis zum Ende der Rückfahrt am Vortag als „vorläufig“.</p>';
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
      '<span>Weiteren Ort zeigen (aktiv)<br><span class="klein">Der Reiter Wetter zeigt das Wetter dort dann als weitere Auswahl (heute und morgen, ohne Hin- und Rückfahrt), die Übersicht in einer Zeile.</span></span></label>' : "") +
    '<p class="klein">Koordinaten (auch die der Wegpunkte) werden mit 4 Nachkommastellen gespeichert (ca. 10 m); an Open-Meteo (Vorhersage, Rückblick) und an den Deutschen Wetterdienst bzw. Bright Sky (Warnungen) ' +
    'gehen sie nur auf 3 Nachkommastellen gerundet (ca. 100 m). ' +
    'Für die Ortssuche geht nur der eingegebene Name an Open-Meteo.</p>';
}

function regelZeile(aktion, titel, text) {
  return '<div class="zeile"><button type="button" class="inhalt" data-action="' + aktion + '"><div class="text"><div>' + titel + '</div>' +
    '<div class="klein">' + esc(text) + '</div></div><span class="klein" style="padding-right:16px">›</span></button></div>';
}
function kleidungKurztext(k) {
  const std = standardKleidung();
  return k.stufen.length + " Stufen nach " + (k.grundlage === "fahrt" ? "„beim Fahren“" : "„gefühlt“") +
    " · Regenzusatz " + (k.regen.length ? "ab " + k.regen.map(r => r.ab + " %").join(" / ") : "keiner") +
    " · Rückmeldung " + (k.rueckmeldung ? "an" : "aus") + (gleicherInhalt([k.stufen, k.regen], [std.stufen, std.regen]) ? " · Standard" : "");
}
function ampelKurztext(g) {
  return "Böen " + zahlFeld(g.gelbBoeen) + " / " + zahlFeld(g.rotBoeen) + " km/h · Niederschlag " + zahlFeld(g.gelbNiederschlag) + " / " + zahlFeld(g.rotStarkregen) +
    " mm/h · Regen ab " + zahlFeld(g.gelbRegenWahrscheinlichkeit) + " %" + (gleicherInhalt(g, standardAmpel()) ? " · Standard" : "");
}

// Zustand des Ort-Formulars (Unterseite „ort“, ab 5d statt eines Fensters); die
// Koordinaten stehen in den Feldern "Breite" und "Länge"
let formOrt = null; // { rolle, index (nur Wegpunkt; null = neu), treffer, titel, vorschlag }

// Ort des Formulars: Wohnort, Arbeitsort, weiterer Ort oder ein Wegpunkt
function ortVon(rolle, index) {
  const w = daten.einstellungen.wetter;
  return rolle === "wegpunkt" ? (index === null ? null : w.wegpunkte[index] || null) : w[rolle];
}
function ortTitel(v) {
  return !v ? "Ort" : v.rolle === "wegpunkt" ? (v.index === null ? "Neuer Wegpunkt" : wegpunktTitel(v.index)) : ORT_TITEL[v.rolle];
}
function ortFormular(rolle, index = null) { unterseiteZeigen("ort", { rolle, index }); }
// Formular als Unterseite (‹ Orte und Strecke): Suche „Ort oder PLZ“ mit Vorschlägen
// beim Tippen, Koordinaten oder Kartenlinks einfügen, zuletzt gewählte Orte,
// aktueller Standort, Koordinaten direkt, Name (mit Vorschlag), Apple Karten
function ortSeite(v) {
  const { rolle, index } = v;
  const o = ortVon(rolle, index);
  formOrt = { rolle, index, treffer: [], titel: ortTitel(v), vorschlag: null };
  const lat = o ? koordinateFeld(o.lat) : "", lon = o ? koordinateFeld(o.lon) : "";
  return (
    (rolle === "wegpunkt" ? '<p class="klein" style="margin-top:0">Ein Punkt auf deinem Weg zwischen Wohn- und Arbeitsort. Ein neuer Wegpunkt kommt ans Ende, direkt vor den Arbeitsort; ' +
      'die Reihenfolge änderst du unter „Orte und Strecke“ mit ▲/▼.</p>' : "") +
    '<label for="o-suche">Ort oder PLZ</label>' +
    '<input type="search" id="o-suche" enterkeyhint="search" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="z. B. Musterdorf oder 12345" ' +
      'data-input="ort-eingabe" data-enter="ort-suchen">' +
    '<div class="feldhinweis">Anfang des Namens genügt (Umlaute und Groß/klein egal, PLZ möglich). Vorschläge erscheinen ab ' + ORTSSUCHE_MIN + ' Buchstaben. ' +
      'Du kannst auch Koordinaten oder einen Link aus Apple Karten oder Google Maps einfügen; die liest die App selbst, ohne Netz.</div>' +
    '<div id="o-treffer"></div>' +
    '<div id="o-letzte">' + letzteOrteHtml() + '</div>' +
    '<div class="knopfreihe"><button type="button" class="voll" data-action="ort-standort">📍 Aktueller Standort</button></div>' +
    '<label for="o-lat">Koordinaten (Breite und Länge in Grad)</label>' +
    // Ohne Zifferntastatur: auf dem iPhone fehlt dort das Minus (Süd und West)
    '<div class="suchzeile"><input type="text" id="o-lat" autocomplete="off" placeholder="Breite, z. B. 51,1234" aria-label="Breite" data-input="ort-karte" value="' + lat + '">' +
    '<input type="text" id="o-lon" autocomplete="off" placeholder="Länge, z. B. 10,4567" aria-label="Länge" data-input="ort-karte" value="' + lon + '"></div>' +
    '<div class="feldhinweis" id="o-gewaehlt">Aus der Suche, vom Standort, eingefügt oder direkt eingeben (Komma oder Punkt, Süd und West mit Minus).</div>' +
    // Öffnet Apple Karten mit den Werten in den Feldern (auch vor dem Speichern); vorher geht nichts an Apple
    '<div class="knopfreihe"><a class="knopf voll" id="o-karte" target="_blank" rel="noopener noreferrer"' +
      (o ? ' href="' + esc(kartenUrl(o)) + '"' : ' aria-disabled="true"') + '>🗺️ In Karten zeigen</a></div>' +
    '<label for="o-name">Name (zur Anzeige)</label><input type="text" id="o-name" data-input="ort-karte" value="' + esc(o ? o.name : "") + '">' +
    '<div id="o-namenvorschlag"></div>' +
    (rolle === "weitererOrt" ? '<label class="haken"><input type="checkbox" id="o-aktiv"' + (o && o.aktiv ? " checked" : "") + '>' +
      '<span>Aktiv<br><span class="klein">Der Reiter Wetter zeigt dann das Wetter an diesem Ort (ohne Hin- und Rückfahrt).</span></span></label>' : "") +
    '<div class="feldhinweis">Gespeichert werden die Koordinaten mit 4 Nachkommastellen (ca. 10 m); an die Wetterdienste gehen sie nur auf 3 Nachkommastellen gerundet (ca. 100 m). ' +
    'Für die Suche geht nur der eingegebene Text an Open-Meteo, schon beim Tippen. Für den Namensvorschlag gehen die gerundeten Koordinaten an den Deutschen Wetterdienst. ' +
    '„In Karten zeigen“ öffnet Apple Karten an dieser Stelle; erst dann gehen Koordinaten und Name an Apple.</div>' +
    '<div class="knopfreihe"><button type="button" data-action="einstellungen-seite" data-seite="orte">Abbrechen</button>' +
    '<button type="button" class="primaer" data-action="ort-speichern">Speichern</button></div>' +
    (o ? '<div class="knopfreihe"><button type="button" class="gefahr voll" data-action="ort-entfernen">' + (rolle === "wegpunkt" ? "Wegpunkt entfernen" : "Ort entfernen") + '</button></div>' : "")
  );
}
// Die zuletzt gewählten Orte zum Antippen (nur auf dem Gerät)
function letzteOrteHtml() {
  const l = letzteOrte();
  if (!l.length) return "";
  return '<div class="klein" style="margin-top:8px">Zuletzt gewählt</div><div class="liste">' + l.map((o, i) =>
    '<div class="zeile"><button type="button" class="inhalt" data-action="ort-letzter" data-i="' + i + '"><div class="text"><div>' + esc(o.name) + '</div>' +
    '<div class="klein">' + koordinatenText(o) + '</div></div></button></div>').join("") + '</div>' +
    '<button type="button" class="leise weg" data-action="ort-letzte-leeren">Liste leeren</button>';
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
function ortTrefferAnzeigen(html) {
  const el = document.getElementById("o-treffer");
  if (el) el.innerHTML = html;
  const letzte = document.getElementById("o-letzte");
  // Die zuletzt gewählten Orte nur bei leerem Suchfeld
  if (letzte) letzte.hidden = !!(document.getElementById("o-suche") || {}).value;
}
// Koordinaten in die Felder übernehmen (auf 4 Nachkommastellen gerundet)
function ortKoordinatenSetzen(lat, lon, text) {
  document.getElementById("o-lat").value = koordinateFeld(lat);
  document.getElementById("o-lon").value = koordinateFeld(lon);
  ortGewaehltAnzeigen(text);
  ortKarteAktualisieren();
}
const KEIN_TREFFER = "Kein Ort gefunden. Tipps: kürzer eingeben (der Anfang des Namens genügt, z. B. nur „Muster“), die Postleitzahl versuchen " +
  "oder Koordinaten bzw. einen Link einfügen – in Apple Karten eine Stelle lange drücken und bei der Markierung die Koordinaten kopieren.";
const OHNE_NETZ = "Ohne Netz keine Ortssuche. Koordinaten oder einen Kartenlink einfügen geht auch ohne Netz.";
function trefferHtml(erg) {
  if (erg.fehler) return '<div class="feldhinweis warn">' + (erg.fehler === "keine Verbindung" ? OHNE_NETZ : "Ortssuche nicht möglich (" + esc(erg.fehler) + ").") + '</div>';
  if (!formOrt) return "";
  formOrt.treffer = erg.treffer;
  const plz = /^\d/.test(erg.text);
  return erg.treffer.length
    ? '<div class="liste" style="margin-top:8px">' + erg.treffer.map((t, i) => '<div class="zeile"><button type="button" class="inhalt" data-action="ort-waehlen" data-i="' + i + '">' +
        '<div class="text"><div>' + esc(t.name) + '</div><div class="klein">' + esc((plz && t.plz ? t.plz + " · " : "") + t.zusatz) + '</div></div></button></div>').join("") + '</div>'
    : '<div class="feldhinweis warn">' + KEIN_TREFFER + '</div>';
}
// Eingabe im Suchfeld: Koordinaten und Kartenlinks sofort (ohne Netz), sonst Vorschläge ab 3 Zeichen
function ortEingabe() {
  const el = document.getElementById("o-suche");
  if (!el || !formOrt) return;
  const text = el.value.trim();
  if (ortEingefuegt(text)) return;
  ortssucheAbbrechen();
  if (text.length < ORTSSUCHE_MIN) { ortTrefferAnzeigen(""); return; }
  if (ohneNetz()) { ortTrefferAnzeigen('<div class="feldhinweis warn">' + OHNE_NETZ + '</div>'); return; }
  ortTrefferAnzeigen('<div class="feldhinweis">Suche …</div>');
  ortssucheVormerken(text, erg => { if (formOrt && document.getElementById("o-treffer")) ortTrefferAnzeigen(trefferHtml(erg)); });
}
// Koordinaten oder Kartenlink im Suchfeld übernehmen; true, wenn es welche waren (auch ein Kurzlink)
function ortEingefuegt(text) {
  const c = ortAusText(text);
  if (!c) return false;
  ortssucheAbbrechen();
  if (c.kurzlink) {
    ortTrefferAnzeigen('<div class="feldhinweis warn">Kurzlinks (maps.apple/p/…, maps.app.goo.gl/…) lassen sich ohne Netz nicht lesen. Bitte in der Karten-App ' +
      '„Koordinaten kopieren“ bzw. den vollständigen Link verwenden.</div>');
    return true;
  }
  ortTrefferAnzeigen("");
  ortKoordinatenSetzen(c.lat, c.lon, "Erkannt (" + c.quelle + "): " + koordinatenText({ lat: c.lat, lon: c.lon }) + ".");
  ortNamenVorschlagen(c, c.name);
  return true;
}
// Name vorschlagen (zum Antippen, nie automatisch): aus dem Kartenlink, sonst mit
// Netz die Gemeinde des DWD an diesen Koordinaten
async function ortNamenVorschlagen(o, ausLink = null) {
  const ziel = () => document.getElementById("o-namenvorschlag");
  if (!ziel() || !formOrt) return;
  const zeigen = name => {
    formOrt.vorschlag = name;
    ziel().innerHTML = name ? '<button type="button" class="leise weg" data-action="ort-name-uebernehmen">Name übernehmen: ' + esc(name) + '</button>' : "";
  };
  zeigen(ausLink);
  if (ausLink || ohneNetz()) return;
  const schluessel = koordinateFeld(o.lat) + "/" + koordinateFeld(o.lon);
  let name = null;
  try { name = await gemeindeName(o); } catch (e) { return; }
  // Formular inzwischen verlassen oder andere Koordinaten
  if (!ziel() || !formOrt || wert("o-lat") + "/" + wert("o-lon") !== schluessel) return;
  zeigen(name);
}
function ortNameUebernehmen() {
  if (!formOrt || !formOrt.vorschlag) return;
  document.getElementById("o-name").value = formOrt.vorschlag;
  document.getElementById("o-namenvorschlag").innerHTML = "";
  ortKarteAktualisieren();
}
// Eingabetaste: sofort suchen (ab 2 Zeichen; Koordinaten und Links ohne Netz)
async function ortSuchen() {
  const text = wert("o-suche").trim();
  if (ortEingefuegt(text)) return;
  ortssucheAbbrechen();
  if (text.length < 2) { ortTrefferAnzeigen('<div class="feldhinweis warn">Bitte mindestens 2 Buchstaben eingeben.</div>'); return; }
  ortTrefferAnzeigen('<div class="feldhinweis">Suche …</div>');
  let erg;
  try { erg = await ortssucheAusfuehren(text); } catch (e) { erg = { fehler: e.message }; }
  // Neuere Suche begonnen, Formular inzwischen verlassen
  if (!erg || !formOrt || !document.getElementById("o-treffer")) return;
  ortTrefferAnzeigen(trefferHtml(erg));
}
function ortWaehlen(i) {
  const t = formOrt && formOrt.treffer[i];
  if (!t) return;
  document.getElementById("o-name").value = t.name;
  ortTrefferAnzeigen("");
  ortKoordinatenSetzen(t.lat, t.lon, "Übernommen aus der Suche: " + t.name + (t.zusatz ? ", " + t.zusatz : "") + ".");
}
function ortLetzterWaehlen(i) {
  const o = letzteOrte()[i];
  if (!o || !formOrt) return;
  document.getElementById("o-name").value = o.name;
  ortKoordinatenSetzen(o.lat, o.lon, "Übernommen aus „Zuletzt gewählt“: " + o.name + ".");
}
function ortLetzteLeeren() {
  letzteOrteLeeren();
  const el = document.getElementById("o-letzte");
  if (el) el.innerHTML = "";
  meldung("Liste „Zuletzt gewählt“ geleert");
}
function ortStandort() {
  if (!navigator.geolocation) { ortGewaehltAnzeigen("Der Standort ist auf diesem Gerät nicht verfügbar."); return; }
  ortGewaehltAnzeigen("Standort wird bestimmt …");
  navigator.geolocation.getCurrentPosition(pos => {
    if (!formOrt || !document.getElementById("o-name")) return;
    const name = document.getElementById("o-name");
    if (!name.value.trim()) name.value = "Aktueller Standort";
    ortKoordinatenSetzen(pos.coords.latitude, pos.coords.longitude, "Übernommen vom aktuellen Standort (auf 4 Nachkommastellen gerundet).");
    ortNamenVorschlagen({ lat: koordinateSpeichern(pos.coords.latitude), lon: koordinateSpeichern(pos.coords.longitude) });
  }, err => {
    ortGewaehltAnzeigen("Standort nicht verfügbar" + (err && err.code === 1 ? " (Zugriff nicht erlaubt)." : "."));
  }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 });
}
// Nach dem Speichern oder Entfernen zurück zu „Orte und Strecke“
function ortFertig(text) {
  ortssucheAbbrechen();
  unterseiteZeigen("orte");
  meldung(text);
  wetterBeiBedarf();
}
function ortSpeichern() {
  const name = wert("o-name").trim();
  const lat = zahlLesen(wert("o-lat")), lon = zahlLesen(wert("o-lon"));
  if (lat === null || lon === null) { alert("Bitte einen Ort suchen und auswählen, Koordinaten oder einen Kartenlink einfügen, den aktuellen Standort verwenden oder Breite und Länge eingeben, z. B. 51,1234 und 10,4567."); return; }
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
  if (speichern()) { letzteOrteMerken(ort); ortFertig(formOrt.rolle === "wegpunkt" ? "Wegpunkt gespeichert" : "Ort gespeichert"); }
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
  if (speichern()) ortFertig(rolle === "wegpunkt" ? "Wegpunkt entfernt" : "Ort entfernt");
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
// Weiterer Ort an/aus (Einstellungen und Reiter Wetter)
function weitererOrtAktiv(aktiv) {
  const o = daten.einstellungen.wetter.weitererOrt;
  if (!o) return;
  o.aktiv = aktiv;
  if (speichern()) { zeichnen(); meldung(aktiv ? "Weiterer Ort aktiv" : "Weiterer Ort ausgeblendet"); wetterBeiBedarf(); }
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
// Einstellungen → Ampel-Grenzen (Unterseite): Jedes Feld wird beim Verlassen
// gespeichert und mit allen anderen geprüft (gelb unter rot); ungültig: Hinweis,
// das Feld zeigt wieder den gespeicherten Wert.
function ampelFormular() { unterseiteZeigen("ampel"); }
function ampelSeite() {
  const g = daten.einstellungen.wetter.ampel;
  let gruppe = "";
  const felder = AMPEL_FELDER.map(([feld, gr, text, einheit, tastatur]) =>
    (gr !== gruppe ? (gruppe = gr, '<h3 style="margin-top:16px">' + gr + '</h3>') : "") +
    '<label for="ag-' + feld + '">' + text + ' (' + einheit + ')</label>' +
    '<input type="text" id="ag-' + feld + '" data-change="ampel-feld"' + (tastatur ? ' inputmode="' + tastatur + '"' : "") + ' autocomplete="off" value="' + zahlFeld(g[feld]) + '">').join("");
  return '<p class="klein">Gelten für die Ampel jeder Fahrt; gelb unter rot. Jede Änderung wird beim Verlassen des Felds gespeichert. ' +
    'Das schon in Einträgen gespeicherte Wetter bleibt, wie es ist.</p>' + felder +
    '<div class="feldhinweis">Glätte: kalt (Luft bis zu dieser Temperatur oder Boden höchstens 0 °C) und nass.</div>' +
    '<h3 style="margin-top:16px">Amtliche Warnungen</h3><label for="ag-rotWarnstufe">Rot ab</label><select id="ag-rotWarnstufe" data-change="ampel-feld">' +
    [1, 2, 3, 4].map(n => '<option value="' + n + '"' + (g.rotWarnstufe === n ? " selected" : "") + '>Stufe ' + n + '</option>').join("") + '</select>' +
    '<div class="feldhinweis">Niedrigere Stufen sind gelb. Warnungen vor Gewitter und Glätte sind bei jeder Stufe rot, Hitze und UV nur zur Info.</div>' +
    '<div class="knopfreihe"><button type="button" class="voll" data-action="ampel-standard">Auf Standard zurücksetzen</button></div>';
}
// Alle Felder der Seite lesen und prüfen; gültig: speichern. "geaendert" ist das
// verlassene Feld (bei einem Fehler zeigt es wieder den gespeicherten Wert).
function ampelSpeichern(geaendert = null) {
  const alt = daten.einstellungen.wetter.ampel;
  const zurueck = text => {
    alert(text);
    if (geaendert) geaendert.value = geaendert.id === "ag-rotWarnstufe" ? String(alt.rotWarnstufe) : zahlFeld(alt[geaendert.id.slice(3)]);
  };
  const g = standardAmpel();
  for (const [feld, , text] of AMPEL_FELDER) {
    const v = zahlLesen(wert("ag-" + feld));
    if (v === null) { zurueck("Bitte bei „" + text + "“ eine Zahl eingeben."); return; }
    g[feld] = v;
  }
  g.rotWarnstufe = Number(wert("ag-rotWarnstufe"));
  if (!(g.gelbRegenWahrscheinlichkeit >= 0 && g.gelbRegenWahrscheinlichkeit <= 100)) { zurueck("Die Regenwahrscheinlichkeit muss zwischen 0 und 100 % liegen."); return; }
  if (!(g.gelbNiederschlag > 0 && g.gelbNiederschlag < g.rotStarkregen)) { zurueck("Beim Niederschlag muss die Grenze für Gelb größer als 0 und kleiner als die für Rot sein."); return; }
  if (!(g.gelbBoeen > 0 && g.gelbBoeen < g.rotBoeen)) { zurueck("Bei den Böen muss die Grenze für Gelb größer als 0 und kleiner als die für Rot sein."); return; }
  if (gleicherInhalt(g, alt)) { if (geaendert && geaendert.tagName === "INPUT") geaendert.value = zahlFeld(alt[geaendert.id.slice(3)]); return; }
  daten.einstellungen.wetter.ampel = g;
  if (speichern()) { if (geaendert && geaendert.tagName === "INPUT") geaendert.value = zahlFeld(g[geaendert.id.slice(3)]); meldung("Ampel-Grenzen gespeichert"); }
}
async function ampelStandard() {
  if (!await frage("Ampel-Grenzen auf die Standardwerte zurücksetzen?", "Zurücksetzen", "Abbrechen")) return;
  mitRueckgaengig(() => { daten.einstellungen.wetter.ampel = standardAmpel(); }, "Ampel-Grenzen zurückgesetzt", () => {});
}

// ---------- Kleidungsregeln (Einstellungen → Wetter) ----------

// Bereich einer Stufe: "ab 20 °C", "7 bis 11 °C", "−6 bis −1 °C", "unter −6 °C"
// ("bis" statt Strich, damit negative Grenzen lesbar bleiben)
function stufeBereich(k, i) {
  const s = k.stufen[i], oben = k.stufen[i - 1];
  const grenze = x => minus(zahlFeld(x.ab));
  if (s.ab === null) return "unter " + grenze(oben) + " °C";
  return oben ? grenze(s) + " bis " + grenze(oben) + " °C" : "ab " + grenze(s) + " °C";
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

// Einstellungen → Kleidung (Unterseite): Schalter für die Rückmeldung, Stufen
// mit Auswertung der Rückmeldungen, Regenzusatz. Jede Stufe und jeder
// Regenzusatz hat eine eigene Unterseite („‹ Kleidung“) mit „Speichern“.
function kleidungFormular() { unterseiteZeigen("kleidung"); }
function kleidungSeite() {
  const k = daten.einstellungen.wetter.kleidung, aus = rueckmeldungenAuswerten(), seit = rueckmeldungenSeitAenderung();
  const hinweise = k.stufen.map((st, i) => ({ i, h: kleidungHinweis(st.id, seit) })).filter(x => x.h);
  const frueher = Object.keys(aus).filter(id => !k.stufen.some(s => s.id === id)).reduce((x, id) => x + aus[id].anzahl, 0);
  const zeile = (aktion, i, titel, unten) => '<div class="zeile"><button type="button" class="inhalt" data-action="' + aktion + '" data-i="' + i + '">' +
    '<div class="text"><div>' + titel + '</div>' + unten.map(u => '<div class="klein umbrechen">' + u + '</div>').join("") + '</div>' +
    '<span class="klein" style="padding-right:16px">›</span></button></div>';
  return (
    hinweise.map(x => kleidungHinweisHtml(x.h, x.i)).join("") +
    '<h3 style="margin-top:8px">Stufe wählen nach</h3>' +
    umschalterHtml("kleidung-grundlage", k.grundlage, [["fahrt", "gefühlt beim Fahren"], ["gefuehlt", "gefühlt (Open-Meteo)"]], "Stufe wählen nach") +
    '<div class="feldhinweis">„Beim Fahren“ rechnet Fahrtwind, Windrichtung und Windstärke ein (je Teilstrecke, die für den Wind zählt). Es liegt meist 1–3 °C unter ' +
    '„gefühlt“ von Open-Meteo (für einen stehenden Menschen); die Empfehlung fällt dadurch oft eine Stufe wärmer aus. Ohne Luftfeuchte in der Vorhersage gilt „gefühlt“.</div>' +
    geschwindigkeitHtml() + plausibilitaetHtml() +
    '<label class="haken"><input type="checkbox" id="k-rueckmeldung" data-change="kleidung-rueckmeldung"' + (k.rueckmeldung ? " checked" : "") + '>' +
    '<span>Rückmeldung zur Kleidung<br><span class="klein">Karte „Wie war die Kleidung?“ im Reiter Wetter und die Knöpfe in den Einträgen. ' +
    'Ausgeschaltet bleiben gegebene Rückmeldungen und die Auswertung erhalten.</span></span></label>' +
    '<h3 style="margin-top:16px">Stufen</h3><p class="klein" style="margin-top:0">Nach dem kältesten Wert der Fahrt (' + (k.grundlage === "fahrt" ? "gefühlt beim Fahren" : "gefühlt") +
    '), von warm nach kalt. ' +
    'Eine Stufe gilt ab ihrer Grenze, die letzte darunter. Antippen zum Ändern.</p>' +
    '<div class="liste">' + k.stufen.map((s, i) => zeile("kleidung-stufe", i, stufeBereich(k, i),
      [esc(bereicheKurz(s.bereiche)) + (s.haendeBeiRegen ? " · bei Regen Hände " + esc(s.haendeBeiRegen) : ""), "Rückmeldungen " + seitText(s.id, seit[s.id])])).join("") + '</div>' +
    (frueher ? '<p class="klein">' + (frueher === 1 ? "1 Rückmeldung" : frueher + " Rückmeldungen") + ' zu früheren Stufen (gibt es nicht mehr, werden nicht zugeordnet).</p>' : "") +
    '<div class="knopfreihe"><button type="button" data-action="kleidung-stufe-neu">+ Stufe</button></div>' +
    '<h3 style="margin-top:16px">Regenzusatz</h3><p class="klein" style="margin-top:0">Ab dieser Regenwahrscheinlichkeit kommt das Regenzeug in seinem Bereich dazu. ' +
    'Zwiebelprinzip: In Oberkörper, Beinen und Füßen gilt dann bei mehreren Teilen die Kleidung der nächstwärmeren Stufe (eine Schicht weniger); ' +
    'steht das Regenzeug schon in der Stufe, bleibt der Bereich, wie er ist. Kopf, Hals und Hände bleiben wie in der Stufe („Hände bei Regen“ je Stufe).</p>' +
    (k.regen.length ? '<div class="liste">' + k.regen.map((r, i) => zeile("kleidung-regen", i, "ab " + zahlFeld(r.ab) + " %", [esc(bereicheKurz(r.bereiche))])).join("") + '</div>'
      : '<div class="liste"><div class="leer">Kein Regenzusatz.</div></div>') +
    '<div class="knopfreihe"><button type="button" data-action="kleidung-regen-neu">+ Regenzusatz</button></div>' +
    '<div class="knopfreihe"><button type="button" class="voll" data-action="kleidung-standard">Auf Standard zurücksetzen</button></div>' +
    '<div class="liste" style="margin-top:16px">' + seitenZeile("kleidung-protokoll", "Änderungen",
      k.protokoll.length ? (k.protokoll.length === 1 ? "1 Änderung" : k.protokoll.length + " Änderungen") + ", zuletzt am " +
        datumText(isoAusDate(new Date(k.protokoll[k.protokoll.length - 1].zeitpunkt))) : "noch keine") + '</div>' +
    '<p class="klein">Die App protokolliert jede Änderung an einer Stufe, am Regenzusatz und am Umschalter „Stufe wählen nach“. Die Rückmeldungen zählen je Stufe ab ihrer ' +
    'letzten Änderung (auch einer Grenze, die ihren Bereich verschiebt, und des Umschalters). Rückmeldungen von vor 5d stehen getrennt („vor 5d“, Stufe damals nach „gefühlt“).</p>'
  );
}
// Fahrgeschwindigkeit für „beim Fahren“: automatisch (Vorlage und Dauer) oder ein eigener Wert
function geschwindigkeitHtml() {
  const w = daten.einstellungen.wetter, hin = fahrgeschwindigkeit("hinfahrt", w);
  const kmh = x => zahl1.format(x) + " km/h";
  const auto = fahrgeschwindigkeit("hinfahrt", Object.assign({}, w, { geschwindigkeit: null }));
  const autoR = fahrgeschwindigkeit("rueckfahrt", Object.assign({}, w, { geschwindigkeit: null }));
  const autoText = auto.quelle === "annahme" ? "angenommen " + kmh(auto.kmh) + " (keine Vorlage mit Arbeitsweg)"
    : (auto.kmh === autoR.kmh ? kmh(auto.kmh) : "Hinfahrt " + kmh(auto.kmh) + ", Rückfahrt " + kmh(autoR.kmh)) + " aus der Vorlage „" + esc(auto.vorlage.name) + "“ (" +
      zahl1.format(auto.vorlage.km) + " km, je Richtung die Hälfte in " + (w.hinfahrt.dauer === w.rueckfahrt.dauer ? w.hinfahrt.dauer : w.hinfahrt.dauer + " bzw. " + w.rueckfahrt.dauer) + " min)";
  return '<label for="k-geschwindigkeit">Eigene Fahrgeschwindigkeit (km/h, optional)</label>' +
    '<input type="text" id="k-geschwindigkeit" class="kurzfeld" inputmode="decimal" autocomplete="off" placeholder="automatisch" data-change="kleidung-geschwindigkeit" value="' +
    (w.geschwindigkeit === null ? "" : zahlFeld(w.geschwindigkeit)) + '">' +
    '<div class="feldhinweis">' + (hin.quelle === "eigen" ? "Es gilt " + kmh(hin.kmh) + " (automatisch wären es " + autoText + ")."
      : "Leer = automatisch: " + autoText + ".") + ' Die Dauer enthält Ampelstopps; der Fahrtwind wirkt nur in Bewegung, die eigene Angabe darf deshalb höher sein. ' +
    GESCHWINDIGKEIT_MIN + " bis " + GESCHWINDIGKEIT_MAX + ' km/h.</div>';
}
function geschwindigkeitGeaendert(el) {
  const text = el.value.trim(), w = daten.einstellungen.wetter;
  const v = text === "" ? null : zahlLesen(text);
  if (text !== "" && (v === null || v < GESCHWINDIGKEIT_MIN || v > GESCHWINDIGKEIT_MAX)) {
    alert("Bitte eine Fahrgeschwindigkeit von " + GESCHWINDIGKEIT_MIN + " bis " + GESCHWINDIGKEIT_MAX + " km/h eingeben oder das Feld leeren (automatisch).");
    el.value = w.geschwindigkeit === null ? "" : zahlFeld(w.geschwindigkeit);
    return;
  }
  if (v === w.geschwindigkeit) return;
  w.geschwindigkeit = v === null ? null : Math.round(v * 10) / 10;
  if (speichern()) { zeichnen(); meldung(v === null ? "Fahrgeschwindigkeit: automatisch" : "Fahrgeschwindigkeit " + zahl1.format(w.geschwindigkeit) + " km/h gespeichert"); }
}
// Plausibilität (nur im Testmodus „?test“): eigene Rechnung mit dem Wind, wie
// Open-Meteo ihn einsetzt (0,75 · w10), gegen apparent_temperature der zuletzt
// geladenen Vorhersage, größte Abweichung über alle Orte und Schritte
const PLAUSIBEL_TOLERANZ = 0.3;
function plausibilitaetHtml(jetzt = Date.now()) {
  if (!TESTMODUS) return "";
  const v = wetter.vorhersage, p = v ? plausibilitaet(v.orte) : null;
  const zahl2 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let text;
  if (!v) text = "Keine Vorhersage geladen. Im Testmodus lädt die App das Wetter nur mit „Aktualisieren“ im Reiter Wetter.";
  else if (!p) text = "Die geladene Vorhersage enthält keine Luftfeuchte (älterer Stand). Bitte im Reiter Wetter „Aktualisieren“.";
  else {
    const orte = wetterOrte(), ort = orte.map(x => ortSchluessel(x.ort)).join(";") === v.schluessel && orte[p.ort] ? orte[p.ort].titel : "Ort " + (p.ort + 1);
    const ok = p.abweichung <= PLAUSIBEL_TOLERANZ;
    text = '<span class="' + (ok ? "status-gruen" : "status-rot") + '">Größte Abweichung ' + zahl2.format(p.abweichung) + " °C</span> über " + p.schritte + " Schritte (" +
      (v.orte.length === 1 ? "1 Ort" : v.orte.length + " Orte") + "), am " + esc(ort) + " " + wochentag(isoAusDate(new Date(p.zeit))) + " " + kurzDatum(isoAusDate(new Date(p.zeit))) +
      " " + uhrzeit(p.zeit) + ": eigene Rechnung " + zahl2.format(p.eigen).replace("-", "−") + " °C, Open-Meteo " + zahl1.format(p.openMeteo).replace("-", "−") + " °C. Toleranz " +
      zahl1.format(PLAUSIBEL_TOLERANZ) + " °C: " + (ok ? "eingehalten" : "überschritten") + ". Stand: " + standText(v.stand, jetzt) + ".";
  }
  return '<div class="hinweis info" id="k-plausibel"><strong>Plausibilität (Testmodus)</strong><br>' + text + '</div>';
}
// Umschalter "Stufe wählen nach" (sofort gespeichert)
function kleidungGrundlageSetzen(wert) {
  const k = daten.einstellungen.wetter.kleidung;
  if (!GRUNDLAGEN.includes(wert) || k.grundlage === wert) return;
  k.protokoll.push(protokollEintrag("grundlage", null, k.grundlage, wert));
  k.grundlage = wert;
  if (speichern()) { zeichnen(); meldung(wert === "fahrt" ? "Stufe nach „gefühlt beim Fahren“" : "Stufe nach „gefühlt“ (Open-Meteo)"); }
}

// Schalter "Rückmeldung zur Kleidung" (sofort gespeichert; Rückmeldungen und Auswertung bleiben)
function kleidungRueckmeldungSchalten(an) {
  daten.einstellungen.wetter.kleidung.rueckmeldung = an;
  if (speichern()) { zeichnen(); meldung(an ? "Rückmeldung zur Kleidung an" : "Rückmeldung zur Kleidung aus – deine Rückmeldungen bleiben gespeichert"); }
}
function rueckmeldungAn() { return daten.einstellungen.wetter.kleidung.rueckmeldung; }

// Formular einer Stufe als Unterseite (i = Nummer in der Liste; null = neue Stufe)
function kleidungStufeFormular(i) { unterseiteZeigen("kleidung-stufe", i); }
function kleidungStufeTitel(i) {
  const k = daten.einstellungen.wetter.kleidung;
  return i === null || !k.stufen[i] ? "Neue Stufe" : "Stufe " + stufeBereich(k, i);
}
function kleidungStufeSeite(i) {
  const k = daten.einstellungen.wetter.kleidung, n = k.stufen.length;
  if (i !== null && !k.stufen[i]) return kleidungSeite();
  const neu = i === null, letzte = !neu && i === n - 1;
  const vorschlag = k.stufen[n - 2].ab - 3;
  const s = neu ? { ab: vorschlag, bereiche: bereicheAus(), haendeBeiRegen: null } : k.stufen[i];
  const z = neu ? null : rueckmeldungenSeitAenderung()[s.id];
  return (
    (letzte ? '<p class="klein">Die letzte Stufe gilt unterhalb der vorigen (' + stufeBereich(k, i) + ').</p>'
      : '<label for="ks-ab">Ab gefühlter Temperatur (°C)</label><input type="text" id="ks-ab" class="kurzfeld" autocomplete="off" value="' + zahlFeld(s.ab) + '">' +
        '<div class="feldhinweis">Ein Grenzwert gehört zu dieser Stufe; die Stufen werden nach ihrer Grenze sortiert.</div>') +
    bereichFelder("ks", s.bereiche) +
    '<label for="ks-haende-regen">Hände bei Regen (optional)</label>' +
    '<input type="text" id="ks-haende-regen" autocomplete="off" placeholder="leer = wie bei Hände" value="' + esc(s.haendeBeiRegen || "") + '">' +
    '<div class="feldhinweis">Gilt statt „Hände“, sobald ein Regenzusatz greift, z. B. regenfeste Handschuhe. Mehrere Teile mit Komma trennen.</div>' +
    (neu ? "" : '<p class="klein">Rückmeldungen ' + seitText(s.id, z) + '</p>') +
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
  k.protokoll.push(...stufenProtokoll(k.stufen, stufen));
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
    const kl = daten.einstellungen.wetter.kleidung, vorher = JSON.parse(JSON.stringify(kl.stufen)), st = kl.stufen;
    st.splice(i, 1);
    st[st.length - 1].ab = null;
    kl.protokoll.push(...stufenProtokoll(vorher, st));
  }, "Stufe entfernt", () => kleidungFormular());
}

// Formular eines Regenzusatzes als Unterseite (i = Nummer; null = neu)
function kleidungRegenFormular(i) { unterseiteZeigen("kleidung-regen", i); }
function kleidungRegenTitel(i) {
  const k = daten.einstellungen.wetter.kleidung;
  return i === null || !k.regen[i] ? "Neuer Regenzusatz" : "Regenzusatz ab " + zahlFeld(k.regen[i].ab) + " %";
}
function kleidungRegenSeite(i) {
  const k = daten.einstellungen.wetter.kleidung, neu = i === null;
  if (!neu && !k.regen[i]) return kleidungSeite();
  const r = neu ? { ab: k.regen.length ? Math.min(100, k.regen[k.regen.length - 1].ab + 10) : 40, bereiche: bereicheAus() } : k.regen[i];
  return (
    '<label for="kr-ab">Ab Regenwahrscheinlichkeit (%)</label><input type="text" id="kr-ab" class="kurzfeld" inputmode="numeric" autocomplete="off" value="' + zahlFeld(r.ab) + '">' +
    '<div class="feldhinweis">Das Regenzeug kommt in seinem Bereich dazu (siehe Zwiebelprinzip auf der Seite Kleidung).</div>' +
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
  const alt = i === null ? null : k.regen[i];
  if (!alt || !gleicherInhalt(alt, { ab, bereiche })) k.protokoll.push(protokollEintrag("regen", null, alt, { ab, bereiche }));
  k.regen = regen;
  if (speichern()) { kleidungFormular(); zeichnen(); meldung(i === null ? "Regenzusatz hinzugefügt" : "Regenzusatz gespeichert"); }
}
async function kleidungRegenWeg(i) {
  const k = daten.einstellungen.wetter.kleidung;
  if (!k.regen[i]) return;
  if (!await frage("Regenzusatz ab " + zahlFeld(k.regen[i].ab) + " % entfernen?", "Entfernen", "Abbrechen", true)) return;
  mitRueckgaengig(() => {
    const kl = daten.einstellungen.wetter.kleidung;
    kl.protokoll.push(protokollEintrag("regen", null, kl.regen[i], null));
    kl.regen.splice(i, 1);
  }, "Regenzusatz entfernt", () => kleidungFormular());
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
    k.protokoll.push(...stufenProtokoll(k.stufen, std.stufen), ...regenProtokoll(k.regen, std.regen));
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
    const z = rueckmeldungenSeitAenderung()[fw.kleidung];
    const stand = !z ? "" : fw.empfohlenAm === null ? "vor 5d: " + auswertungText(z.vor5d) : seitText(fw.kleidung, z, false);
    return "Rückmeldung „" + RUECKMELDUNG_TEXT[urteil] + "“ gespeichert" + (i < 0 || !stand ? "" : " · Stufe " + stufeBereich(k, i) + " " + stand);
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
// Rückmeldung haben (nur, wenn die Rückmeldung eingeschaltet ist). Vorbei ist eine
// Fahrt am Ende ihres gespeicherten Zeitfensters (ab 5e), heute am Ende des
// tatsächlichen (ggf. verschobenen), sonst am Ende der Fahrzeit aus den Einstellungen.
function offeneRueckmeldungen(jetzt) {
  if (!rueckmeldungAn()) return [];
  const h = isoAusDate(new Date(jetzt)), w = daten.einstellungen.wetter, abw = abweichungFuer(jetzt, w);
  const liste = [];
  daten.eintraege.filter(e => e.wetter && e.datum <= h && e.datum >= plusTage(h, -2))
    .sort((a, b) => b.datum.localeCompare(a.datum)).forEach(e => {
      [["hin", "hinfahrt"], ["rueck", "rueckfahrt"]].forEach(([art, fahrt]) => {
        const fw = e.wetter[art];
        if (!fw || !fw.kleidung || fw.rueckmeldung) return;
        const heutig = fahrtZeitfenster(fahrt, e.datum, w, abw);
        const ende = e.datum === h && heutig.verschoben ? heutig.bisMs : fw.bis ? zeitpunktAm(e.datum, minutenAus(fw.bis)) : heutig.bisMs;
        if (ende <= jetzt) liste.push({ e, art, name: FAHRT_NAME[fahrt], fw, h });
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

// ---------- Änderungsprotokoll der Kleidung und Zählung ab der letzten Änderung (N4) ----------

function protokollEintrag(art, stufe, vorher, nachher, auchBetroffen = []) {
  const kopie = x => x === null || x === undefined ? null : JSON.parse(JSON.stringify(x));
  return { zeitpunkt: new Date(Date.now()).toISOString(), art, stufe, vorher: kopie(vorher), nachher: kopie(nachher), auchBetroffen };
}
// Inhalt einer Stufe im Protokoll
const stufeInhalt = s => s ? { ab: s.ab, bereiche: Object.assign({}, s.bereiche), haendeBeiRegen: s.haendeBeiRegen } : null;
// Protokolleinträge für eine Änderung der Stufen: je geänderte, neue oder
// entfernte Stufe einer; dazu die Stufen, deren Temperaturbereich sich dadurch
// mit verschoben hat (auchBetroffen, z. B. die nächstwärmere bei einer neuen Grenze)
function stufenProtokoll(vorher, nachher) {
  const bereich = (liste, id) => { const i = liste.findIndex(s => s.id === id); return i < 0 ? null : stufeBereich({ stufen: liste }, i); };
  const ids = [...new Set(vorher.map(s => s.id).concat(nachher.map(s => s.id)))];
  const finde = (liste, id) => liste.find(s => s.id === id) || null;
  const geaendert = ids.filter(id => !gleicherInhalt(stufeInhalt(finde(vorher, id)), stufeInhalt(finde(nachher, id))));
  if (!geaendert.length) return [];
  const auch = nachher.map(s => s.id).filter(id => !geaendert.includes(id) && finde(vorher, id) && bereich(vorher, id) !== bereich(nachher, id));
  return geaendert.map(id => protokollEintrag("stufe", id, stufeInhalt(finde(vorher, id)), stufeInhalt(finde(nachher, id)), auch));
}
// Protokolleinträge für den Regenzusatz (Zuordnung über die Schwelle)
function regenProtokoll(vorher, nachher) {
  const finde = (liste, ab) => liste.find(r => r.ab === ab) || null;
  const abs = [...new Set(vorher.map(r => r.ab).concat(nachher.map(r => r.ab)))].sort((a, b) => a - b);
  return abs.filter(ab => !gleicherInhalt(finde(vorher, ab), finde(nachher, ab))).map(ab => protokollEintrag("regen", null, finde(vorher, ab), finde(nachher, ab)));
}
// Letzte Änderung (ms), ab der die Rückmeldungen einer Stufe zählen: Änderungen der
// Stufe selbst, Änderungen, die ihren Bereich verschieben, und des Umschalters; null = keine
function letzteAenderung(id, k = daten.einstellungen.wetter.kleidung) {
  return k.protokoll.filter(p => p.art === "grundlage" || (p.art === "stufe" && (p.stufe === id || p.auchBetroffen.includes(id))))
    .reduce((m, p) => { const t = Date.parse(p.zeitpunkt); return m === null || t > m ? t : m; }, null);
}
// Rückmeldungen je Stufe ab ihrer letzten Änderung: gezählt werden Fahrten, deren
// Empfehlung nach der aktuellen Grundlage und nach der Änderung berechnet wurde
// und die nach der Änderung lagen. Rückmeldungen von vor 5d (empfohlenAm null)
// stehen getrennt in "vor5d". { id: { seit, anzahl, "zu-warm", passte, "zu-kalt",
// regen: {…}, fahrten: [{ urteil, lage, regen }], vor5d: {…} } }
function rueckmeldungenSeitAenderung(k = daten.einstellungen.wetter.kleidung, w = daten.einstellungen.wetter) {
  const leer = () => ({ anzahl: 0, "zu-warm": 0, passte: 0, "zu-kalt": 0 });
  const erg = {};
  const fuer = id => erg[id] || (erg[id] = Object.assign(leer(), { seit: letzteAenderung(id, k), regen: leer(), fahrten: [], vor5d: Object.assign(leer(), { regen: leer() }) }));
  daten.eintraege.forEach(e => e.wetter && [["hin", "hinfahrt"], ["rueck", "rueckfahrt"]].forEach(([art, fahrt]) => {
    const f = e.wetter[art];
    if (!f || !f.kleidung || !f.rueckmeldung) return;
    const z = fuer(f.kleidung);
    const zaehle = x => { x.anzahl++; x[f.rueckmeldung]++; if (f.regenkleidung) { x.regen.anzahl++; x.regen[f.rueckmeldung]++; } };
    if (f.empfohlenAm === null) { zaehle(z.vor5d); return; }
    if (f.grundlage !== k.grundlage) return;
    if (z.seit !== null && (Date.parse(f.empfohlenAm) < z.seit || zeitpunktAm(e.datum, minutenAus(w[fahrt].bis)) < z.seit)) return;
    zaehle(z);
    z.fahrten.push({ urteil: f.rueckmeldung, lage: windLageGespeichert(f), regen: !!f.regenkleidung });
  }));
  return erg;
}
// "seit 5d" (Stufe nie geändert) bzw. "seit deiner Änderung am 08.11." (seit = ms der letzten Änderung)
function seitTitel(seit) { return seit === null ? "seit 5d" : "seit deiner Änderung am " + kurzDatum(isoAusDate(new Date(seit))); }
// "seit deiner Änderung am 08.11.: 2× zu kalt · vor 5d: 1× passte". Ohne Rückmeldung
// (z fehlt) zählt die letzte Änderung der Stufe "id" trotzdem (B16, ab 5f).
function seitText(id, z, mitVor5d = true) {
  return seitTitel(z ? z.seit : letzteAenderung(id)) + ": " + auswertungText(z) +
    (mitVor5d && z && z.vor5d.anzahl ? " · vor 5d: " + auswertungText(z.vor5d) : "");
}
const LAGE_BEI = { Gegenwind: "bei Gegenwind", Seitenwind: "bei Seitenwind", Rückenwind: "bei Rückenwind", wechselnd: "bei wechselndem Wind", "kaum Wind": "bei wenig Wind" };
// Hinweis zu einer Stufe: ab 2 gleichen Abweichungen seit der letzten Änderung,
// wenn sie häufiger sind als „passte“ (2× zu kalt, 5× passte: kein Hinweis). Gibt
// es beide Richtungen gleich oft, heißt der Hinweis „uneinheitlich“. null = keiner.
function kleidungHinweis(id, seit = rueckmeldungenSeitAenderung(), k = daten.einstellungen.wetter.kleidung) {
  const z = seit[id], i = k.stufen.findIndex(s => s.id === id);
  if (!z || i < 0) return null;
  const richtungen = ["zu-kalt", "zu-warm"].filter(u => z[u] >= 2 && z[u] > z.passte);
  if (!richtungen.length) return null;
  const titel = "Stufe " + stufeBereich(k, i) + ": " + seitTitel(z.seit) + " ";
  if (richtungen.length === 2 && z["zu-kalt"] === z["zu-warm"]) {
    return { id, richtung: null, text: titel + z["zu-kalt"] + "× zu kalt und " + z["zu-warm"] + "× zu warm – uneinheitlich" };
  }
  const u = richtungen.length === 2 ? (z["zu-kalt"] > z["zu-warm"] ? "zu-kalt" : "zu-warm") : richtungen[0];
  const fahrten = z.fahrten.filter(f => f.urteil === u), n = fahrten.length;
  // Wind und Regen der abweichenden Fahrten: "beide bei Gegenwind", "1× bei Gegenwind, 1× bei Seitenwind", "alle bei Regen"
  const lagen = fahrten.map(f => f.lage).filter(Boolean);
  const zaehl = [...new Set(lagen)].map(l => [l, lagen.filter(x => x === l).length]);
  const alle = n === 2 ? "beide " : "alle ";
  const teile = [];
  if (lagen.length === n && zaehl.length === 1) teile.push(alle + LAGE_BEI[zaehl[0][0]]);
  else if (zaehl.length) teile.push(zaehl.map(([l, c]) => c + "× " + LAGE_BEI[l]).join(", "));
  const regen = fahrten.filter(f => f.regen).length;
  if (regen === n) teile.push(teile.length ? "bei Regen" : alle + "bei Regen");
  else if (regen) teile.push("davon " + regen + "× bei Regen");
  return { id, richtung: u, text: titel + z[u] + "× " + RUECKMELDUNG_TEXT[u] + (teile.length ? " (" + teile.join(", ") + ")" : "") };
}
function kleidungHinweisHtml(h, i) {
  return '<div class="hinweis warn">💡 ' + esc(h.text) +
    '<br><button type="button" data-action="kleidung-stufe" data-i="' + i + '">Stufe bearbeiten</button></div>';
}
// In der Fahrt-Karte: Hinweis zur empfohlenen Stufe (nur, wenn die Rückmeldung eingeschaltet ist)
function fahrtHinweisHtml(kl) {
  if (!kl || !rueckmeldungAn()) return "";
  const h = kleidungHinweis(kl.stufe.id);
  return h ? '<div class="klein">💡 ' + esc(h.text) + ' <button type="button" class="leise" data-action="kleidung-stufe" data-i="' + kl.index + '">Stufe bearbeiten ›</button></div>' : "";
}

// Unterseite „Änderungen der Kleidung“: das Protokoll, neueste zuerst
function kleidungProtokollSeite() {
  const k = daten.einstellungen.wetter.kleidung;
  if (!k.protokoll.length) return '<div class="liste"><div class="leer">Noch keine Änderungen seit 5d.</div></div>';
  const leerText = t => t ? esc(t) : "–";
  const name = p => {
    const i = k.stufen.findIndex(s => s.id === p.stufe), x = p.nachher || p.vorher;
    return i >= 0 ? "Stufe " + stufeBereich(k, i) : "frühere Stufe" + (x && x.ab !== null ? " (ab " + minus(zahlFeld(x.ab)) + " °C)" : "");
  };
  const grenze = x => x === null ? "darunter" : minus(zahlFeld(x)) + " °C";
  const bereichsTeile = (a, b) => BEREICHE.filter(([bb]) => (a[bb] || "") !== (b[bb] || "")).map(([bb, n]) => n + ": " + leerText(a[bb]) + " → " + leerText(b[bb]));
  const unterschiede = (a, b) => (a.ab !== b.ab ? ["Grenze " + grenze(a.ab) + " → " + grenze(b.ab)] : []).concat(bereichsTeile(a.bereiche, b.bereiche),
    (a.haendeBeiRegen || null) !== (b.haendeBeiRegen || null) ? ["Hände bei Regen: " + leerText(a.haendeBeiRegen) + " → " + leerText(b.haendeBeiRegen)] : []);
  const GRUNDLAGE_TEXT = { fahrt: "gefühlt beim Fahren", gefuehlt: "gefühlt (Open-Meteo)" };
  const zeilen = k.protokoll.slice().reverse().map(p => {
    const wann = datumText(isoAusDate(new Date(p.zeitpunkt))) + " " + uhrzeit(Date.parse(p.zeitpunkt));
    let titel, details = [];
    if (p.art === "grundlage") { titel = "Stufe wählen nach"; details = [GRUNDLAGE_TEXT[p.vorher] + " → " + GRUNDLAGE_TEXT[p.nachher]]; }
    else if (p.art === "regen") {
      const x = p.nachher || p.vorher;
      titel = "Regenzusatz ab " + zahlFeld(x.ab) + " %" + (!p.vorher ? " neu" : !p.nachher ? " entfernt" : "");
      details = p.vorher && p.nachher ? (p.vorher.ab !== p.nachher.ab ? ["Schwelle " + zahlFeld(p.vorher.ab) + " → " + zahlFeld(p.nachher.ab) + " %"] : [])
        .concat(bereichsTeile(p.vorher.bereiche, p.nachher.bereiche)) : [bereicheKurz(x.bereiche)];
    } else {
      titel = name(p) + (!p.vorher ? " neu" : !p.nachher ? " entfernt" : "");
      details = p.vorher && p.nachher ? unterschiede(p.vorher, p.nachher) : [bereicheKurz((p.nachher || p.vorher).bereiche)];
    }
    return '<div class="zeile"><div class="text" style="padding:10px 16px"><div>' + esc(titel) + '</div><div class="klein">' + esc(wann) + '</div>' +
      details.map(d => '<div class="klein umbrechen">' + esc(d) + '</div>').join("") + '</div></div>';
  });
  return '<div class="liste">' + zeilen.join("") + '</div>' +
    '<p class="klein">Neueste zuerst. Das Protokoll gehört zu deinen Daten und steht in der Sicherung.</p>';
}
