import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { migrate, readFontInfo, readThemeInfo } from './migrate.js'
import { resolvePaths } from './paths.js'
import type { MigrationResult, MigrationTarget } from './types.js'

const VERSION = '0.1.0'

const ICON: Record<MigrationResult['status'], string> = {
  ok: chalk.green('✓'),
  skipped: chalk.dim('–'),
  failed: chalk.red('✗'),
  partial: chalk.yellow('~'),
}

const LABEL: Record<MigrationTarget, string> = {
  settings: 'settings.json',
  keybindings: 'keybindings.json',
  snippets: 'snippets/',
  profiles: 'profiles/',
  extensions: 'extensions',
}

function printBanner(): void {
  console.log()
  console.log(chalk.bold.cyan('  cursorport') + chalk.dim(' — migrate Cursor → VS Code'))
  console.log()
}

function printResult(r: MigrationResult): void {
  const icon = ICON[r.status]
  const label = chalk.bold(LABEL[r.target].padEnd(18))
  const count = r.count != null ? chalk.dim(` (${r.count})`) : ''
  const msg = r.message ? chalk.dim(` ${r.message}`) : ''
  console.log(`  ${icon}  ${label}${count}${msg}`)
  if (r.failures?.length) {
    for (const f of r.failures) {
      console.log(`     ${chalk.red('↳')} ${chalk.dim(f)}`)
    }
  }
}

function printHints(paths: ReturnType<typeof resolvePaths>): void {
  const settingsPath = join(paths.cursorUser, 'settings.json')
  if (!existsSync(settingsPath)) return

  const fonts = readFontInfo(settingsPath)
  const theme = readThemeInfo(settingsPath)
  const hints: string[] = []

  if (fonts.editor) {
    const name = fonts.editor.split(',')[0]?.replace(/['"]/g, '').trim() ?? ''
    hints.push(`Font: ${chalk.bold(name)} — make sure it's installed on your system`)
  }
  if (theme.colorTheme) {
    hints.push(`Theme: ${chalk.bold(theme.colorTheme)} — verify its extension is installed in VS Code`)
  }
  if (theme.iconTheme) {
    hints.push(`Icon theme: ${chalk.bold(theme.iconTheme)}`)
  }

  if (hints.length) {
    console.log()
    console.log(chalk.dim('  Hints:'))
    for (const h of hints) console.log(`  ${chalk.yellow('!')}  ${h}`)
  }
}

async function run(): Promise<void> {
  const program = new Command()

  program
    .name('cursorport')
    .description('Migrate everything from Cursor to VS Code')
    .version(VERSION)

  program
    .command('migrate', { isDefault: true })
    .description('Run the full migration (default command)')
    .option('-n, --dry-run', 'Preview without making changes', false)
    .option('-f, --force', 'Overwrite VS Code files without prompting', false)
    .option('--skip-extensions', 'Skip extension installation', false)
    .option(
      '--only <targets>',
      'Comma-separated targets: settings,keybindings,snippets,profiles,extensions',
    )
    .action(async (opts: { dryRun: boolean; force: boolean; skipExtensions: boolean; only?: string }) => {
      printBanner()

      if (opts.dryRun) {
        console.log(chalk.yellow('  DRY RUN') + chalk.dim(' — no files will be written\n'))
      }

      const suffix = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const paths = resolvePaths(suffix)

      const only = opts.only
        ? (opts.only.split(',').map((s) => s.trim()) as MigrationTarget[])
        : undefined

      const spinner = ora({ text: 'Migrating…', color: 'cyan' }).start()

      const results = await migrate(
        paths,
        { dryRun: opts.dryRun, force: opts.force, skipExtensions: opts.skipExtensions, only },
        (r) => {
          spinner.stop()
          printResult(r)
          spinner.start()
        },
      )

      spinner.stop()

      const failed = results.filter((r) => r.status === 'failed')
      const ok = results.filter((r) => r.status === 'ok' || r.status === 'partial')

      console.log()
      if (failed.length === 0) {
        console.log(chalk.green('  Migration complete.'))
      } else {
        console.log(chalk.yellow(`  Done with ${failed.length} failure(s). Check output above.`))
      }

      if (!opts.dryRun && ok.length > 0) {
        console.log(chalk.dim(`  Backup saved: ${paths.backup}`))
        console.log(chalk.dim('  Restart VS Code to apply all changes.'))
      }

      printHints(paths)
      console.log()
    })

  program
    .command('check')
    .description('Check what would be migrated without making changes')
    .action(async () => {
      program.parse(['', '', 'migrate', '--dry-run'], { from: 'user' })
    })

  await program.parseAsync()
}

run().catch((e: unknown) => {
  console.error(chalk.red('Error:'), e instanceof Error ? e.message : String(e))
  process.exit(1)
})
