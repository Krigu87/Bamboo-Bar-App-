// Anleitungen: Schritt für Schritt mit Fotos
import {
  anleitungLoeschen, anleitungSpeichern, bilderEntfernen, bildHochladen, bildUrl, istMitglied, stand,
} from '../daten.js';
import { bestaetigen, feld, h, meldung, mitSperre, fuellen } from '../ui.js';
import { gehe } from '../main.js';

const schritteVon = (id) => stand.schritte.filter((s) => s.anleitung_id === id).sort((a, b) => a.nr - b.nr);

export async function seiteAnleitungen() {
  const liste = stand.anleitungen;
  return h('div', { class: 'seite' },
    h('h1', null, 'Anleitungen'),
    liste.length
      ? h('ul', { class: 'liste karte' }, liste.map((a) => {
        const anzahl = schritteVon(a.id).length;
        return h('li', null, h('a', { class: 'eintrag', href: '#/anleitung/' + a.id },
          h('span', { class: 'eintrag-text' },
            h('strong', null, a.titel),
            h('small', null, a.beschreibung || `${anzahl} ${anzahl === 1 ? 'Schritt' : 'Schritte'}`)),
          h('span', { class: 'pfeil', 'aria-hidden': 'true' }, '›')));
      }))
      : h('div', { class: 'karte leer' },
        h('p', null, 'Noch keine Anleitungen.'),
        h('p', { class: 'leise' }, 'Ideen: Licht einschalten, Musikanlage bedienen, Beamer anschließen, Abschließen am Schluss.')),
    istMitglied() ? h('a', { class: 'knopf primaer breit', href: '#/anleitung-bearbeiten/neu' }, '+ Neue Anleitung') : null,
  );
}

export async function seiteAnleitung([id]) {
  const a = stand.anleitungen.find((x) => x.id === id);
  if (!a) return h('div', { class: 'seite' }, h('a', { class: 'zurueck', href: '#/anleitungen' }, '‹ Anleitungen'), h('p', { class: 'leise' }, 'Diese Anleitung gibt es nicht mehr.'));
  const schritte = schritteVon(id);
  return h('div', { class: 'seite' },
    h('a', { class: 'zurueck', href: '#/anleitungen' }, '‹ Anleitungen'),
    h('h1', null, a.titel),
    a.beschreibung ? h('p', null, a.beschreibung) : null,
    h('ol', { class: 'schritte' }, schritte.map((s) => h('li', { class: 'karte schritt' },
      h('span', { class: 'schritt-nr' }, s.nr),
      s.bild ? h('img', { src: bildUrl(s.bild), alt: `Schritt ${s.nr}`, loading: 'lazy', class: 'schritt-bild',
        onclick: (ev) => ev.target.classList.toggle('gross') }) : null,
      s.text ? h('p', null, s.text) : null,
    ))),
    !schritte.length ? h('p', { class: 'leise' }, 'Noch keine Schritte.') : null,
    istMitglied() ? h('a', { class: 'knopf breit', href: '#/anleitung-bearbeiten/' + id }, 'Bearbeiten') : null,
  );
}

