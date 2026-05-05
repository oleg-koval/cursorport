export interface MigrationOptions {
  dryRun: boolean
  force: boolean
  skipExtensions: boolean
  only?: MigrationTarget[]
}

export type MigrationTarget = 'settings' | 'keybindings' | 'snippets' | 'profiles' | 'extensions'

export interface MigrationResult {
  target: MigrationTarget
  status: 'ok' | 'skipped' | 'failed' | 'partial'
  count?: number
  message?: string
  failures?: string[]
}

export interface Paths {
  cursorUser: string
  vscodeUser: string
  cursorExtensions: string
  vscodeExtensions: string
  backup: string
}

export interface FontInfo {
  editor?: string
  terminal?: string
}

export interface ThemeInfo {
  colorTheme?: string
  iconTheme?: string
}
