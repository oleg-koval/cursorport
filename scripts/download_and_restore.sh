#!/bin/bash
set -e

if ! rclone listremotes | grep -q "^gdrive:$"; then
  echo "❌ rclone remote 'gdrive' not configured."
  echo "   Run ./setup_rclone.sh first."
  exit 1
fi

TMP_DIR=~/cursor_restore_tmp
DEST_DIR="$HOME/Library/Application Support/Cursor/User"
REMOTE_DIR="gdrive:cursor_backups"

mkdir -p "$TMP_DIR"
cd "$TMP_DIR"

echo "📂 Fetching list of remote backups..."
LATEST_BACKUP=$(rclone lsf "$REMOTE_DIR" --files-only | grep -E '^cursor_backup_.*\.zip$' | sort | tail -n 1 | tr -d '\r\n')

if [ -z "$LATEST_BACKUP" ]; then
  echo "❌ No backups found in $REMOTE_DIR"
  exit 1
fi

echo "⬇️ Downloading latest backup: $LATEST_BACKUP"
rclone copy "$REMOTE_DIR/$LATEST_BACKUP" .

echo "📦 Extracting archive..."
unzip -q "$LATEST_BACKUP"
EXTRACTED_DIR="${LATEST_BACKUP%.zip}"

# Backup current config
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_OLD="$DEST_DIR.backup_$TIMESTAMP"
mv "$DEST_DIR" "$BACKUP_OLD" 2>/dev/null || true
echo "📁 Existing config backed up to $BACKUP_OLD"

# Restore new config
cp -R "$EXTRACTED_DIR/User" "$DEST_DIR"

# Install extensions if present
EXT_FILE="$TMP_DIR/$EXTRACTED_DIR/User/extensions.txt"
if [ -f "$EXT_FILE" ]; then
  echo "🔌 Installing extensions from $EXT_FILE..."
  while IFS= read -r extension; do
    if [ -n "$extension" ]; then
      echo "   → Installing: $extension"
      cursor --install-extension "$extension" || echo "⚠️ Failed: $extension"
    fi
  done < "$EXT_FILE"
else
  echo "ℹ️ No extensions.txt found in backup"
fi

echo "✅ Cursor settings and extensions restored from $LATEST_BACKUP"
