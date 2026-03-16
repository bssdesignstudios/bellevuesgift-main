#!/bin/bash
# =============================================================================
# Supabase Audit Script
# Scans a Lovable AI project and produces a migration audit report
# Usage: ./supabase-audit.sh /path/to/project
# =============================================================================

PROJECT_ROOT="${1:-.}"

if [ ! -d "$PROJECT_ROOT" ]; then
  echo "Error: Directory '$PROJECT_ROOT' does not exist."
  exit 1
fi

echo "# Supabase Migration Audit Report"
echo ""
echo "**Project:** $PROJECT_ROOT"
echo "**Date:** $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# --- Check for Lovable AI fingerprint ---
echo "## 1. Lovable AI Detection"
echo ""
if [ -f "$PROJECT_ROOT/package.json" ]; then
  HAS_SUPABASE=$(grep -c "@supabase/supabase-js" "$PROJECT_ROOT/package.json" 2>/dev/null || echo "0")
  HAS_LOVABLE=$(grep -c "lovable-tagger" "$PROJECT_ROOT/package.json" 2>/dev/null || echo "0")
  if [ "$HAS_SUPABASE" -gt 0 ]; then
    echo "- [x] \`@supabase/supabase-js\` found in package.json"
  else
    echo "- [ ] \`@supabase/supabase-js\` NOT found in package.json"
  fi
  if [ "$HAS_LOVABLE" -gt 0 ]; then
    echo "- [x] \`lovable-tagger\` found (Lovable AI project confirmed)"
  else
    echo "- [ ] \`lovable-tagger\` NOT found"
  fi
else
  echo "- [ ] No package.json found at project root"
fi
echo ""

# --- Supabase Client Files ---
echo "## 2. Supabase Client Files"
echo ""
SUPABASE_DIR=$(find "$PROJECT_ROOT" -path "*/integrations/supabase" -type d 2>/dev/null | head -5)
if [ -n "$SUPABASE_DIR" ]; then
  echo "**Supabase integration directory found:**"
  for dir in $SUPABASE_DIR; do
    echo ""
    echo "\`$dir/\`"
    ls -1 "$dir" 2>/dev/null | while read -r f; do
      echo "- \`$f\`"
    done
  done
else
  echo "No \`integrations/supabase/\` directory found."
fi
echo ""

# --- Supabase Config Directory ---
echo "## 3. Supabase Config & Migrations"
echo ""
if [ -d "$PROJECT_ROOT/supabase" ]; then
  echo "**\`supabase/\` directory found:**"
  echo ""
  if [ -f "$PROJECT_ROOT/supabase/config.toml" ]; then
    echo "- \`config.toml\` (Supabase project config)"
  fi
  if [ -d "$PROJECT_ROOT/supabase/functions" ]; then
    FUNC_COUNT=$(find "$PROJECT_ROOT/supabase/functions" -name "*.ts" -o -name "*.js" 2>/dev/null | wc -l | tr -d ' ')
    echo "- \`functions/\` ($FUNC_COUNT edge function files)"
    find "$PROJECT_ROOT/supabase/functions" -name "*.ts" -o -name "*.js" 2>/dev/null | while read -r f; do
      echo "  - \`$(basename "$(dirname "$f")")/$(basename "$f")\`"
    done
  fi
  if [ -d "$PROJECT_ROOT/supabase/migrations" ]; then
    MIG_COUNT=$(find "$PROJECT_ROOT/supabase/migrations" -name "*.sql" 2>/dev/null | wc -l | tr -d ' ')
    echo "- \`migrations/\` ($MIG_COUNT SQL migration files)"
    find "$PROJECT_ROOT/supabase/migrations" -name "*.sql" 2>/dev/null | sort | while read -r f; do
      echo "  - \`$(basename "$f")\`"
    done
  fi
else
  echo "No \`supabase/\` directory found."
fi
echo ""

