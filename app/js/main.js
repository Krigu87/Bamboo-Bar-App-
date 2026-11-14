// Start der App: Anmeldung prüfen, Daten laden, Seiten anzeigen.
import { eingerichtet, ladeAlles, ladeIch, sb, stand, abmelden, istAdmin } from './daten.js';
import { fehlerMeldung, h, logo } from './ui.js';
import { seiteLogin, seiteEinladung, seitePasswortPflicht } from './seiten/login.js';
import { seiteKalender } from './seiten/kalender.js';
import { seiteEintrag, seiteEintragFormular } from './seiten/eintrag.js';
import { seiteEinkauf } from './seiten/einkauf.js';
import { seiteAnleitungen, seiteAnleitung, seiteAnleitungBearbeiten } from './seiten/anleitungen.js';
import { seiteProfil } from './seiten/profil.js';
import { seiteAdmin } from './seiten/admin.js';

const inhalt = document.getElementById('inhalt');
const navi = document.getElementById('navi');

// Adresse wie #/kalender/2026-11-14 → ['kalender', '2026-11-14']
function route() {
  const [pfad, query] = location.hash.replace(/^#\/?/, '').split('?');
  return { teile: pfad.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(query ?? '') };
}

export function gehe(pfad) {
  if (location.hash === '#' + pfad) zeigen();
  else location.hash = pfad;
}

const SEITEN = {
  kalender: seiteKalender,
  eintrag: seiteEintrag,
  neu: seiteEintragFormular,
  bearbeiten: seiteEintragFormular,
  einkauf: seiteEinkauf,
  anleitungen: seiteAnleitungen,
  anleitung: seiteAnleitung,
  'anleitung-bearbeiten': seiteAnleitungBearbeiten,
  profil: seiteProfil,
  admin: seiteAdmin,
};

const NAVI = [
  { ziel: 'kalender', text: 'Kalender', icon: 'kalender' },
  { ziel: 'einkauf', text: 'Einkauf', icon: 'einkauf' },
  { ziel: 'anleitungen', text: 'Anleitungen', icon: 'anleitung' },
  { ziel: 'profil', text: 'Profil', icon: 'profil' },
];

function naviZeichnen(aktiv) {
  const offen = stand.einkauf.filter((e) => !e.erledigt && !e.bringt_mit).length;
  navi.replaceChildren(...NAVI.map((n) => h('a', {
    href: '#/' + n.ziel,
    class: 'navi-punkt' + (aktiv === n.ziel ? ' aktiv' : ''),
    'aria-current': aktiv === n.ziel ? 'page' : null,
  },
  h('span', { class: 'navi-icon icon-' + n.icon, 'aria-hidden': 'true' }),
  h('span', null, n.text),
  n.ziel === 'einkauf' && offen ? h('span', { class: 'zaehler' }, offen) : null,
  )));
  navi.hidden = false;
}

const ZU_NAVI = { eintrag: 'kalender', neu: 'kalender', bearbeiten: 'kalender', anleitung: 'anleitungen',
  'anleitung-bearbeiten': 'anleitungen', admin: 'profil' };

export async function zeigen() {
  const { teile, query } = route();
  const name = teile[0] ?? '';

  try {
    if (!eingerichtet) {
      navi.hidden = true;
      inhalt.replaceChildren(h('div', { class: 'mitte' }, logo(true),
        h('p', null, 'Die App ist noch nicht mit Supabase verbunden.'),
        h('p', { class: 'leise' }, 'Trage die Werte in app/js/config.js ein (siehe EINRICHTUNG.md).')));
      return;
    }

    // Einladungslink: auch ohne Anmeldung
    if (name === 'einladung') {
      navi.hidden = true;
      inhalt.replaceChildren(await seiteEinladung(teile[1] ?? ''));
      return;
    }

    if (!stand.ich) {
      navi.hidden = true;
      inhalt.replaceChildren(await seiteLogin());
      return;
    }

    if (!stand.ich.aktiv) {
      navi.hidden = true;
      inhalt.replaceChildren(h('div', { class: 'mitte' }, logo(true),
        h('p', null, 'Dein Zugang ist zurzeit nicht aktiv.'),
        h('p', { class: 'leise' }, 'Melde dich bei Krigu, wenn das ein Versehen ist.'),
        h('button', { class: 'knopf', onclick: async () => { await abmelden(); gehe('/login'); } }, 'Abmelden')));
      return;
    }

    if (stand.ich.passwort_aendern) {
      navi.hidden = true;
      inhalt.replaceChildren(await seitePasswortPflicht());
      return;
    }

    const seite = SEITEN[name];
    if (!seite || (name === 'admin' && !istAdmin())) {
      location.replace('#/kalender');
      return;
    }
    naviZeichnen(ZU_NAVI[name] ?? name);
    const el = await seite(teile.slice(1), query);
    inhalt.replaceChildren(el);
    if (!zeigen.gleicheSeite) window.scrollTo(0, 0);
  } catch (e) {
    fehlerMeldung(e);
  }
}

// Daten neu laden, z. B. wenn die App wieder geöffnet wird
let laedt = false;
export async function neuLaden(erzwingen = false) {
  if (laedt || !stand.ich) return;
  if (!erzwingen && Date.now() - stand.geladenUm < 20000) return;
  laedt = true;
  try {
    await ladeIch();
    if (stand.ich?.aktiv) await ladeAlles();
    zeigen.gleicheSeite = true;
    await zeigen();
  } catch (e) {
    fehlerMeldung(e);
  } finally {
    zeigen.gleicheSeite = false;
    laedt = false;
  }
}

async function start() {
  if (eingerichtet) {
    try {
      await ladeIch();
      if (stand.ich?.aktiv) await ladeAlles();
    } catch (e) {
      fehlerMeldung(e);
    }
    sb.auth.onAuthStateChange((ereignis) => {
      if (ereignis === 'SIGNED_OUT') { stand.ich = null; zeigen(); }
    });
  }
  window.addEventListener('hashchange', () => zeigen());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') neuLaden();
  });
  if (!location.hash || location.hash === '#/' || location.hash === '#/login') {
    location.replace(stand.ich ? '#/kalender' : '#/login');
  }
  await zeigen();
}

if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* ohne Offline-Modus weiter */ });
}

start();
