// Einzelner Eintrag (Ansicht) und Formular zum Anlegen/Ändern
import {
  ausnahmeLoeschen, ausnahmeSetzen, darfTerminAendern, darfTyp, profilName, serieAbAendern,
  serieAbLoeschen, stand, terminAendern, terminAnlegen, terminLoeschen,
} from '../daten.js';
import {
  datumKurz, datumLang, eintraegeImBereich, heute, ueberschneidungen, wiederholungsOptionen,
  wiederholungText, zeit,
} from '../termine.js';
import { bestaetigen, feld, frage, h, meldung, mitSperre, fuellen } from '../ui.js';
import { gehe } from '../main.js';
import { TYP_TEXT, zeitText } from './kalender.js';

function zurueck(datum) {
  return h('a', { class: 'zurueck', href: '#/kalender/' + datum }, '‹ Kalender');
}

// ---------- Ansicht ----------

export async function seiteEintrag([id, datum]) {
  const t = stand.termine.find((x) => x.id === id);
  if (!t) {
    return h('div', { class: 'seite' }, zurueck(datum ?? heute()),
      h('p', { class: 'leise' }, 'Diesen Eintrag gibt es nicht mehr.'));
  }
  const e = eintraegeImBereich([t], stand.ausnahmen, datum, datum)[0];
  if (!e) {
    return h('div', { class: 'seite' }, zurueck(datum),
      h('p', { class: 'leise' }, 'An diesem Tag findet der Eintrag nicht statt.'));
  }

  const serie = t.wiederholung !== 'keine';
  const ersterTermin = datum <= t.datum;
  const darf = darfTerminAendern(t);

  const zeilen = [
    h('div', { class: 'detail-zeile' }, h('span', null, 'Datum'), h('b', null, datumLang(datum, true))),
    h('div', { class: 'detail-zeile' }, h('span', null, 'Zeit'),
      h('b', null, zeitText(e), e.geaendert ? h('small', null, ` (sonst ${zeitText(t)})`) : null)),
  ];
  if (serie) {
    zeilen.push(h('div', { class: 'detail-zeile' }, h('span', null, 'Wiederholung'),
      h('b', null, wiederholungText(t), t.bis ? h('small', null, ` bis ${datumKurz(t.bis)}`) : null)));
  }
  zeilen.push(h('div', { class: 'detail-zeile' }, h('span', null, 'Eingetragen von'), h('b', null, profilName(t.erstellt_von))));

  const inhalt = [
    zurueck(datum),
    h('div', { class: 'karte' },
      h('span', { class: 'abzeichen ' + t.typ }, TYP_TEXT[t.typ]),
      h('h1', { class: e.abgesagt ? 'durchgestrichen' : '' }, t.titel || TYP_TEXT[t.typ]),
      e.abgesagt ? h('p', { class: 'hinweis-box' }, 'An diesem Tag abgesagt.') : null,
      zeilen,
      t.notiz ? h('p', { class: 'notiz' }, t.notiz) : null,
    ),
  ];

  if (darf && !serie) {
    const loeschen = h('button', { class: 'knopf gefahr' }, 'Löschen');
    loeschen.addEventListener('click', () => mitSperre(loeschen, async () => {
      if (!await bestaetigen('Eintrag löschen?', `${t.titel || TYP_TEXT[t.typ]} am ${datumKurz(datum)}`, 'Löschen')) return;
      await terminLoeschen(t.id);
      meldung('Gelöscht.');
      gehe('/kalender/' + datum);
    }));
    inhalt.push(h('div', { class: 'knopf-reihe' },
      h('a', { class: 'knopf primaer', href: `#/bearbeiten/${t.id}/${datum}` }, 'Bearbeiten'),
      loeschen));
  }

  if (darf && serie) {
    // Nur dieser Tag
    const absagen = h('button', { class: 'knopf' + (e.abgesagt ? ' gruen' : ' gefahr') },
      e.abgesagt ? 'Absage zurücknehmen' : 'An diesem Tag absagen');
    absagen.addEventListener('click', () => mitSperre(absagen, async () => {
      if (e.abgesagt) {
        if (e.geaendert) await ausnahmeSetzen(t.id, datum, { abgesagt: false, beginn: e.beginn, ende: e.ende });
        else await ausnahmeLoeschen(t.id, datum);
        meldung('Findet wieder statt.');
      } else {
        await ausnahmeSetzen(t.id, datum, { abgesagt: true, beginn: e.geaendert ? e.beginn : null, ende: e.geaendert ? e.ende : null });
        meldung('Abgesagt.');
      }
      gehe(`/eintrag/${t.id}/${datum}`);
    }));

    const nurHeute = [absagen];
    if (!t.ganztags && !e.abgesagt) {
      nurHeute.unshift(h('button', {
        class: 'knopf',
        onclick: () => uhrzeitDialog(t, e, datum),
      }, 'Uhrzeit ändern'));
    }

    const abLoeschen = h('button', { class: 'knopf gefahr' }, ersterTermin ? 'Ganze Serie löschen' : 'Ab hier löschen');
    abLoeschen.addEventListener('click', () => mitSperre(abLoeschen, async () => {
      const text = ersterTermin
        ? 'Alle Termine dieser Serie werden gelöscht.'
        : `Dieser und alle folgenden Termine ab ${datumKurz(datum)} werden gelöscht. Frühere bleiben.`;
      if (!await bestaetigen('Serie löschen?', text, 'Löschen')) return;
      await serieAbLoeschen(t, datum);
      meldung('Gelöscht.');
      gehe('/kalender/' + datum);
    }));

    inhalt.push(
      h('div', { class: 'karte aktionen' },
        h('h3', null, 'Nur an diesem Tag'),
        h('div', { class: 'knopf-reihe' }, nurHeute),
      ),
      h('div', { class: 'karte aktionen' },
        h('h3', null, ersterTermin ? 'Ganze Serie' : 'Dieser und alle folgenden Termine'),
        h('div', { class: 'knopf-reihe' },
          h('a', { class: 'knopf primaer', href: `#/bearbeiten/${t.id}/${datum}` }, ersterTermin ? 'Serie ändern' : 'Ab hier ändern'),
          abLoeschen),
      ),
    );
  }

  return h('div', { class: 'seite' }, inhalt);
}

