#!/bin/bash
SCRIPT_NAME=$(basename "$0")
GITHUB_USER="SevenMDL"

git add . ':!'"$SCRIPT_NAME"

COMMIT_MSG=${1:-"Changes"}
git commit -m "$COMMIT_MSG"

git push https://$GITHUB_USER:$GITHUB_TOKEN@github.com/$GITHUB_USER/quickbill-desk.git main

echo "✅ Changes pushed to GitHub (script excluded)."
