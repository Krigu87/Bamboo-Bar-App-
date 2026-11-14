// Einkaufsliste: Fehlendes eintragen, "Ich bring's mit", abhaken
import { einkaufAendern, einkaufErledigteLoeschen, einkaufHinzu, profilName, stand } from '../daten.js';
import { bestaetigen, h, meldung, mitSperre, fuellen } from '../ui.js';

export async function seiteEinkauf() {
  const wurzel = h('div', { class: 'seite' });
  let erledigteOffen = false;

  function zeichnen() {
    const ich = stand.ich.id;
    const offen = stand.einkauf.filter((e) => !e.erledigt);
    const erledigt = stand.einkauf.filter((e) => e.erledigt)
      .sort((a, b) => (b.erledigt_am ?? '').localeCompare(a.erledigt_am ?? ''));

    const eingabe = h('input', { type: 'text', placeholder: 'Was fehlt? z. B. Cola, Chips', maxlength: 100, enterkeyhint: 'done' });
    const hinzu = h('button', { class: 'knopf primaer', type: 'submit', 'aria-label': 'Hinzufügen' }, '+');

    const zeile = (e) => {
      const abhaken = h('input', { type: 'checkbox', class: 'haken', 'aria-label': `${e.text} abhaken` });
      abhaken.addEventListener('change', () => mitSperre(abhaken, async () => {
        await einkaufAendern(e.id, { erledigt: true, erledigt_am: new Date().toISOString() });
        zeichnen();
      }));
      const mitbringen = h('button', { class: 'knopf klein ' + (e.bringt_mit === ich ? 'leise' : 'gruen') },
        e.bringt_mit === ich ? 'Doch nicht' : 'Ich bring’s mit');
      mitbringen.addEventListener('click', () => mitSperre(mitbringen, async () => {
        await einkaufAendern(e.id, { bringt_mit: e.bringt_mit === ich ? null : ich });
        zeichnen();
      }));
      return h('li', { class: 'einkauf-zeile' + (e.bringt_mit ? ' wird-gebracht' : '') },
        abhaken,
        h('div', { class: 'einkauf-text' },
          h('strong', null, e.text),
          h('small', null,
            e.bringt_mit ? h('span', { class: 'bringt' }, `${profilName(e.bringt_mit)} bringt’s mit`) : null,
            e.bringt_mit ? ' · ' : '',
            `eingetragen von ${profilName(e.erstellt_von)}`),
        ),
        (!e.bringt_mit || e.bringt_mit === ich) ? mitbringen : null,
      );
    };

    fuellen(wurzel, 
      h('h1', null, 'Einkaufsliste'),
      h('form', {
        class: 'eingabe-zeile',
        onsubmit: (ev) => {
          ev.preventDefault();
          const text = eingabe.value.trim();
          if (!text) return;
          mitSperre(hinzu, async () => {
            await einkaufHinzu(text);
            zeichnen();
            wurzel.querySelector('.eingabe-zeile input')?.focus();
          });
        },
      }, eingabe, hinzu),
      offen.length
        ? h('ul', { class: 'liste karte' }, offen.map(zeile))
        : h('p', { class: 'leise mitte-text' }, 'Alles da. Prost! 🍻'),
      erledigt.length ? h('div', { class: 'erledigt-bereich' },
        h('button', {
          class: 'knopf leise klein',
          onclick: () => { erledigteOffen = !erledigteOffen; zeichnen(); },
        }, `${erledigteOffen ? '▾' : '▸'} Erledigt (${erledigt.length})`),
        erledigteOffen ? h('ul', { class: 'liste karte erledigt' }, erledigt.slice(0, 30).map((e) => {
          const zurueck = h('button', { class: 'knopf klein leise' }, 'Zurückholen');
          zurueck.addEventListener('click', () => mitSperre(zurueck, async () => {
            await einkaufAendern(e.id, { erledigt: false, erledigt_am: null, bringt_mit: null });
            zeichnen();
          }));
          return h('li', { class: 'einkauf-zeile' },
            h('div', { class: 'einkauf-text' }, h('s', null, e.text),
              e.bringt_mit ? h('small', null, `von ${profilName(e.bringt_mit)}`) : null),
            zurueck);
        })) : null,
        erledigteOffen ? (() => {
          const leeren = h('button', { class: 'knopf klein gefahr' }, 'Erledigte löschen');
          leeren.addEventListener('click', () => mitSperre(leeren, async () => {
            if (!await bestaetigen('Erledigte löschen?', 'Alle abgehakten Einträge werden entfernt.', 'Löschen')) return;
            await einkaufErledigteLoeschen();
            meldung('Aufgeräumt.');
            zeichnen();
          }));
          return leeren;
        })() : null,
      ) : null,
    );
  }

  zeichnen();
  return wurzel;
}