async function uhrzeitDialog(t, e, datum) {
  const beginn = h('input', { type: 'time', value: zeit(e.beginn), required: true });
  const ende = h('input', { type: 'time', value: zeit(e.ende) });
  const inhalt = h('div', { class: 'formular' },
    h('p', null, `Neue Uhrzeit nur für ${datumLang(datum)}. Die anderen Termine bleiben gleich.`),
    h('div', { class: 'zwei-spalten' }, feld('Von', beginn), feld('Bis', ende)),
  );
  const knoepfe = [{ text: 'Speichern', wert: 'speichern', art: 'primaer' }];
  if (e.geaendert) knoepfe.push({ text: 'Normale Zeit', wert: 'normal' });
  const wahl = await frage('Uhrzeit ändern', inhalt, knoepfe);
  try {
    if (wahl === 'speichern') {
      if (!beginn.value) { meldung('Bitte eine Anfangszeit angeben.', 'fehler'); return; }
      await ausnahmeSetzen(t.id, datum, { beginn: beginn.value, ende: ende.value || null });
      meldung('Uhrzeit geändert.');
    } else if (wahl === 'normal') {
      await ausnahmeLoeschen(t.id, datum);
      meldung('Wieder normale Zeit.');
    } else {
      return;
    }
    gehe(`/eintrag/${t.id}/${datum}`);
  } catch (err) {
    meldung(err.message, 'fehler');
  }
}

// ---------- Formular ----------

