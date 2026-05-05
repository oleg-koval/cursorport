<p align="center">
  <a href="https://github.com/oleg-koval/cursorport/actions/workflows/ci.yml"><img src="https://github.com/oleg-koval/cursorport/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://coveralls.io/github/oleg-koval/cursorport"><img src="https://coveralls.io/repos/github/oleg-koval/cursorport/badge.svg?branch=main" alt="Coverage"></a>
  <a href="https://www.npmjs.com/package/cursorport"><img src="https://img.shields.io/npm/v/cursorport.svg?colorB=00c020" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/cursorport"><img src="https://img.shields.io/npm/dm/cursorport.svg?colorB=00c020" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a>
</p>

<p align="center">
  <img src="./logo.svg" width="120" height="120" alt="cursorport icon">
</p>

<h1 align="center">cursorport</h1>

<p align="center">
  Migrate everything from <strong>Cursor</strong> to <strong>VS Code</strong> in one command<br>
  settings · keybindings · snippets · profiles · extensions
</p>

---

```
  cursorport — migrate Cursor → VS Code

  ✓  settings.json       (cursor.* keys stripped)
  ✓  keybindings.json
  ✓  snippets/           (14)
  ✓  profiles/           (2)
  ✓  extensions          (38 installed, 2 failed)
     ↳ anysphere.cursorpyright  (Cursor-only, skipped)

  Migration complete.
  Backup saved: ~/.cursorport_backup_2025-01-15T10-30-00
  Restart VS Code to apply all changes.

  !  Font: Fira Code — make sure it's installed on your system
  !  Theme: GitHub Dark Dimmed — verify its extension is installed in VS Code
```

## Install & run

No install needed:

```bash
npx cursorport
```

Or install globally:

```bash
npm install -g cursorport
cursorport
```

## What gets migrated

| What | Detail |
|------|--------|
| **settings.json** | Copied verbatim; `cursor.*` and `anysphere.*` keys stripped so VS Code doesn't error |
| **keybindings.json** | Direct copy |
| **snippets/** | All language snippets |
| **profiles/** | All named profiles |
| **extensions** | `cursor --list-extensions` → `code --install-extension` for each; Cursor-only extensions skipped automatically |
| **font hints** | Detects your editor and terminal font and warns if not installed system-wide |
| **theme hints** | Detects color/icon theme and warns if the extension isn't in VS Code |

Cursor-only extensions that are skipped (not on the VS Code marketplace):

- `anysphere.cursorpyright`
- `anysphere.remote-containers`
- `anysphere.remote-ssh`
- `beilunyang.cursor-rules`

## Options

```
Usage: cursorport [options]
       cursorport migrate [options]   (same — migrate is the default command)
       cursorport check               (dry run alias)

Options:
  -n, --dry-run           Preview without making any changes
  -f, --force             Overwrite VS Code files without prompting
      --skip-extensions   Skip extension installation
      --only <targets>    Comma-separated subset:
                          settings,keybindings,snippets,profiles,extensions
  -V, --version           Print version
  -h, --help              Show help
```

### Examples

```bash
# Preview what would happen
npx cursorport --dry-run

# Migrate only settings and keybindings
npx cursorport --only settings,keybindings

# Full migration, no prompts
npx cursorport --force

# Skip extensions (fast)
npx cursorport --skip-extensions
```

## Platform support

| Platform | Supported |
|----------|-----------|
| macOS    | ✓ |
| Linux    | ✓ |
| Windows  | ✓ |

Requires Node.js ≥ 20 and both the `cursor` and `code` CLI commands in your `$PATH`.

### Install the CLIs

**Cursor:** Open Cursor → Command Palette → `Shell Command: Install 'cursor' command in PATH`

**VS Code:** Open VS Code → Command Palette → `Shell Command: Install 'code' command in PATH`

## Programmatic API

```ts
import { migrate, resolvePaths } from 'cursorport'

const paths = resolvePaths('my-backup')
const results = await migrate(paths, {
  dryRun: false,
  force: true,
  skipExtensions: false,
})

for (const r of results) {
  console.log(r.target, r.status, r.count)
}
```

## Before you migrate

1. **Back up VS Code settings** — cursorport saves a backup automatically to `~/.cursorport_backup_<timestamp>`, but keep your own copy too.
2. **Check your font** — if your Cursor font isn't installed system-wide, VS Code will fall back to its default. Download from [Nerd Fonts](https://www.nerdfonts.com/) or [Google Fonts](https://fonts.google.com/).
3. **Close VS Code** while migrating to avoid write conflicts.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Conventional commits drive automated releases via semantic-release.

## Support

If cursorport saved you time, [buy me a coffee ☕](https://www.buymeacoffee.com/olko)

## License

[MIT](LICENSE) © [Oleg Koval](https://github.com/oleg-koval)

---

<p align="center">
  <a href="https://github.com/oleg-koval/cursorport">GitHub</a> ·
  <a href="https://www.npmjs.com/package/cursorport">npm</a> ·
  <a href="https://github.com/oleg-koval/cursorport/issues">Issues</a> ·
  <a href="https://github.com/oleg-koval/cursorport/releases">Releases</a> ·
  <a href="https://oleg-koval.github.io/cursorport/">Website</a>
</p>
