Before changing application or library code here, read `docs/architecture-boundaries.md` and apply the architecture rules.

If the change touches state management, also read `docs/architecture-state-management.md` when it exists.

File-name suffixes carry architectural meaning (see `docs/architecture-state-management.md`). Renaming or moving a file across suffixes is a re-classification, not a cosmetic change — verify it against those rules first.

Do not bypass documented domain boundaries. Prefer small, focused changes.