export async function seiteEintragFormular(teileUrl, query) {
  const bearbeiten = location.hash.startsWith('#/bearbeiten');
  let alt = null;
  let abDatum = null;
  let werte;

  if (bearbeiten) {
    alt = stand.termine.find((x) => x.id === teileUrl[0]);
    abDatum = teileUrl[1];
    if (!alt || !darfTerminAendern(alt)) {
      return h('div', { class: 'seite' }, zurueck(abDatum ?? heute()), h('p', { class: 'leise' }, 'Dieser Eintrag kann nicht bearbeitet werden.'));
    }
    werte = { ...alt, beginn: zeit(alt.beginn), ende: zeit(alt.ende) };
    if (alt.wiederholung !== 'keine' && abDatum > alt.datum) werte.datum = abDatum;
  } else {
    const typ = darfTyp(query.get('typ')) ? query.get('typ') : 'reservierung';
    werte = {
      typ,
      datum: query.get('datum') || heute(),
      titel: typ === 'probe' ? 'Bandprobe' : '',
      ganztags: typ === 'verfuegbar',
      beginn: typ === 'probe' ? '19:00' : '',
      ende: typ === 'probe' ? '22:00' : '',
      wiederholung: typ === 'probe' || typ === 'verfuegbar' ? 'woechentlich' : 'keine',
      bis: null,
      notiz: '',
    };
  }

  const wurzel = h('div', { class: 'seite' });
  const istSerieAb = bearbeiten && alt.wiederholung !== 'keine' && abDatum > alt.datum;

  function zeichnen() {
    const typen = ['reservierung', 'probe', 'verfuegbar'].filter(darfTyp);
    const titel = h('input', { type: 'text', value: werte.titel ?? '', maxlength: 80,
      placeholder: werte.typ === 'reservierung' ? 'z. B. Spieleabend, Geburtstag' : '',
      oninput: (ev) => { werte.titel = ev.target.value; } });
    const datum = h('input', { type: 'date', value: werte.datum, required: true,
      onchange: (ev) => { if (ev.target.value) { werte.datum = ev.target.value; zeichnen(); } } });
    const ganztags = h('input', { type: 'checkbox', checked: !!werte.ganztags,
      onchange: (ev) => { werte.ganztags = ev.target.checked; zeichnen(); } });
    const beginn = h('input', { type: 'time', value: werte.beginn ?? '',
      oninput: (ev) => { werte.beginn = ev.target.value; } });
    const ende = h('input', { type: 'time', value: werte.ende ?? '',
      oninput: (ev) => { werte.ende = ev.target.value; } });
    const wiederholung = h('select', {
      onchange: (ev) => { werte.wiederholung = ev.target.value; zeichnen(); },
    }, wiederholungsOptionen(werte.datum).map((o) => h('option', { value: o.wert, selected: o.wert === werte.wiederholung }, o.text)));
    const bis = h('input', { type: 'date', value: werte.bis ?? '', min: werte.datum,
      onchange: (ev) => { werte.bis = ev.target.value || null; } });
    const notiz = h('textarea', { rows: 2, maxlength: 500,
      placeholder: werte.typ === 'verfuegbar' ? 'z. B. erst ab 20 Uhr' : 'Optional',
      oninput: (ev) => { werte.notiz = ev.target.value; } }, werte.notiz ?? '');

    const speichern = h('button', { class: 'knopf primaer breit', type: 'submit' }, 'Speichern');

    let ueberschrift;
    if (!bearbeiten) ueberschrift = { reservierung: 'Raum reservieren', probe: 'Bandprobe eintragen', verfuegbar: 'Wann kannst du?' }[werte.typ];
    else if (istSerieAb) ueberschrift = `Ab ${datumKurz(abDatum)} ändern`;
    else ueberschrift = 'Eintrag bearbeiten';

    fuellen(wurzel, 
      zurueck(abDatum ?? werte.datum),
      h('h1', null, ueberschrift),
      istSerieAb ? h('p', { class: 'leise' }, 'Termine vor diesem Tag bleiben unverändert.') : null,
      h('form', {
        class: 'karte formular',
        onsubmit: (ev) => { ev.preventDefault(); mitSperre(speichern, () => absenden()); },
      },
      !bearbeiten && typen.length > 1
        ? h('div', { class: 'umschalter' }, typen.map((t) => h('button', {
          type: 'button',
          class: werte.typ === t ? 'aktiv' : '',
          onclick: () => {
            werte.typ = t;
            if (t === 'probe' && !werte.titel) werte.titel = 'Bandprobe';
            if (t !== 'probe' && werte.titel === 'Bandprobe') werte.titel = '';
            werte.ganztags = t === 'verfuegbar';
            zeichnen();
          },
        }, TYP_TEXT[t])))
        : null,
      werte.typ !== 'verfuegbar' ? feld(werte.typ === 'probe' ? 'Titel' : 'Wofür?', titel) : null,
      feld('Datum', datum),
      h('label', { class: 'schalter' }, ganztags, h('span', null, 'Ganztägig')),
      !werte.ganztags ? h('div', { class: 'zwei-spalten' }, feld('Von', beginn), feld('Bis', ende)) : null,
      feld('Wiederholen', wiederholung),
      werte.wiederholung !== 'keine' ? feld('Endet am', bis, 'Leer lassen = läuft ohne Ende.') : null,
      feld('Notiz', notiz),
      speichern,
      ),
    );
  }

  async function absenden() {
    if (!werte.ganztags && !werte.beginn) {
      meldung('Bitte eine Anfangszeit angeben oder „Ganztägig“ wählen.', 'fehler');
      return;
    }
    if (werte.bis && werte.bis < werte.datum) {
      meldung('Das Enddatum liegt vor dem Startdatum.', 'fehler');
      return;
    }
    const daten = {
      typ: werte.typ,
      titel: (werte.titel ?? '').trim(),
      notiz: (werte.notiz ?? '').trim(),
      datum: werte.datum,
      ganztags: !!werte.ganztags,
      beginn: werte.ganztags ? null : werte.beginn,
      ende: werte.ganztags || !werte.ende ? null : werte.ende,
      wiederholung: werte.wiederholung,
      bis: werte.wiederholung === 'keine' ? null : werte.bis || null,
    };

    // Doppelbuchung?
    const konflikte = ueberschneidungen({ ...daten, id: alt?.id }, stand.termine, stand.ausnahmen);
    if (konflikte.length) {
      const liste = h('ul', { class: 'konflikte' }, konflikte.map((k) => h('li', null,
        `${datumKurz(k.datum)}, ${zeitText(k)}: ${k.termin.titel || TYP_TEXT[k.termin.typ]}`)));
      const ok = await frage('Überschneidung', h('div', null,
        h('p', null, 'Zu dieser Zeit ist der Raum schon belegt:'), liste),
      [{ text: 'Trotzdem speichern', wert: true, art: 'primaer' }]);
      if (!ok) return;
    }

    if (!bearbeiten) await terminAnlegen(daten);
    else if (alt.wiederholung !== 'keine') await serieAbAendern(alt, abDatum, daten);
    else await terminAendern(alt.id, daten);
    meldung('Gespeichert.');
    gehe('/kalender/' + daten.datum);
  }

  zeichnen();
  return wurzel;
}
