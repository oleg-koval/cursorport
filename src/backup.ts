import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { Paths } from './types.js'

interface BackupOptions {
  dryRun?: boolean
}

interface BackupResult {
  status: 'success' | 'failed' | 'skipped'
  message: string
  archivePath?: string
  uploadedToGdrive?: boolean
}

function hasRclone(): boolean {
  try {
    execSync('rclone version', { stdio: 'pipe', timeout: 5000 })
    return true
  } catch {
    return false
  }
}

function backupWithRclone(archivePath: string): boolean {
  try {
    execSync(`rclone copy "${archivePath}" gdrive:cursor_backups`, {
      stdio: 'pipe',
      timeout: 60000,
    })
    return true
  } catch {
    return false
  }
}

function cleanupOldBackups(backupRoot: string, maxBackups: number): void {
  try {
    const files = readdirSync(backupRoot)
      .filter((f) => f.match(/^cursor_backup_.*\.zip$/))
      .sort()

    if (files.length > maxBackups) {
      const toDelete = files.slice(0, files.length - maxBackups)
      for (const f of toDelete) {
        rmSync(join(backupRoot, f), { force: true })
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

export function backup(paths: Paths, opts: BackupOptions = {}): BackupResult {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '').split('T')[0] + '_' + Date.now().toString().slice(-6)
  const backupName = `cursor_backup_${timestamp}`
  const backupRoot = join(homedir(), 'cursor_backup')
  const backupDir = join(backupRoot, backupName)
  const archiveName = `${backupName}.zip`
  const archivePath = join(backupRoot, archiveName)

  if (opts.dryRun) {
    return {
      status: 'skipped',
      message: 'Dry-run mode: backup skipped',
    }
  }

  try {
    mkdirSync(backupDir, { recursive: true })

    execSync(`rsync -av --exclude='workspaceStorage' --exclude='globalStorage' --exclude='logs' "${paths.cursorUser}/" "${join(backupDir, 'User')}"`
    , {
      stdio: 'pipe',
      shell: '/bin/bash',
    })

    const extensionsOutput = execSync('cursor --list-extensions 2>/dev/null || echo ""', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()

    if (extensionsOutput) {
      writeFileSync(join(backupDir, 'User', 'extensions.txt'), extensionsOutput + '\n')
    }

    execSync(`cd "${backupRoot}" && zip -r -q "${archiveName}" "${backupName}"`, {
      stdio: 'pipe',
      shell: '/bin/bash',
    })

    rmSync(backupDir, { recursive: true, force: true })

    const uploadedToGdrive = hasRclone() && backupWithRclone(archivePath)

    cleanupOldBackups(backupRoot, 3)

    return {
      status: 'success',
      message: `Backup created: ${archiveName}${uploadedToGdrive ? ' (uploaded to GDrive)' : ' (local backup only)'}`,
      archivePath,
      uploadedToGdrive,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return {
      status: 'failed',
      message: `Backup failed: ${msg}`,
    }
  }
}
