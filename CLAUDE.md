# Hobbyraum-App – Bauplan für Claude Code

Stand: 13.11.2026 · Krigu

> Quelle: Claude-Docs-Dokument „Hobbyraum-App – Bauplan für Claude Code“
> (https://claude.ai/artifact/THBeZRwv63jjpLEXjnZHaQ). Bei Änderungen am Bauplan diese Datei mitpflegen.

## Ausgangslage

Ziel ist eine private Web-App (PWA) für den gemeinsamen Hobbyraum „Bamboo Bar“, die den WhatsApp-Chat bei Organisation, Reservierungen und Raum-Infos ersetzt. Sie soll so viel Nützliches können, dass sie auch wirklich benutzt wird.

- **Mitglieder:** ungefähr 7 offizielle Mitglieder (Freundeskreis). Der Kern trifft sich etwa einmal im Monat mit 4–6 Leuten. Früher war man 2–3 Mal pro Woche dort.
- **Unterschiedliche Nutzung:** Ein Mitglied zahlt, kommt aber nie. Ein anderes nutzt den Raum öfter für Spieleabende mit eigenen Kollegen.
- **Band:** Ein Teil des Raums ist an eine Band mit 5–6 Leuten untervermietet. Sie probt einmal pro Woche, die Uhrzeit variiert.
- **Geräte:** gemischt, überwiegend Android, mindestens 1–2 iPhones.
- **Heutige Probleme:** Im WhatsApp-Chat wird ständig gefragt, wann die Band probt und ob der Raum frei ist. Termine werden per WhatsApp-Umfrage gesucht. Fehlende Getränke werden per Anruf organisiert. Viele wissen nicht, wie Licht- und Tontechnik bedient werden.
- **Zugang:** Im WhatsApp-Chat sind auch ehemalige Mitglieder und Ex-Partnerinnen. Die App bekommen nur aktive Nutzer.

## Nutzer und Rollen

Es gibt eine einzige App mit einem Link für alle. Was jemand sieht, hängt von seiner Rolle beim Login ab. Zwei getrennte Apps sind nicht vorgesehen, weil die Band und die Mitglieder denselben Kalender brauchen, damit Doppelbuchungen sichtbar werden.

- **Admin** (Krigu): lädt Leute ein, entfernt sie und vergibt Rollen.
- **Mitglied:** sieht alle Bereiche der App.
- **Band:** sieht alles, was nicht privat ist: Belegung, Anleitungen, Einkaufsliste, Spiele-Bibliothek und Dart.
- Zugang nur auf Einladung. Ehemalige oder Fremde kommen nicht hinein.

Sichtbarkeit, von Krigu festgelegt. Grundsatz: Die Band sieht alles, was nicht privat ist.

| Bereich | Mitglied | Band |
|---|---|---|
| Kalender und Belegung | sehen und buchen | sehen und buchen, eigene Probetermine pflegen |
| Anleitungen (Licht, Ton) | ja | ja |
| Einkaufsliste | ja | ja |
| Verfügbarkeit, Abstimmungen, Events | ja | nein (kann später freigeschaltet werden) |
| Fotos und Kommentare | ja | nein |
| Spiele-Bibliothek, Dart, Bestenliste | ja | ja |
| Finanzen | ja | nein |

## Funktionen nach Etappen

Gebaut wird in drei Etappen. Zuerst kommt, was den WhatsApp-Chat im Alltag ersetzt, danach die Extras. Jede Etappe soll für sich nutzbar sein.

**Etappe 1 – Grundgerüst (Alltag)**

1. Login nur auf Einladung, Rollen Admin, Mitglied und Band
2. Kalender mit Raumbelegung: Wer hat den Raum wann? Reservierung mit Datum und Uhrzeit
3. Band-Probe als Dauertermin (wöchentlich) mit genauer Uhrzeit, die die Band selbst anpassen kann
4. Verfügbarkeit: Jedes Mitglied markiert beliebig weit im Voraus, wann es Zeit hätte. Der Kalender zeigt pro Tag eine Zahl wie „4 von 7 können“.
5. Einkaufsliste: Fehlendes eintragen (z. B. Cola), jemand tippt „Ich bring’s mit“, danach wird es abgehakt
6. Anleitungen: Schritt für Schritt mit Fotos, z. B. Licht einschalten oder Musikanlage bedienen
7. Geburtstage: freiwillig im Profil eintragen, erscheinen jedes Jahr automatisch im Kalender (Details unter „Entscheidungen“)

**Etappe 2 – Gemeinschaft**

1. Abstimmungen: 2–3 Daten vorschlagen, jeder stimmt ab, wann er kann
2. Events: Brunch, Abendessen, Ausflug, mit Zu- oder Absage
3. Fotos hochladen, mit Kommentaren. Bilder vor dem Upload verkleinern, um Speicher zu sparen.
4. Kommentarfunktion bei Terminen, Events und Fotos
5. Spiele-Bibliothek nur für Brett- und Kartenspiele: Liste mit Suche und Kategorien (z. B. Strategie, Kartenspiele), damit man sieht, ob ein Spiel vorhanden ist oder mitgebracht werden muss. Kicker, Dart, Ping-Pong usw. kommen nicht hinein.
6. Push-Benachrichtigungen, z. B. bei neuer Reservierung oder neuer Abstimmung

**Etappe 3 – Extras**

1. Dart-Zähler, vereinfacht: 301 und 501 mit Abzug der Punkte pro Wurf
2. Dart-Bestenliste und Statistik pro Spieler
3. Finanzen als einfaches Kassenbuch: Mietanteil pro Person, Band-Miete, Zusatzbeiträge, Kassenstand, Ausgaben wie Nebenkosten. Keine Anbindung an echte Bankkonten.

**Weitere Ideen, noch nicht entschieden**

- „Jetzt im Raum“: Einchecken, damit andere sehen, dass jemand vor Ort ist
- „Defekt melden“: Liste für kaputte oder fehlende Dinge
- „Was spielen wir heute?“: Spielvorschlag nach Anzahl der Spieler

## Name und Design

Die App heißt wie der Raum: **Bamboo Bar**. Das Design ist dunkel und orientiert sich am Leuchtschild über der Bar.

- **Vorbild:** Über der Bar hängt ein Schild aus Plexiglas mit dem Schriftzug „bamboo bar“ in weißen, kleinen, handgeschriebenen Buchstaben (fast Graffiti-Stil). Dahinter ist eine Lichtröhre, die die Farbe wechseln kann.
- **Farben:** Schwarz als Grundfarbe, Schrift in Weiß oder Creme. Akzentfarbe z. B. Bambusgrün oder warmes Holzbraun wie die Bartheke.
- **Leuchteffekt:** Der Schriftzug bekommt in der App einen sanften Glow, als würde er von hinten beleuchtet.
- **Logo:** mit Bambus, z. B. als leuchtende Linie im Neon-Stil. Es muss auch als kleines App-Symbol erkennbar sein.

Ideen, noch nicht entschieden:

- Jedes Mitglied wählt im Profil seine Leuchtfarbe, und die App übernimmt diese Akzentfarbe.
- Der Schriftzug wechselt beim Öffnen der App langsam die Farbe, wie die Röhre hinter dem Schild.
- Logo-Varianten: Schriftzug mit Bambusrohren dahinter oder als Unterstreichung · Bambusrohr als Cocktailglas oder Strohhalm · nur „bb“ mit Bambusblatt für das App-Symbol.

## Technik

Die App wird eine PWA auf GitHub Pages mit Supabase als Backend. Das ist kostenlos, braucht keinen App Store und läuft auf Android und iPhone.

| Baustein | Lösung | Hinweis |
|---|---|---|
| App | PWA (Web-App, über „Zum Homescreen hinzufügen“ installierbar) | Ein Link für alle, Updates kommen automatisch beim nächsten Öffnen |
| Hosting | GitHub Pages | Krigu hat schon eine PWA so veröffentlicht |
| Datenbank, Login, Dateien | Supabase, Gratis-Plan | 500 MB Datenbank, 1 GB Dateispeicher, keine Kreditkarte nötig |
| Rechte | Supabase Row Level Security | Setzt die Rollen aus „Nutzer und Rollen“ in der Datenbank durch, nicht nur in der Oberfläche |
| Wachhalten | täglicher automatischer Ping (GitHub Actions oder cron-job.org) | Unsichtbar für die Nutzer, keine Benachrichtigung |
| Push | Web Push | Auf dem iPhone nur, wenn die App auf dem Homescreen liegt |

Wichtige Fallstricke:

- Supabase pausiert Gratis-Projekte nach etwa einer Woche Inaktivität. Der Raum wird selten genutzt, darum ist der Ping Pflicht.
- GitHub deaktiviert zeitgesteuerte Workflows in öffentlichen Repositories nach 60 Tagen ohne Aktivität. Darum regelmäßig etwas pushen oder cron-job.org nutzen.
- Das Repository ist vermutlich öffentlich. Der öffentliche Supabase-Schlüssel (anon key) darf hinein, der geheime service_role-Schlüssel nie.
- Fotos clientseitig verkleinern, z. B. auf etwa 1600 px, damit das 1 GB lange reicht.

Quellen: [Supabase: Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing.md) · [Supabase-Gratis-Limits 2026](https://automationatlas.io/answers/supabase-free-tier-limits-2026/) · [GitHub Docs: Workflows deaktivieren](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows)

## Entscheidungen (Stand 14.11.2026, von Krigu bestätigt)

**Admin**
- Krigu ist der einzige Admin.

**Login**
- Zugang nur über einen Einladungslink, den Krigu in der App erstellt. Die Rolle (Mitglied oder Band) wird beim Erstellen der Einladung festgelegt.
- Es gibt zwei Gruppenlinks: einen für Mitglieder und einen für die Band. Sie sind mehrfach nutzbar und dauerhaft gültig, wie bei Krigus anderen Apps. Krigu kann einen Link in der App jederzeit erneuern. Danach funktioniert der alte Link nicht mehr.
- Der Mitglieder-Link kommt in den WhatsApp-Gruppenchat. Den Band-Link schickt das Mitglied weiter, das den Kontakt zur Band hält (der „Präsident“). Krigu hat keine Nummern der Bandmitglieder.
- Wer den Link öffnet, wählt einmal einen Namen und ein eigenes Passwort.
- Danach bleibt man auf dem Gerät angemeldet (wie bei WhatsApp).
- Passwort vergessen: Krigu setzt es in der App auf ein vorläufiges Passwort zurück und sagt es der Person. Beim nächsten Login wählt sie ein neues.
- Keine E-Mails: Supabase kennt nur Login per E-Mail, darum macht die App aus dem Namen intern eine Ersatz-Adresse (z. B. `name@bamboo-bar.invalid`). Nutzer sehen davon nichts. Beim Bauen zuerst testen, ob Supabase das ohne Probleme annimmt.
- Konten werden über eine Supabase Edge Function angelegt (nur dort liegt der service_role-Schlüssel). Öffentliche Registrierung in Supabase ausschalten. Für das Zurücksetzen von Passwörtern ebenfalls eine Edge Function, die prüft, ob der Aufrufer Admin ist.
- Krigu ist es egal, wenn ein Link im Gruppenchat landet und Ehemalige ihn sehen. Es sind Freunde, und Krigu kann unerwünschte Konten in der App wieder entfernen.

**Band-Termine und Rechte im Kalender**
- Alle Bandmitglieder dürfen Probetermine eintragen und ändern.
- Sonst bearbeitet jeder nur seine eigenen Einträge. Der Admin darf alles.

**Wiederholende Termine** (für Reservierungen, Bandproben und Verfügbarkeit)
- Auswahl: einmalig, wöchentlich, monatlich, jährlich. „Alle 2 Wochen“ wird nicht gebraucht.
- Ende: nie oder bis zu einem Datum.
- Monatlich wie im Handy-Kalender: Die App bietet aus dem gewählten Datum automatisch zwei Varianten an, z. B. „Monatlich am 14.“ oder „Monatlich am 2. Samstag“.
- Beim Ändern fragt die App: „Nur diesen Termin“ oder „Diesen und alle folgenden“. So lässt sich z. B. die Uhrzeit für einzelne Termine anpassen.
- Einzelne Termine einer Serie können abgesagt werden, ohne die Serie zu löschen.

**Geburtstage**
- Jeder trägt sein Geburtsdatum freiwillig im Profil ein, auf Wunsch ohne Jahrgang.
- Der Kalender zeigt Geburtstage jedes Jahr automatisch an, damit man gratulieren kann.
- Die Band darf ihre Geburtstage ebenfalls eintragen und sieht alle Geburtstage.
- Geburtstage von Nicht-Mitgliedern bei Bedarf als normalen jährlichen Termin eintragen.
- Kommt in Etappe 1.

## Offene Fragen

Diese Punkte sind noch nicht entschieden. Claude Code soll sie bei der jeweiligen Etappe nachfragen und nicht selbst festlegen.

- [x] Wer aus der Band trägt die Probetermine ein? → alle aus der Band
- [x] Gibt es neben Krigu weitere Admins? → nein
- [x] Login-Art? → Name und eigenes Passwort, siehe „Entscheidungen“
- [x] Einladungslinks? → ein dauerhafter Gruppenlink pro Rolle, siehe „Entscheidungen“
- [x] Geburtstage und Band? → Band trägt ein und sieht alle
- [ ] Finanzen: Beträge, Währung, wer darf Einträge machen?
- [ ] Logo festlegen. Krigu reicht ein besseres Foto vom Schild nach (frontal, in Farbe, Raumlicht aus).
- [ ] Brett- und Kartenspiele erfassen (macht Krigu)
- [ ] Fotos der Licht- und Tontechnik für die Anleitungen machen
- [ ] Welche der „weiteren Ideen“ kommen hinein?

## Hinweise für Claude Code

Dieses Dokument ist der Projektauftrag. Es liegt als CLAUDE.md im Repository, damit es bei jeder Sitzung bekannt ist.

- Auf Deutsch kommunizieren und einfach erklären, ohne unnötigen Fachjargon.
- Nichts eigenständig ändern oder entscheiden. Vor jedem größeren Schritt den Plan zeigen und auf Krigus OK warten.
- Bei Unklarheiten nachfragen statt raten.
- Mit Etappe 1 beginnen und erst weitermachen, wenn sie läuft.
- Schritte außerhalb des Codes, z. B. Supabase-Konto anlegen oder GitHub Pages einschalten, als kurze Klick-Anleitung erklären. Krigu führt diese Schritte selbst aus.
- Keine E-Mails oder SMS versenden.
