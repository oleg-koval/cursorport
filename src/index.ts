export {
  migrate,
  migrateSettings,
  migrateKeybindings,
  migrateSnippets,
  migrateProfiles,
  migrateExtensions,
  readFontInfo,
  readThemeInfo,
} from './migrate.js'
export { resolvePaths } from './paths.js'
export type {
  MigrationOptions,
  MigrationResult,
  MigrationTarget,
  Paths,
  FontInfo,
  ThemeInfo,
} from './types.js'
