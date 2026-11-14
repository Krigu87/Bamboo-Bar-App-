-- =====================================================================
-- Bamboo Bar – Etappe 1: Grundgerüst
-- Tabellen, Rechte (Row Level Security) und Start-Einladungen.
-- Dieses Skript wird einmal im Supabase "SQL Editor" ausgeführt.
-- =====================================================================

-- ---------- Aufzählungen ----------
create type public.rolle as enum ('admin', 'mitglied', 'band');
create type public.termin_typ as enum ('reservierung', 'probe', 'verfuegbar');
create type public.wiederholung as enum (
  'keine', 'woechentlich', 'monatlich_datum', 'monatlich_wochentag', 'jaehrlich'
);

-- ---------- Profile (eine Zeile pro Person) ----------
create table public.profile (
  id                    uuid primary key references auth.users (id) on delete cascade,
  name                  text not null check (char_length(name) between 2 and 30),
  login_name            text not null unique,
  rolle                 public.rolle not null default 'mitglied',
  aktiv                 boolean not null default true,
  geburtstag            date,
  geburtsjahr_anzeigen  boolean not null default true,
  passwort_aendern      boolean not null default false,
  erstellt_am           timestamptz not null default now()
);

-- ---------- Einladungslinks ----------
create table public.einladungen (
  id          uuid primary key default gen_random_uuid(),
  rolle       public.rolle not null,
  code        text not null unique default replace(gen_random_uuid()::text, '-', ''),
  aktiv       boolean not null default true,
  einmalig    boolean not null default false,
  erstellt_am timestamptz not null default now()
);

-- ---------- Termine (Reservierung, Bandprobe, Verfügbarkeit) ----------
create table public.termine (
  id            uuid primary key default gen_random_uuid(),
  typ           public.termin_typ not null,
  titel         text not null default '' check (char_length(titel) <= 80),
  notiz         text not null default '' check (char_length(notiz) <= 500),
  datum         date not null,                 -- erster Termin der Serie
  ganztags      boolean not null default false,
  beginn        time,
  ende          time,                          -- kleiner als beginn = geht über Mitternacht
  wiederholung  public.wiederholung not null default 'keine',
  bis           date,                          -- letzter möglicher Termin (leer = endlos)
  erstellt_von  uuid not null default auth.uid() references public.profile (id) on delete cascade,
  erstellt_am   timestamptz not null default now(),
  check (ganztags or beginn is not null),
  check (bis is null or bis >= datum)
);
create index termine_datum_idx on public.termine (datum);

-- Abweichungen einzelner Termine einer Serie (andere Uhrzeit oder abgesagt)
create table public.termin_ausnahmen (
  termin_id  uuid not null references public.termine (id) on delete cascade,
  datum      date not null,                    -- ursprüngliches Datum des Termins
  abgesagt   boolean not null default false,
  beginn     time,
  ende       time,
  primary key (termin_id, datum)
);

-- ---------- Einkaufsliste ----------
create table public.einkauf (
  id            uuid primary key default gen_random_uuid(),
  text          text not null check (char_length(btrim(text)) between 1 and 100),
  erstellt_von  uuid default auth.uid() references public.profile (id) on delete set null,
  bringt_mit    uuid references public.profile (id) on delete set null,
  erledigt      boolean not null default false,
  erledigt_am   timestamptz,
  erstellt_am   timestamptz not null default now()
);

-- ---------- Anleitungen ----------
create table public.anleitungen (
  id            uuid primary key default gen_random_uuid(),
  titel         text not null check (char_length(btrim(titel)) between 1 and 80),
  beschreibung  text not null default '' check (char_length(beschreibung) <= 500),
  reihenfolge   integer not null default 0,
  erstellt_am   timestamptz not null default now()
);

create table public.anleitung_schritte (
  id            uuid primary key default gen_random_uuid(),
  anleitung_id  uuid not null references public.anleitungen (id) on delete cascade,
  nr            integer not null,
  text          text not null default '' check (char_length(text) <= 1000),
  bild          text                          -- Pfad im Speicher-Bucket "anleitungen"
);
create index anleitung_schritte_idx on public.anleitung_schritte (anleitung_id, nr);

-- =====================================================================
-- Hilfsfunktionen für die Rechte
-- =====================================================================

-- Rolle der angemeldeten Person (leer, wenn nicht angemeldet oder deaktiviert)
create function public.meine_rolle()
returns public.rolle
language sql stable security definer set search_path = public
as $$
  select rolle from public.profile where id = auth.uid() and aktiv
$$;

-- Darf die angemeldete Person einen Termin dieses Typs anlegen?
create function public.darf_typ(t public.termin_typ)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case t
    when 'reservierung' then public.meine_rolle() is not null
    when 'probe'        then public.meine_rolle() in ('admin', 'band')
    when 'verfuegbar'   then public.meine_rolle() in ('admin', 'mitglied')
  end
$$;

-- Darf die angemeldete Person diesen Termin ändern oder löschen?
-- Admin: alles. Sonst: eigene Termine. Band: alle Bandproben.
create function public.darf_termin_aendern(t public.termin_typ, von uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    public.meine_rolle() = 'admin'
    or (von = auth.uid() and public.meine_rolle() is not null)
    or (t = 'probe' and public.meine_rolle() = 'band'),
    false)
$$;

-- Für den täglichen "Wachhalte"-Ping (verhindert, dass Supabase pausiert)
create function public.ping()
returns text
language sql stable
as $$ select 'ok'::text $$;

