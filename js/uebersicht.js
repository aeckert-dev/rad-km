// Rad-km · Reiter Übersicht (Wetter-Kachel, Erfassen, Kilometerstand, Summen, Jahr, Woche) und Einträge: Liste, Formular
"use strict";

/* ---------- Übersicht ---------- */
// Reihenfolge (Release 5b): Hinweise, Wetter-Kachel, Heute erfassen mit
// Fahrtagen ohne Eintrag, Kilometerstand mit Wartung, Summen, Jahr, Einträge
// dieser Woche, Datensicherung in einer Zeile. Ampel und Erfassen sollen auf
// einem kleinen iPhone ohne Scrollen sichtbar sein.
function bildUebersicht() {
  const h = heute();
  let html = "";

  if (!daten.fahrrad) {
    html += '<div class="hinweis info"><strong>Willkommen!</strong><br>Bitte lege zuerst dein Fahrrad mit Startdatum und Start-Kilometerstand an.' +
      '<br><button type="button" class="primaer" data-action="fahrrad-aendern">Fahrrad anlegen</button></div>';
  }

  // Erinnerung an die Datensicherung
  const le = letzterExport();
  const exportAlter = le ? tageZwischen(le, h) : null;
  if (daten.fahrrad && (le === null || exportAlter > EXPORT_ERINNERUNG_TAGE)) {
    html += '<div class="hinweis warn"><strong>⚠️ Datensicherung fällig</strong><br>' +
      (le === null ? "Du hast noch nie gesichert." : "Letzte Sicherung vor " + tageText(exportAlter) + " (" + datumText(le) + ").") +
      ' Die Daten liegen nur auf diesem Gerät.<br><button type="button" class="primaer" data-action="sichern">Jetzt sichern</button></div>';
  }

  html += wetterKachel(Date.now());

  // Schnellerfassung, darunter Fahrtage ohne Eintrag
  const eHeute = eintragAm(h);
  html += '<h2>Heute erfassen</h2>';
  if (eHeute) {
    html += '<div class="hinweis info">✓ Heute erfasst: <strong>' + (eHeute.km === 0 ? "keine Fahrt" : kmText(eHeute.km) + ' km') + '</strong>' +
      (eHeute.vorlage ? " (" + esc(eHeute.vorlage) + ")" : "") +
      '<br><button type="button" data-action="eintrag-ansehen" data-id="' + eHeute.id + '">Anzeigen</button></div>';
  }
  html += '<div class="schnell">';
  daten.vorlagen.forEach(v => {
    html += '<button type="button" class="primaer" data-action="vorlage-erfassen" data-id="' + v.id + '">' +
      '<span>' + esc(v.name) + '</span><span class="km">' + kmText(v.km) + ' km</span></button>';
  });
  html += '<button type="button" data-action="eintrag-neu"><span>Andere km</span><span class="km">frei eingeben</span></button>';
  html += '</div>';
  if (!daten.vorlagen.length) {
    html += '<p class="klein">Tipp: Lege unter „Einstellungen → Vorlagen“ deine Standard-Strecken an, dann erfasst du einen Tag mit zwei Klicks.</p>' +
      wegZuEinstellungen("Vorlagen anlegen", "vorlagen");
  }
  html += lueckenHinweis(h);

  // Kilometerstand, nächste Wartung und offene Mängel (antippen: Reiter Wartung)
  html += '<h2>Kilometerstand</h2><button type="button" class="karte stand-kachel" data-action="tab" data-tab="wartung">' +
    '<div class="klein">' + esc(daten.fahrrad ? daten.fahrrad.name : "Kilometerstand") + '</div>' +
    '<div class="stand-zahl">' + kmText(aktuellerKmStand()) + ' km</div>';
  const lage = werkstattLage(h);
  const nw = naechsterAuftrag(lage, h);
  if (nw) {
    html += '<div style="margin-top:8px">🔧 ' + esc(nw.art.name) + ': <span class="' + nw.klasse + '">' + esc(nw.text) + '</span>' +
      (nw.erwartet ? ' <span class="klein">(' + caKm(nw.erwartet.km) + ')</span>' : "") +
      (nw.positionen.length ? ' · ' + positionenText(nw.positionen.length) : "") + '</div>';
  } else {
    html += '<div class="klein" style="margin-top:8px">🔧 Keine Wartung fällig</div>';
  }
  // Überfällige Aufgaben ohne Auftrag als Hinweis
  lage.aufgaben.filter(x => !x.offen && x.st.klasse === "status-rot").forEach(x => {
    html += '<div class="status-rot" style="margin-top:4px">⚠️ ' + esc(x.art.name) + ' ' + esc(aufgabeKurz(x.st)) + ' – keinem Auftrag zugeordnet</div>';
  });
  const anzahlMaengel = offeneMaengel().length;
  if (anzahlMaengel) {
    html += '<div class="status-orange" style="margin-top:4px">⚠️ ' + maengelText(anzahlMaengel) + '</div>';
  }
  html += '</button>';

  // Summen
  const montag = montagDerWoche(h), sonntag = plusTage(montag, 6);
  html += '<h2>Summen</h2><div class="summen">' +
    kachel("Heute", summe(e => e.datum === h)) +
    kachel("Woche", summe(e => e.datum >= montag && e.datum <= sonntag)) +
    kachel("Monat", summe(e => e.datum.slice(0, 7) === h.slice(0, 7))) +
    kachel("Jahr", summe(e => e.datum.slice(0, 4) === h.slice(0, 4))) +
    '</div>';

  if (daten.fahrrad) html += jahresKarte(h);

  // Einträge dieser Woche; alle Einträge im Reiter Fahrten
  const woche = daten.eintraege.filter(e => e.datum >= montag && e.datum <= sonntag).sort((a, b) => b.datum.localeCompare(a.datum));
  html += '<h2>Diese Woche</h2><div class="liste">' +
    (woche.length ? woche.map(e => eintragsZeile(e, "")).join("") : '<div class="leer">Diese Woche noch keine Einträge.</div>') + '</div>' +
    '<button type="button" class="leise weg" data-action="zu-fahrten" data-wert="eintraege">Alle Einträge (' + daten.eintraege.length + ') ›</button>';

  html += sicherungsZeile(h);
  return html;
}

