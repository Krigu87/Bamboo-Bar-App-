// Kalender: Monatsansicht mit Belegung, Verfügbarkeit und Geburtstagen
import {
  ausnahmeLoeschen, ausnahmeSetzen, darfTyp, istMitglied, mitglieder, profilName, stand,
  terminAnlegen, terminLoeschen,
} from '../daten.js';
import {
  datumAus, datumLang, eintraegeImBereich, geburtstageImBereich, heute, MONATE, plusTage,
  tageImMonat, teile, wochentag, WOCHENTAGE_KURZ, zeit,
} from '../termine.js';
import { h, mitSperre, fuellen } from '../ui.js';
import { gehe } from '../main.js';

export const TYP_TEXT = { reservierung: 'Reservierung', probe: 'Bandprobe', verfuegbar: 'Verfügbar' };

export function zeitText(e) {
  if (e.ganztags) return 'ganztags';
  if (!e.ende) return `ab ${zeit(e.beginn)}`;
  return `${zeit(e.beginn)}–${zeit(e.ende)}`;
}

export async function seiteKalender(teileUrl) {
  let ausgewaehlt = /^\d{4}-\d{2}-\d{2}$/.test(teileUrl[0] ?? '') ? teileUrl[0] : heute();
  let monat = ausgewaehlt.slice(0, 7); // 'JJJJ-MM'

  const wurzel = h('div', { class: 'seite kalender' });

  function zeichnen() {
    const { y, m } = teile(monat + '-01');
    const erster = datumAus(y, m, 1);
    const letzter = datumAus(y, m, tageImMonat(y, m));
    const start = plusTage(erster, -wochentag(erster));
    const ende = plusTage(letzter, 6 - wochentag(letzter));

    const eintraege = eintraegeImBereich(stand.termine, stand.ausnahmen, start, ende);
    const geburtstage = geburtstageImBereich(stand.profile, start, ende);
    const proTag = new Map();
    const tag = (d) => {
      if (!proTag.has(d)) proTag.set(d, { belegung: [], verfuegbar: new Set(), geburtstage: [] });
      return proTag.get(d);
    };
    for (const e of eintraege) {
      if (e.abgesagt) continue;
      if (e.termin.typ === 'verfuegbar') tag(e.datum).verfuegbar.add(e.termin.erstellt_von);
      else tag(e.datum).belegung.push(e);
    }
    for (const g of geburtstage) tag(g.datum).geburtstage.push(g);

    const anzahlMitglieder = mitglieder().length;
    const heuteD = heute();

    const zellen = [];
    for (let d = start; d <= ende; d = plusTage(d, 1)) {
      const info = proTag.get(d);
      const imMonat = d.slice(0, 7) === monat;
      const datum = d;
      zellen.push(h('button', {
        class: 'tag' + (imMonat ? '' : ' fremd') + (d === heuteD ? ' heute' : '') + (d === ausgewaehlt ? ' gewaehlt' : ''),
        onclick: () => { ausgewaehlt = datum; if (datum.slice(0, 7) !== monat) monat = datum.slice(0, 7); zeichnen(); },
        'aria-label': datumLang(d),
      },
      h('span', { class: 'tag-zahl' }, teile(d).d),
      h('span', { class: 'tag-marker' },
        (info?.belegung ?? []).slice(0, 3).map((e) => h('i', { class: 'punkt ' + e.termin.typ })),
        info?.geburtstage.length ? h('i', { class: 'punkt geburtstag' }) : null,
      ),
      istMitglied() && info?.verfuegbar.size
        ? h('span', { class: 'tag-verfuegbar' }, `${info.verfuegbar.size}/${anzahlMitglieder}`)
        : null,
      ));
    }

    history.replaceState(null, '', '#/kalender/' + ausgewaehlt);

    fuellen(wurzel, 
      h('header', { class: 'kopf' },
        h('button', { class: 'knopf rund', 'aria-label': 'Voriger Monat', onclick: () => blaettern(-1) }, '‹'),
        h('h1', { class: 'monat' }, `${MONATE[m - 1]} ${y}`),
        h('button', { class: 'knopf rund', 'aria-label': 'Nächster Monat', onclick: () => blaettern(1) }, '›'),
      ),
      h('div', { class: 'raster wochentage' }, WOCHENTAGE_KURZ.map((w) => h('span', null, w))),
      h('div', { class: 'raster tage' }, zellen),
      h('div', { class: 'legende' },
        h('span', null, h('i', { class: 'punkt reservierung' }), 'Reservierung'),
        h('span', null, h('i', { class: 'punkt probe' }), 'Bandprobe'),
        h('span', null, h('i', { class: 'punkt geburtstag' }), 'Geburtstag'),
        istMitglied() ? h('span', null, h('b', { class: 'tag-verfuegbar' }, '4/7'), 'können') : null,
        ausgewaehlt !== heuteD ? h('button', {
          class: 'knopf klein leise',
          onclick: () => { ausgewaehlt = heuteD; monat = heuteD.slice(0, 7); zeichnen(); },
        }, 'Heute') : null,
      ),
      tagesBereich(ausgewaehlt, eintraege.filter((e) => e.datum === ausgewaehlt),
        geburtstage.filter((g) => g.datum === ausgewaehlt), zeichnen),
    );
  }

  function blaettern(richtung) {
    let { y, m } = teile(monat + '-01');
    m += richtung;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    monat = datumAus(y, m, 1).slice(0, 7);
    ausgewaehlt = datumAus(y, m, Math.min(teile(ausgewaehlt).d, tageImMonat(y, m)));
    zeichnen();
  }

  // Wischen nach links/rechts blättert den Monat
  let wischStart = null;
  wurzel.addEventListener('touchstart', (ev) => {
    if (ev.target.closest('.raster.tage')) wischStart = ev.touches[0].clientX;
  }, { passive: true });
  wurzel.addEventListener('touchend', (ev) => {
    if (wischStart === null) return;
    const dx = ev.changedTouches[0].clientX - wischStart;
    wischStart = null;
    if (Math.abs(dx) > 60) blaettern(dx < 0 ? 1 : -1);
  });

  zeichnen();
  return wurzel;
}

