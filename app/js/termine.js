// Datum, Wiederholungen und Überschneidungen – reine Rechenfunktionen ohne Oberfläche.
// Daten werden als Text 'JJJJ-MM-TT' geführt, Uhrzeiten als 'HH:MM' (oder 'HH:MM:SS').

export const WOCHENTAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const WOCHENTAGE_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August',
  'September', 'Oktober', 'November', 'Dezember'];

const pad = (n) => String(n).padStart(2, '0');

export function parse(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
export function fmt(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
export function datumAus(y, m, d) { // m: 1–12
  return `${y}-${pad(m)}-${pad(d)}`;
}
export function plusTage(s, n) {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
}
export function tageZwischen(a, b) { // b - a in Tagen
  return Math.round((parse(b) - parse(a)) / 86400000);
}
export function wochentag(s) { // 0 = Montag … 6 = Sonntag
  return (parse(s).getUTCDay() + 6) % 7;
}
export function tageImMonat(y, m) { // m: 1–12
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
export function istSchaltjahr(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
export function heute() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}
export function teile(s) {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

// "Samstag, 21. November" bzw. mit Jahr
export function datumLang(s, mitJahr = false) {
  const { y, m, d } = teile(s);
  return `${WOCHENTAGE[wochentag(s)]}, ${d}. ${MONATE[m - 1]}${mitJahr ? ' ' + y : ''}`;
}
export function datumKurz(s) {
  const { y, m, d } = teile(s);
  return `${pad(d)}.${pad(m)}.${y}`;
}
export function zeit(t) {
  return t ? t.slice(0, 5) : '';
}

// Für "monatlich am 2. Samstag": welche Woche im Monat? 5 = letzte
export function wocheImMonat(s) {
  return Math.ceil(teile(s).d / 7);
}

// n-ter Wochentag (0=Mo) eines Monats; n = 5 bedeutet "letzter"
function nterWochentag(y, m, wt, n) {
  if (n >= 5) {
    const letzter = datumAus(y, m, tageImMonat(y, m));
    return plusTage(letzter, -((wochentag(letzter) - wt + 7) % 7));
  }
  const erster = datumAus(y, m, 1);
  const versatz = (wt - wochentag(erster) + 7) % 7;
  return plusTage(erster, versatz + (n - 1) * 7);
}

const ORDNUNG = ['', 'ersten', 'zweiten', 'dritten', 'vierten', 'letzten'];

// Auswahl-Texte für die Wiederholung, passend zum gewählten Datum
export function wiederholungsOptionen(datum) {
  const { m, d } = teile(datum);
  const wt = WOCHENTAGE[wochentag(datum)];
  const n = wocheImMonat(datum);
  return [
    { wert: 'keine', text: 'Nicht wiederholen' },
    { wert: 'woechentlich', text: `Jede Woche am ${wt}` },
    { wert: 'monatlich_datum', text: `Jeden Monat am ${d}.` },
    { wert: 'monatlich_wochentag', text: `Jeden Monat am ${ORDNUNG[Math.min(n, 5)]} ${wt}` },
    { wert: 'jaehrlich', text: `Jedes Jahr am ${d}. ${MONATE[m - 1]}` },
  ];
}
export function wiederholungText(t) {
  return wiederholungsOptionen(t.datum).find((o) => o.wert === t.wiederholung)?.text ?? '';
}

// Alle Termine (ursprüngliche Daten) einer Serie im Bereich [von, bis]
export function vorkommen(t, von, bis) {
  const ende = t.bis && t.bis < bis ? t.bis : bis;
  const anfang = t.datum > von ? t.datum : von;
  if (anfang > ende) return [];
  const liste = [];
  const { y: sy, m: sm, d: sd } = teile(t.datum);

  switch (t.wiederholung) {
    case 'keine':
      if (t.datum >= von && t.datum <= ende) liste.push(t.datum);
      break;

    case 'woechentlich': {
      let d = t.datum;
      if (d < anfang) d = plusTage(d, Math.ceil(tageZwischen(d, anfang) / 7) * 7);
      for (; d <= ende; d = plusTage(d, 7)) liste.push(d);
      break;
    }

    case 'monatlich_datum':
    case 'monatlich_wochentag': {
      const wt = wochentag(t.datum);
      const n = wocheImMonat(t.datum);
      let { y, m } = teile(anfang);
      const { y: ey, m: em } = teile(ende);
      while (y < ey || (y === ey && m <= em)) {
        let d = null;
        if (t.wiederholung === 'monatlich_datum') {
          if (sd <= tageImMonat(y, m)) d = datumAus(y, m, sd); // Monate ohne 31. werden übersprungen
        } else {
          d = nterWochentag(y, m, wt, n);
        }
        if (d && d >= anfang && d <= ende) liste.push(d);
        m++;
        if (m > 12) { m = 1; y++; }
      }
      break;
    }

    case 'jaehrlich': {
      const { y: ay } = teile(anfang);
      const { y: ey } = teile(ende);
      for (let y = ay; y <= ey; y++) {
        if (sm === 2 && sd === 29 && !istSchaltjahr(y)) continue;
        const d = datumAus(y, sm, sd);
        if (d >= anfang && d <= ende) liste.push(d);
      }
      break;
    }
  }
  return liste;
}

// Ausnahmen als Nachschlagetabelle
export function ausnahmenTabelle(ausnahmen) {
  const tab = new Map();
  for (const a of ausnahmen) tab.set(`${a.termin_id}|${a.datum}`, a);
  return tab;
}

// Konkrete Einträge im Bereich, sortiert nach Datum und Uhrzeit
export function eintraegeImBereich(termine, ausnahmen, von, bis) {
  const tab = ausnahmen instanceof Map ? ausnahmen : ausnahmenTabelle(ausnahmen);
  const liste = [];
  for (const t of termine) {
    for (const datum of vorkommen(t, von, bis)) {
      const a = tab.get(`${t.id}|${datum}`);
      liste.push({
        termin: t,
        datum,
        ganztags: t.ganztags,
        beginn: a?.beginn ?? t.beginn,
        ende: a?.beginn ? a.ende : t.ende,
        abgesagt: !!a?.abgesagt,
        geaendert: !!a?.beginn,
      });
    }
  }
  liste.sort((x, y) => (x.datum + (x.ganztags ? '' : zeit(x.beginn)))
    .localeCompare(y.datum + (y.ganztags ? '' : zeit(y.beginn))));
  return liste;
}

// Geburtstage im Bereich. Am 29. Februar Geborene feiern in anderen Jahren am 28.
export function geburtstageImBereich(profile, von, bis) {
  const liste = [];
  const { y: vy } = teile(von);
  const { y: by } = teile(bis);
  for (const p of profile) {
    if (!p.geburtstag || !p.aktiv) continue;
    const g = teile(p.geburtstag);
    for (let y = vy; y <= by; y++) {
      const tag = g.m === 2 && g.d === 29 && !istSchaltjahr(y) ? 28 : g.d;
      const d = datumAus(y, g.m, tag);
      if (d >= von && d <= bis) {
        liste.push({ profil: p, datum: d, alter: p.geburtsjahr_anzeigen ? y - g.y : null });
      }
    }
  }
  return liste;
}

// Zeitspanne in Minuten ab Tagesbeginn; über Mitternacht geht bis in den nächsten Tag
function spanne(e) {
  if (e.ganztags || !e.beginn) return [0, 24 * 60];
  const [bh, bm] = zeit(e.beginn).split(':').map(Number);
  const anfang = bh * 60 + bm;
  if (!e.ende) return [anfang, anfang + 60];
  const [eh, em] = zeit(e.ende).split(':').map(Number);
  let schluss = eh * 60 + em;
  if (schluss <= anfang) schluss += 24 * 60;
  return [anfang, schluss];
}

// Überschneidet sich ein (neuer oder geänderter) Termin mit bestehender Belegung?
// Geprüft wird das nächste Jahr. Verfügbarkeiten zählen nicht als Belegung.
export function ueberschneidungen(neu, termine, ausnahmen, ab) {
  if (neu.typ === 'verfuegbar') return [];
  const von = ab && ab > neu.datum ? ab : neu.datum;
  const bis = plusTage(von, 365);
  const andere = termine.filter((t) => t.typ !== 'verfuegbar' && t.id !== neu.id);
  const belegt = eintraegeImBereich(andere, ausnahmen, von, bis).filter((e) => !e.abgesagt);
  const proTag = new Map();
  for (const e of belegt) {
    if (!proTag.has(e.datum)) proTag.set(e.datum, []);
    proTag.get(e.datum).push(e);
  }
  const treffer = [];
  for (const datum of vorkommen(neu, von, bis)) {
    const [a1, b1] = spanne(neu);
    for (const e of proTag.get(datum) ?? []) {
      const [a2, b2] = spanne(e);
      if (a1 < b2 && a2 < b1) treffer.push(e);
    }
    if (treffer.length >= 5) break;
  }
  return treffer;
}
