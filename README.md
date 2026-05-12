<p align="center">
  <a href="https://github.com/oleg-koval/cursorport/actions/workflows/ci.yml"><img src="https://github.com/oleg-koval/cursorport/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node.js ≥ 20"></a>
</p>

<p align="center">
  <img src="./logo.svg" width="120" height="120" alt="cursorport icon">
</p>

<h1 align="center">cursorport</h1>

<p align="center">
  <strong>Migrate everything from Cursor to VS Code in one command</strong><br>
  Copy all settings, keybindings, snippets, profiles, extensions, themes, and fonts
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

### One-command migration (no install)

```bash
npx cursorport
```

### Or install globally for repeated use

```bash
npm install -g cursorport
cursorport
```

## Step-by-step guide

**Before migrating:**

1. Install the CLIs (instructions below)
2. Back up your VS Code settings (cursorport does this automatically, but keep your own copy too)
3. Close VS Code while migrating to avoid write conflicts

**Migrate your settings:**

1. Run `npx cursorport` or `cursorport` (if installed globally)
2. Follow the prompts — cursorport asks before overwriting existing VS Code files
3. Restart VS Code to apply all changes

**Verify the migration:**

1. Check your settings: VS Code → Settings → search for your Cursor preferences
2. Test keybindings: VS Code → Keyboard Shortcuts
3. Verify extensions: VS Code → Extensions → search for migrated extensions
4. Confirm fonts and themes are installed: Editor font and workbench theme

**Options for advanced use:**

- Preview changes without applying: `npx cursorport --dry-run`
- Migrate only specific items: `npx cursorport --only settings,keybindings`
- Overwrite without prompting: `npx cursorport --force`
- Skip extension installation: `npx cursorport --skip-extensions`

### Install the CLIs

**Cursor:** Open Cursor → Command Palette → `Shell Command: Install 'cursor' command in PATH`

**VS Code:** Open VS Code → Command Palette → `Shell Command: Install 'code' command in PATH`

## Transfer Cursor settings between Macs

To copy your Cursor setup to another Mac (before migrating to VS Code):

**On your first Mac (source):**
1. Run `npx cursorport --backup` to create a backup
2. Backup saved to `~/.cursorport_backup_<timestamp>`
3. Transfer the backup to your other Mac:
   - **Cloud:** Upload to Drive/Dropbox/iCloud
   - **USB:** Copy to external drive
   - **Network:** `scp` or AirDrop the backup folder

**On your second Mac (target):**
1. Download/transfer the backup folder to your Mac
2. Extract the backup (if it's zipped)
3. Copy settings manually:
   - Settings: `~/.cursor/User/settings.json`
   - Keybindings: `~/.cursor/User/keybindings.json`
   - Snippets: `~/.cursor/User/snippets/`
   - Profiles: `~/.cursor/User/profiles/`
4. Reinstall extensions:
   - Open the backup folder
   - Find `extensions.txt` (list of your extensions)
   - Run: `cat extensions.txt | xargs -I {} cursor --install-extension {}`
5. Restart Cursor to apply all changes

**Then migrate to VS Code:**
Once Cursor is set up on the new Mac, run `npx cursorport` to migrate everything to VS Code.

## What gets migrated

Complete migration of your Cursor configuration to VS Code:

| What                 | Detail                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| **settings.json**    | All editor preferences, window settings, and configuration; `cursor.*` and `anysphere.*` keys stripped |
| **keybindings.json** | All keyboard shortcuts and custom key bindings                                                         |
| **snippets/**        | All code snippets across all programming languages                                                     |
| **profiles/**        | All named profiles and workspace configurations                                                        |
| **extensions**       | Installs all extensions; automatically skips Cursor-exclusive extensions                               |
| **fonts**            | Detects editor font family and terminal font; warns if not installed system-wide                       |
| **themes**           | Detects color theme and icon theme; warns if not available in VS Code marketplace                      |

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
| -------- | --------- |
| macOS    | ✓         |
| Linux    | ✓         |
| Windows  | ✓         |

Requires Node.js ≥ 20 and both the `cursor` and `code` CLI commands in your `$PATH`. (See step-by-step guide above for CLI installation.)

## Programmatic API

```ts
import { migrate, resolvePaths } from 'cursorport'

const paths = resolvePaths('my-backup')
const results = migrate(paths, {
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
