// Verwaltung (nur Admin): Einladungslinks und Nutzer
import { einladungErneuern, istAdmin, passwortZuruecksetzen, profilAendern, stand } from '../daten.js';
import { bestaetigen, feld, frage, h, meldung, mitSperre, fuellen } from '../ui.js';
import { ROLLEN_TEXT } from './profil.js';

function linkVon(code) {
  return `${location.origin}${location.pathname}#/einladung/${code}`;
}

async function kopieren(text) {
  try {
    await navigator.clipboard.writeText(text);
    meldung('Link kopiert.');
  } catch (_) {
    await frage('Link kopieren', h('input', { type: 'text', value: text, readonly: true, onfocus: (ev) => ev.target.select() }),
      [{ text: 'Fertig', wert: true, art: 'primaer' }]);
  }
}

export async function seiteAdmin() {
  if (!istAdmin()) return h('div', { class: 'seite' }, h('p', null, 'Nur für den Admin.'));
  const wurzel = h('div', { class: 'seite' });

  function zeichnen() {
    const links = ['mitglied', 'band'].map((r) => stand.einladungen.find((e) => e.rolle === r)).filter(Boolean);
    const nutzer = [...stand.profile].sort((a, b) => (b.aktiv - a.aktiv) || a.name.localeCompare(b.name));

    fuellen(wurzel, 
      h('a', { class: 'zurueck', href: '#/profil' }, '‹ Profil'),
      h('h1', null, 'Verwaltung'),

      h('h2', null, 'Einladungslinks'),
      h('p', { class: 'leise klein' }, 'Wer den Link öffnet, kann sich mit Namen und Passwort einen Zugang erstellen. Die Links bleiben gültig, bis du sie erneuerst.'),
      links.map((e) => {
        const url = linkVon(e.code);
        const erneuern = h('button', { class: 'knopf klein gefahr' }, 'Erneuern');
        erneuern.addEventListener('click', () => mitSperre(erneuern, async () => {
          if (!await bestaetigen('Link erneuern?', 'Der alte Link funktioniert danach nicht mehr. Wer schon einen Zugang hat, bleibt angemeldet.', 'Erneuern')) return;
          await einladungErneuern(e.id);
          meldung('Neuer Link erstellt.');
          zeichnen();
        }));
        return h('div', { class: 'karte' },
          h('h3', null, e.rolle === 'band' ? 'Für die Band' : 'Für Mitglieder'),
          h('p', { class: 'leise klein' }, e.rolle === 'band'
            ? 'Sieht Belegung, Anleitungen, Einkaufsliste und Geburtstage. Darf Bandproben eintragen.'
            : 'Sieht alles.'),
          h('code', { class: 'link-anzeige' }, url),
          h('div', { class: 'knopf-reihe' },
            h('button', { class: 'knopf klein primaer', onclick: () => kopieren(url) }, 'Kopieren'),
            navigator.share ? h('button', {
              class: 'knopf klein',
              onclick: () => navigator.share({ title: 'Bamboo Bar', text: 'Dein Zugang zur Bamboo-Bar-App:', url }).catch(() => {}),
            }, 'Teilen') : null,
            erneuern,
          ),
        );
      }),

      h('h2', null, `Nutzer (${nutzer.filter((n) => n.aktiv).length} aktiv)`),
      h('ul', { class: 'liste karte' }, nutzer.map((n) => nutzerZeile(n))),
    );
  }

  function nutzerZeile(n) {
    const ichSelbst = n.id === stand.ich.id;
    const rolle = h('select', { disabled: ichSelbst || !n.aktiv, 'aria-label': `Rolle von ${n.name}` },
      (n.rolle === 'admin' ? ['admin'] : ['mitglied', 'band'])
        .map((r) => h('option', { value: r, selected: n.rolle === r }, ROLLEN_TEXT[r])));
    rolle.addEventListener('change', () => mitSperre(rolle, async () => {
      await profilAendern(n.id, { rolle: rolle.value });
      meldung(`${n.name} ist jetzt ${ROLLEN_TEXT[rolle.value]}.`);
      zeichnen();
    }));

    const pw = h('button', { class: 'knopf klein' }, 'Passwort');
    pw.addEventListener('click', () => mitSperre(pw, async () => {
      const vorschlag = 'bamboo' + Math.floor(100 + Math.random() * 900);
      const eingabe = h('input', { type: 'text', value: vorschlag, minlength: 6 });
      const ok = await frage(`Passwort für ${n.name} zurücksetzen`,
        h('div', { class: 'formular' },
          h('p', null, 'Sag der Person das vorläufige Passwort. Beim nächsten Anmelden muss sie ein eigenes wählen.'),
          feld('Vorläufiges Passwort', eingabe)),
        [{ text: 'Zurücksetzen', wert: true, art: 'primaer' }]);
      if (!ok) return;
      await passwortZuruecksetzen(n.id, eingabe.value);
      meldung(`Passwort für ${n.name}: ${eingabe.value}`);
    }));

    const aktiv = h('button', { class: 'knopf klein ' + (n.aktiv ? 'gefahr' : 'gruen') }, n.aktiv ? 'Entfernen' : 'Wieder aufnehmen');
    aktiv.addEventListener('click', () => mitSperre(aktiv, async () => {
      if (n.aktiv && !await bestaetigen(`${n.name} entfernen?`, 'Die Person kommt nicht mehr in die App. Du kannst sie später wieder aufnehmen.', 'Entfernen')) return;
      await profilAendern(n.id, { aktiv: !n.aktiv });
      meldung(n.aktiv ? `${n.name} entfernt.` : `${n.name} ist wieder dabei.`);
      zeichnen();
    }));

    return h('li', { class: 'nutzer-zeile' + (n.aktiv ? '' : ' inaktiv') },
      h('div', { class: 'nutzer-name' },
        h('strong', null, n.name, ichSelbst ? ' (du)' : ''),
        !n.aktiv ? h('small', null, 'entfernt') : null),
      ichSelbst ? h('span', { class: 'abzeichen' }, 'Admin') : rolle,
      !ichSelbst ? h('div', { class: 'knopf-reihe eng' }, n.aktiv ? pw : null, aktiv) : null,
    );
  }

  zeichnen();
  return wurzel;
}