// Alle Einträge (Reiter Fahrten → Einträge), abgeschlossene Zeiträume zusammengefasst
function eintraegeListe(h) {
  return '<h2 style="margin-top:12px">Einträge <span class="klein">(' + daten.eintraege.length + ')</span></h2><div class="liste">' +
    (daten.eintraege.length ? "" : '<div class="leer">Noch keine Einträge.</div>') + zeilenHtml(gruppieren(daten.eintraege, h), 0) + '</div>' +
    '<div class="knopfreihe"><button type="button" class="primaer" data-action="eintrag-neu">+ Eintrag</button></div>';
}

// Eingestellte Fahrtage der letzten 14 Tage (und ab der eingestellten Uhrzeit
// heute) ohne Eintrag, je mit "Nachtragen" und "Keine Fahrt". Die Überschrift
// nennt nur die Anzahl, die Tage stehen in den Zeilen (jeder Tag nur einmal).
function lueckenHinweis(h, minuten) {
  const tage = fehlendeFahrtage(h, minuten);
  if (!tage.length) return "";
  const kurz = d => d === h ? "heute" : wochentag(d) + " " + kurzDatum(d);
  return '<div class="hinweis info"><strong>' + (tage.length === 1 ? "1 Fahrtag" : tage.length + " Fahrtage") + ' ohne Eintrag</strong>' +
    tage.map(d => '<div class="luecke"><span>' + kurz(d) + '</span>' +
      '<button type="button" data-action="nachtragen" data-datum="' + d + '">Nachtragen</button>' +
      '<button type="button" data-action="keine-fahrt" data-datum="' + d + '">Keine Fahrt</button></div>').join("") +
    '</div>';
}
// "Keine Fahrt": Eintrag mit 0 km mit einem Tipper (mit "Rückgängig")
function keineFahrt(datum) {
  if (!istGueltigesDatum(datum) || eintragAm(datum)) return;
  mitRueckgaengig(() => daten.eintraege.push({ id: neueId(), datum, km: 0, vorlage: null, notiz: "", typ: "tag", arbeitsweg: false, wetter: null }),
    "Keine Fahrt am " + wochentag(datum) + " " + kurzDatum(datum));
}

