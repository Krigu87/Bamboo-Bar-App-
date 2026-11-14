# Einrichtung – Klick-Anleitung für Krigu

Diese Schritte machst du einmal. Danach läuft die App von allein.
Dauer: etwa 20–30 Minuten. Du brauchst einen Computer (am Handy geht es auch, ist aber fummelig).

> Supabase ändert ab und zu die Namen der Menüs. Wenn etwas nicht genau so heißt,
> such nach einem ähnlichen Begriff oder frag Hans.

---

## 1. Supabase-Konto und Projekt anlegen

1. Öffne <https://supabase.com> und klicke **Start your project**.
2. Melde dich mit **Continue with GitHub** an (dein GitHub-Konto).
3. Klicke **New project**:
   - **Name:** `bamboo-bar`
   - **Database Password:** auf **Generate a password** klicken und das Passwort sicher aufbewahren (z. B. im Passwort-Manager). Du brauchst es im Alltag nicht.
   - **Region:** **Central EU (Frankfurt)** oder, falls angeboten, **Zurich**.
   - **Plan:** Free.
   - Falls Optionen wie „Enable Data API“ angezeigt werden: eingeschaltet lassen.
4. **Create new project** klicken und 1–2 Minuten warten.

## 2. Datenbank einrichten

1. Öffne im Repository auf GitHub die Datei
   `supabase/migrations/20261114000000_etappe1.sql`, klicke oben rechts auf **Raw**
   und kopiere den ganzen Text (Strg+A, Strg+C).
2. In Supabase links auf **SQL Editor** klicken, dann **New query**.
3. Text einfügen und unten rechts **Run** klicken.
4. Erwartet: **Success. No rows returned**. Bei einer roten Fehlermeldung: Text an Hans schicken.

## 3. Anmeldung einstellen

1. Links **Authentication** → **Sign In / Providers**.
2. **Allow new users to sign up** (heißt manchmal „Enable sign ups“) **AUSSCHALTEN** und speichern.
   Damit kann sich niemand ohne Einladungslink ein Konto anlegen.
3. Bei den Anbietern muss **Email** **eingeschaltet bleiben**.
   Wichtig: Der Login mit Name und Passwort läuft intern darüber. Ist „Email“ aus, kann sich niemand mehr anmelden.
4. Falls es dort eine Einstellung **Confirm email** gibt: ausschalten (es werden nie E-Mails verschickt).

## 4. Die zwei Server-Funktionen anlegen

Die Funktionen legen neue Konten an und setzen Passwörter zurück. Sie brauchen den geheimen Schlüssel,
der nur bei Supabase liegt. Darum laufen sie dort und nicht in der App.

Für **jede** der beiden Funktionen:

| Name bei Supabase | Datei im Repository |
|---|---|
| `registrieren` | `supabase/functions/registrieren/index.ts` |
| `passwort-zuruecksetzen` | `supabase/functions/passwort-zuruecksetzen/index.ts` |

1. Links **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Den vorgegebenen Beispiel-Code komplett löschen.
3. Die Datei auf GitHub öffnen, **Raw**, alles kopieren und in den Editor einfügen.
4. Unten den **Namen** genau wie in der Tabelle eintragen (klein, mit Bindestrich).
5. **Deploy function** klicken.
6. Danach in der Funktion die **Einstellungen / Details** öffnen und
   **Verify JWT** (bzw. „Enforce JWT verification“) **AUSSCHALTEN** und speichern.
   Die Funktionen prüfen selbst, wer sie aufruft.

> Supabase schaltet „Verify JWT“ nach einem erneuten Deploy manchmal wieder ein.
> Wenn das Registrieren plötzlich nicht mehr geht: diese Einstellung prüfen.

## 5. Zwei Werte an Hans schicken

1. Links unten **Project Settings** (Zahnrad).
2. Unter **Data API** (oder **API**): die **Project URL** kopieren, z. B. `https://abcdefgh.supabase.co`.
3. Unter **API Keys**: den **Publishable key** kopieren (beginnt mit `sb_publishable_`).
   Falls nur alte Schlüssel angezeigt werden: den **anon public** Schlüssel.
4. Beide Werte an Hans schicken. Die sind öffentlich und dürfen in die App.

> **Niemals** den **Secret key** (`sb_secret_…`) oder **service_role** weitergeben oder irgendwo eintragen.

Hans trägt die Werte in `app/js/config.js` ein.

## 6. GitHub Pages einschalten

1. Im Repository auf GitHub: **Settings** → links **Pages**.
2. Bei **Build and deployment** → **Source**: **GitHub Actions** auswählen.
3. Sobald der Code auf `main` ist (Hans fragt dich vorher), wird die App automatisch veröffentlicht.
   Den Fortschritt siehst du unter **Actions** → „App veröffentlichen“.
4. Die Adresse der App: **<https://krigu87.github.io/Bamboo-Bar-App-/>**

## 7. Dein erster Login als Admin

1. In Supabase im **SQL Editor** eine neue Abfrage mit diesem Text ausführen:
   ```sql
   select code from einladungen where rolle = 'admin' and aktiv;
   ```
2. Den angezeigten Code an diese Adresse anhängen und auf dem Handy öffnen:
   `https://krigu87.github.io/Bamboo-Bar-App-/#/einladung/CODE`
3. Namen (z. B. „Krigu“) und Passwort wählen. Fertig, du bist Admin.
   Dieser Admin-Link funktioniert nur einmal.

> Kommt beim Registrieren die Meldung, die E-Mail-Adresse sei ungültig: Hans Bescheid geben.
> Dann muss die interne Ersatz-Adresse angepasst werden (ein Wert an zwei Stellen).

## 8. Einladungslinks verteilen

1. In der App: **Profil** → **Verwaltung: Einladungen und Nutzer**.
2. **Für Mitglieder** → **Kopieren** → in den WhatsApp-Gruppenchat.
3. **Für die Band** → **Kopieren** → an euren „Präsidenten“, der ihn der Band weiterschickt.
4. Falls ein Link in falsche Hände gerät: **Erneuern**. Der alte Link geht dann nicht mehr,
   wer schon drin ist, bleibt drin.

## 9. App aufs Handy

- **Android (Chrome):** Seite öffnen → Menü ⋮ → **App installieren** bzw. **Zum Startbildschirm hinzufügen**.
- **iPhone (Safari):** Seite öffnen → **Teilen** (Quadrat mit Pfeil) → **Zum Home-Bildschirm**.
  Auf dem iPhone muss man sich in der installierten App einmal neu anmelden.

## 10. Wachhalten (läuft automatisch)

Supabase pausiert Gratis-Projekte nach etwa einer Woche ohne Nutzung. Darum fragt GitHub jeden Tag
einmal kurz bei Supabase nach (Ablauf „Supabase wachhalten“ unter **Actions**).

- GitHub schaltet solche täglichen Abläufe ab, wenn **60 Tage** lang nichts im Repository geändert wurde.
  Vorher kommt eine E-Mail von GitHub. Dann unter **Actions** → „Supabase wachhalten“ → **Enable workflow** klicken.
- Falls Supabase doch pausiert: Supabase öffnen, Projekt anklicken, **Restore project**. Es gehen keine Daten verloren.

---

## Für später: was wo liegt

| Was | Wo |
|---|---|
| Die App (Seiten, Design) | `app/` |
| Verbindungswerte | `app/js/config.js` |
| Datenbank und Rechte | `supabase/migrations/` |
| Server-Funktionen | `supabase/functions/` |
| Automatische Abläufe | `.github/workflows/` |
| Bauplan und Entscheidungen | `CLAUDE.md` |
