// Kleine Helfer für die Oberfläche.

// Element bauen: h('button', { class: 'x', onclick: fn }, 'Text', kind, …)
export function h(tag, attrs, ...kinder) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k in el && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const kind of kinder.flat(Infinity)) {
    if (kind === null || kind === undefined || kind === false) continue;
    el.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
  return el;
}

// Kurze Meldung unten am Bildschirm
let toastTimer;
export function meldung(text, art = 'info') {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', { id: 'toast', role: 'status' });
    document.body.append(el);
  }
  el.textContent = text;
  el.className = 'toast sichtbar ' + art;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('sichtbar'), art === 'fehler' ? 6000 : 2800);
}

export function fehlerMeldung(e) {
  console.error(e);
  const text = e?.message ?? String(e);
  if (/Failed to fetch|NetworkError|Load failed/i.test(text)) {
    meldung('Keine Verbindung. Bist du online?', 'fehler');
  } else {
    meldung(text, 'fehler');
  }
}

// Dialog mit Knöpfen. Gibt den Wert des gewählten Knopfs zurück (oder null).
export function frage(titel, text, knoepfe = [{ text: 'OK', wert: true, art: 'primaer' }]) {
  return new Promise((fertig) => {
    const schliessen = (wert) => { dialog.close(); dialog.remove(); fertig(wert); };
    const dialog = h('dialog', { class: 'dialog' },
      h('h3', null, titel),
      text ? (text instanceof Node ? text : h('p', null, text)) : null,
      h('div', { class: 'dialog-knoepfe' },
        knoepfe.map((k) => h('button', {
          class: 'knopf ' + (k.art ?? ''),
          onclick: () => schliessen(k.wert),
        }, k.text)),
        h('button', { class: 'knopf leise', onclick: () => schliessen(null) }, 'Abbrechen'),
      ),
    );
    dialog.addEventListener('cancel', (ev) => { ev.preventDefault(); schliessen(null); });
    document.body.append(dialog);
    dialog.showModal();
  });
}

export async function bestaetigen(titel, text, knopfText = 'Ja', art = 'gefahr') {
  return (await frage(titel, text, [{ text: knopfText, wert: true, art }])) === true;
}

// Knopf während einer Aktion sperren
export async function mitSperre(knopf, aktion) {
  if (knopf.disabled) return;
  knopf.disabled = true;
  try {
    return await aktion();
  } catch (e) {
    fehlerMeldung(e);
  } finally {
    knopf.disabled = false;
  }
}

export function feld(label, eingabe, hinweis) {
  return h('label', { class: 'feld' },
    h('span', { class: 'feld-label' }, label),
    eingabe,
    hinweis ? h('span', { class: 'feld-hinweis' }, hinweis) : null,
  );
}

export function logo(gross = false) {
  return h('div', { class: 'logo' + (gross ? ' gross' : '') },
    h('img', { src: 'icons/bambus.svg', alt: '', class: 'logo-bambus' }),
    h('span', { class: 'logo-text' }, 'bamboo bar'),
  );
}

// Inhalt eines Elements ersetzen; leere Werte (null, false) werden übersprungen
export function fuellen(el, ...kinder) {
  el.replaceChildren(...kinder.flat(Infinity).filter((k) => k !== null && k !== undefined && k !== false)
    .map((k) => (k instanceof Node ? k : document.createTextNode(String(k)))));
}