export async function seiteAnleitungBearbeiten([id]) {
  if (!istMitglied()) return h('div', { class: 'seite' }, h('p', null, 'Nur Mitglieder können Anleitungen bearbeiten.'));
  const neu = id === 'neu';
  const a = neu ? { titel: '', beschreibung: '' } : stand.anleitungen.find((x) => x.id === id);
  if (!a) return h('div', { class: 'seite' }, h('p', { class: 'leise' }, 'Diese Anleitung gibt es nicht mehr.'));

  const kopf = { titel: a.titel, beschreibung: a.beschreibung };
  const schritte = neu ? [{ text: '', bild: null }] : schritteVon(id).map((s) => ({ text: s.text, bild: s.bild }));
  const neueBilder = new Set(); // in dieser Sitzung hochgeladen
  let gespeichert = false;

  const wurzel = h('div', { class: 'seite' });

  // Ungespeicherte, frisch hochgeladene Bilder beim Verlassen wieder entfernen
  const aufraeumen = () => {
    window.removeEventListener('hashchange', aufraeumen);
    if (gespeichert) return;
    const weg = [...neueBilder];
    if (weg.length) bilderEntfernen(weg).catch(() => {});
  };
  window.addEventListener('hashchange', aufraeumen);

  function zeichnen() {
    const speichern = h('button', { class: 'knopf primaer breit', type: 'submit' }, 'Speichern');

    fuellen(wurzel, 
      h('a', { class: 'zurueck', href: neu ? '#/anleitungen' : '#/anleitung/' + id }, '‹ Zurück'),
      h('h1', null, neu ? 'Neue Anleitung' : 'Anleitung bearbeiten'),
      h('form', {
        class: 'formular',
        onsubmit: (ev) => {
          ev.preventDefault();
          mitSperre(speichern, async () => {
            if (!kopf.titel.trim()) { meldung('Bitte einen Titel angeben.', 'fehler'); return; }
            const behalten = schritte.filter((s) => s.text.trim() || s.bild);
            const neueId = await anleitungSpeichern(neu ? null : id,
              { titel: kopf.titel.trim(), beschreibung: kopf.beschreibung.trim() },
              behalten.map((s) => ({ text: s.text.trim(), bild: s.bild })));
            // Bilder, die hochgeladen, aber wieder entfernt wurden
            const genutzt = new Set(behalten.map((s) => s.bild).filter(Boolean));
            await bilderEntfernen([...neueBilder].filter((b) => !genutzt.has(b)));
            gespeichert = true;
            meldung('Gespeichert.');
            gehe('/anleitung/' + neueId);
          });
        },
      },
      h('div', { class: 'karte formular' },
        feld('Titel', h('input', { type: 'text', value: kopf.titel, maxlength: 80, required: true,
          placeholder: 'z. B. Licht einschalten', oninput: (ev) => { kopf.titel = ev.target.value; } })),
        feld('Kurzbeschreibung', h('input', { type: 'text', value: kopf.beschreibung, maxlength: 500,
          placeholder: 'Optional', oninput: (ev) => { kopf.beschreibung = ev.target.value; } })),
      ),
      schritte.map((s, i) => schrittKarte(s, i)),
      h('button', {
        type: 'button', class: 'knopf breit',
        onclick: () => { schritte.push({ text: '', bild: null }); zeichnen(); },
      }, '+ Schritt hinzufügen'),
      speichern,
      !neu ? (() => {
        const loeschen = h('button', { type: 'button', class: 'knopf gefahr breit' }, 'Anleitung löschen');
        loeschen.addEventListener('click', () => mitSperre(loeschen, async () => {
          if (!await bestaetigen('Anleitung löschen?', `„${a.titel}“ mit allen Schritten und Fotos.`, 'Löschen')) return;
          await anleitungLoeschen(id);
          await bilderEntfernen([...neueBilder]);
          gespeichert = true;
          meldung('Gelöscht.');
          gehe('/anleitungen');
        }));
        return loeschen;
      })() : null,
      ),
    );
  }

  function schrittKarte(s, i) {
    const datei = h('input', { type: 'file', accept: 'image/*', hidden: true });
    const fotoKnopf = h('button', { type: 'button', class: 'knopf klein', onclick: () => datei.click() },
      s.bild ? 'Foto ersetzen' : '📷 Foto');
    datei.addEventListener('change', () => {
      const f = datei.files?.[0];
      if (!f) return;
      mitSperre(fotoKnopf, async () => {
        fotoKnopf.textContent = 'Lädt …';
        const pfad = await bildHochladen(f);
        neueBilder.add(pfad);
        s.bild = pfad;
        zeichnen();
      });
    });

    const verschieben = (richtung) => {
      const ziel = i + richtung;
      if (ziel < 0 || ziel >= schritte.length) return;
      [schritte[i], schritte[ziel]] = [schritte[ziel], schritte[i]];
      zeichnen();
    };

    return h('div', { class: 'karte schritt-bearbeiten' },
      h('div', { class: 'schritt-kopf' },
        h('span', { class: 'schritt-nr' }, i + 1),
        h('div', { class: 'knopf-reihe eng' },
          h('button', { type: 'button', class: 'knopf klein leise', 'aria-label': 'Nach oben', disabled: i === 0, onclick: () => verschieben(-1) }, '↑'),
          h('button', { type: 'button', class: 'knopf klein leise', 'aria-label': 'Nach unten', disabled: i === schritte.length - 1, onclick: () => verschieben(1) }, '↓'),
          h('button', { type: 'button', class: 'knopf klein leise', 'aria-label': 'Schritt entfernen',
            onclick: () => { schritte.splice(i, 1); zeichnen(); } }, '✕'),
        ),
      ),
      s.bild ? h('div', { class: 'bild-vorschau' },
        h('img', { src: bildUrl(s.bild), alt: '' }),
        h('button', { type: 'button', class: 'knopf klein leise', onclick: () => { s.bild = null; zeichnen(); } }, 'Foto entfernen'),
      ) : null,
      h('textarea', { rows: 3, maxlength: 1000, placeholder: 'Was ist zu tun?',
        oninput: (ev) => { s.text = ev.target.value; } }, s.text),
      h('div', { class: 'knopf-reihe' }, fotoKnopf, datei),
    );
  }

  zeichnen();
  return wurzel;
}