function kachel(titel, km) {
  return '<div class="summe"><div class="wert">' + kmText(km) + '</div><div class="titel">' + titel + ' (km)</div></div>';
}

// Grundlage der Prognosen in einem Satz
function grundlageText(g) {
  return '<div class="klein">Grundlage: Ø ' + kmText(g.rate) + ' km pro Tag (' + datumText(g.von) + '–' + datumText(g.bis) + ')</div>';
}
function zuWenigeTageText() {
  return "Für eine Prognose sind noch zu wenige Tage erfasst (möglich ab dem " + datumText(plusTage(daten.fahrrad.startdatum, PROGNOSE_MIN_TAGE)) + ").";
}

// Laufendes Jahr: Jahresziel mit zeitanteiligem Soll, Jahresprognose
function jahresKarte(h) {
  const z = jahreszielStand(h);
  const prognose = jahresPrognose(h);
  let html = '<h2>Jahr ' + z.jahr + '</h2><div class="karte">';
  if (z.ziel) {
    const v = rund10(z.vorsprung);
    html += '<div><strong>' + kmText(z.ist) + '</strong> von ' + kmText(z.ziel) + ' km · ' + Math.round(z.anteil * 100) + ' %</div>' +
      '<div class="balken" role="progressbar" aria-label="Jahresziel" aria-valuemin="0" aria-valuemax="' + z.ziel + '" aria-valuenow="' + runden(z.ist) + '">' +
      '<div class="balken-ist" style="width:' + Math.min(100, z.anteil * 100) + '%"></div>' +
      '<div class="balken-soll" style="left:' + Math.min(100, z.soll / z.ziel * 100) + '%"></div></div>' +
      '<div class="' + (v >= 0 ? "status-gruen" : "status-orange") + '">' +
      (v > 0 ? "ca. " + kmText(v) + " km voraus" : v < 0 ? "ca. " + kmText(-v) + " km im Rückstand" : "genau im Soll") + '</div>' +
      '<div class="klein">Zeitanteiliges Soll bis heute: ' + caKm(z.soll) + '</div>';
  }
  html += '<div style="margin-top:' + (z.ziel ? 10 : 0) + 'px">';
  if (prognose === null) {
    html += '<span class="klein">Jahresprognose: ' + zuWenigeTageText() + '</span>';
  } else {
    html += 'Jahresprognose: <strong>' + caKm(prognose) + '</strong>';
    if (z.ziel) {
      const d = rund10(prognose - z.ziel);
      html += '<div class="klein">' + (d > 0 ? "ca. " + kmText(d) + " km über dem Ziel" : d < 0 ? "ca. " + kmText(-d) + " km unter dem Ziel" : "entspricht dem Ziel") + '</div>';
    }
    html += grundlageText(prognoseGrundlage(h));
  }
  html += '</div><div class="knopfreihe"><button type="button" data-action="prognose">Kilometerstand für ein Datum …</button>' +
    (z.ziel ? "" : '<button type="button" data-action="jahresziel-neu" data-jahr="' + z.jahr + '">Jahresziel festlegen</button>') +
    '</div></div>';
  return html;
}

