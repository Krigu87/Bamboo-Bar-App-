// Verbindung zu Supabase und alle Daten der App.
import { LOGIN_DOMAIN, LOKAL, SUPABASE_KEY, SUPABASE_URL } from './config.js';
import { plusTage } from './termine.js';

const lokal = new URLSearchParams(location.search).has('lokal') ||
  ['localhost', '127.0.0.1'].includes(location.hostname);

export const eingerichtet = lokal || !SUPABASE_URL.startsWith('HIER_');

export const sb = eingerichtet
  ? window.supabase.createClient(lokal ? LOKAL.url : SUPABASE_URL, lokal ? LOKAL.key : SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  })
  : null;

// Alles, was die App gerade weiß
export const stand = {
  ich: null,          // eigenes Profil
  profile: [],        // alle sichtbaren Profile
  termine: [],
  ausnahmen: [],
  einkauf: [],
  anleitungen: [],
  schritte: [],
  einladungen: [],
  geladenUm: 0,
};

function pruefe({ data, error }) {
  if (error) throw new Error(uebersetze(error.message));
  return data;
}

function uebersetze(text) {
  if (/row-level security/i.test(text)) return 'Dafür fehlen dir die Rechte.';
  if (/JWT expired/i.test(text)) return 'Anmeldung abgelaufen. Bitte neu laden.';
  return text;
}

// ---------- Login ----------

// Gleiche Regel wie loginName() in supabase/functions/registrieren/index.ts
export function loginName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

export async function anmelden(name, passwort) {
  const login = loginName(name);
  if (login.length < 2) throw new Error('Bitte deinen Namen eingeben.');
  const { error } = await sb.auth.signInWithPassword({ email: `${login}@${LOGIN_DOMAIN}`, password: passwort });
  if (error) {
    if (/invalid login credentials/i.test(error.message)) throw new Error('Name oder Passwort stimmt nicht.');
    throw new Error(error.message);
  }
}

export async function registrieren(code, name, passwort) {
  const { data, error } = await sb.functions.invoke('registrieren', { body: { code, name, passwort } });
  if (error) {
    // Bei Fehlern steckt die Meldung der Funktion in der Antwort
    let text = error.message;
    try { text = (await error.context.json()).fehler ?? text; } catch (_) { /* egal */ }
    throw new Error(text);
  }
  if (data?.fehler) throw new Error(data.fehler);
  await anmelden(name, passwort);
}

export async function abmelden() {
  await sb.auth.signOut();
  stand.ich = null;
}

export async function passwortAendern(neu) {
  const { error } = await sb.auth.updateUser({ password: neu });
  if (error) {
    if (/different from the old/i.test(error.message)) throw new Error('Bitte ein anderes Passwort als das bisherige wählen.');
    throw new Error(error.message);
  }
  if (stand.ich?.passwort_aendern) {
    pruefe(await sb.from('profile').update({ passwort_aendern: false }).eq('id', stand.ich.id));
    stand.ich.passwort_aendern = false;
  }
}

export async function sitzung() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

// ---------- Laden ----------

export async function ladeIch() {
  const s = await sitzung();
  if (!s) { stand.ich = null; return null; }
  const daten = pruefe(await sb.from('profile').select('*').eq('id', s.user.id).maybeSingle());
  stand.ich = daten;
  return daten;
}

export async function ladeAlles() {
  const ich = stand.ich;
  if (!ich) return;
  const abfragen = [
    sb.from('profile').select('*').order('name'),
    sb.from('termine').select('*'),
    sb.from('termin_ausnahmen').select('*'),
    sb.from('einkauf').select('*').order('erstellt_am'),
    sb.from('anleitungen').select('*').order('reihenfolge').order('titel'),
    sb.from('anleitung_schritte').select('*').order('nr'),
  ];
  if (ich.rolle === 'admin') abfragen.push(sb.from('einladungen').select('*'));
  const [p, t, a, e, an, s, ei] = await Promise.all(abfragen);
  stand.profile = pruefe(p);
  stand.termine = pruefe(t);
  stand.ausnahmen = pruefe(a);
  stand.einkauf = pruefe(e);
  stand.anleitungen = pruefe(an);
  stand.schritte = pruefe(s);
  stand.einladungen = ei ? pruefe(ei) : [];
  stand.ich = stand.profile.find((x) => x.id === ich.id) ?? ich;
  stand.geladenUm = Date.now();
}

export function profilName(id) {
  return stand.profile.find((p) => p.id === id)?.name ?? 'Unbekannt';
}

