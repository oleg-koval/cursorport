import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Paths } from './types.js'

const platform = process.platform

function userDataRoot(app: 'Cursor' | 'Code'): string {
  if (platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', app, 'User')
  }
  if (platform === 'win32') {
    const appData = process.env['APPDATA'] ?? join(homedir(), 'AppData', 'Roaming')
    return join(appData, app, 'User')
  }
  // Linux
  return join(homedir(), '.config', app, 'User')
}

function extensionsRoot(app: 'cursor' | 'vscode'): string {
  if (platform === 'win32') {
    return join(homedir(), '.' + app, 'extensions')
  }
  return join(homedir(), '.' + app, 'extensions')
}

export function resolvePaths(backupSuffix: string): Paths {
  return {
    cursorUser: userDataRoot('Cursor'),
    vscodeUser: userDataRoot('Code'),
    cursorExtensions: extensionsRoot('cursor'),
    vscodeExtensions: extensionsRoot('vscode'),
    backup: join(homedir(), `.cursorport_backup_${backupSuffix}`),
  }
}
