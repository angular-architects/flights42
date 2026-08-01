# flights42 — Schulungs-Starterkit

Dieses Repo ist das Starterkit für die Angular-Architects-Workshops. Die zugehörigen
Übungsblätter liegen im Schwester-Repo **workshop-site** (`workshops/*/Labs`) — dort
gilt: vor Änderungen die `_context.md` des jeweiligen Labs-Ordners lesen.

## Branch-Ketten

- **Mentales Modell:** Ein Starterkit ist `main` minus Lösungsinhalte — für die Übung
  wird typischerweise Code entfernt bzw. durch TODO-Kommentare ersetzt.
- Die ENT-Branches basieren auf `main` und werden per `node rebase.js` aktualisiert;
  `ENT-signals-starter` basiert auf `ENT-signals-solution`. Die ess-Kette
  (`rebase-ess.mjs`) basiert auf `ess-starter`, nicht auf `main`.
- Für Ketten-Updates das **rebase-labs-Skill** verwenden (`.claude/skills/rebase-labs/`),
  inklusive der dortigen Konfliktregeln und Verifikationsschritte.
- Teilnehmer klonen von GitHub — lokale Ketten-Änderungen wirken erst nach
  `git push --force-with-lease` (nur auf explizite Anweisung).

## Eiserne Regeln

- **Superset-Invariante:** Alle Dependencies kommen aus `main`. Ketten-Branches fassen
  `package.json`/`package-lock.json` **nicht** an (einzige tolerierte Ausnahme:
  reine `scripts`-Zeilen wie `test:arch` auf `ENT-sheriff-starter`). Braucht ein Lab
  eine neue Dependency → in `main` aufnehmen, Lock dort regenerieren, Kette rebasen.
- **Lockfile-Konflikte beim Rebase:** nie eine Seite übernehmen — immer
  `git checkout --ours package-lock.json` (Details im rebase-labs-Skill). Stale Locks
  brechen `npm ci` und frisches `npm i` bei den Teilnehmern.
- Starter-Branches lassen Dinge **bewusst** weg (Teilnehmer bauen sie selbst).
  Fehlendes ist kein Fehler und wird nicht „repariert“; TODO-Kommentare für
  Teilnehmer müssen erhalten bleiben.

## Bewusste Besonderheiten (nicht „fixen“)

- `sheriff.config.api.ts` und `sheriff.config.simple.ts` im Root gehören zum
  **Buchprojekt** (weiterführende Ideen) — sie werden von keinem Lab verwendet;
  aktiv ist nur `sheriff.config.ts`.
- `directives-starter` ist ein **Alias von `comp-starter`** (Directives-Lab startet
  bewusst auf dem Components-Starter). Der Branch existiert nur auf GitHub und hängt
  in keiner Rebase-Kette — bei Updates von `comp-starter` manuell mitziehen.
- Das `DateControl` (`src/app/domains/shared/ui-common/date-control/`) wird nur auf
  `main` verwendet. Der Forms-Starter (`ENT-signal-forms-starter`) nutzt auf der
  Advanced-Seite bewusst ein schlichtes `datetime-local`-Input und normalisiert dafür
  das Datum in `advanced-flight-edit.ts` — beide Stellen synchron halten.
- Der Diff `ENT-signals-starter..ENT-signals-solution` enthält neben den drei
  Lab-Dateien historisch bedingt Extra-Änderungen in fünf lab-fremden Dateien
  (flight-edit-Bereich, `eslint.config.js`, `booking-navigation.html`). Das ist
  akzeptiert (keine Kopplung an `flight-search`, Labs referenzieren den Branch nicht);
  für Demo-Diffs den Vergleich auf die Lab-Dateien einschränken.

## Code-Konventionen

- Seit der ng22.1-Kette ist `@Service()` (aus `@angular/core`) der bevorzugte Dekorator
  für Services — nicht mehr `@Injectable()`. Lab-Snippets für Branches der aktuellen
  Kette folgen dem. Ältere Ketten und Stände (`comp-starter`/Directives, ess-Kette,
  `ag-ui-starter`/`agentic`) laufen noch auf Angular 21 und nutzen dort weiterhin
  korrekt `@Injectable()` — nicht „modernisieren“.
