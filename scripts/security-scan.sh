#!/usr/bin/env bash
# ─── SurePath Automated Security Scanner ──────────────────────────────────────
# Runs on schedule (cron) to detect security regressions.
# Scans: code patterns, dependency vulnerabilities, config drift.
#
# Install cron (runs daily at 3am):
#   crontab -e
#   0 3 * * * /home/z/my-project/surepath/scripts/security-scan.sh >> /home/z/my-project/surepath/logs/security-scan.log 2>&1

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

REPORT_DIR="logs/security-reports"
mkdir -p "$REPORT_DIR" logs
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT="$REPORT_DIR/scan_$TIMESTAMP.md"

echo "# Security Scan Report — $(date)" > "$REPORT"
echo "" >> "$REPORT"

# ─── 1. Static Security Pattern Scan ─────────────────────────────────────────
echo "## 1. Static Code Patterns" >> "$REPORT"
echo "" >> "$REPORT"

# Check for dangerous patterns
check_pattern() {
  local name="$1"
  local pattern="$2"
  local files="${3:-components/ services/ src/ supabase/}"
  local count=$(grep -rn "$pattern" $files 2>/dev/null | grep -v node_modules | grep -v ".test." | wc -l)
  if [ "$count" -gt 0 ]; then
    echo "- ⚠️ **$name**: $count occurrences" >> "$REPORT"
    grep -rn "$pattern" $files 2>/dev/null | grep -v node_modules | grep -v ".test." | head -5 >> "$REPORT"
    echo "" >> "$REPORT"
  else
    echo "- ✅ **$name**: 0 occurrences" >> "$REPORT"
  fi
}

check_pattern "eval() usage" 'eval('
check_pattern "dangerouslySetInnerHTML" 'dangerouslySetInnerHTML'
check_pattern "localStorage with token/PII" "localStorage.*\(token\|password\|ktp\|bank\|account_number\)"
check_pattern "window.confirm/alert/prompt" 'window\.\(confirm\|alert\|prompt\)'
check_pattern "SQL injection risk (string concat in .rpc)" '\.rpc(.*\$'
check_pattern "HTTP without HTTPS" 'http://[^/]*[^s]$'
check_pattern "Hardcoded secrets" '\(password\|secret\|api_key\)\s*[:=]\s*["\x27][^"\x27]\{8,\}'
check_pattern "CORS wildcard" "Access-Control-Allow-Origin.*\*"
check_pattern "console.log with sensitive data" "console\.log.*\(token\|password\|ktp\|secret\)"

echo "" >> "$REPORT"

# ─── 2. Dependency Vulnerability Scan ────────────────────────────────────────
echo "## 2. Dependency Vulnerabilities" >> "$REPORT"
echo "" >> "$REPORT"

if command -v npm &> /dev/null; then
  AUDIT_OUTPUT=$(npm audit --json 2>/dev/null || true)
  HIGH_COUNT=$(echo "$AUDIT_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('vulnerabilities',{})))" 2>/dev/null || echo "0")
  if [ "$HIGH_COUNT" -gt 0 ]; then
    echo "- ⚠️ **$HIGH_COUNT vulnerabilities** found in npm dependencies" >> "$REPORT"
    npm audit 2>/dev/null | head -30 >> "$REPORT" || true
  else
    echo "- ✅ No npm vulnerabilities" >> "$REPORT"
  fi
fi
echo "" >> "$REPORT"

# ─── 3. TypeScript Type Safety ───────────────────────────────────────────────
echo "## 3. TypeScript Type Safety" >> "$REPORT"
echo "" >> "$REPORT"

TS_ERRORS=$(npx tsc --noEmit --skipLibCheck 2>&1 | grep "error TS" | wc -l | tr -d " ")
if [ "$TS_ERRORS" -gt 0 ]; then
  echo "- ⚠️ **$TS_ERRORS TypeScript errors**" >> "$REPORT"
  npx tsc --noEmit --skipLibCheck 2>&1 | head -10 >> "$REPORT"
else
  echo "- ✅ 0 TypeScript errors" >> "$REPORT"
fi

ANY_COUNT=$(grep -rn ": any\b\|as any\b" components/ services/ src/ 2>/dev/null | grep -v node_modules | grep -v ".test." | wc -l)
echo "- ℹ️ **$ANY_COUNT** \`any\` type usages (target: <50)" >> "$REPORT"
echo "" >> "$REPORT"

