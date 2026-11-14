// Der Admin setzt das Passwort einer Person auf ein vorläufiges Passwort zurück.
// Eigenständige Datei: kann so im Supabase-Dashboard eingefügt werden.
// Bei Supabase in den Einstellungen dieser Funktion "Verify JWT" AUSSCHALTEN.

// ---------- Hilfen ----------
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

  // 1. Ist der Aufrufer ein aktiver Admin?
  const ichId = await aufrufer(req);
  if (!ichId) return fehler("Bitte zuerst anmelden.", 401);
  const ich = await supa(`/rest/v1/profile?select=rolle,aktiv&id=eq.${ichId}`);
  const profil = ich.daten?.[0];
  if (!profil || !profil.aktiv || profil.rolle !== "admin") {
    return fehler("Nur der Admin darf Passwörter zurücksetzen.", 403);
  }

  // 2. Eingabe prüfen
  let eingabe: { nutzer_id?: string; passwort?: string };
  try {
    eingabe = await req.json();
  } catch (_) {
    return fehler("Ungültige Anfrage");
  }
  const nutzerId = String(eingabe.nutzer_id ?? "");
  const passwort = String(eingabe.passwort ?? "");
  if (!/^[0-9a-f-]{36}$/.test(nutzerId)) return fehler("Keine gültige Person angegeben.");
  if (passwort.length < 6) return fehler("Das Passwort muss mindestens 6 Zeichen lang sein.");

  // 3. Passwort setzen und beim nächsten Login Änderung verlangen
  const r = await supa(`/auth/v1/admin/users/${nutzerId}`, {
    method: "PUT",
    body: JSON.stringify({ password: passwort }),
  });
  if (!r.ok) return fehler("Passwort konnte nicht geändert werden: " + meldungAus(r.daten), 500);

  await supa(`/rest/v1/profile?id=eq.${nutzerId}`, {
    method: "PATCH",
    body: JSON.stringify({ passwort_aendern: true }),
  });

  return antwort({ ok: true });
});
