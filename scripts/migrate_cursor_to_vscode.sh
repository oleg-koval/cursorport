#!/usr/bin/env bash
# migrate_cursor_to_vscode.sh
# Full settings migration: Cursor → VSCode (macOS)
# Usage: bash migrate_cursor_to_vscode.sh [--dry-run] [--skip-extensions] [--force]

set -euo pipefail

# ─── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GRN='\033[0;32m'
YLW='\033[1;33m'
BLU='\033[0;34m'
CYN='\033[0;36m'
RST='\033[0m'

log()  { echo -e "${BLU}[INFO]${RST}  $*"; }
ok()   { echo -e "${GRN}[OK]${RST}    $*"; }
warn() { echo -e "${YLW}[WARN]${RST}  $*"; }
err()  { echo -e "${RED}[ERROR]${RST} $*" >&2; }
hdr()  { echo -e "\n${CYN}══ $* ══${RST}"; }

# ─── Flags ─────────────────────────────────────────────────────────────────────
DRY_RUN=false
SKIP_EXTENSIONS=false
FORCE=false

for arg in "$@"; do
  case $arg in
    --dry-run)         DRY_RUN=true ;;
    --skip-extensions) SKIP_EXTENSIONS=true ;;
    --force)           FORCE=true ;;
    --help|-h)
      echo "Usage: $0 [--dry-run] [--skip-extensions] [--force]"
      echo "  --dry-run          Show what would happen, make no changes"
      echo "  --skip-extensions  Skip extension installation"
      echo "  --force            Overwrite VSCode settings without prompting"
      exit 0 ;;
    *) err "Unknown flag: $arg"; exit 1 ;;
  esac
done

$DRY_RUN && warn "DRY RUN — no files will be written"

# ─── Paths ─────────────────────────────────────────────────────────────────────
CURSOR_USER="$HOME/Library/Application Support/Cursor/User"
VSCODE_USER="$HOME/Library/Application Support/Code/User"
CURSOR_EXT="$HOME/.cursor/extensions"
VSCODE_EXT="$HOME/.vscode/extensions"
BACKUP_DIR="$HOME/.vscode_migration_backup_$(date +%Y%m%d_%H%M%S)"

# ─── Pre-flight checks ──────────────────────────────────────────────────────────
hdr "Pre-flight checks"

[[ -d "$CURSOR_USER" ]] || { err "Cursor user dir not found: $CURSOR_USER"; exit 1; }
[[ -d "$VSCODE_USER" ]] || { err "VSCode user dir not found: $VSCODE_USER"; exit 1; }
ok "Cursor user dir: $CURSOR_USER"
ok "VSCode user dir: $VSCODE_USER"

command -v cursor &>/dev/null || { err "'cursor' CLI not found — install via Cursor > Shell command: Install 'cursor' command"; exit 1; }
command -v code   &>/dev/null || { err "'code' CLI not found — install via VSCode > Shell command: Install 'code' command"; exit 1; }
ok "Both CLIs available"

# ─── Backup existing VSCode settings ───────────────────────────────────────────
hdr "Backing up existing VSCode settings"

if ! $DRY_RUN; then
  mkdir -p "$BACKUP_DIR"
  for f in settings.json keybindings.json; do
    [[ -f "$VSCODE_USER/$f" ]] && cp "$VSCODE_USER/$f" "$BACKUP_DIR/$f" && ok "Backed up $f"
  done
  [[ -d "$VSCODE_USER/snippets" ]] && cp -r "$VSCODE_USER/snippets" "$BACKUP_DIR/snippets" && ok "Backed up snippets/"
  ok "Backup saved to: $BACKUP_DIR"
else
  log "Would backup VSCode settings to: $BACKUP_DIR"
fi

# ─── Helper: safe copy ─────────────────────────────────────────────────────────
safe_copy() {
  local src="$1" dst="$2" label="$3"
  if [[ ! -e "$src" ]]; then
    warn "$label not found, skipping: $src"
    return
  fi
  if $DRY_RUN; then
    log "Would copy $label: $src → $dst"
    return
  fi
  if [[ -e "$dst" ]] && ! $FORCE; then
    read -r -p "$(echo -e "${YLW}Overwrite${RST} $dst? [y/N] ")" ans
    [[ "$ans" =~ ^[Yy]$ ]] || { warn "Skipped $label"; return; }
  fi
  if [[ -d "$src" ]]; then
    cp -r "$src" "$dst"
  else
    cp "$src" "$dst"
  fi
  ok "Copied $label"
}

# ─── Settings JSON ─────────────────────────────────────────────────────────────
hdr "Migrating settings.json"

