import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  migrateSettings,
  migrateKeybindings,
  migrateSnippets,
  migrateProfiles,
  readFontInfo,
  readThemeInfo,
} from '../src/migrate.js'
import type { Paths } from '../src/types.js'

const DRY = { dryRun: true, force: false, skipExtensions: false }
const LIVE = { dryRun: false, force: true, skipExtensions: false }

function makePaths(base: string): Paths {
  return {
    cursorUser: join(base, 'cursor'),
    vscodeUser: join(base, 'vscode'),
    cursorExtensions: join(base, 'cursor-ext'),
    vscodeExtensions: join(base, 'vscode-ext'),
    backup: join(base, 'backup'),
  }
}

describe('migrateSettings', () => {
  let tmp: string
  let paths: Paths

  beforeEach(() => {
    tmp = join(tmpdir(), `cursorport-test-${Date.now()}`)
    paths = makePaths(tmp)
    mkdirSync(paths.cursorUser, { recursive: true })
    mkdirSync(paths.vscodeUser, { recursive: true })
  })

  afterEach(() => rmSync(tmp, { recursive: true, force: true }))

  it('returns skipped when settings.json absent', () => {
    const r = migrateSettings(paths, LIVE)
    expect(r.status).toBe('skipped')
  })

  it('strips cursor.* and anysphere.* keys', () => {
    const src = join(paths.cursorUser, 'settings.json')
    writeFileSync(
      src,
      JSON.stringify({
        'editor.fontSize': 14,
        'cursor.foo': 'bar',
        'anysphere.baz': true,
      }),
    )
    migrateSettings(paths, LIVE)
    const out = JSON.parse(readFileSync(join(paths.vscodeUser, 'settings.json'), 'utf8')) as Record<
      string,
      unknown
    >
    expect(out['editor.fontSize']).toBe(14)
    expect(out['cursor.foo']).toBeUndefined()
    expect(out['anysphere.baz']).toBeUndefined()
  })

  it('dry run does not write', () => {
    writeFileSync(join(paths.cursorUser, 'settings.json'), '{"x":1}')
    migrateSettings(paths, DRY)
    expect(existsSync(join(paths.vscodeUser, 'settings.json'))).toBe(false)
  })
})

describe('migrateKeybindings', () => {
  let tmp: string
  let paths: Paths

  beforeEach(() => {
    tmp = join(tmpdir(), `cursorport-test-${Date.now()}`)
    paths = makePaths(tmp)
    mkdirSync(paths.cursorUser, { recursive: true })
    mkdirSync(paths.vscodeUser, { recursive: true })
  })

  afterEach(() => rmSync(tmp, { recursive: true, force: true }))

  it('copies keybindings.json', () => {
    writeFileSync(join(paths.cursorUser, 'keybindings.json'), '[{"key":"ctrl+k"}]')
    migrateKeybindings(paths, LIVE)
    const out = readFileSync(join(paths.vscodeUser, 'keybindings.json'), 'utf8')
    expect(out).toContain('ctrl+k')
  })

  it('dry run does not write', () => {
    writeFileSync(join(paths.cursorUser, 'keybindings.json'), '[]')
    migrateKeybindings(paths, DRY)
    expect(existsSync(join(paths.vscodeUser, 'keybindings.json'))).toBe(false)
  })
})

describe('migrateSnippets', () => {
  let tmp: string
  let paths: Paths

  beforeEach(() => {
    tmp = join(tmpdir(), `cursorport-test-${Date.now()}`)
    paths = makePaths(tmp)
    mkdirSync(paths.cursorUser, { recursive: true })
    mkdirSync(paths.vscodeUser, { recursive: true })
  })

  afterEach(() => rmSync(tmp, { recursive: true, force: true }))

  it('copies all snippet files', () => {
    mkdirSync(join(paths.cursorUser, 'snippets'))
    writeFileSync(join(paths.cursorUser, 'snippets', 'ts.json'), '{}')
    writeFileSync(join(paths.cursorUser, 'snippets', 'go.json'), '{}')
    migrateSnippets(paths, LIVE)
    expect(existsSync(join(paths.vscodeUser, 'snippets', 'ts.json'))).toBe(true)
    expect(existsSync(join(paths.vscodeUser, 'snippets', 'go.json'))).toBe(true)
  })

  it('returns count', () => {
    mkdirSync(join(paths.cursorUser, 'snippets'))
    writeFileSync(join(paths.cursorUser, 'snippets', 'a.json'), '{}')
    const r = migrateSnippets(paths, LIVE)
    expect(r.count).toBe(1)
  })
})

describe('migrateProfiles', () => {
  let tmp: string
  let paths: Paths

  beforeEach(() => {
    tmp = join(tmpdir(), `cursorport-test-${Date.now()}`)
    paths = makePaths(tmp)
    mkdirSync(paths.cursorUser, { recursive: true })
    mkdirSync(paths.vscodeUser, { recursive: true })
  })

  afterEach(() => rmSync(tmp, { recursive: true, force: true }))

  it('skipped when no profiles dir', () => {
    const r = migrateProfiles(paths, LIVE)
    expect(r.status).toBe('skipped')
  })
})

describe('readFontInfo / readThemeInfo', () => {
  let tmp: string

  beforeEach(() => {
    tmp = join(tmpdir(), `cursorport-test-${Date.now()}`)
    mkdirSync(tmp, { recursive: true })
  })

  afterEach(() => rmSync(tmp, { recursive: true, force: true }))

  it('extracts font and theme from settings', () => {
    const p = join(tmp, 'settings.json')
    writeFileSync(
      p,
      JSON.stringify({
        'editor.fontFamily': "'Fira Code', monospace",
        'workbench.colorTheme': 'GitHub Dark Dimmed',
        'workbench.iconTheme': 'material-icon-theme',
      }),
    )
    const fonts = readFontInfo(p)
    const theme = readThemeInfo(p)
    expect(fonts.editor).toContain('Fira Code')
    expect(theme.colorTheme).toBe('GitHub Dark Dimmed')
    expect(theme.iconTheme).toBe('material-icon-theme')
  })

  it('returns empty object for missing file', () => {
    expect(readFontInfo('/nonexistent')).toEqual({})
    expect(readThemeInfo('/nonexistent')).toEqual({})
  })
})
