// Rad-km · Reiter Fahrten (Einträge | Statistik): Fahrtage und Kennzahlen, Diagramm, Jahresziele, Wetter-Statistik
"use strict";

// ---------- Fahrtage und Statistik ----------
// Radtag = Tages-Eintrag mit mehr als 0 km. Wochensummen zählen nicht, weil
// unbekannt ist, an welchen Tagen gefahren wurde.
function istRadtag(e) { return e.typ === "tag" && e.km > 0; }

// Minuten seit Mitternacht (Ortszeit)
function minutenJetzt(d = new Date()) { return d.getHours() * 60 + d.getMinutes(); }

// Eingestellte Fahrtage der letzten 14 Tage (bis gestern) ohne Eintrag, ab dem
// Startdatum; der heutige Tag ab der Uhrzeit "hinweisHeuteAb" (Standard 18:00),
// wenn der Schalter "Hinweis schon am selben Tag" (hinweisHeuteAn) an ist.
// "minuten" ist die Uhrzeit am Stichtag; ohne Angabe die aktuelle, wenn der
// Stichtag heute ist, sonst 0:00. Ein Eintrag mit 0 km ("keine Fahrt") und eine
// Wochensumme in derselben Woche gelten als erfasst.
function fehlendeFahrtage(h = heute(), minuten = h === heute() ? minutenJetzt() : 0) {
  const f = daten.fahrrad;
  if (!f) return [];
  const fahrtage = new Set(daten.einstellungen.fahrtage);
  const wochen = new Set(daten.eintraege.filter(e => e.typ === "woche").map(e => montagDerWoche(e.datum)));
  const es = daten.einstellungen;
  const bis = es.hinweisHeuteAn && minuten >= minutenAus(es.hinweisHeuteAb) ? h : plusTage(h, -1);
  const tage = [];
  for (let d = plusTage(h, -14); d <= bis; d = plusTage(d, 1)) {
    if (d >= f.startdatum && fahrtage.has(isoWochentag(d)) && !eintragAm(d) && !wochen.has(montagDerWoche(d))) tage.push(d);
  }
  return tage;
}

// Längste Serie aufeinanderfolgender Fahrtage mit Fahrt (Radtag) von "von" bis
// "bis". Nur die eingestellten Fahrtage zählen; andere Wochentage unterbrechen
// die Serie nicht und verlängern sie nicht.
function laengsteSerie(von, bis) {
  const fahrtage = new Set(daten.einstellungen.fahrtage);
  const gefahren = new Set(daten.eintraege.filter(istRadtag).map(e => e.datum));
  let laengste = 0, lauf = 0;
  if (!fahrtage.size) return 0;
  for (let d = von; d <= bis; d = plusTage(d, 1)) {
    if (!fahrtage.has(isoWochentag(d))) continue;
    lauf = gefahren.has(d) ? lauf + 1 : 0;
    if (lauf > laengste) laengste = lauf;
  }
  return laengste;
}

// km je Monat eines Jahres (alle Einträge einschließlich Wochensummen); Index 0 = Januar
function monatsSummen(jahr) {
  const s = Array(12).fill(0);
  daten.eintraege.forEach(e => { if (e.datum.slice(0, 4) === String(jahr)) s[Number(e.datum.slice(5, 7)) - 1] += e.km; });
  return s.map(runden);
}

// Kennzahlen eines Zeitraums bis zum Stichtag: km (alle Einträge), Radtage,
// Durchschnitt pro Radtag, Arbeitstage (Radtage mit Merkmal Arbeitsweg),
// längste Serie und die nicht als Radtage gezählten Wochensummen
function kennzahlen(liste, von, bis) {
  const radtage = liste.filter(istRadtag);
  const wochen = liste.filter(e => e.typ === "woche");
  return {
    km: runden(liste.reduce((s, e) => s + e.km, 0)),
    radtage: radtage.length,
    schnitt: radtage.length ? radtage.reduce((s, e) => s + e.km, 0) / radtage.length : null,
    arbeitstage: radtage.filter(e => e.arbeitsweg).length,
    serie: laengsteSerie(von, bis),
    wochensummen: wochen.length,
    wochenKm: runden(wochen.reduce((s, e) => s + e.km, 0))
  };
}
// Je Kalenderjahr (neueste zuerst) und gesamt; Einträge nach dem Stichtag zählen nicht
function jahresKennzahlen(h = heute()) {
  const bisher = daten.eintraege.filter(e => e.datum <= h);
  const jahre = [...new Set(bisher.map(e => e.datum.slice(0, 4)))].sort().reverse();
  const erstes = bisher.reduce((m, e) => e.datum < m ? e.datum : m, h);
  return {
    jahre: jahre.map(j => Object.assign({ jahr: Number(j) },
      kennzahlen(bisher.filter(e => e.datum.slice(0, 4) === j), j + "-01-01", j + "-12-31" < h ? j + "-12-31" : h))),
    gesamt: kennzahlen(bisher, erstes, h)
  };
}

