# Update 2026

## Angular 22.x

Aktualisiere auf das neueste Angular 22 und ziehe alle anderen deps nach. Nutze ng update.

## ArchUnitTS

Siehe Email unter [1] unten. Bitte umbauen und schauen, obs (besser?) geht.

## Vereinfachungen

- Mittlerweile reicht eine AGENTS.md und eine CLAUDE.md, die darauf verweist (@AGENTS.md)
- Das Script soll nur noch die .agents/skills auf .claude/skills kopieren. Alles andere lassen wir weg.
- Der Hook soll 2 Adapter haben
  - Hauptadapter, der für Claude und Codex geht (die sind mittlerweile konvergiert)
  - Adapter für Google agv
- Hooks und MCP werden separat konfiguriert
- Context-Engineering auch pro Domäne. Die globale AGENTS.md definiert, dass jede Domäne und jedes Feature eine context.md hat, und dass die gelesen werden soll, wenn was in diesem Context gemacht wird.
- Lege ein paar beispielhafte context.mds an.
- Orientiere Dich beim Thema Context-Engineering an dem, was pocock mit seinen skills macht (ohne die skills anzuwenden)
- Mache einen Skill, der ein ticket betrachtet, gegen den code prüft und offene fragen stellt ggf. mit antwortoptionen. diese antworten sollen dann ins ticket aufgenommen werden unter ## Decisions
- Füge auch Pocks Sandcastle hinzu. Wir verwenden es mal ohne Sandbox, dafür mit der Claude sandbox, die bei Claude dabei ist. Tickets sollen aus einem bestimmten Ordner abgeholt werden.

---

[1]

I loved reading your article about using architecture tests as deterministic feedback for coding agents. However, I do not think it is responsible to recommend tsarch for new projects.

For context, I may be considered biased because I maintain ArchUnitTS, a similar architecture testing library for TypeScript. However, this is not about self-promotion.

I am genuinely convinced there are serious issues with recommending tsarch in 2026:

tsarch is not actively maintained. Its latest release is nearly two years old, its last source changes were made in 2024, and its current main CI run is failing.
A selector that matches no files can silently produce a green test. This can create false confidence when a directory is renamed or a pattern becomes outdated.
It uses TypeScript 3.9 internally and does not properly resolve modern tsconfig inheritance, requiring projects such as your example to maintain a separate configuration.
A clean installation of the repository reported 130 npm audit findings, including 22 critical findings.
Now that said, of course tsarch still works and for teams with an existing, stable setup it may make sense to just stay with tsarch. However recommending it for a new and potentially long-lived project is a separate story.

ArchUnitTS began with inspiration and some code from the MIT-licensed tsarch project. It has since developed into an actively maintained library with safer empty-test behavior, modern TypeScript project resolution, substantially more rules, metrics, reports, and test-runner integrations. It was also faster in both of my benchmark measurements.

I documented the evidence, reproduction steps, and complete comparison in this article.

I would propose revisiting the recommendation in the article. It should either include a clear warning about tsarch’s maintenance and correctness issues or recommend a maintained alternative, such as my ArchUnitTS or dependency-cruiser.

Thank you and best regards,
Lukas
