#!/bin/bash
#
# Git History Credential Cleanup Script
# 
# This script removes exposed WordPress API credentials from git history.
# The exposed password was: vKCBU6YCLacPFSCkQ0VI5tqT
# 
# ⚠️  WARNING: This rewrites git history. All collaborators must re-clone.
# 
# Usage: ./scripts/clean-credential-history.sh
#

set -e

echo "🔒 Git History Credential Cleanup"
echo "=================================="
echo ""
echo "⚠️  WARNING: This will rewrite git history!"
echo "   - All collaborators must re-clone the repository"
echo "   - Open pull requests will need to be recreated"
echo "   - Backup recommended before proceeding"
echo ""
read -p "Continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Aborted."
    exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo ""
echo "📋 Step 1: Creating backup..."
BACKUP_DIR="$HOME/bapi-headless-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
git bundle create "$BACKUP_DIR/repo-backup.bundle" --all
echo "✅ Backup created: $BACKUP_DIR/repo-backup.bundle"

echo ""
echo "🔍 Step 2: Identifying commits with exposed credentials..."
git log --all --full-history --pretty=format:"%H %s" -- docs/DAILY-LOG.md | \
    grep -E "(Phase 3|credentials|environment)" | head -10

echo ""
echo ""
echo "🧹 Step 3: Cleaning git history using git filter-branch..."
echo "   Removing: vKCBU6YCLacPFSCkQ0VI5tqT"
echo "   Replacing with: [REDACTED_PASSWORD]"
echo ""

# Method 1: Using git filter-branch (built-in, slower but reliable)
git filter-branch --force --index-filter \
    'git diff-index --cached --name-only HEAD | \
     grep "docs/DAILY-LOG.md" && \
     git checkout -- docs/DAILY-LOG.md && \
     sed -i "s/WORDPRESS_API_PASSWORD=vKCBU6YCLacPFSCkQ0VI5tqT/WORDPRESS_API_PASSWORD=[REDACTED_PASSWORD]/g" docs/DAILY-LOG.md && \
     git add docs/DAILY-LOG.md || true' \
    --tag-name-filter cat \
    --prune-empty \
    -- --all

echo ""
echo "✅ Git history rewritten"

echo ""
echo "🗑️  Step 4: Cleaning up refs..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Verify the cleanup:"
echo "      git log --all --full-history -S 'vKCBU6YCLacPFSCkQ0VI5tqT' -- docs/DAILY-LOG.md"
echo ""
echo "   2. Rotate the WordPress API password in Kinsta:"
echo "      - Log into Kinsta dashboard"
echo "      - Users → Your Profile → Application Passwords"
echo "      - Revoke 'vKCBU6YCLacPFSCkQ0VI5tqT'"
echo "      - Create new application password"
echo "      - Update .env.local and Vercel environment variables"
echo ""
echo "   3. Force push to remote (⚠️  requires coordination):"
echo "      git push origin --force --all"
echo "      git push origin --force --tags"
echo ""
echo "   4. Notify team to re-clone:"
echo "      git clone https://github.com/andrewteece/bapi-headless.git"
echo ""
echo "🔒 Backup location: $BACKUP_DIR"