// Personen, die bei "x von y können" mitzählen
export function mitglieder() {
  return stand.profile.filter((p) => p.aktiv && (p.rolle === 'mitglied' || p.rolle === 'admin'));
}

// ---------- Rechte (die Datenbank prüft sie zusätzlich) ----------

export const rolle = () => stand.ich?.rolle;
export const istAdmin = () => rolle() === 'admin';
export const istMitglied = () => rolle() === 'mitglied' || rolle() === 'admin';
export const istBand = () => rolle() === 'band';

export function darfTyp(typ) {
  if (typ === 'reservierung') return !!rolle();
  if (typ === 'probe') return rolle() === 'admin' || rolle() === 'band';
  if (typ === 'verfuegbar') return istMitglied();
  return false;
}

export function darfTerminAendern(t) {
  return istAdmin() || t.erstellt_von === stand.ich?.id || (t.typ === 'probe' && istBand());
}

// ---------- Termine ----------

async function ladeTermine() {
  const [t, a] = await Promise.all([
    sb.from('termine').select('*'),
    sb.from('termin_ausnahmen').select('*'),
  ]);
  stand.termine = pruefe(t);
  stand.ausnahmen = pruefe(a);
}

const TERMIN_FELDER = ['typ', 'titel', 'notiz', 'datum', 'ganztags', 'beginn', 'ende', 'wiederholung', 'bis'];
function nurFelder(werte) {
  const neu = {};
  for (const f of TERMIN_FELDER) if (f in werte) neu[f] = werte[f];
  if (neu.ganztags) { neu.beginn = null; neu.ende = null; }
  if (neu.wiederholung === 'keine') neu.bis = null;
  return neu;
}

export async function terminAnlegen(werte) {
  pruefe(await sb.from('termine').insert({ ...nurFelder(werte), erstellt_von: stand.ich.id }));
  await ladeTermine();
}

export async function terminAendern(id, werte) {
  pruefe(await sb.from('termine').update(nurFelder(werte)).eq('id', id));
  await ladeTermine();
}

// Serie ab einem bestimmten Termin ändern: alte Serie endet am Vortag, neue beginnt
export async function serieAbAendern(alt, abDatum, werte) {
  if (abDatum <= alt.datum) return terminAendern(alt.id, werte);
  const neu = pruefe(await sb.from('termine')
    .insert({ ...nurFelder({ ...alt, ...werte }), erstellt_von: stand.ich.id })
    .select().single());
  pruefe(await sb.from('termine').update({ bis: plusTage(abDatum, -1) }).eq('id', alt.id));
  // Ausnahmen ab diesem Tag gehören jetzt zur neuen Serie
  pruefe(await sb.from('termin_ausnahmen').update({ termin_id: neu.id })
    .eq('termin_id', alt.id).gte('datum', abDatum));
  await ladeTermine();
}

export async function terminLoeschen(id) {
  pruefe(await sb.from('termine').delete().eq('id', id));
  await ladeTermine();
}

export async function serieAbLoeschen(t, abDatum) {
  if (abDatum <= t.datum) return terminLoeschen(t.id);
  pruefe(await sb.from('termine').update({ bis: plusTage(abDatum, -1) }).eq('id', t.id));
  pruefe(await sb.from('termin_ausnahmen').delete().eq('termin_id', t.id).gte('datum', abDatum));
  await ladeTermine();
}

// Einzelnen Termin einer Serie ändern (Uhrzeit) oder absagen
export async function ausnahmeSetzen(terminId, datum, werte) {
  pruefe(await sb.from('termin_ausnahmen').upsert({
    termin_id: terminId, datum, abgesagt: false, beginn: null, ende: null, ...werte,
  }));
  await ladeTermine();
}

export async function ausnahmeLoeschen(terminId, datum) {
  pruefe(await sb.from('termin_ausnahmen').delete().eq('termin_id', terminId).eq('datum', datum));
  await ladeTermine();
}

// ---------- Einkaufsliste ----------

async function ladeEinkauf() {
  stand.einkauf = pruefe(await sb.from('einkauf').select('*').order('erstellt_am'));
}

export async function einkaufHinzu(text) {
  pruefe(await sb.from('einkauf').insert({ text: text.trim(), erstellt_von: stand.ich.id }));
  await ladeEinkauf();
}

export async function einkaufAendern(id, werte) {
  pruefe(await sb.from('einkauf').update(werte).eq('id', id));
  await ladeEinkauf();
}

