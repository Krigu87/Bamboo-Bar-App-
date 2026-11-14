// Profil: Geburtstag, Passwort, Abmelden, App installieren
import { abmelden, istAdmin, passwortAendern, profilAendern, stand } from '../daten.js';
import { datumAus } from '../termine.js';
import { feld, h, meldung, mitSperre } from '../ui.js';
import { gehe } from '../main.js';

export const ROLLEN_TEXT = { admin: 'Admin', mitglied: 'Mitglied', band: 'Band' };

let installAufforderung = null;
window.addEventListener('beforeinstallprompt', (ev) => {
  ev.preventDefault();
  installAufforderung = ev;
});

function istInstalliert() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}
function istIphone() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export async function seiteProfil() {
  const ich = stand.ich;

  // Geburtstag
  const g = ich.geburtstag ? ich.geburtstag.split('-').map(Number) : [null, null, null];
  const tag = h('select', null, h('option', { value: '' }, 'Tag'),
    Array.from({ length: 31 }, (_, i) => h('option', { value: i + 1, selected: g[2] === i + 1 }, i + 1)));
  const monat = h('select', null, h('option', { value: '' }, 'Monat'),
    ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
      .map((m, i) => h('option', { value: i + 1, selected: g[1] === i + 1 }, m)));
  const jahr = h('input', { type: 'number', inputmode: 'numeric', min: 1920, max: new Date().getFullYear(),
    placeholder: 'Jahr (optional)', value: ich.geburtstag && ich.geburtsjahr_anzeigen ? g[0] : '' });
  const gebSpeichern = h('button', { class: 'knopf primaer', type: 'submit' }, 'Speichern');

  // Passwort
  const pw1 = h('input', { type: 'password', autocomplete: 'new-password', minlength: 6, required: true });
  const pw2 = h('input', { type: 'password', autocomplete: 'new-password', minlength: 6, required: true });
  const pwSpeichern = h('button', { class: 'knopf', type: 'submit' }, 'Passwort ändern');

  // Installieren
  let installBereich = null;
  if (!istInstalliert()) {
    if (installAufforderung) {
      installBereich = h('button', {
        class: 'knopf gruen breit',
        onclick: async () => { installAufforderung.prompt(); installAufforderung = null; },
      }, 'App auf dem Startbildschirm installieren');
    } else if (istIphone()) {
      installBereich = h('p', { class: 'hinweis-box' },
        'Als App installieren: In Safari unten auf „Teilen“ (Quadrat mit Pfeil) tippen, dann „Zum Home-Bildschirm“.');
    } else {
      installBereich = h('p', { class: 'hinweis-box' },
        'Als App installieren: Im Browser-Menü (⋮) „App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.');
    }
  }

  const abmeldenKnopf = h('button', { class: 'knopf leise breit' }, 'Abmelden');
  abmeldenKnopf.addEventListener('click', () => mitSperre(abmeldenKnopf, async () => {
    await abmelden();
    gehe('/login');
  }));

  return h('div', { class: 'seite' },
    h('div', { class: 'profil-kopf' },
      h('div', { class: 'avatar' }, ich.name.slice(0, 1).toUpperCase()),
      h('div', null, h('h1', null, ich.name), h('span', { class: 'abzeichen' }, ROLLEN_TEXT[ich.rolle])),
    ),

    istAdmin() ? h('a', { class: 'knopf holz breit', href: '#/admin' }, 'Verwaltung: Einladungen und Nutzer') : null,

    h('form', {
      class: 'karte formular',
      onsubmit: (ev) => {
        ev.preventDefault();
        mitSperre(gebSpeichern, async () => {
          let geburtstag = null;
          let anzeigen = true;
          if (tag.value && monat.value) {
            const j = Number(jahr.value);
            anzeigen = j >= 1920;
            // Ohne Jahr wird 2000 gespeichert (Schaltjahr, damit auch der 29.2. geht)
            geburtstag = datumAus(anzeigen ? j : 2000, Number(monat.value), Number(tag.value));
            const pruef = new Date(geburtstag + 'T00:00:00Z');
            if (pruef.getUTCDate() !== Number(tag.value)) { meldung('Dieses Datum gibt es nicht.', 'fehler'); return; }
          } else if (tag.value || monat.value) {
            meldung('Bitte Tag und Monat angeben.', 'fehler');
            return;
          }
          await profilAendern(ich.id, { geburtstag, geburtsjahr_anzeigen: anzeigen });
          meldung(geburtstag ? 'Geburtstag gespeichert. 🎂' : 'Geburtstag entfernt.');
        });
      },
    },
    h('h3', null, 'Geburtstag'),
    h('p', { class: 'leise klein' }, 'Freiwillig. Erscheint jedes Jahr im Kalender, damit alle gratulieren können. Ohne Jahr wird kein Alter angezeigt.'),
    h('div', { class: 'drei-spalten' }, tag, monat, jahr),
    gebSpeichern,
    ),

    h('form', {
      class: 'karte formular',
      onsubmit: (ev) => {
        ev.preventDefault();
        if (pw1.value !== pw2.value) { meldung('Die beiden Passwörter sind nicht gleich.', 'fehler'); return; }
        mitSperre(pwSpeichern, async () => {
          await passwortAendern(pw1.value);
          pw1.value = '';
          pw2.value = '';
          meldung('Passwort geändert.');
        });
      },
    },
    h('h3', null, 'Passwort ändern'),
    feld('Neues Passwort', pw1),
    feld('Wiederholen', pw2),
    pwSpeichern,
    ),

    installBereich,
    abmeldenKnopf,
    h('p', { class: 'leise klein mitte-text' }, 'Bamboo Bar · Etappe 1'),
  );
}
