---
name: rebase-labs
description: Rebased die Schulungs-Branch-Ketten (rebase.js für ENT-Branches auf FULL, rebase-ess.mjs für die ess-Lab-Kette) und löst Konflikte nach den Repo-Regeln auf. Verwenden, wenn nach Änderungen an Basis-Branches die Ketten aktualisiert werden sollen.
---

# Kontext

Schulungs-Repo. Die Branch-Ketten sind in den Skripten selbst definiert (tasks-Array in
`rebase.js` und `rebase-ess.mjs`). Jeder Starter-Branch ist die Lösung des vorherigen Labs;
Upstream-Änderungen propagieren per Rebase stromabwärts durch die ganze Kette.

Zwei eiserne Regeln:

- Starter-Branches lassen Dinge **bewusst** weg (wird im Lab nicht gebraucht oder von den
  Teilnehmern selbst gebaut). Fehlendes ist kein Fehler und darf beim Auflösen nicht
  "repariert" werden.
- TODO-Kommentare für Teilnehmer müssen erhalten bleiben.

# Ablauf

1. Working Tree muss clean sein. Häufiger Störfaktor: die Peacock-Extension schreibt beim
   Branch-Wechsel in `.vscode/settings.json` → mit `git checkout -- .vscode/settings.json`
   verwerfen.
2. `node rebase.js` ausführen. Das Skript bricht beim ersten Konflikt ab.
3. Konflikt auflösen (siehe unten), dann `git add <files>` und
   `GIT_EDITOR=true git rebase --continue`. Innerhalb eines Branch-Rebases können mehrere
   Konflikte nacheinander kommen — jeweils auflösen und weiter.
4. Nach Abschluss des Rebases: zurück auf main, Skript erneut ausführen. Bereits rebaste
   Branches laufen als No-op durch. Wiederholen bis `🎉 Fertig` ohne Konflikt.
5. Dasselbe mit `node rebase-ess.mjs`.
6. Verifikation (siehe unten).

# Konfliktauflösung

Entscheidungslogik pro Konflikt:

- **Replay eines alten, schon enthaltenen Commits:** Sobald ein Commit einmal mit
  Konfliktauflösung neu geschrieben wurde, matcht seine patch-id nicht mehr und er wird auf
  jedem Folge-Branch der Kette erneut abgespielt. Erkennbar daran, dass die neue Basis
  (HEAD) den Inhalt bereits in **neuerer** Form enthält. → HEAD nehmen:
  `git checkout --ours <files>`.
- **Echtes neues Material** (der Commit gehört inhaltlich zu diesem Branch, z.B. die
  Lab-Lösung des Vorgänger-Labs): eingehende Seite nehmen (`git checkout --theirs`) oder
  beide Seiten kombinieren, wenn HEAD zusätzlich neue Upstream-Änderungen enthält
  (z.B. neuer Import auf beiden Seiten → beide behalten).
- **AUSNAHME `package-lock.json`:** Für das Lockfile gelten die beiden Regeln oben NICHT —
  niemals eine Seite übernehmen (auch nicht bei "echtem neuen Material"; genau so
  entstehen stale Locks, die `npm ci` und frisches `npm i` brechen). Stattdessen immer:
  `git checkout --ours package-lock.json`. Nur falls der Branch wirklich eigene
  Dependencies in der package.json hat, danach `npm i` laufen lassen (regeneriert die
  Branch-Extras auf der neuen Basis) — Soll-Zustand ist aber, dass Dependencies
  ausschließlich aus `main` kommen (Superset-Invariante) und Ketten-Branches
  package.json/Lock gar nicht anfassen. Hat rerere für das Lockfile eine Auflösung
  aufgezeichnet, ist sie zu verwerfen (`git rerere forget package-lock.json`).
- **Im Zweifel Zielzustand nachschlagen:** Der Branch-Stand vor dem Rebase zeigt, was
  inhaltlich rauskommen soll:
  `ORIG=$(tr -d '[:space:]' < .git/rebase-merge/orig-head); git show "$ORIG:<pfad>"`.
  Zusätzlich die Tips der nachgelagerten Branches ansehen. Achtung: neue Upstream-Commits
  (z.B. Starter-Vereinfachungen wie "prepare starter kit") sollen den alten Stand gezielt
  ändern — deren Effekt gehört ins Ergebnis.
- **rerere:** Ab dem zweiten Durchlauf löst git-rerere wiederkehrende Konflikte selbst
  ("mit vorheriger Konfliktauflösung beseitigt"). Dann nur prüfen, dass keine Marker mehr
  in den Dateien stehen (`grep -rl '<<<<<<<'`), `git add -u`, weiter.
- Triviale Konflikte (z.B. nur fehlendes Newline am Dateiende): Seite mit Newline nehmen.

# Verifikation

- Kette: `git merge-base --is-ancestor <base> <branch>` für jedes Paar muss 0 liefern.
- Inhalt: `git diff "<branch>@{1}" <branch> --stat` — nur beabsichtigte
  Upstream-Propagationen dürfen erscheinen; idealerweise sind Branches ohne neue
  Upstream-Änderungen baumidentisch (leerer Diff).
- TODOs: Zähler vor/nach vergleichen, muss identisch sein:
  `git grep -c TODO "<branch>@{1}" -- 'src/**'` vs. `git grep -c TODO "<branch>" -- 'src/**'`.
- Nicht pushen — die Branches divergieren nach dem Rebase von origin.
  `git push --force-with-lease` nur auf explizite Anweisung.