export async function einkaufErledigteLoeschen() {
  pruefe(await sb.from('einkauf').delete().eq('erledigt', true));
  await ladeEinkauf();
}

// ---------- Anleitungen ----------

const BUCKET = 'anleitungen';

async function ladeAnleitungen() {
  const [a, s] = await Promise.all([
    sb.from('anleitungen').select('*').order('reihenfolge').order('titel'),
    sb.from('anleitung_schritte').select('*').order('nr'),
  ]);
  stand.anleitungen = pruefe(a);
  stand.schritte = pruefe(s);
}

export function bildUrl(pfad) {
  return pfad ? sb.storage.from(BUCKET).getPublicUrl(pfad).data.publicUrl : null;
}

// Foto verkleinern (max. 1600 px) und hochladen. Gibt den Pfad zurück.
export async function bildHochladen(datei) {
  const blob = await verkleinern(datei, 1600, 0.82);
  const pfad = `${crypto.randomUUID()}.jpg`;
  pruefe(await sb.storage.from(BUCKET).upload(pfad, blob, { contentType: 'image/jpeg' }));
  return pfad;
}

async function verkleinern(datei, max, qualitaet) {
  let bild;
  try {
    bild = await createImageBitmap(datei, { imageOrientation: 'from-image' });
  } catch (_) {
    bild = await new Promise((ok, nein) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => nein(new Error('Das Bild konnte nicht gelesen werden.'));
      img.src = URL.createObjectURL(datei);
    });
  }
  const faktor = Math.min(1, max / Math.max(bild.width, bild.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bild.width * faktor);
  canvas.height = Math.round(bild.height * faktor);
  canvas.getContext('2d').drawImage(bild, 0, 0, canvas.width, canvas.height);
  return new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', qualitaet));
}

export async function anleitungSpeichern(id, kopf, schritte) {
  let anleitungId = id;
  if (id) {
    pruefe(await sb.from('anleitungen').update(kopf).eq('id', id));
  } else {
    anleitungId = pruefe(await sb.from('anleitungen').insert(kopf).select().single()).id;
  }
  const alteBilder = stand.schritte.filter((s) => s.anleitung_id === anleitungId && s.bild).map((s) => s.bild);
  pruefe(await sb.from('anleitung_schritte').delete().eq('anleitung_id', anleitungId));
  if (schritte.length) {
    pruefe(await sb.from('anleitung_schritte').insert(
      schritte.map((s, i) => ({ anleitung_id: anleitungId, nr: i + 1, text: s.text, bild: s.bild ?? null })),
    ));
  }
  const neueBilder = new Set(schritte.map((s) => s.bild).filter(Boolean));
  const weg = alteBilder.filter((b) => !neueBilder.has(b));
  if (weg.length) await sb.storage.from(BUCKET).remove(weg);
  await ladeAnleitungen();
  return anleitungId;
}

export async function anleitungLoeschen(id) {
  const bilder = stand.schritte.filter((s) => s.anleitung_id === id && s.bild).map((s) => s.bild);
  pruefe(await sb.from('anleitungen').delete().eq('id', id));
  if (bilder.length) await sb.storage.from(BUCKET).remove(bilder);
  await ladeAnleitungen();
}

export async function bilderEntfernen(pfade) {
  if (pfade.length) await sb.storage.from(BUCKET).remove(pfade);
}

// ---------- Profil und Verwaltung ----------

async function ladeProfile() {
  stand.profile = pruefe(await sb.from('profile').select('*').order('name'));
  stand.ich = stand.profile.find((x) => x.id === stand.ich.id) ?? stand.ich;
}

export async function profilAendern(id, werte) {
  pruefe(await sb.from('profile').update(werte).eq('id', id));
  await ladeProfile();
}

export async function einladungErneuern(id) {
  const code = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
  pruefe(await sb.from('einladungen').update({ code, aktiv: true }).eq('id', id));
  stand.einladungen = pruefe(await sb.from('einladungen').select('*'));
}

export async function passwortZuruecksetzen(nutzerId, passwort) {
  const { data, error } = await sb.functions.invoke('passwort-zuruecksetzen', {
    body: { nutzer_id: nutzerId, passwort },
  });
  if (error) {
    let text = error.message;
    try { text = (await error.context.json()).fehler ?? text; } catch (_) { /* egal */ }
    throw new Error(text);
  }
  if (data?.fehler) throw new Error(data.fehler);
}
