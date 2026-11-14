# Bamboo Bar

Private Web-App (PWA) für den Hobbyraum „Bamboo Bar“: Raumbelegung, Bandproben, Verfügbarkeit,
Geburtstage, Einkaufsliste und Anleitungen. Zugang nur mit Einladungslink.

- **Einrichtung:** siehe [EINRICHTUNG.md](EINRICHTUNG.md)
- **Bauplan und Entscheidungen:** siehe [CLAUDE.md](CLAUDE.md)

## Aufbau

| Teil | Technik |
|---|---|
| App | reines HTML, CSS und JavaScript ohne Build-Schritt (`app/`) |
| Hosting | GitHub Pages (`.github/workflows/pages.yml`) |
| Datenbank, Login, Fotos | Supabase (`supabase/`) |
| Rechte | Row Level Security in der Datenbank |

## Lokal testen (für Entwickler)

```bash
npm install
npm test                      # Rechenlogik (Wiederholungen usw.)
npx supabase start            # lokale Supabase (braucht Docker)
npx supabase functions serve  # Server-Funktionen
npm run serve                 # App auf http://localhost:8080 (nutzt automatisch die lokale Supabase)
```

Einladungscodes der lokalen Datenbank:
`psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "select rolle, code from einladungen"`
