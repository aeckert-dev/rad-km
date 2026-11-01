// Rad-km · Berechnungen: Kilometerstand, Summen, Prognosen, Jahresziel, Zusammenfassung der Einträge
"use strict";

/* =====================================================================
   4. BERECHNUNGEN
   ===================================================================== */

function eintragAm(iso) { return daten.eintraege.find(e => e.datum === iso) || null; }

function summe(filter) {
  return runden(daten.eintraege.filter(filter).reduce((s, e) => s + e.km, 0));
}

// Kilometerstand am Ende des Tages "iso". null, wenn kein Fahrrad angelegt
// ist oder das Datum vor dem Startdatum liegt.
function kmStandAm(iso) {
  const f = daten.fahrrad;
  if (!f || iso < f.startdatum) return null;
  return runden(f.startKm + summe(e => e.datum >= f.startdatum && e.datum <= iso));
}

// Aktueller Kilometerstand = Start + alle Einträge ab dem Startdatum
function aktuellerKmStand() {
  const f = daten.fahrrad;
  if (!f) return null;
  return runden(f.startKm + summe(e => e.datum >= f.startdatum));
}

// ---------- Prognosen ----------
// Grundlage aller Prognosen: durchschnittliche km pro Kalendertag der letzten
// 365 Tage bis gestern; liegt das Startdatum später, ab dem Startdatum.
// Einträge vor dem Startdatum zählen nicht. null = zu wenige Tage.
function prognoseGrundlage(h = heute()) {
  const f = daten.fahrrad;
  if (!f) return null;
  const bis = plusTage(h, -1);
  const von = f.startdatum > plusTage(bis, -364) ? f.startdatum : plusTage(bis, -364);
  const tage = tageZwischen(von, bis) + 1;
  if (tage < PROGNOSE_MIN_TAGE) return null;
  const km = summe(e => e.datum >= von && e.datum <= bis);
  return { von, bis, tage, km, rate: km / tage };
}

// Erwarteter Kilometerstand am Ende des Tages "datum" (nach "h"):
// Kilometerstand heute + Rate × Tage bis dahin. null ohne Grundlage.
function kmPrognose(datum, h = heute()) {
  const g = prognoseGrundlage(h);
  const stand = kmStandAm(h);
  if (!g || stand === null || datum <= h) return null;
  return stand + g.rate * tageZwischen(h, datum);
}

// Jahresprognose: km des laufenden Jahres bis heute + Rate × restliche Tage
function jahresPrognose(h = heute()) {
  const g = prognoseGrundlage(h);
  if (!g) return null;
  const jahr = h.slice(0, 4);
  return summe(e => e.datum.slice(0, 4) === jahr && e.datum <= h) + g.rate * tageZwischen(h, jahr + "-12-31");
}

// Jahresziel des laufenden Jahres: Fortschritt und zeitanteiliges Soll bis heute
function jahreszielStand(h = heute()) {
  const jahr = Number(h.slice(0, 4));
  const ziel = daten.einstellungen.jahresziele.find(z => z.jahr === jahr);
  const ist = summe(e => e.datum.slice(0, 4) === String(jahr) && e.datum <= h);
  if (!ziel) return { jahr, ziel: null, ist };
  const tageImJahr = tageZwischen(jahr + "-01-01", (jahr + 1) + "-01-01");
  const soll = ziel.km * (tageZwischen(jahr + "-01-01", h) + 1) / tageImJahr;
  return { jahr, ziel: ziel.km, ist, soll, vorsprung: ist - soll, anteil: ist / ziel.km };
}

// ---------- Zusammenfassung der Einträge (nur Anzeige) ----------
// Eine Woche (Mo–So) ist ab dem folgenden Montag abgeschlossen. Ein Monat bzw.
// ein Jahr ist abgeschlossen, wenn die Woche abgeschlossen ist, die seinen
// letzten Tag enthält. Summen zählen nach Kalenderdatum; eine Woche über
// einen Monatswechsel erscheint in jedem Monat als Teilwoche.
function abgeschlossenBis(letzterTag, stichtag) {
  return stichtag >= plusTage(montagDerWoche(letzterTag), 7);
}

// Liefert die Zeilen der obersten Ebene, neueste zuerst. Jede Gruppe hat
//   { art: "jahr" | "monat" | "woche", schluessel, titel, von, bis, km, anzahl, kinder }
// und jede Eintragszeile { art: "eintrag", schluessel, eintrag }.
function gruppieren(eintraege, stichtag) {
  const absteigend = (a, b) => b.localeCompare(a);
  const nachSchluessel = (liste, f) => {
    const m = new Map();
    liste.forEach(e => { const k = f(e); if (!m.has(k)) m.set(k, []); m.get(k).push(e); });
    return [...m.keys()].sort(absteigend).map(k => [k, m.get(k)]);
  };
  const eintragsZeilen = liste => [...liste].sort((a, b) => absteigend(a.datum, b.datum))
    .map(e => ({ art: "eintrag", schluessel: "e" + e.id, eintrag: e }));
  const gruppe = (art, schluessel, titel, von, bis, liste, kinder) => ({
    art, schluessel, titel, von, bis, kinder,
    km: runden(liste.reduce((s, e) => s + e.km, 0)), anzahl: liste.length
  });

  // Wochen innerhalb eines Monats (am Monatsrand als Teilwoche)
  const wochenDesMonats = (ym, liste) => {
    const [j, m] = ym.split("-").map(Number);
    const anfang = monatsanfang(j, m), ende = monatsende(j, m);
    return nachSchluessel(liste, e => montagDerWoche(e.datum)).map(([montag, wl]) => {
      const sonntag = plusTage(montag, 6);
      const teil = montag < anfang || sonntag > ende;
      const von = montag < anfang ? anfang : montag, bis = sonntag > ende ? ende : sonntag;
      return { montag, liste: wl, knoten: () => gruppe("woche", "w" + ym + "|" + montag,
        "KW " + kalenderwoche(montag) + (teil ? " (Teil)" : ""), von, bis, wl, eintragsZeilen(wl)) };
    });
  };
  const monatsKnoten = (ym, liste) => {
    const [j, m] = ym.split("-").map(Number);
    return gruppe("monat", "m" + ym, MONATE[m - 1] + " " + j, monatsanfang(j, m), monatsende(j, m), liste,
      wochenDesMonats(ym, liste).map(w => w.knoten()));
  };

  const zeilen = [];
  nachSchluessel(eintraege, e => e.datum.slice(0, 4)).forEach(([jahr, jl]) => {
    const monate = nachSchluessel(jl, e => e.datum.slice(0, 7));
    if (abgeschlossenBis(jahr + "-12-31", stichtag)) {
      zeilen.push(gruppe("jahr", "j" + jahr, jahr, jahr + "-01-01", jahr + "-12-31", jl, monate.map(([ym, ml]) => monatsKnoten(ym, ml))));
      return;
    }
    monate.forEach(([ym, ml]) => {
      const [j, m] = ym.split("-").map(Number);
      if (abgeschlossenBis(monatsende(j, m), stichtag)) { zeilen.push(monatsKnoten(ym, ml)); return; }
      wochenDesMonats(ym, ml).forEach(w => {
        if (abgeschlossenBis(plusTage(w.montag, 6), stichtag)) zeilen.push(w.knoten());
        else zeilen.push(...eintragsZeilen(w.liste));
      });
    });
  });
  return zeilen;
}
