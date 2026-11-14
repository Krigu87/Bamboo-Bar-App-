// Anmelden, Registrieren über Einladungslink, Pflicht-Passwortwechsel
import { anmelden, ladeAlles, ladeIch, passwortAendern, registrieren, stand, abmelden } from '../daten.js';
import { feld, h, logo, meldung, mitSperre } from '../ui.js';
import { gehe } from '../main.js';

async function nachAnmeldung() {
  await ladeIch();
  if (stand.ich?.aktiv) await ladeAlles();
  gehe('/kalender');
}

export async function seiteLogin() {
  const name = h('input', { type: 'text', autocomplete: 'username', autocapitalize: 'words', required: true });
  const passwort = h('input', { type: 'password', autocomplete: 'current-password', required: true });
  const knopf = h('button', { class: 'knopf primaer breit', type: 'submit' }, 'Anmelden');

  return h('div', { class: 'eingang' },
    logo(true),
    h('form', {
      class: 'karte formular',
      onsubmit: (ev) => {
        ev.preventDefault();
        mitSperre(knopf, async () => {
          await anmelden(name.value, passwort.value);
          await nachAnmeldung();
        });
      },
    },
    feld('Name', name),
    feld('Passwort', passwort),
    knopf,
    ),
    h('p', { class: 'leise mitte-text' }, 'Noch kein Zugang? Du brauchst einen Einladungslink.'),
    h('p', { class: 'leise mitte-text klein' }, 'Passwort vergessen? Melde dich bei Krigu.'),
  );
}

export async function seiteEinladung(code) {
  const name = h('input', { type: 'text', autocomplete: 'username', autocapitalize: 'words', maxlength: 30, required: true });
  const passwort = h('input', { type: 'password', autocomplete: 'new-password', minlength: 6, required: true });
  const passwort2 = h('input', { type: 'password', autocomplete: 'new-password', minlength: 6, required: true });
  const knopf = h('button', { class: 'knopf primaer breit', type: 'submit' }, 'Zugang erstellen');

  const kopf = [
    logo(true),
    h('h1', { class: 'mitte-text' }, 'Willkommen!'),
  ];

  if (stand.ich) {
    return h('div', { class: 'eingang' }, ...kopf,
      h('p', { class: 'mitte-text' }, `Du bist schon als ${stand.ich.name} angemeldet.`),
      h('a', { class: 'knopf primaer breit', href: '#/kalender' }, 'Zur App'),
      h('button', { class: 'knopf leise breit', onclick: async () => { await abmelden(); gehe('/einladung/' + code); } },
        'Abmelden und neuen Zugang erstellen'));
  }

  return h('div', { class: 'eingang' }, ...kopf,
    h('p', { class: 'mitte-text' }, 'Wähle deinen Namen und ein Passwort. Damit meldest du dich künftig an.'),
    h('form', {
      class: 'karte formular',
      onsubmit: (ev) => {
        ev.preventDefault();
        if (passwort.value !== passwort2.value) {
          meldung('Die beiden Passwörter sind nicht gleich.', 'fehler');
          return;
        }
        mitSperre(knopf, async () => {
          await registrieren(code, name.value, passwort.value);
          meldung('Willkommen in der Bamboo Bar!');
          await nachAnmeldung();
        });
      },
    },
    feld('Dein Name', name, 'So sehen dich die anderen, z. B. „Krigu“.'),
    feld('Passwort', passwort, 'Mindestens 6 Zeichen.'),
    feld('Passwort wiederholen', passwort2),
    knopf,
    ),
  );
}

export async function seitePasswortPflicht() {
  const passwort = h('input', { type: 'password', autocomplete: 'new-password', minlength: 6, required: true });
  const passwort2 = h('input', { type: 'password', autocomplete: 'new-password', minlength: 6, required: true });
  const knopf = h('button', { class: 'knopf primaer breit', type: 'submit' }, 'Passwort speichern');

  return h('div', { class: 'eingang' },
    logo(true),
    h('h1', { class: 'mitte-text' }, 'Neues Passwort'),
    h('p', { class: 'mitte-text' }, 'Dein Passwort wurde zurückgesetzt. Bitte wähle jetzt ein eigenes.'),
    h('form', {
      class: 'karte formular',
      onsubmit: (ev) => {
        ev.preventDefault();
        if (passwort.value !== passwort2.value) {
          meldung('Die beiden Passwörter sind nicht gleich.', 'fehler');
          return;
        }
        mitSperre(knopf, async () => {
          await passwortAendern(passwort.value);
          meldung('Passwort gespeichert.');
          gehe('/kalender');
        });
      },
    },
    feld('Neues Passwort', passwort, 'Mindestens 6 Zeichen.'),
    feld('Wiederholen', passwort2),
    knopf,
    ),
  );
}