# ─── 4. Gateway Security Checks ──────────────────────────────────────────────
echo "## 4. Gateway Action Security" >> "$REPORT"
echo "" >> "$REPORT"

# Check all admin actions have auth guard
GATEWAY_DIR="supabase/functions/data-gateway/actions"
if [ -d "$GATEWAY_DIR" ]; then
  for f in "$GATEWAY_DIR"/*.ts; do
    ACTIONS=$(grep -o "case '[^']*'" "$f" | sed "s/case '//;s/'//")
    for action in $ACTIONS; do
      if ! grep -A5 "case '$action'" "$f" | head -5 | grep -q "caller\.\(isAdmin\|spUser\|authId\|isFinanceAdmin\)"; then
        # Check if it's a PUBLIC_ACTION
        if ! grep -q "'$action'" supabase/functions/data-gateway/index.ts 2>/dev/null | grep -q PUBLIC; then
          echo "- ⚠️ Action \`$action\` in $(basename $f) may be missing auth guard" >> "$REPORT"
        fi
      fi
    done
  done
fi
echo "- ✅ Gateway scan complete" >> "$REPORT"
echo "" >> "$REPORT"

# ─── 5. Build Verification ───────────────────────────────────────────────────
echo "## 5. Build Verification" >> "$REPORT"
echo "" >> "$REPORT"

BUILD_OUTPUT=$(npm run build 2>&1 || true)
if echo "$BUILD_OUTPUT" | grep -q "built in"; then
  BUILD_TIME=$(echo "$BUILD_OUTPUT" | grep "built in" | sed 's/.*built in //;s/s//')
  BUNDLE_SIZE=$(du -sh dist/assets/ 2>/dev/null | cut -f1)
  echo "- ✅ Build succeeded in ${BUILD_TIME}s" >> "$REPORT"
  echo "- ℹ️ Bundle size: $BUNDLE_SIZE" >> "$REPORT"
else
  echo "- ❌ Build FAILED" >> "$REPORT"
  echo '```' >> "$REPORT"
  echo "$BUILD_OUTPUT" | tail -20 >> "$REPORT"
  echo '```' >> "$REPORT"
fi
echo "" >> "$REPORT"

# ─── 6. RLS Policy Check ─────────────────────────────────────────────────────
echo "## 6. RLS Policy Audit" >> "$REPORT"
echo "" >> "$REPORT"

RLS_TABLES=$(grep -rn "ENABLE ROW LEVEL SECURITY\|CREATE POLICY" supabase/migrations/ 2>/dev/null | wc -l)
echo "- ℹ️ $RLS_TABLES RLS policies defined in migrations" >> "$REPORT"

# Check for tables without RLS
NO_RLS=$(grep -rn "CREATE TABLE" supabase/migrations/ 2>/dev/null | while read line; do
  TABLE=$(echo "$line" | sed 's/.*CREATE TABLE[^"]*"\([^"]*\)".*/\1/' | sed 's/.*CREATE TABLE[^ ]* //')
  if [ -n "$TABLE" ] && ! grep -q "ENABLE ROW LEVEL SECURITY.*$TABLE\|CREATE POLICY.*$TABLE" supabase/migrations/ 2>/dev/null; then
    echo "$TABLE"
  fi
done | wc -l)
echo "- ⚠️ $NO_RLS tables may be missing RLS (verify manually)" >> "$REPORT"
echo "" >> "$REPORT"

# ─── 7. Summary ──────────────────────────────────────────────────────────────
echo "## Summary" >> "$REPORT"
echo "" >> "$REPORT"
WARNINGS=$(grep -c "⚠️" "$REPORT" 2>/dev/null || echo "0")
PASSED=$(grep -c "✅" "$REPORT" 2>/dev/null || echo "0")
FAILED=$(grep -c "❌" "$REPORT" 2>/dev/null || echo "0")
echo "- **Passed**: $PASSED" >> "$REPORT"
echo "- **Warnings**: $WARNINGS" >> "$REPORT"
echo "- **Failed**: $FAILED" >> "$REPORT"
echo "" >> "$REPORT"
echo "Scan completed at $(date)" >> "$REPORT"

# Output to console
cat "$REPORT"
echo ""
echo "Report saved to: $REPORT"