# Cursor settings contain some cursor-specific keys — strip them before writing
CURSOR_SETTINGS="$CURSOR_USER/settings.json"
VSCODE_SETTINGS="$VSCODE_USER/settings.json"

if [[ -f "$CURSOR_SETTINGS" ]]; then
  if $DRY_RUN; then
    log "Would merge settings.json (stripping cursor.* keys)"
  else
    # Remove cursor-specific top-level keys that break VSCode
    CURSOR_ONLY_KEYS=(
      '"cursor\.'
      '"anysphere\.'
      '"github\.copilot'
    )

    FILTER='.
      | del(.. | objects | with_entries(select(.key | test("^cursor\\.|^anysphere\\."))))'

    if command -v jq &>/dev/null; then
      jq "$FILTER" "$CURSOR_SETTINGS" > /tmp/migrated_settings.json 2>/dev/null \
        && mv /tmp/migrated_settings.json "$VSCODE_SETTINGS" \
        && ok "settings.json merged (cursor-specific keys stripped)" \
        || { warn "jq filter failed — copying settings.json as-is"; safe_copy "$CURSOR_SETTINGS" "$VSCODE_SETTINGS" "settings.json"; }
    else
      warn "jq not found — copying settings.json as-is (may contain Cursor-only keys)"
      safe_copy "$CURSOR_SETTINGS" "$VSCODE_SETTINGS" "settings.json"
    fi
  fi
else
  warn "Cursor settings.json not found"
fi

# ─── Keybindings ───────────────────────────────────────────────────────────────
hdr "Migrating keybindings.json"
safe_copy "$CURSOR_USER/keybindings.json" "$VSCODE_USER/keybindings.json" "keybindings.json"

# ─── Snippets ──────────────────────────────────────────────────────────────────
hdr "Migrating snippets"
if [[ -d "$CURSOR_USER/snippets" ]]; then
  if $DRY_RUN; then
    log "Would copy snippets: $(ls "$CURSOR_USER/snippets" | wc -l | tr -d ' ') files"
  else
    mkdir -p "$VSCODE_USER/snippets"
    # Copy each snippet file; don't overwrite without prompt unless --force
    for f in "$CURSOR_USER/snippets"/*; do
      fname=$(basename "$f")
      dst="$VSCODE_USER/snippets/$fname"
      if [[ -e "$dst" ]] && ! $FORCE; then
        read -r -p "$(echo -e "${YLW}Overwrite snippet${RST} $fname? [y/N] ")" ans
        [[ "$ans" =~ ^[Yy]$ ]] || { warn "Skipped snippet: $fname"; continue; }
      fi
      cp "$f" "$dst"
      ok "Snippet: $fname"
    done
  fi
else
  warn "No snippets directory in Cursor"
fi

# ─── Profiles ──────────────────────────────────────────────────────────────────
hdr "Migrating profiles"
if [[ -d "$CURSOR_USER/profiles" ]]; then
  PROFILE_COUNT=$(ls "$CURSOR_USER/profiles" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$PROFILE_COUNT" -gt 0 ]]; then
    safe_copy "$CURSOR_USER/profiles" "$VSCODE_USER/profiles" "profiles/ ($PROFILE_COUNT entries)"
  else
    log "No profiles to migrate"
  fi
else
  log "No profiles directory in Cursor"
fi

# ─── Extensions ────────────────────────────────────────────────────────────────
hdr "Migrating extensions"

if $SKIP_EXTENSIONS; then
  warn "Skipping extensions (--skip-extensions)"
else
  CURSOR_EXTS=$(cursor --list-extensions 2>/dev/null | sort)
  VSCODE_EXTS=$(code --list-extensions 2>/dev/null | sort)

  # Skip Cursor-only extensions that don't exist on VSCode marketplace
  SKIP_EXTS=(
    "anysphere.cursorpyright"
    "anysphere.remote-containers"
    "anysphere.remote-ssh"
    "anysphere.remote-ssh-edit"
    "beilunyang.cursor-rules"
    "cursor-always-local"
  )

  MISSING=()
  while IFS= read -r ext; do
    [[ -z "$ext" ]] && continue
    skip=false
    for s in "${SKIP_EXTS[@]}"; do
      [[ "$ext" == "$s" ]] && skip=true && break
    done
    $skip && warn "Skipping Cursor-only extension: $ext" && continue
    echo "$VSCODE_EXTS" | grep -qx "$ext" || MISSING+=("$ext")
  done <<< "$CURSOR_EXTS"

  if [[ ${#MISSING[@]} -eq 0 ]]; then
    ok "All Cursor extensions already installed in VSCode"
  else
    log "Extensions to install: ${#MISSING[@]}"
    printf '  %s\n' "${MISSING[@]}"

    if $DRY_RUN; then
      log "Would install ${#MISSING[@]} extensions"
    else
      FAILED=()
      for ext in "${MISSING[@]}"; do
        echo -ne "  Installing ${CYN}$ext${RST}... "
        if code --install-extension "$ext" --force &>/dev/null; then
          echo -e "${GRN}ok${RST}"
        else
          echo -e "${RED}failed${RST}"
          FAILED+=("$ext")
        fi
      done

      if [[ ${#FAILED[@]} -gt 0 ]]; then
        warn "Failed to install ${#FAILED[@]} extension(s):"
        printf '  %s\n' "${FAILED[@]}"
        warn "These may be Cursor-exclusive or marketplace-unavailable."
        if ! $DRY_RUN; then
          FAIL_LOG="$BACKUP_DIR/failed_extensions.txt"
          printf '%s\n' "${FAILED[@]}" > "$FAIL_LOG"
          log "Failed list saved to: $FAIL_LOG"
        fi
      else
        ok "All extensions installed"
      fi
    fi
  fi
fi

# ─── Font check ────────────────────────────────────────────────────────────────
hdr "Font check"

if command -v jq &>/dev/null && [[ -f "$CURSOR_SETTINGS" ]]; then
  EDITOR_FONT=$(jq -r '."editor.fontFamily" // empty' "$CURSOR_SETTINGS" 2>/dev/null)
  TERMINAL_FONT=$(jq -r '."terminal.integrated.fontFamily" // empty' "$CURSOR_SETTINGS" 2>/dev/null)

  check_font() {
    local font_spec="$1" label="$2"
    [[ -z "$font_spec" ]] && return
    # Extract first font name (before comma)
    local primary
    primary=$(echo "$font_spec" | sed "s/[',].*//;s/'//g;s/^ *//;s/ *$//")
    [[ -z "$primary" ]] && return
    log "$label font: $font_spec"
    # Check if installed via system_profiler (slow) or fc-list
    if command -v fc-list &>/dev/null; then
      fc-list | grep -qi "$primary" \
        && ok "Font found on system: $primary" \
        || warn "Font NOT found: $primary — install it or VSCode will fall back to default"
    else
      log "Cannot verify font (fc-list not available): $primary"
    fi
  }

  check_font "$EDITOR_FONT"   "Editor"
  check_font "$TERMINAL_FONT" "Terminal"
