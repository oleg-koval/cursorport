#!/bin/bash
set -e

if ! rclone listremotes | grep -q "^gdrive:$"; then
  echo "❌ rclone remote 'gdrive' not configured."
  echo "   Run ./setup_rclone.sh first."
  exit 1
fi

# === CONFIG ===
BACKUP_ROOT=~/cursor_backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="cursor_backup_$TIMESTAMP"
BACKUP_DIR="$BACKUP_ROOT/$BACKUP_NAME"
ARCHIVE_NAME="$BACKUP_NAME.zip"
CURSOR_SRC="$HOME/Library/Application Support/Cursor/User"
REMOTE_DIR="gdrive:cursor_backups"
MAX_BACKUPS=3

echo "📁 Creating backup folder..."
mkdir -p "$BACKUP_DIR"

echo "📦 Copying Cursor settings (excluding heavy subfolders)..."
rsync -av \
  --exclude='workspaceStorage' \
  --exclude='globalStorage' \
  --exclude='logs' \
  "$CURSOR_SRC/" "$BACKUP_DIR/User/"

echo "🔌 Exporting installed extensions list..."
cursor --list-extensions > "$BACKUP_DIR/User/extensions.txt"

echo "🗜️ Creating ZIP archive..."
cd "$BACKUP_ROOT"
zip -r -q "$ARCHIVE_NAME" "$BACKUP_NAME"

echo "☁️ Uploading $ARCHIVE_NAME to Google Drive..."
rclone copy "$ARCHIVE_NAME" "$REMOTE_DIR"

echo "🧹 Cleaning up old local backups..."
cd "$BACKUP_ROOT"
ls -dt cursor_backup_*.zip | tail -n +$((MAX_BACKUPS + 1)) | xargs -I {} rm -f {}

echo "🧹 Cleaning up old backups from Google Drive..."
REMOTE_FILES=$(rclone lsf "$REMOTE_DIR" --files-only | grep -E '^cursor_backup_.*\.zip$' | sort)
NUM_BACKUPS=$(echo "$REMOTE_FILES" | wc -l)

if (( NUM_BACKUPS > MAX_BACKUPS )); then
  FILES_TO_DELETE=$(echo "$REMOTE_FILES" | head -n $((NUM_BACKUPS - MAX_BACKUPS)))
  echo "$FILES_TO_DELETE" | while read -r FILE; do
    echo "   🔥 Deleting: $FILE"
    rclone delete "$REMOTE_DIR/$FILE"
  done
else
  echo "   ℹ️ No old remote backups to delete"
fi

echo "✅ Backup complete and uploaded as $ARCHIVE_NAME"
