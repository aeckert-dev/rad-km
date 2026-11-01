// Rad-km · Bedienung: Klicks und Eingaben den Funktionen zuordnen (data-action, data-change)
"use strict";

/* =====================================================================
   9. BEDIENUNG: Klicks und Eingaben den Funktionen zuordnen
   Jede Schaltfläche hat ein Attribut data-action="…", hier steht,
   was dann passiert.
   ===================================================================== */

const AKTIONEN = {
  "tab": el => {
    // Erneutes Antippen der Einstellungen führt zur Hauptseite
    if (el.dataset.tab === "einstellungen" && aktiverTab === "einstellungen") einstellungenSeite = null;
    aktiverTab = el.dataset.tab;
    zeichnen();
    window.scrollTo(0, 0);
    if (aktiverTab === "uebersicht" || aktiverTab === "wetter") wetterBeiBedarf();
  },
  "fenster-zu": () => fensterSchliessen(),
  "kalender": el => kalenderFenster(el.dataset.key),
  "kalender-oeffnen": el => kalenderOeffnen(el.dataset.key),
  "kalender-teilen": el => kalenderTeilen(el.dataset.key),
  "gruppe": el => gruppeUmschalten(el.dataset.key),

  "vorlage-erfassen": el => {
    const v = daten.vorlagen.find(v => v.id === el.dataset.id);
    eintragNeu({ datum: heute(), km: v.km, vorlage: v.name, arbeitsweg: v.arbeitsweg });
  },
  "eintrag-neu": () => eintragNeu({ datum: heute() }),
  "nachtragen": el => eintragNeu({ datum: el.dataset.datum }),
  "keine-fahrt": el => keineFahrt(el.dataset.datum),
  "eintrag-ansehen": el => eintragAnsicht(el.dataset.id),
  "eintrag-aendern": el => eintragsFormular(daten.eintraege.find(e => e.id === el.dataset.id), ""),
  "eintrag-speichern": () => eintragSpeichern(),
  "eintrag-loeschen": el => eintragLoeschen(el.dataset.id),

  "auftrag-ansehen": el => auftragAnsicht(el.dataset.key),
  "auftrag-termin": el => auftragTerminFormular(el.dataset.key),
  "auftrag-termin-speichern": el => auftragTerminSpeichern(el.dataset.key),
  "auftrag-termin-entfernen": el => auftragTerminEntfernen(el.dataset.key),
  "auftrag-neu": el => auftragTerminFormular("anlegen:" + el.dataset.id),
  "auftrag-loeschen": el => auftragLoeschen(el.dataset.key),
  "auftrag-erledigen": el => auftragErledigen(el.dataset.key),
  "vorschlag-annehmen": el => auftragGeaendert(aufgabeZuAuftrag(el.dataset.key, el.dataset.id), artName(el.dataset.id) + " aufgenommen"),
  "position-entfernen": el => auftragGeaendert(positionEntfernen(el.dataset.key, el.dataset.pos), "Position entfernt"),
  "position-verschieben": el => positionVerschiebenWahl(el.dataset.key, el.dataset.pos),
  "position-verschieben-ziel": el => positionVerschieben(el.dataset.key, el.dataset.pos, el.dataset.ziel),
  "position-aufgabe-dazu": el => auftragGeaendert(aufgabeZuAuftrag(el.dataset.key, wert("ap-aufgabe")), "Aufgabe hinzugefügt"),
  "position-mangel-dazu": el => auftragGeaendert(mangelZuAuftrag(el.dataset.key, wert("ap-mangel")), "Mangel hinzugefügt"),
  "abschluss-speichern": () => abschlussSpeichern(),
  "erledigt-aendern": el => erledigterAuftragAendern(el.dataset.id),
  "abschluss-position-entfernen": el => abschlussPositionEntfernen(Number(el.dataset.i)),
  "abschluss-aufgabe-dazu": () => abschlussAufgabeDazu(),
  "abschluss-mangel-dazu": () => abschlussMangelDazu(),
  "erledigt-loeschen": el => erledigtLoeschen(el.dataset.id),
  "protokoll-km-neu": () => protokollKmNeu(),
  "aufgabe-ansehen": el => aufgabeAnsicht(el.dataset.id),
  "aufgabe-erledigen": el => aufgabeErledigen(el.dataset.id),
  "aufgabe-erledigen-neu": el => aufgabeErledigenNeu(el.dataset.id, wert("ae-art")),
  "aufgabe-zu-erledigtem": el => erledigterAuftragAendern(el.dataset.id, el.dataset.aufgabe),
  "aufgabe-zuordnen": el => aufgabeZuordnenWahl(el.dataset.id),
  "aufgabe-zuordnen-ziel": el => { const a = aufgabeZuAuftrag(el.dataset.ziel, el.dataset.id); if (a && speichern()) { fensterSchliessen(); zeichnen(); meldung(artName(el.dataset.id) + " zugeordnet"); } },
  "mangel-zuordnen": el => mangelZuordnenWahl(el.dataset.id),
  "mangel-zuordnen-ziel": el => { const a = mangelZuAuftrag(el.dataset.ziel, el.dataset.id); if (a && speichern()) { fensterSchliessen(); zeichnen(); meldung("Mangel zugeordnet"); } },
  "mangel-auftrag-neu": el => mangelAuftragNeu(el.dataset.id, el.dataset.art),
  "pruefung-oeffnen": () => pruefungAnsicht(),
  "pruefung-art": el => artFormular(el.dataset.id, true),
  "pruefung-fertig": () => pruefungFertig(),
  "mangel-neu": () => mangelFormular(null),
  "mangel-ansehen": el => mangelAnsicht(el.dataset.id),
  "mangel-aendern": el => mangelFormular(el.dataset.id),
  "mangel-speichern": el => mangelSpeichern(el.dataset.id || null),
  "mangel-loeschen": el => mangelLoeschen(el.dataset.id),
  "wartung-ansicht": el => { wartungAnsicht = el.dataset.wert; zeichnen(); },
  "art-neu": () => artFormular(null),
  "art-bearbeiten": el => artFormular(el.dataset.id),
  "art-speichern": el => artSpeichern(el.dataset.id || null),
  "art-loeschen": el => artLoeschen(el.dataset.id),

  "vorlage-neu": () => vorlageFormular(null),
  "vorlage-bearbeiten": el => vorlageFormular(el.dataset.id),
  "vorlage-speichern": el => vorlageSpeichern(el.dataset.id || null),
  "vorlage-loeschen": el => vorlageLoeschen(el.dataset.id),
  "vorlage-hoch": el => vorlageVerschieben(el.dataset.id, -1),
  "vorlage-runter": el => vorlageVerschieben(el.dataset.id, 1),

  "fahrrad-aendern": () => fahrradFormular(),
  "fahrrad-speichern": () => fahrradSpeichern(),
  "jahresziel-neu": el => jahreszielFormular(el.dataset.jahr ? Number(el.dataset.jahr) : null, false),
  "jahresziel-bearbeiten": el => jahreszielFormular(Number(el.dataset.jahr), true),
  "jahresziel-speichern": el => jahreszielSpeichern(el.dataset.jahr ? Number(el.dataset.jahr) : null),
  "jahresziel-loeschen": el => jahreszielLoeschen(Number(el.dataset.jahr)),
  "prognose": () => prognoseFenster(),
  "fahrten-ansicht": el => { fahrtenAnsicht = el.dataset.wert; zeichnen(); },
  "zu-fahrten": el => { aktiverTab = "fahrten"; fahrtenAnsicht = el.dataset.wert; zeichnen(); window.scrollTo(0, 0); },
  "einstellungen-seite": el => {
    aktiverTab = "einstellungen";
    einstellungenSeite = el.dataset.seite || null;
    zeichnen();
    const ziel = el.dataset.anker && document.getElementById(el.dataset.anker);
    if (ziel) ziel.scrollIntoView(); else window.scrollTo(0, 0);
  },
  "statistik-monat": el => { statistikMonat = Number(el.dataset.monat); zeichnen(); },
  "statistik-tabelle": () => { statistikTabelleOffen = !statistikTabelleOffen; zeichnen(); },

  "ort-bearbeiten": el => ortFormular(el.dataset.rolle, el.dataset.i === undefined ? null : Number(el.dataset.i)),
  "wegpunkt-neu": () => ortFormular("wegpunkt", null),
  "wegpunkt-hoch": el => wegpunktVerschieben(Number(el.dataset.i), -1),
  "wegpunkt-runter": el => wegpunktVerschieben(Number(el.dataset.i), 1),
  "ort-suchen": () => ortSuchen(),
  "ort-waehlen": el => ortWaehlen(Number(el.dataset.i)),
  "ort-standort": () => ortStandort(),
  "ort-speichern": () => ortSpeichern(),
  "ort-entfernen": () => ortEntfernen(),
  "weiterer-ort-aus": () => weitererOrtAktiv(false),
  "fahrt-bearbeiten": el => fahrtFormular(el.dataset.art),
  "fahrt-speichern": () => fahrtSpeichern(),
  "wetter-aktualisieren": () => { wetterAktualisieren(true); standortBeiBedarf(true); },
  "ort-ausserhalb": el => ortAusserhalbSetzen(el.dataset.wert),
  "ampel-bearbeiten": () => ampelFormular(),
  "ampel-speichern": () => ampelSpeichern(),
  "ampel-standard": () => ampelStandard(),
  "kleidung-bearbeiten": () => kleidungFormular(),
  "kleidung-stufe": el => kleidungStufeFormular(Number(el.dataset.i)),
  "kleidung-stufe-neu": () => kleidungStufeFormular(null),
  "kleidung-stufe-speichern": el => kleidungStufeSpeichern(el.dataset.i),
  "kleidung-stufe-weg": el => kleidungStufeWeg(Number(el.dataset.i)),
  "kleidung-regen": el => kleidungRegenFormular(Number(el.dataset.i)),
  "kleidung-regen-neu": () => kleidungRegenFormular(null),
  "kleidung-regen-speichern": el => kleidungRegenSpeichern(el.dataset.i),
  "kleidung-regen-weg": el => kleidungRegenWeg(Number(el.dataset.i)),
  "kleidung-standard": () => kleidungStandard(),
  "rueckmeldung": el => rueckmeldungGeben(el.dataset.id, el.dataset.fahrt, el.dataset.urteil, !!el.dataset.detail),
  "wetter-nachtragen": () => wetterNachtragen(),

  "rueckgaengig": () => rueckgaengig(),
  "neu-laden": () => neuLaden(),
  "sichern": () => jetztSichern(),
  "sicherung-teilen": () => {
    const s = geprueftZumTeilen;
    geprueftZumTeilen = null;
    fensterSchliessen();
    if (s) sicherungTeilen(s);
  },
  "sicherung-pruefen": () => sicherungPruefenStarten(),
  "import": () => importStarten()
};
const AENDERUNGEN = {
  "eintrag-datum": () => eintragDatumGeaendert(),
  "eintrag-vorlage": () => eintragVorlageGeaendert(),
  "protokoll-datum": () => protokollDatumGeaendert(),
  "mangel-status": () => mangelStatusGeaendert(),
  "art-fenster": () => artFensterGeaendert(),
  "art-typ": () => artTypGeaendert(),
  "fahrtag": () => fahrtageGeaendert(),
  "hinweis-heute-an": el => hinweisHeuteAnGeaendert(el.checked),
  "termin-zeit-an": el => { document.getElementById("t-zeit").disabled = !el.checked; },
  "hinweis-heute-ab": el => hinweisHeuteAbGeaendert(el.value),
  "fahrt-abfahrt-an": el => { const f = document.getElementById("fz-abfahrt"); if (f) f.disabled = !el.checked; },
  "weiterer-ort-aktiv": el => weitererOrtAktiv(el.checked),
  "teilstrecke-wind": el => teilstreckeWind(Number(el.dataset.i), el.checked),
  "kleidung-rueckmeldung": el => kleidungRueckmeldungSchalten(el.checked),
  "prognose-datum": () => prognoseAnzeigen()
};
const EINGABEN = {
  "ort-karte": () => ortKarteAktualisieren(),
  "protokoll-km": () => protokollKmEingabe(),
  "prognose-datum": () => prognoseAnzeigen()
};

