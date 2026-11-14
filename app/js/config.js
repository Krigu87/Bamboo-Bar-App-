// Verbindung zu Supabase.
// Beide Werte findest du in Supabase unter: Project Settings → API Keys / Data API.
// Der "publishable" (bzw. "anon") Schlüssel ist öffentlich und darf hier stehen.
// Den geheimen Schlüssel (secret / service_role) NIE hier eintragen!
export const SUPABASE_URL = 'HIER_SUPABASE_URL_EINTRAGEN';
export const SUPABASE_KEY = 'HIER_PUBLISHABLE_KEY_EINTRAGEN';

// Interne Ersatz-Adresse für den Login mit Namen.
// MUSS mit LOGIN_DOMAIN in supabase/functions/registrieren/index.ts übereinstimmen.
export const LOGIN_DOMAIN = 'bamboo-bar.invalid';

// Für lokale Tests: ?lokal in der Adresse verwendet die Test-Datenbank auf diesem Rechner.
export const LOKAL = {
  url: 'http://127.0.0.1:54321',
  key: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
};