-- Schutz: Name/Login nie über die App ändern, Rolle und Aktiv nur durch den Admin
create function public.profil_schutz()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Ohne angemeldete Person (SQL Editor, Server-Funktionen) ist alles erlaubt
  if auth.uid() is null then
    return new;
  end if;
  if new.id <> old.id or new.name <> old.name or new.login_name <> old.login_name then
    raise exception 'Der Name kann nicht geändert werden.';
  end if;
  if new.rolle <> old.rolle or new.aktiv <> old.aktiv then
    if public.meine_rolle() is distinct from 'admin' then
      raise exception 'Nur der Admin darf Rollen ändern.';
    end if;
    if old.id = auth.uid() then
      raise exception 'Die eigene Rolle kann nicht geändert werden.';
    end if;
  end if;
  return new;
end
$$;

create trigger profil_schutz
  before update on public.profile
  for each row execute function public.profil_schutz();

-- =====================================================================
-- Row Level Security: wer darf was sehen und ändern
-- =====================================================================
alter table public.profile            enable row level security;
alter table public.einladungen        enable row level security;
alter table public.termine            enable row level security;
alter table public.termin_ausnahmen   enable row level security;
alter table public.einkauf            enable row level security;
alter table public.anleitungen        enable row level security;
alter table public.anleitung_schritte enable row level security;

-- Profile: das eigene immer, aktive Nutzer sehen alle aktiven, Admin sieht alle
create policy profile_lesen on public.profile for select to authenticated
  using (id = auth.uid()
         or (aktiv and public.meine_rolle() is not null)
         or public.meine_rolle() = 'admin');
create policy profile_aendern on public.profile for update to authenticated
  using (id = auth.uid() or public.meine_rolle() = 'admin')
  with check (id = auth.uid() or public.meine_rolle() = 'admin');

-- Einladungen: nur der Admin
create policy einladungen_admin on public.einladungen for all to authenticated
  using (public.meine_rolle() = 'admin')
  with check (public.meine_rolle() = 'admin');

-- Termine: Verfügbarkeiten sieht die Band nicht
create policy termine_lesen on public.termine for select to authenticated
  using (public.meine_rolle() is not null
         and (typ <> 'verfuegbar' or public.meine_rolle() in ('admin', 'mitglied')));
create policy termine_anlegen on public.termine for insert to authenticated
  with check (erstellt_von = auth.uid() and public.darf_typ(typ));
create policy termine_aendern on public.termine for update to authenticated
  using (public.darf_termin_aendern(typ, erstellt_von))
  with check (public.darf_termin_aendern(typ, erstellt_von) and public.darf_typ(typ));
create policy termine_loeschen on public.termine for delete to authenticated
  using (public.darf_termin_aendern(typ, erstellt_von));

-- Ausnahmen: wie der zugehörige Termin
create policy ausnahmen_lesen on public.termin_ausnahmen for select to authenticated
  using (exists (select 1 from public.termine t where t.id = termin_id));
create policy ausnahmen_anlegen on public.termin_ausnahmen for insert to authenticated
  with check (exists (select 1 from public.termine t
                      where t.id = termin_id and public.darf_termin_aendern(t.typ, t.erstellt_von)));
create policy ausnahmen_aendern on public.termin_ausnahmen for update to authenticated
  using (exists (select 1 from public.termine t
                 where t.id = termin_id and public.darf_termin_aendern(t.typ, t.erstellt_von)))
  with check (exists (select 1 from public.termine t
                      where t.id = termin_id and public.darf_termin_aendern(t.typ, t.erstellt_von)));
create policy ausnahmen_loeschen on public.termin_ausnahmen for delete to authenticated
  using (exists (select 1 from public.termine t
                 where t.id = termin_id and public.darf_termin_aendern(t.typ, t.erstellt_von)));

-- Einkaufsliste: alle aktiven Nutzer dürfen alles
create policy einkauf_alle on public.einkauf for all to authenticated
  using (public.meine_rolle() is not null)
  with check (public.meine_rolle() is not null);

-- Anleitungen: alle lesen, Mitglieder und Admin schreiben
create policy anleitungen_lesen on public.anleitungen for select to authenticated
  using (public.meine_rolle() is not null);
create policy anleitungen_schreiben on public.anleitungen for all to authenticated
  using (public.meine_rolle() in ('admin', 'mitglied'))
  with check (public.meine_rolle() in ('admin', 'mitglied'));
create policy schritte_lesen on public.anleitung_schritte for select to authenticated
  using (public.meine_rolle() is not null);
create policy schritte_schreiben on public.anleitung_schritte for all to authenticated
  using (public.meine_rolle() in ('admin', 'mitglied'))
  with check (public.meine_rolle() in ('admin', 'mitglied'));

-- Zugriff über die App-Schnittstelle (die Policies oben schränken ihn ein)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
grant execute on function public.ping() to anon, authenticated;

-- =====================================================================
-- Speicher für Anleitungsfotos (öffentlich lesbar, nur Mitglieder laden hoch)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anleitungen', 'anleitungen', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

create policy anleitungen_bilder_hochladen on storage.objects for insert to authenticated
  with check (bucket_id = 'anleitungen' and public.meine_rolle() in ('admin', 'mitglied'));
create policy anleitungen_bilder_aendern on storage.objects for update to authenticated
  using (bucket_id = 'anleitungen' and public.meine_rolle() in ('admin', 'mitglied'));
create policy anleitungen_bilder_loeschen on storage.objects for delete to authenticated
  using (bucket_id = 'anleitungen' and public.meine_rolle() in ('admin', 'mitglied'));

-- =====================================================================
-- Start-Einladungen: ein einmaliger Admin-Link (für Krigu) und die zwei Gruppenlinks
-- =====================================================================
insert into public.einladungen (rolle, einmalig) values
  ('admin', true),
  ('mitglied', false),
  ('band', false);