// Kilometerstand-Prognose für ein frei wählbares Datum
function prognoseFenster() {
  fensterOeffnen('<h2>Kilometerstand für ein Datum</h2>' +
    '<label for="pg-datum">Datum</label>' +
    '<input type="date" id="pg-datum" value="' + heute().slice(0, 4) + '-12-31" data-change="prognose-datum" data-input="prognose-datum">' +
    '<div id="pg-ergebnis" style="margin-top:14px"></div>' +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Schließen</button></div>');
  prognoseAnzeigen();
}
function prognoseAnzeigen() {
  document.getElementById("pg-ergebnis").innerHTML = prognoseErgebnis(wert("pg-datum"), heute());
}
function prognoseErgebnis(d, h) {
  const f = daten.fahrrad;
  if (!f) return "Bitte zuerst das Fahrrad anlegen.";
  if (!istGueltigesDatum(d)) return "Bitte ein Datum wählen.";
  if (d < f.startdatum) return "Das Datum liegt vor dem Startdatum (" + datumText(f.startdatum) + ").";
  if (d <= h) {
    return '<div class="stand-zahl">' + kmText(kmStandAm(d)) + ' km</div>' +
      '<div class="klein">Tatsächlicher Kilometerstand am Ende des ' + datumText(d) + '</div>';
  }
  const g = prognoseGrundlage(h);
  if (!g) return zuWenigeTageText();
  return '<div class="stand-zahl">' + caKm(kmPrognose(d, h)) + '</div>' +
    '<div class="klein">Erwarteter Kilometerstand am Ende des ' + datumText(d) + '</div>' + grundlageText(g);
}

// "heute", "gestern" bzw. "vor 5 Tagen"
function vorText(iso, h) {
  const t = tageZwischen(iso, h);
  return t <= 0 ? "heute" : t === 1 ? "gestern" : "vor " + tageText(t);
}

// Datensicherung auf der Übersicht in einer Zeile (und Hauptseite der Einstellungen)
function sicherungsZeile(h) {
  const le = letzterExport();
  return '<div class="karte" style="margin-top:12px"><div class="sicherungszeile"><div>Letzte Sicherung: ' +
    (le ? datumText(le) + ' <span class="klein">(' + vorText(le, h) + ')</span>' : "noch nie") + '</div>' +
    '<button type="button" class="primaer" data-action="sichern">Jetzt sichern</button></div>' +
    sicherungsErgebnisHtml() + '</div>';
}
// Nach einer erfolgreichen Sicherung: Ergebnis und Prüfung der gespeicherten Datei
function sicherungsErgebnisHtml() {
  if (!sicherungsErgebnis) return "";
  return '<div class="hinweis info" style="margin:10px 0 0">✓ <strong>Sicherung ' + sicherungsErgebnis.wie + '</strong> – Inhalt geprüft: ' +
    inhaltText(sicherungsErgebnis.kurzinfo) +
    '<br><span class="klein">Wähle die gespeicherte Datei aus, um sie zu prüfen. Dabei wird nichts überschrieben.</span>' +
    '<br><button type="button" data-action="sicherung-pruefen">Gespeicherte Sicherung jetzt prüfen</button></div>';
}

// Zeilen der Eintragsliste; aufgeklappte Gruppen zeigen ihre Kinder eingerückt darunter
function zeilenHtml(zeilen, tiefe) {
  const einzug = ' style="padding-left:' + (16 + tiefe * 16) + 'px"';
  return zeilen.map(z => {
    if (z.art === "eintrag") return eintragsZeile(z.eintrag, einzug);
    const offen = offeneGruppen.has(z.schluessel);
    const zeitraum = z.art === "woche" ? kurzDatum(z.von) + "–" + kurzDatum(z.bis) : "";
    const unten = [zeitraum, z.anzahl === 1 ? "1 Eintrag" : z.anzahl + " Einträge"].filter(Boolean).join(" · ");
    return '<div class="zeile gruppe">' +
      '<button type="button" class="inhalt" data-action="gruppe" data-key="' + esc(z.schluessel) + '" aria-expanded="' + offen + '"' + einzug + '>' +
      CHEVRON +
      '<div class="text"><div class="titel">' + esc(z.titel) + '</div><div class="klein">' + unten + '</div></div>' +
      '<span class="zahl" style="padding-right:16px">' + kmText(z.km) + ' km</span></button></div>' +
      (offen ? zeilenHtml(z.kinder, tiefe + 1) : "");
  }).join("");
}

function eintragsZeile(e, einzug) {
  const vorStart = daten.fahrrad && e.datum < daten.fahrrad.startdatum;
  const unten = [e.vorlage, e.notiz].filter(Boolean).map(esc).join(" · ");
  const keine = e.km === 0;
  return '<div class="zeile' + (keine ? " keine-fahrt" : "") + '">' +
    '<button type="button" class="inhalt" data-action="eintrag-ansehen" data-id="' + e.id + '"' + einzug + '>' +
    '<div class="text"><div>' + wochentag(e.datum) + ', ' + datumText(e.datum) +
    (e.typ === "woche" ? '<span class="abzeichen">Woche</span>' : "") + '</div>' +
    (unten ? '<div class="klein">' + unten + '</div>' : "") +
    (vorStart ? '<div class="klein">vor dem Startdatum – zählt nicht zum Kilometerstand</div>' : "") +
    '</div><span class="zahl" style="padding-right:16px">' + (keine ? "keine Fahrt" : kmText(e.km) + ' km') + '</span></button>' +
    '</div>';
}

function gruppeUmschalten(schluessel) {
  if (offeneGruppen.has(schluessel)) offeneGruppen.delete(schluessel);
  else offeneGruppen.add(schluessel);
  zeichnen();
}

/* ---------- Eintrag: Detailansicht und Formular ---------- */

function eintragAnsicht(id, hinweis) {
  const e = daten.eintraege.find(e => e.id === id);
  if (!e) return;
  const vorStart = daten.fahrrad && e.datum < daten.fahrrad.startdatum;
  const stand = kmStandAm(e.datum);
  fensterOeffnen(
    '<h2>Eintrag' + (e.typ === "woche" ? ' <span class="abzeichen">Woche</span>' : "") + '</h2>' +
    (hinweis ? '<div class="hinweis info">' + esc(hinweis) + '</div>' : "") +
    detailListe([
      ["Datum", wochentag(e.datum) + ", " + datumText(e.datum)],
      ["Kilometer", kmText(e.km) + " km" + (e.km === 0 ? " (keine Fahrt)" : "")],
      ["Art", e.typ === "woche" ? "Importierte Wochensumme (Datum = Montag bzw. erster Fahrtag der Woche)" : "Tages-Eintrag"],
      ["Vorlage", esc(e.vorlage || "")],
      ["Arbeitsweg", e.arbeitsweg ? "ja" : ""],
      ["Notiz", esc(e.notiz)],
      ["Kilometerstand am Ende des Tages", vorStart ? "vor dem Startdatum – zählt nicht zum Kilometerstand" : stand === null ? "" : kmText(stand) + " km"]
    ]) +
    eintragWetterHtml(e) +
    '<div class="knopfreihe"><button type="button" data-action="fenster-zu">Schließen</button>' +
    '<button type="button" class="primaer" data-action="eintrag-aendern" data-id="' + e.id + '">Ändern</button></div>'
  );
}
// Gespeichertes Wetter eines Eintrags mit Rückmeldung zur Kleidung je Fahrt
function eintragWetterHtml(e) {
  const w = e.wetter;
  if (!w) return mitWetter(e) ? '<p class="klein">Noch kein Wetter gespeichert. In der Statistik lässt es sich mit „Wetter nachtragen …“ holen.</p>' : "";
  const fahrt = (name, art) => {
    const f = w[art];
    if (!f) return '<div class="eintrag-wetter"><strong>' + name + '</strong> <span class="klein">ohne Wetter</span></div>';
    const rueckmeldung = !f.kleidung ? ""
      : rueckmeldungAn() ? '<div class="klein">Wie war die Kleidung?</div>' + rueckmeldungKnoepfe(e, art, f, true)
      : f.rueckmeldung ? '<div class="klein">Rückmeldung: ' + RUECKMELDUNG_TEXT[f.rueckmeldung] + '</div>' : "";
    return '<div class="eintrag-wetter"><div><strong>' + name + '</strong> ' + ampelHtml(f.ampel) + FARBWORT[f.ampel] + '</div>' +
      '<div class="klein">' + gradText(f.temperatur) + ' (gefühlt ' + gradText(f.gefuehlt) + ') · Regen ' +
      (f.regenWahrscheinlichkeit === null ? "" : f.regenWahrscheinlichkeit + ' %, ') + zahl1.format(f.niederschlag) + ' mm · Wind ' + kmhText(f.wind) + ' · Böen ' + kmhText(f.boeen) + '</div>' +
      (f.kleidung ? '<div>👕 ' + esc(fahrtKleidungText(f)) + '</div>' : "") + rueckmeldung + '</div>';
  };
  return '<h3 style="margin-top:16px">Wetter</h3>' + fahrt("Hinfahrt", "hin") + fahrt("Rückfahrt", "rueck") +
    '<p class="klein">' + (w.quelle === "rueckblick" ? "Aus dem Rückblick" : "Aus der Vorhersage") + ' (Open-Meteo), Stand ' + esc(zeitpunktText(w.stand) || "–") +
    '. Die Ampel berücksichtigt hier nur die Wetterwerte, keine amtlichen Warnungen.</p>';
}

// Zustand des gerade geöffneten Eintrags-Formulars
let formEintrag = null; // { id | null, typ, ursprungsDatum }

// Neuer Eintrag. Gibt es für das Datum schon einen Eintrag, wird dieser angezeigt.
function eintragNeu(vorgabe) {
  const datum = vorgabe.datum || heute();
  const vorhanden = eintragAm(datum);
  if (vorhanden) {
    eintragAnsicht(vorhanden.id, "Für den " + datumText(datum) + " gibt es bereits einen Eintrag. Mit „Ändern“ kannst du ihn bearbeiten.");
  } else {
    eintragsFormular({ id: null, datum, km: vorgabe.km ?? null, vorlage: vorgabe.vorlage || null, notiz: "", typ: "tag", arbeitsweg: !!vorgabe.arbeitsweg }, "");
  }
}

function eintragsFormular(e, hinweis) {
  formEintrag = { id: e.id, typ: e.typ, ursprungsDatum: e.id ? e.datum : null };
  let optionen = '<option value="">– keine –</option>';
  let gefunden = false;
  daten.vorlagen.forEach(v => {
    const sel = v.name === e.vorlage;
    if (sel) gefunden = true;
    optionen += '<option value="' + esc(v.id) + '"' + (sel ? " selected" : "") + '>' + esc(v.name) + ' (' + kmText(v.km) + ' km)</option>';
  });
  // Vorlage wurde gelöscht oder umbenannt: Namen trotzdem behalten
  if (e.vorlage && !gefunden) {
    optionen += '<option value="__alt__" selected>' + esc(e.vorlage) + ' (Vorlage existiert nicht mehr)</option>';
  }
  formEintrag.alteVorlage = e.vorlage;

  fensterOeffnen(
    '<h2>' + (e.id ? "Eintrag bearbeiten" : "Neuer Eintrag") +
    (e.typ === "woche" ? ' <span class="abzeichen">Woche</span>' : "") + '</h2>' +
    (hinweis ? '<div class="hinweis info">' + esc(hinweis) + '</div>' : "") +
    (e.typ === "woche" ? '<div class="klein">Importierte Wochensumme – das Datum ist der Montag bzw. erste Fahrtag der Woche.</div>' : "") +
    '<label for="f-datum">Datum</label>' +
    '<input type="date" id="f-datum" value="' + e.datum + '" data-change="eintrag-datum">' +
    '<div class="feldhinweis warn" id="f-datum-hinweis"></div>' +
    '<label for="f-vorlage">Vorlage (optional)</label>' +
    '<select id="f-vorlage" data-change="eintrag-vorlage">' + optionen + '</select>' +
    (e.typ === "tag" ? '<label class="haken"><input type="checkbox" id="f-arbeitsweg"' + (e.arbeitsweg ? " checked" : "") + '>' +
      '<span>Arbeitsweg <span class="klein">(Fahrt zur Arbeit)</span><br><span class="klein">Die App speichert dann das Wetter der Hin- und Rückfahrt mit, ' +
      'soweit die Vorhersage für Wohn- und Arbeitsort vorliegt.</span></span></label>' : "") +
    '<label for="f-km">Kilometer</label>' +
    '<input type="text" id="f-km" inputmode="decimal" autocomplete="off" placeholder="z. B. 12,5" value="' + kmFeld(e.km) + '">' +
    '<label for="f-notiz">Notiz (optional)</label>' +
    '<input type="text" id="f-notiz" value="' + esc(e.notiz) + '">' +
    '<div class="knopfreihe">' +
    (e.id ? '<button type="button" data-action="eintrag-ansehen" data-id="' + e.id + '">Abbrechen</button>'
          : '<button type="button" data-action="fenster-zu">Abbrechen</button>') +
    '<button type="button" class="primaer" data-action="eintrag-speichern">Speichern</button>' +
    '</div>' +
    (e.id ? '<div class="knopfreihe"><button type="button" class="gefahr voll" data-action="eintrag-loeschen" data-id="' + e.id + '">Eintrag löschen</button></div>' : "")
  );
  datumHinweis();
}

function datumHinweis() {
  const d = wert("f-datum");
  const el = document.getElementById("f-datum-hinweis");
  el.textContent = (daten.fahrrad && d && d < daten.fahrrad.startdatum)
    ? "Dieses Datum liegt vor dem Startdatum (" + datumText(daten.fahrrad.startdatum) + ") und zählt nicht zum Kilometerstand."
    : "";
}

// Datum im Formular geändert: existiert dort schon ein Eintrag, wechseln
function eintragDatumGeaendert() {
  const d = wert("f-datum");
  const vorhanden = istGueltigesDatum(d) ? eintragAm(d) : null;
  if (vorhanden && vorhanden.id !== formEintrag.id) {
    eintragsFormular(vorhanden, "Für den " + datumText(d) + " gibt es bereits einen Eintrag. Du kannst ihn hier bearbeiten.");
    return;
  }
  datumHinweis();
}

function eintragVorlageGeaendert() {
  const v = daten.vorlagen.find(v => v.id === wert("f-vorlage"));
  if (v) {
    document.getElementById("f-km").value = kmFeld(v.km);
    const aw = document.getElementById("f-arbeitsweg");
    if (aw) aw.checked = v.arbeitsweg;
  }
}

async function eintragSpeichern() {
  const datum = wert("f-datum");
  const km = kmLesen(wert("f-km"));
  if (!istGueltigesDatum(datum)) { alert("Bitte ein gültiges Datum wählen."); return; }
  if (km === null) { alert("Bitte die Kilometer als Zahl eingeben, z. B. 12,5."); return; }
  const anderer = eintragAm(datum);
  if (anderer && anderer.id !== formEintrag.id) { alert("Für den " + datumText(datum) + " gibt es bereits einen Eintrag."); return; }

  const vw = wert("f-vorlage");
  const gewaehlt = daten.vorlagen.find(v => v.id === vw) || null;
  const vorlage = vw === "__alt__" ? formEintrag.alteVorlage : (gewaehlt ? gewaehlt.name : null);

  // Warnung: Tages-Eintrag in einer Woche, für die es schon eine Wochensumme gibt
  const neuOderVerschoben = !formEintrag.id || formEintrag.ursprungsDatum !== datum;
  if (formEintrag.typ === "tag" && neuOderVerschoben) {
    const w = wochenEintragInWoche(datum, formEintrag.id);
    if (w) {
      const mo = montagDerWoche(datum);
      const ok = await frage("In der Woche vom " + datumText(mo) + " bis " + datumText(plusTage(mo, 6)) +
        " gibt es bereits einen <strong>Wochen-Eintrag</strong> (" + kmText(w.km) + " km am " + datumText(w.datum) +
        "). Die Kilometer würden dann doppelt zählen.<br><br>Trotzdem speichern?", "Trotzdem speichern", "Abbrechen");
      if (!ok) return;
    }
  }

  const notiz = wert("f-notiz").trim();
  // Das Merkmal "Arbeitsweg" kommt wie km aus der Vorlage und lässt sich ändern
  const aw = document.getElementById("f-arbeitsweg");
  if (formEintrag.id) {
    const e = daten.eintraege.find(e => e.id === formEintrag.id);
    // Das gespeicherte Wetter gehört zum Datum und entfällt, wenn es sich ändert
    if (e.datum !== datum) e.wetter = null;
    Object.assign(e, { datum, km, vorlage, notiz });
    if (aw) e.arbeitsweg = aw.checked;
    eintragWetterSetzen(e);
  } else {
    const e = { id: neueId(), datum, km, vorlage, notiz, typ: "tag", arbeitsweg: !!(aw && aw.checked), wetter: null };
    eintragWetterSetzen(e);
    daten.eintraege.push(e);
  }
  if (speichern()) {
    fensterSchliessen();
    zeichnen();
    const e = eintragAm(datum);
    meldung("Gespeichert: " + kmText(km) + " km" + (e && e.wetter ? ", mit Wetter" : ""));
  }
}

async function eintragLoeschen(id) {
  const e = daten.eintraege.find(e => e.id === id);
  if (!e) return;
  const ok = await frage("Eintrag vom " + datumText(e.datum) + " (" + kmText(e.km) + " km) wirklich löschen?", "Löschen", "Abbrechen", true);
  if (!ok) return;
  mitRueckgaengig(() => { daten.eintraege = daten.eintraege.filter(x => x.id !== id); }, "Eintrag gelöscht");
}