/* ---------- Statistik ---------- */
// Angetippter Monat im Diagramm (0 = Januar; null = laufender Monat) und Tabellenansicht
let statistikMonat = null;
let statistikTabelleOffen = false;
const MONATE_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

// Reiter Fahrten: Umschalter „Einträge | Statistik“
function bildFahrten() {
  const h = heute();
  return umschalterHtml("fahrten-ansicht", fahrtenAnsicht, [["eintraege", "Einträge"], ["statistik", "Statistik"]], "Ansicht") +
    (fahrtenAnsicht === "statistik" ? bildStatistik() : eintraegeListe(h));
}

// Jahresziele (Fahrten → Statistik); Fortschritt auf der Übersicht
function jahreszieleBereich() {
  const ziele = [...daten.einstellungen.jahresziele].sort((a, b) => b.jahr - a.jahr);
  return '<h2>Jahresziele</h2><div class="liste">' + (ziele.length ? "" : '<div class="leer">Noch kein Jahresziel.</div>') +
    ziele.map(z => '<div class="zeile"><button type="button" class="inhalt" data-action="jahresziel-bearbeiten" data-jahr="' + z.jahr + '">' +
      '<div class="text"><div>' + z.jahr + '</div></div><span class="zahl" style="padding-right:16px">' + kmText(z.km) + ' km</span></button></div>').join("") +
    '</div><div class="knopfreihe"><button type="button" data-action="jahresziel-neu">+ Jahresziel</button></div>';
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

function bildStatistik() {
  const h = heute();
  const jahr = Number(h.slice(0, 4));
  let html = '<h2 style="margin-top:8px">km pro Monat</h2><div class="karte">' +
    monatsDiagramm(jahr, h, statistikMonat ?? Number(h.slice(5, 7)) - 1) + '</div>';

  const k = jahresKennzahlen(h);
  html += '<h2>Kennzahlen</h2>';
  if (!k.jahre.length) return html + '<div class="liste"><div class="leer">Noch keine Einträge.</div></div>' + jahreszieleBereich();
  const fahrtage = daten.einstellungen.fahrtage;
  const zeile = (titel, z, klasse) => '<tr' + (klasse ? ' class="' + klasse + '"' : "") + '><td>' + titel + '</td>' +
    '<td>' + kmText(Math.round(z.km)) + '</td><td>' + z.radtage + '</td>' +
    '<td>' + (z.schnitt === null ? "–" : kmText(Math.round(z.schnitt * 10) / 10)) + '</td>' +
    '<td>' + z.arbeitstage + '</td><td>' + (fahrtage.length ? z.serie : "–") + '</td></tr>';
  html += '<div class="karte"><table class="tabelle"><thead><tr><th>Jahr</th><th>km</th><th>Rad&shy;tage</th><th>Ø km</th>' +
    '<th>Arbeits&shy;tage</th><th>Serie</th></tr></thead><tbody>' +
    k.jahre.map(z => zeile(String(z.jahr), z)).join("") +
    (k.jahre.length > 1 ? zeile("Gesamt", k.gesamt, "summe-zeile") : "") + '</tbody></table>' +
    '<p class="klein"><strong>Radtage:</strong> Tage mit mehr als 0 km. <strong>Ø km:</strong> Durchschnitt pro Radtag. ' +
    '<strong>Arbeitstage:</strong> Radtage mit dem Merkmal „Arbeitsweg“. <strong>Serie:</strong> längste Folge aufeinanderfolgender Fahrtage (' +
    (fahrtage.length ? fahrtage.map(t => WOCHENTAGE[t % 7]).join(", ") : "keine eingestellt") +
    ') mit Fahrt; andere Wochentage unterbrechen sie nicht.<br>Radtage, Ø km, Arbeitstage und Serie ohne Wochensummen.</p>' +
    k.jahre.filter(z => z.wochensummen).map(z => '<p class="klein">' + z.jahr + ': ' +
      (z.wochensummen === 1 ? "1 Wochensumme" : z.wochensummen + " Wochensummen") + ' (' + kmText(z.wochenKm) +
      ' km) in „km“ enthalten, aber nicht als Radtage gezählt.</p>').join("") +
    '</div>';
  return html + jahreszieleBereich() + wetterStatistik(h);
}

// Wetter auf dem Arbeitsweg: km bei Regen, Tage unter 0 °C, Verteilung der Ampelfarben; "Wetter nachtragen …"
function wetterStatistik(h) {
  const k = wetterKennzahlen(h);
  const offen = rueckblickKandidaten(h).length;
  let html = '<h2>Wetter auf dem Arbeitsweg</h2><div class="karte">';
  if (!k.jahre.length) return html + '<div class="klein">Noch keine Fahrten mit dem Merkmal „Arbeitsweg“.</div></div>';
  const zeilen = k.jahre.map(z => [String(z.jahr), z]).concat(k.jahre.length > 1 ? [["Gesamt", k.gesamt]] : []);
  html += '<table class="tabelle"><thead><tr><th>Jahr</th><th>mit Wetter</th><th>km bei Regen</th><th>Tage unter 0&nbsp;°C</th></tr></thead><tbody>' +
    zeilen.map(([titel, z]) => '<tr' + (titel === "Gesamt" ? ' class="summe-zeile"' : "") + '><td>' + titel + '</td><td>' + z.mitWetter + ' von ' + z.tage + '</td>' +
      '<td>' + kmText(Math.round(z.kmRegen)) + '</td><td>' + z.tageFrost + '</td></tr>').join("") + '</tbody></table>';
  html += '<h3 style="margin-top:14px">Ampel der Fahrten</h3>' + zeilen.map(([titel, z]) => {
    const a = z.ampel, n = a.gruen + a.gelb + a.rot;
    return '<div class="verteilung-zeile"><span class="verteilung-titel">' + titel + '</span>' +
      (n ? '<div class="verteilung" role="img" aria-label="' + titel + ': ' + a.gruen + ' grün, ' + a.gelb + ' gelb, ' + a.rot + ' rot">' +
        ["gruen", "gelb", "rot"].filter(f => a[f]).map(f => '<span class="' + f + '" style="flex:' + a[f] + '"></span>').join("") + '</div>' +
        '<span class="klein">' + ["gruen", "gelb", "rot"].map(f => a[f] + " " + FARBWORT[f]).join(" · ") + '</span>'
        : '<span class="klein">noch keine Fahrten mit Wetter</span>') + '</div>';
  }).join("");
  return html + '<p class="klein">Nur Fahrten zur Arbeit (Merkmal „Arbeitsweg“) mit gespeichertem Wetter. <strong>km bei Regen:</strong> km der Tage, ' +
    'an denen auf einer der Fahrten mindestens 0,1 mm Niederschlag fiel. <strong>Tage unter 0 °C:</strong> auf einer der Fahrten. ' +
    '<strong>Ampel:</strong> je Fahrt aus den Wetterwerten, ohne amtliche Warnungen.</p>' +
    '<button type="button" class="voll" data-action="wetter-nachtragen"' + (offen && !rueckblickLaeuft ? "" : " disabled") + '>' +
    (rueckblickLaeuft ? "Rückblick läuft …" : "Wetter nachtragen …" + (offen ? " (" + offen + ")" : "")) + '</button>' +
    '<p class="klein">Holt für vergangene Fahrten zur Arbeit ohne Wetter oder mit dem Wetter aus der Vorhersage das Wetter aus dem Rückblick von Open-Meteo ' +
    '(ab 2022, für die aktuellen Wohn- und Arbeitsorte und Wegpunkte). Vorher fragt die App nach.</p></div>';
}

let rueckblickLaeuft = false;
// "Wetter nachtragen": Rückblick für vergangene Fahrten zur Arbeit, mit Rückfrage und "Rückgängig".
// Empfohlene Kleidung und Rückmeldung bleiben (die Auswertung der Rückmeldungen beruht darauf).
async function wetterNachtragen(jetzt = Date.now()) {
  if (rueckblickLaeuft) return;
  const orte = arbeitswegOrte();
  if (!orte.length) { alert("Bitte zuerst unter Einstellungen → Wetter Wohn- und Arbeitsort festlegen."); return; }
  const h = isoAusDate(new Date(jetzt));
  const liste = rueckblickKandidaten(h);
  if (!liste.length) { meldung("Alle vergangenen Fahrten zur Arbeit haben schon Wetter aus dem Rückblick"); return; }
  const n = liste.length;
  const zeitraum = (von, bis) => von === bis ? datumText(von) : datumText(von) + "–" + datumText(bis);
  // Datum je Eintrag jetzt merken: wird ein Eintrag während des Abrufs geändert, bleibt er, wie er ist
  const plan = rueckblickAbschnitte(liste).map(ab => ({ von: ab.von, bis: ab.bis, eintraege: ab.eintraege.map(e => ({ id: e.id, datum: e.datum })) }));
  if (!await frage("Für " + (n === 1 ? "1 Fahrtag" : n + " Fahrtage") + " zur Arbeit (" + zeitraum(liste[0].datum, liste[n - 1].datum) + ") " +
    "das Wetter aus dem Rückblick holen?<br><br>Dazu gehen die gerundeten Koordinaten von Wohn- und Arbeitsort" + (orte.length > 2 ? " und der Wegpunkte" : "") + " an Open-Meteo. " +
    "Wetter aus der Vorhersage wird ersetzt; empfohlene Kleidung und Rückmeldungen bleiben.", "Wetter nachtragen", "Abbrechen")) return;
  rueckblickLaeuft = true;
  zeichnen();
  const ergebnisse = new Map();
  let fehler = null;
  try {
    for (const ab of plan) {
      meldung("Rückblick " + zeitraum(ab.von, ab.bis) + " …", { dauer: 30000 });
      let orteDaten;
      try { orteDaten = vorhersageLesen(await jsonAbrufen(rueckblickUrl(orte, ab.von, ab.bis)), orte.length); }
      catch (e) { fehler = e.message; break; }
      ab.eintraege.forEach(e => ergebnisse.set(e.id, { datum: e.datum, wetter: fahrtenWetter(orteDaten, e.datum, "rueckblick", jetzt) }));
    }
  } finally {
    rueckblickLaeuft = false;
  }
  const gefunden = [...ergebnisse.values()].filter(x => x.wetter).length, ohne = ergebnisse.size - gefunden;
  if (!gefunden) {
    meldungAus();
    zeichnen();
    alert("Kein Wetter nachgetragen. " + (fehler ? "Der Rückblick ist nicht erreichbar (" + fehler + ")." : "Für diese Tage liefert der Rückblick keine Daten.") + " Deine Daten sind unverändert.");
    return;
  }
  mitRueckgaengig(() => {
    ergebnisse.forEach(({ datum, wetter: neu }, id) => {
      // Inzwischen geänderte Einträge (anderes Datum, kein Arbeitsweg mehr) bleiben, wie sie sind
      const e = daten.eintraege.find(x => x.id === id);
      if (!neu || !e || e.datum !== datum || !mitWetter(e)) return;
      ["hin", "rueck"].forEach(art => {
        const alt = e.wetter && e.wetter[art];
        if (alt && !neu[art]) neu[art] = alt;
        else if (alt && alt.kleidung) Object.assign(neu[art], { kleidung: alt.kleidung, empfehlung: alt.empfehlung, regenkleidung: alt.regenkleidung, rueckmeldung: alt.rueckmeldung });
      });
      e.wetter = neu;
    });
  }, "Wetter für " + (gefunden === 1 ? "1 Fahrtag" : gefunden + " Fahrtage") + " nachgetragen" + (ohne ? ", " + ohne + " ohne Daten" : "") +
    (fehler ? " (Rückblick abgebrochen: " + fehler + ")" : ""));
}

// Säulendiagramm (SVG): km pro Monat im Jahr "jahr" neben dem Vorjahr. Im
// laufenden Jahr bleiben die kommenden Monate leer. Antippen eines Monats
// zeigt seine Werte; die Tabelle darunter enthält alle Werte.
function monatsDiagramm(jahr, h, gewaehlt) {
  const akt = monatsSummen(jahr), vor = monatsSummen(jahr - 1);
  const bis = h.slice(0, 4) === String(jahr) ? Number(h.slice(5, 7)) : 12;
  const werte = [...vor, ...akt.slice(0, bis)];
  const legende = '<div class="legende"><span><span class="farbe jahr"></span>' + jahr + '</span>' +
    '<span><span class="farbe vorjahr"></span>' + (jahr - 1) + '</span></div>';
  if (!werte.some(v => v > 0)) return legende + '<div class="leer">Für ' + (jahr - 1) + ' und ' + jahr + ' gibt es noch keine Einträge.</div>';

  // Achse in runden Schritten (1, 2, 5 × 10ⁿ), etwa drei Gitterlinien
  const max = Math.max(...werte);
  const roh = max / 3, p = Math.pow(10, Math.floor(Math.log10(roh)));
  const schritt = [1, 2, 5, 10].map(f => f * p).find(s => s >= roh);
  const oben = Math.ceil(max / schritt) * schritt;
  // Maße im Koordinatensystem des SVG (wird auf die Kartenbreite skaliert)
  const B = 340, H = 190, L = 34, R = 2, O = 8, U = 22;
  const spalte = (B - L - R) / 12, balken = 9, luecke = 2;
  const r1 = n => Math.round(n * 10) / 10;
  const y = km => r1(O + (H - O - U) * (1 - km / oben));
  // Säule mit 4px-Rundung oben, gerade an der Grundlinie
  const saeule = (x, km, klasse) => {
    if (!(km > 0)) return "";
    const y0 = y(0), y1 = y(km), r = Math.min(4, y0 - y1);
    return '<path class="' + klasse + '" d="M' + r1(x) + ',' + y0 + 'V' + r1(y1 + r) + 'Q' + r1(x) + ',' + y1 + ' ' + r1(x + r) + ',' + y1 +
      'H' + r1(x + balken - r) + 'Q' + r1(x + balken) + ',' + y1 + ' ' + r1(x + balken) + ',' + r1(y1 + r) + 'V' + y0 + 'Z"/>';
  };

  let svg = '<svg class="diagramm" viewBox="0 0 ' + B + ' ' + H + '" role="img" aria-label="km pro Monat ' + jahr + ' und ' + (jahr - 1) + '">';
  svg += '<rect class="gewaehlt" x="' + r1(L + gewaehlt * spalte) + '" y="0" width="' + r1(spalte) + '" height="' + (H - U + 4) + '" rx="4"/>';
  for (let v = 0; v <= oben; v += schritt) {
    svg += '<line class="gitter" x1="' + L + '" x2="' + (B - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>' +
      '<text x="' + (L - 5) + '" y="' + r1(y(v) + 4) + '" text-anchor="end">' + kmText(v) + '</text>';
  }
  for (let i = 0; i < 12; i++) {
    const mitte = L + (i + 0.5) * spalte;
    svg += saeule(mitte - luecke / 2 - balken, vor[i], "vorjahr") + (i < bis ? saeule(mitte + luecke / 2, akt[i], "jahr") : "") +
      '<text x="' + r1(mitte) + '" y="' + (H - 6) + '" text-anchor="middle"' + (i === gewaehlt ? ' style="fill:var(--text);font-weight:700"' : "") + '>' +
      MONATE_KURZ[i] + '</text>' +
      '<rect class="treffer" x="' + r1(L + i * spalte) + '" y="0" width="' + r1(spalte) + '" height="' + H + '" data-action="statistik-monat" data-monat="' + i + '"' +
      ' role="button" aria-label="' + MONATE[i] + '"/>';
  }
  svg += '</svg>';

  // Werte des angetippten Monats: Wert vorn, Jahr dahinter
  const wert = (km, j, klasse) => '<span class="farbe ' + klasse + '"></span> <strong>' + (km === null ? "–" : kmText(km) + " km") + '</strong> ' + j;
  const jetzt = gewaehlt < bis ? akt[gewaehlt] : null;
  const diff = jetzt === null ? "" : runden(jetzt - vor[gewaehlt]);
  const monatswert = '<div class="monatswert"><strong>' + MONATE[gewaehlt] + '</strong><br>' +
    wert(jetzt, jahr, "jahr") + ' · ' + wert(vor[gewaehlt], jahr - 1, "vorjahr") +
    (diff === "" ? "" : ' <span class="klein">(' + (diff > 0 ? "+" : diff < 0 ? "−" : "±") + kmText(Math.abs(diff)) + ' km)</span>') + '</div>';

  // Dieselben Werte als Tabelle (aufklappbar)
  const summe = liste => runden(liste.reduce((s, v) => s + v, 0));
  const tabelle = '<button type="button" class="aufklappen" data-action="statistik-tabelle" aria-expanded="' + statistikTabelleOffen + '">' +
    CHEVRON + 'Werte als Tabelle</button>' +
    (statistikTabelleOffen ? '<table class="tabelle"><thead><tr><th>Monat</th><th>' + jahr + '</th><th>' + (jahr - 1) + '</th></tr></thead><tbody>' +
      MONATE.map((m, i) => '<tr><td>' + m + '</td><td>' + (i < bis ? kmText(akt[i]) : "–") + '</td><td>' + kmText(vor[i]) + '</td></tr>').join("") +
      '<tr class="summe-zeile"><td>Summe</td><td>' + kmText(summe(akt)) + '</td><td>' + kmText(summe(vor)) + '</td></tr></tbody></table>' : "");
  return legende + svg + monatswert + tabelle;
}