# --- Files Importing Supabase ---
echo "## 4. Files Importing Supabase"
echo ""
IMPORT_FILES=$(grep -rl "supabase" "$PROJECT_ROOT/src" "$PROJECT_ROOT/backend/resources" 2>/dev/null | grep -v node_modules | grep -v '.git/' | sort)
IMPORT_COUNT=$(echo "$IMPORT_FILES" | grep -c . 2>/dev/null || echo "0")
echo "**Total files referencing supabase:** $IMPORT_COUNT"
echo ""
if [ "$IMPORT_COUNT" -gt 0 ]; then
  echo "| File | Type |"
  echo "|------|------|"
  echo "$IMPORT_FILES" | while read -r f; do
    REL_PATH="${f#$PROJECT_ROOT/}"
    if echo "$f" | grep -q "context\|Context"; then
      echo "| \`$REL_PATH\` | Auth Context |"
    elif echo "$f" | grep -q "client\|Client"; then
      echo "| \`$REL_PATH\` | Client Config |"
    elif echo "$f" | grep -q "hook\|Hook\|use[A-Z]"; then
      echo "| \`$REL_PATH\` | Hook |"
    elif echo "$f" | grep -q "Page\|page"; then
      echo "| \`$REL_PATH\` | Page Component |"
    else
      echo "| \`$REL_PATH\` | Component |"
    fi
  done
fi
echo ""

# --- Database Tables Referenced ---
echo "## 5. Database Tables Referenced"
echo ""
TABLES=$(grep -roh "\.from(['\"][a-z_]*['\"])" "$PROJECT_ROOT/src" "$PROJECT_ROOT/backend/resources" 2>/dev/null | grep -v node_modules | sed "s/\.from(['\"]//;s/['\"])//" | sort -u)
TABLE_COUNT=$(echo "$TABLES" | grep -c . 2>/dev/null || echo "0")
echo "**Unique tables found:** $TABLE_COUNT"
echo ""
if [ "$TABLE_COUNT" -gt 0 ]; then
  echo "| Table Name | References |"
  echo "|------------|------------|"
  echo "$TABLES" | while read -r table; do
    if [ -n "$table" ]; then
      REF_COUNT=$(grep -rl "from(['\"]$table['\"])" "$PROJECT_ROOT/src" "$PROJECT_ROOT/backend/resources" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
      echo "| \`$table\` | $REF_COUNT files |"
    fi
  done
fi
echo ""

# --- Auth Patterns ---
echo "## 6. Auth Patterns Found"
echo ""
AUTH_PATTERNS=("getSession" "signInWithPassword" "signUp" "signOut" "onAuthStateChange" "getUser" "signInWithOAuth")
for pattern in "${AUTH_PATTERNS[@]}"; do
  COUNT=$(grep -rl "$pattern" "$PROJECT_ROOT/src" "$PROJECT_ROOT/backend/resources" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
  if [ "$COUNT" -gt 0 ]; then
    echo "- \`supabase.auth.$pattern()\` — found in **$COUNT** files"
  fi
done
echo ""

# --- Environment Variables ---
echo "## 7. Environment Variables"
echo ""
ENV_FILES=$(find "$PROJECT_ROOT" -maxdepth 2 -name ".env*" -not -path "*node_modules*" -not -path "*.git*" 2>/dev/null)
if [ -n "$ENV_FILES" ]; then
  echo "$ENV_FILES" | while read -r envfile; do
    SUPABASE_VARS=$(grep -i "supabase" "$envfile" 2>/dev/null)
    if [ -n "$SUPABASE_VARS" ]; then
      echo "**\`$(basename "$envfile")\`:**"
      echo "\`\`\`"
      echo "$SUPABASE_VARS"
      echo "\`\`\`"
      echo ""
    fi
  done
else
  echo "No .env files found."
fi
echo ""

# --- Summary ---
echo "## 8. Migration Summary"
echo ""
echo "| Metric | Count |"
echo "|--------|-------|"
echo "| Files referencing Supabase | $IMPORT_COUNT |"
echo "| Database tables found | $TABLE_COUNT |"
echo "| Supabase migration files | ${MIG_COUNT:-0} |"
echo "| Edge functions | ${FUNC_COUNT:-0} |"
echo ""
echo "---"
echo ""
echo "*Generated by supabase-audit.sh*"