function tagesBereich(datum, eintraege, geburtstage, neuZeichnen) {
  const belegung = eintraege.filter((e) => e.termin.typ !== 'verfuegbar');
  const verfuegbar = eintraege.filter((e) => e.termin.typ === 'verfuegbar');
  const ich = stand.ich.id;

  const teile = [
    h('h2', { class: 'tag-titel' }, datumLang(datum, true)),
  ];

  // Geburtstage
  for (const g of geburtstage) {
    teile.push(h('div', { class: 'geburtstag-zeile' },
      h('span', { class: 'kuchen', 'aria-hidden': 'true' }, '🎂'),
      g.alter !== null ? `${g.profil.name} wird ${g.alter}` : `${g.profil.name} hat Geburtstag`,
    ));
  }

  // Belegung
  teile.push(h('h3', { class: 'abschnitt' }, 'Belegung'));
  if (!belegung.length) {
    teile.push(h('p', { class: 'leise' }, 'Der Raum ist frei.'));
  } else {
    teile.push(h('ul', { class: 'liste' }, belegung.map((e) => h('li', null,
      h('a', {
        class: 'eintrag ' + e.termin.typ + (e.abgesagt ? ' abgesagt' : ''),
        href: `#/eintrag/${e.termin.id}/${e.datum}`,
      },
      h('span', { class: 'eintrag-zeit' }, zeitText(e)),
      h('span', { class: 'eintrag-text' },
        h('strong', null, e.termin.titel || TYP_TEXT[e.termin.typ]),
        h('small', null,
          e.abgesagt ? 'abgesagt · ' : '',
          TYP_TEXT[e.termin.typ],
          e.termin.typ === 'reservierung' ? ` · ${profilName(e.termin.erstellt_von)}` : '',
          e.termin.wiederholung !== 'keine' ? ' · ↻' : '',
          e.geaendert ? ' · Zeit geändert' : '',
        ),
      ),
      h('span', { class: 'pfeil', 'aria-hidden': 'true' }, '›'),
      ),
    ))));
  }

  const knoepfe = [];
  if (darfTyp('reservierung')) {
    knoepfe.push(h('a', { class: 'knopf primaer', href: `#/neu?typ=reservierung&datum=${datum}` }, '+ Reservieren'));
  }
  if (darfTyp('probe')) {
    knoepfe.push(h('a', { class: 'knopf holz', href: `#/neu?typ=probe&datum=${datum}` }, '+ Bandprobe'));
  }
  teile.push(h('div', { class: 'knopf-reihe' }, knoepfe));

  // Verfügbarkeit (nur Mitglieder)
  if (istMitglied()) {
    const aktiv = verfuegbar.filter((e) => !e.abgesagt);
    const namen = [...new Set(aktiv.map((e) => e.termin.erstellt_von))].map(profilName).sort();
    const meine = verfuegbar.filter((e) => e.termin.erstellt_von === ich);
    const meineAktiv = meine.find((e) => !e.abgesagt);
    const meineAbgesagt = meine.find((e) => e.abgesagt);

    teile.push(h('h3', { class: 'abschnitt' }, 'Wer kann?'));
    teile.push(h('p', { class: 'verfuegbar-zeile' },
      h('b', { class: 'tag-verfuegbar gross' }, `${namen.length}/${mitglieder().length}`),
      namen.length ? namen.join(', ') : 'Noch niemand eingetragen.',
    ));

    const knopf = h('button', { class: 'knopf ' + (meineAktiv ? 'leise' : 'gruen') }, meineAktiv ? 'Ich kann doch nicht' : 'Ich kann an diesem Tag');
    knopf.addEventListener('click', () => mitSperre(knopf, async () => {
      if (meineAktiv) {
        if (meineAktiv.termin.wiederholung === 'keine') await terminLoeschen(meineAktiv.termin.id);
        else await ausnahmeSetzen(meineAktiv.termin.id, datum, { abgesagt: true });
      } else if (meineAbgesagt) {
        await ausnahmeLoeschen(meineAbgesagt.termin.id, datum);
      } else {
        await terminAnlegen({ typ: 'verfuegbar', datum, ganztags: true, wiederholung: 'keine', titel: '', notiz: '' });
      }
      neuZeichnen();
    }));
    teile.push(h('div', { class: 'knopf-reihe' },
      knopf,
      h('a', { class: 'knopf leise', href: `#/neu?typ=verfuegbar&datum=${datum}` }, 'Regelmäßig …'),
    ));
    if (meineAktiv && meineAktiv.termin.wiederholung !== 'keine') {
      teile.push(h('p', { class: 'leise klein' },
        'Du bist hier regelmäßig eingetragen. ',
        h('a', { href: `#/eintrag/${meineAktiv.termin.id}/${datum}` }, 'Serie ansehen')));
    }
  }

  return h('section', { class: 'karte tagesbereich' }, teile);
}

// Für andere Seiten: nach dem Speichern zum Tag zurück
export function zumTag(datum) {
  gehe('/kalender/' + datum);
}
