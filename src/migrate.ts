import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import type {
  MigrationOptions,
  MigrationResult,
  MigrationTarget,
  Paths,
  ThemeInfo,
  FontInfo,
} from './types.js'

// Cursor-specific extension IDs that don't exist on the VS Code marketplace
const CURSOR_ONLY_EXTENSIONS = new Set([
  'anysphere.cursorpyright',
  'anysphere.remote-containers',
  'anysphere.remote-ssh',
  'anysphere.remote-ssh-edit',
  'beilunyang.cursor-rules',
  'cursor-always-local',
])

// Top-level settings keys that are Cursor-only
const CURSOR_ONLY_KEY_PREFIXES = ['cursor.', 'anysphere.']

function isCursorOnlyKey(key: string): boolean {
  return CURSOR_ONLY_KEY_PREFIXES.some((p) => key.startsWith(p))
}

function stripCursorKeys(raw: string): string {
  const parsed: Record<string, unknown> = JSON.parse(raw) as Record<string, unknown>
  const cleaned = Object.fromEntries(Object.entries(parsed).filter(([k]) => !isCursorOnlyKey(k)))
  return JSON.stringify(cleaned, null, 2)
}

function backup(paths: Paths, dryRun: boolean): void {
  if (dryRun) return
  mkdirSync(paths.backup, { recursive: true })
  const files = ['settings.json', 'keybindings.json']
  for (const f of files) {
    const src = join(paths.vscodeUser, f)
    if (existsSync(src)) copyFileSync(src, join(paths.backup, f))
  }
  const snippets = join(paths.vscodeUser, 'snippets')
  if (existsSync(snippets)) cpSync(snippets, join(paths.backup, 'snippets'), { recursive: true })
}

export function migrateSettings(paths: Paths, opts: MigrationOptions): MigrationResult {
  const src = join(paths.cursorUser, 'settings.json')
  const dst = join(paths.vscodeUser, 'settings.json')
  if (!existsSync(src)) {
    return { target: 'settings', status: 'skipped', message: 'settings.json not found in Cursor' }
  }
  if (opts.dryRun) return { target: 'settings', status: 'ok', message: 'dry run' }
  try {
    const raw = readFileSync(src, 'utf8')
    writeFileSync(dst, stripCursorKeys(raw), 'utf8')
    return { target: 'settings', status: 'ok' }
  } catch (e) {
    return { target: 'settings', status: 'failed', message: String(e) }
  }
}

export function migrateKeybindings(paths: Paths, opts: MigrationOptions): MigrationResult {
  const src = join(paths.cursorUser, 'keybindings.json')
  const dst = join(paths.vscodeUser, 'keybindings.json')
  if (!existsSync(src)) {
    return {
      target: 'keybindings',
      status: 'skipped',
      message: 'keybindings.json not found in Cursor',
    }
  }
  if (opts.dryRun) return { target: 'keybindings', status: 'ok', message: 'dry run' }
  copyFileSync(src, dst)
  return { target: 'keybindings', status: 'ok' }
}

export function migrateSnippets(paths: Paths, opts: MigrationOptions): MigrationResult {
  const src = join(paths.cursorUser, 'snippets')
  const dst = join(paths.vscodeUser, 'snippets')
  if (!existsSync(src)) {
    return { target: 'snippets', status: 'skipped', message: 'No snippets directory in Cursor' }
  }
  const files = readdirSync(src)
  if (opts.dryRun)
    return { target: 'snippets', status: 'ok', count: files.length, message: 'dry run' }
  mkdirSync(dst, { recursive: true })
  for (const f of files) {
    copyFileSync(join(src, f), join(dst, f))
  }
  return { target: 'snippets', status: 'ok', count: files.length }
}

