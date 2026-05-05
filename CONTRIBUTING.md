# Contributing

PRs welcome. Please open an issue first for large changes.

## Setup

```bash
git clone https://github.com/oleg-koval/cursorport
cd cursorport
npm install
```

## Development

```bash
npm run dev       # watch mode
npm test          # run tests
npm run lint:fix  # fix lint issues
```

## Commit convention

Follows [Conventional Commits](https://www.conventionalcommits.org/):

- `fix:` — bug fix → patch release
- `feat:` — new feature → minor release
- `feat!:` or `BREAKING CHANGE:` → major release
- `chore:`, `docs:`, `test:` — no release