else
  warn "jq not found or settings missing — skipping font check"
fi

# ─── Color theme check ─────────────────────────────────────────────────────────
hdr "Color theme check"

if command -v jq &>/dev/null && [[ -f "$CURSOR_SETTINGS" ]]; then
  THEME=$(jq -r '."workbench.colorTheme" // empty' "$CURSOR_SETTINGS" 2>/dev/null)
  ICON_THEME=$(jq -r '."workbench.iconTheme" // empty' "$CURSOR_SETTINGS" 2>/dev/null)

  [[ -n "$THEME" ]]      && log "Color theme:   $THEME"
  [[ -n "$ICON_THEME" ]] && log "Icon theme:    $ICON_THEME"

  # Check if theme extension is installed
  if [[ -n "$THEME" ]]; then
    THEME_LOWER=$(echo "$THEME" | tr '[:upper:]' '[:lower:]')
    FOUND=false
    while IFS= read -r ext_dir; do
      pkg="$ext_dir/package.json"
      [[ -f "$pkg" ]] || continue
      if jq -e '.contributes.themes[]? | select(.label | ascii_downcase | test("'"$THEME_LOWER"'"))' "$pkg" &>/dev/null 2>&1; then
        FOUND=true; break
      fi
    done < <(find "$VSCODE_EXT" -maxdepth 1 -type d 2>/dev/null)
    $FOUND && ok "Theme extension found in VSCode extensions" \
           || warn "Theme '$THEME' extension may not be installed in VSCode — check extension list"
  fi
fi

# ─── Summary ───────────────────────────────────────────────────────────────────
hdr "Migration complete"

if ! $DRY_RUN; then
  echo
  echo -e "  ${GRN}✓${RST} settings.json"
  echo -e "  ${GRN}✓${RST} keybindings.json"
  echo -e "  ${GRN}✓${RST} snippets/"
  echo -e "  ${GRN}✓${RST} profiles/"
  $SKIP_EXTENSIONS || echo -e "  ${GRN}✓${RST} extensions"
  echo
  ok "Backup of old VSCode settings: $BACKUP_DIR"
  echo
  warn "Restart VSCode to apply all changes."
  warn "If anything looks wrong, restore from: $BACKUP_DIR"
fi