export function migrateProfiles(paths: Paths, opts: MigrationOptions): MigrationResult {
  const src = join(paths.cursorUser, 'profiles')
  const dst = join(paths.vscodeUser, 'profiles')
  if (!existsSync(src)) {
    return { target: 'profiles', status: 'skipped', message: 'No profiles directory' }
  }
  const entries = readdirSync(src)
  if (entries.length === 0) {
    return { target: 'profiles', status: 'skipped', message: 'No profiles to migrate' }
  }
  if (opts.dryRun)
    return { target: 'profiles', status: 'ok', count: entries.length, message: 'dry run' }
  cpSync(src, dst, { recursive: true })
  return { target: 'profiles', status: 'ok', count: entries.length }
}

export function migrateExtensions(paths: Paths, opts: MigrationOptions): MigrationResult {
  if (opts.dryRun) {
    try {
      const all = execFileSync('cursor', ['--list-extensions'], { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean)
      const toInstall = all.filter((e) => !CURSOR_ONLY_EXTENSIONS.has(e))
      return { target: 'extensions', status: 'ok', count: toInstall.length, message: 'dry run' }
    } catch {
      return { target: 'extensions', status: 'failed', message: 'cursor CLI not found' }
    }
  }

  let cursorExts: string[]
  let vscodeExts: Set<string>
  try {
    cursorExts = execFileSync('cursor', ['--list-extensions'], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
    vscodeExts = new Set(
      execFileSync('code', ['--list-extensions'], { encoding: 'utf8' }).split('\n').filter(Boolean),
    )
  } catch (e) {
    return { target: 'extensions', status: 'failed', message: `CLI error: ${String(e)}` }
  }

  const missing = cursorExts.filter((e) => !CURSOR_ONLY_EXTENSIONS.has(e) && !vscodeExts.has(e))

  const failures: string[] = []
  for (const ext of missing) {
    try {
      execFileSync('code', ['--install-extension', ext, '--force'], { stdio: 'pipe' })
    } catch {
      failures.push(ext)
    }
  }

  const status =
    failures.length === 0 ? 'ok' : missing.length === failures.length ? 'failed' : 'partial'
  return {
    target: 'extensions',
    status,
    count: missing.length - failures.length,
    ...(failures.length > 0 ? { failures } : {}),
  }
}

export function migrate(
  paths: Paths,
  opts: MigrationOptions,
  onProgress?: (result: MigrationResult) => void,
): MigrationResult[] {
  backup(paths, opts.dryRun)

  const targets: MigrationTarget[] = opts.only ?? [
    'settings',
    'keybindings',
    'snippets',
    'profiles',
    'extensions',
  ]

  const runners: Record<MigrationTarget, () => MigrationResult> = {
    settings: () => migrateSettings(paths, opts),
    keybindings: () => migrateKeybindings(paths, opts),
    snippets: () => migrateSnippets(paths, opts),
    profiles: () => migrateProfiles(paths, opts),
    extensions: () => migrateExtensions(paths, opts),
  }

  const results: MigrationResult[] = []
  for (const t of targets) {
    if (opts.skipExtensions && t === 'extensions') {
      const r: MigrationResult = { target: t, status: 'skipped', message: '--skip-extensions' }
      results.push(r)
      onProgress?.(r)
      continue
    }
    const r = runners[t]()
    results.push(r)
    onProgress?.(r)
  }
  return results
}

export function readFontInfo(settingsPath: string): FontInfo {
  try {
    const s = JSON.parse(readFileSync(settingsPath, 'utf8')) as Record<string, unknown>
    const info: FontInfo = {}
    if (typeof s['editor.fontFamily'] === 'string') info.editor = s['editor.fontFamily']
    if (typeof s['terminal.integrated.fontFamily'] === 'string')
      info.terminal = s['terminal.integrated.fontFamily']
    return info
  } catch {
    return {}
  }
}

export function readThemeInfo(settingsPath: string): ThemeInfo {
  try {
    const s = JSON.parse(readFileSync(settingsPath, 'utf8')) as Record<string, unknown>
    const info: ThemeInfo = {}
    if (typeof s['workbench.colorTheme'] === 'string') info.colorTheme = s['workbench.colorTheme']
    if (typeof s['workbench.iconTheme'] === 'string') info.iconTheme = s['workbench.iconTheme']
    return info
  } catch {
    return {}
  }
}