document.addEventListener("click", ev => {
  const el = ev.target.closest("[data-action]");
  if (el && !el.disabled) AKTIONEN[el.dataset.action](el);
});
document.addEventListener("change", ev => {
  const name = ev.target.dataset && ev.target.dataset.change;
  if (name) AENDERUNGEN[name](ev.target);
});
// Eingabetaste in einem Feld mit data-enter="…" (z. B. Ortssuche) löst die Aktion aus
document.addEventListener("keydown", ev => {
  const name = ev.key === "Enter" && ev.target.dataset && ev.target.dataset.enter;
  if (name) { ev.preventDefault(); AKTIONEN[name](ev.target); }
});
document.addEventListener("input", ev => {
  const name = ev.target.dataset && ev.target.dataset.input;
  if (name) EINGABEN[name]();
});
document.getElementById("importdatei").addEventListener("change", ev => importDateiGewaehlt(ev.target.files[0]));
document.getElementById("pruefdatei").addEventListener("change", ev => pruefDateiGewaehlt(ev.target.files[0]));

// Tippen neben das Fenster schließt es
fenster.addEventListener("click", ev => { if (ev.target === fenster) fensterSchliessen(); });

// Beim Zurückkehren in die App (z. B. am nächsten Tag) "heute" neu berechnen,
// nach einer neuen Version fragen und das Wetter bei Bedarf neu laden
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  if (!fenster.open) zeichnen();
  updatePruefen();
  wetterBeiBedarf();
});
