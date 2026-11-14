// Registrieren über einen Einladungslink: Name + Passwort wählen.
// Eigenständige Datei: kann so im Supabase-Dashboard eingefügt werden.
// Bei Supabase in den Einstellungen dieser Funktion "Verify JWT" AUSSCHALTEN.

// ---------- Hilfen ----------
// Supabase kennt nur Login per E-Mail. Aus dem Namen wird darum intern eine
// Ersatz-Adresse gebaut. Es werden nie E-Mails verschickt.
// MUSS mit LOGIN_DOMAIN in app/js/config.js übereinstimmen.
const LOGIN_DOMAIN = "bamboo-bar.invalid";

// Gleiche Regel wie loginName() in app/js/daten.js
function loginName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function antwort(daten: unknown, status = 200): Response {
  return new Response(JSON.stringify(daten), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function fehler(meldung: string, status = 400): Response {
  return antwort({ fehler: meldung }, status);
}

// Geheimer Schlüssel: neues Format (SUPABASE_SECRET_KEYS) oder altes (service_role)
function geheimerSchluessel(): string {
  const neu = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (neu) {
    try {
      const keys = JSON.parse(neu);
      if (keys.default) return keys.default;
    } catch (_) { /* altes Format verwenden */ }
  }
  const alt = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!alt) throw new Error("Kein geheimer Supabase-Schlüssel gefunden");
  return alt;
}

const URL_BASIS = () => Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "");

type Ergebnis = { ok: boolean; status: number; daten: any };

// Aufruf der Supabase-Schnittstelle mit dem geheimen Schlüssel (umgeht die Rechte-Regeln)
async function supa(pfad: string, optionen: RequestInit = {}): Promise<Ergebnis> {
  const key = geheimerSchluessel();
  const res = await fetch(URL_BASIS() + pfad, {
    ...optionen,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(optionen.headers ?? {}),
    },
  });
  const text = await res.text();
  let daten: any = null;
  try { daten = text ? JSON.parse(text) : null; } catch (_) { daten = text; }
  return { ok: res.ok, status: res.status, daten };
}

// Wer ruft die Funktion auf? Liefert die Nutzer-ID oder null.
async function aufrufer(req: Request): Promise<string | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || token.startsWith("sb_")) return null;
  const res = await fetch(URL_BASIS() + "/auth/v1/user", {
    headers: { apikey: geheimerSchluessel(), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const nutzer = await res.json();
  return nutzer?.id ?? null;
}

function meldungAus(daten: any): string {
  if (!daten) return "unbekannter Fehler";
  if (typeof daten === "string") return daten;
  return daten.msg ?? daten.message ?? daten.error_description ?? daten.error ?? JSON.stringify(daten);
}

// ---------- Funktion ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fehler("Nur POST erlaubt", 405);

  let eingabe: { code?: string; name?: string; passwort?: string };
  try {
    eingabe = await req.json();
  } catch (_) {
    return fehler("Ungültige Anfrage");
  }

  const code = String(eingabe.code ?? "").trim();
  const name = String(eingabe.name ?? "").trim().replace(/\s+/g, " ");
  const passwort = String(eingabe.passwort ?? "");
  const login = loginName(name);

  if (name.length < 2 || name.length > 30) return fehler("Der Name muss 2 bis 30 Zeichen lang sein.");
  if (login.length < 2) return fehler("Bitte einen Namen mit Buchstaben oder Zahlen wählen.");
  if (passwort.length < 6) return fehler("Das Passwort muss mindestens 6 Zeichen lang sein.");
  if (!/^[0-9a-f]{16,64}$/.test(code)) return fehler("Dieser Einladungslink ist ungültig oder wurde erneuert.");

  // 1. Einladung prüfen
  const e = await supa(`/rest/v1/einladungen?select=id,rolle,einmalig&aktiv=eq.true&code=eq.${code}`);
  if (!e.ok) return fehler("Serverfehler: " + meldungAus(e.daten), 500);
  const einladung = e.daten?.[0];
  if (!einladung) return fehler("Dieser Einladungslink ist ungültig oder wurde erneuert.");

  // 2. Name schon vergeben?
  const v = await supa(`/rest/v1/profile?select=id&login_name=eq.${encodeURIComponent(login)}`);
  if (v.ok && v.daten?.length) return fehler("Diesen Namen gibt es schon. Bitte einen anderen wählen.");

  // 3. Konto anlegen
  const k = await supa("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email: `${login}@${LOGIN_DOMAIN}`,
      password: passwort,
      email_confirm: true,
      user_metadata: { name },
    }),
  });
  if (!k.ok || !k.daten?.id) {
    const meldung = meldungAus(k.daten);
    if (/already|registered|exists/i.test(meldung)) {
      return fehler("Diesen Namen gibt es schon. Bitte einen anderen wählen.");
    }
    return fehler("Konto konnte nicht angelegt werden: " + meldung, 500);
  }
  const nutzerId = k.daten.id;

  // 4. Profil anlegen (bei Fehler Konto wieder löschen)
  const p = await supa("/rest/v1/profile", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ id: nutzerId, name, login_name: login, rolle: einladung.rolle }),
  });
  if (!p.ok) {
    await supa(`/auth/v1/admin/users/${nutzerId}`, { method: "DELETE" });
    return fehler("Konto konnte nicht angelegt werden: " + meldungAus(p.daten), 500);
  }

  // 5. Einmal-Links (Admin-Link) danach abschalten
  if (einladung.einmalig) {
    await supa(`/rest/v1/einladungen?id=eq.${einladung.id}`, {
      method: "PATCH",
      body: JSON.stringify({ aktiv: false }),
    });
  }

  return antwort({ ok: true });
});
