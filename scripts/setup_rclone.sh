#!/bin/bash
# One-time rclone setup: creates a Google Drive remote named "gdrive"
# This opens a browser for OAuth — run once, then the other scripts will work.
set -e

REMOTE="gdrive"

if rclone listremotes | grep -q "^${REMOTE}:$"; then
  echo "✅ rclone remote '${REMOTE}' already configured."
  exit 0
fi

echo "🔧 Configuring rclone remote '${REMOTE}' for Google Drive..."
rclone config create "$REMOTE" drive scope drive
echo "✅ Done. You can now run backup_and_upload_cursor.sh and download_and_restore.sh."
