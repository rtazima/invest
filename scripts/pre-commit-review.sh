#!/bin/bash
# Hook: automated code review before every commit
# Exit 0 = allow, Exit 2 = block (MUST FIX found)
#
# Triggered by .claude/hooks.json PreToolUse on "git commit"
# This is a TEMPLATE — customize the [SPEC] sections for your project.
#
# Review levels (set via REVIEW_LEVEL env var or bootstrap):
#   simple = bash checks only (grep, compile, tests) — fast, free
#   hybrid = bash + Sonnet AI review (warnings only) — balanced
#   deep   = bash + Opus AI review (warnings only) — thorough
#
# Philosophy: agents and skills are for on-demand tasks.
# Hooks are for guarantees that must never fail.

set -euo pipefail

# ─── Review Level ───────────────────────────────────────────
REVIEW_LEVEL="${REVIEW_LEVEL:-hybrid}"   # [SPEC] Set by bootstrap: simple | hybrid | deep

# ─── Configuration ──────────────────────────────────────────
# [SPEC] Adjust for your stack
LANG_EXTENSIONS="ts"                    # [SPEC] File extensions to review (e.g., "ts", "py", "go", "rs")
SOURCE_DIR="src"                        # [SPEC] Source directory (e.g., "src", "app", "lib")
TEST_DIR="src/__tests__"                # [SPEC] Test directory
TEST_SUFFIX=".test.ts"                  # [SPEC] Test file suffix (e.g., ".test.ts", "_test.py", "_test.go")
COMPILE_CMD="npx tsc --noEmit"          # [SPEC] Compile/type-check command (e.g., "npx tsc --noEmit", "go vet ./...", "cargo check")
TEST_CMD="npm test -- --passWithNoTests" # [SPEC] Test command (leave empty to skip)
LINT_CMD=""                             # [SPEC] Lint command (leave empty to skip — already covered by PostToolUse hook)

# ─── Detect staged source files ─────────────────────────────
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR -- "*.$LANG_EXTENSIONS" | grep "^${SOURCE_DIR}/" | grep -v '__tests__\|test_\|_test\.\|\.test\.\|\.spec\.' || true)

if [ -z "$STAGED_FILES" ]; then
  echo "✅ No source files staged — skipping review"
  exit 0
fi

FILE_COUNT=$(echo "$STAGED_FILES" | wc -l | tr -d ' ')
echo "🔍 Code Review: checking $FILE_COUNT file(s)..."
echo ""

MUST_FIX=0
SHOULD_FIX=0
WARNINGS=""

# ═══════════════════════════════════════════════════════════
# UNIVERSAL CHECKS (apply to any project)
# ═══════════════════════════════════════════════════════════

# ─── 1. Compilation / Type check ────────────────────────────
if [ -n "$COMPILE_CMD" ]; then
  echo "── Compilation ──"
  COMPILE_OUTPUT=$($COMPILE_CMD 2>&1) || true
  COMPILE_EXIT=$?
  if [ $COMPILE_EXIT -ne 0 ]; then
    echo "❌ MUST FIX: Compilation errors"
    echo "$COMPILE_OUTPUT" | head -20
    MUST_FIX=$((MUST_FIX + 1))
  else
    echo "✅ Compilation OK"
  fi
fi

# ─── 2. Tests passing ──────────────────────────────────────
if [ -n "$TEST_CMD" ]; then
  echo ""
  echo "── Tests ──"
  TEST_OUTPUT=$($TEST_CMD 2>&1) || true
  TEST_EXIT=$?
  if [ $TEST_EXIT -ne 0 ]; then
    echo "❌ MUST FIX: Tests failing"
    echo "$TEST_OUTPUT" | tail -15
    MUST_FIX=$((MUST_FIX + 1))
  else
    echo "✅ Tests passing"
  fi
fi

# ─── 3. Security: no hardcoded secrets ──────────────────────
echo ""
echo "── Security ──"
SECRET_PATTERNS='(API_KEY|api_key|apiKey|SECRET|secret|PASSWORD|password|TOKEN|token|PRIVATE_KEY)\s*[:=]\s*["\x27][A-Za-z0-9]'
SECRETS_FOUND=""
for f in $STAGED_FILES; do
  MATCH=$(grep -nEi "$SECRET_PATTERNS" "$f" 2>/dev/null | grep -v 'process\.env\|os\.environ\|os\.Getenv\|env::var\|config\.\|Config\.\|\.env\|example\|placeholder\|TODO\|SPEC' || true)
  if [ -n "$MATCH" ]; then
    SECRETS_FOUND="$SECRETS_FOUND\n  $f: $MATCH"
  fi
done

if [ -n "$SECRETS_FOUND" ]; then
  echo "❌ MUST FIX: Possible hardcoded secrets"
  echo -e "$SECRETS_FOUND"
  MUST_FIX=$((MUST_FIX + 1))
else
  echo "✅ No hardcoded secrets"
fi

# ─── 4. Quality: language-specific checks ───────────────────
echo ""
echo "── Quality ──"
for f in $STAGED_FILES; do
  # [SPEC] TypeScript/JavaScript checks — remove or replace for your stack
  case "$LANG_EXTENSIONS" in
    ts|tsx|js|jsx)
      # console.log — should use structured logger
      CONSOLE=$(grep -n 'console\.log\|console\.error\|console\.warn' "$f" 2>/dev/null || true)
      if [ -n "$CONSOLE" ]; then
        WARNINGS="$WARNINGS\n  SHOULD FIX [$f]: Use logger instead of console.log"
        SHOULD_FIX=$((SHOULD_FIX + 1))
      fi

      # @ts-ignore / @ts-nocheck
      TS_IGNORE=$(grep -n '@ts-ignore\|@ts-nocheck' "$f" 2>/dev/null || true)
      if [ -n "$TS_IGNORE" ]; then
        WARNINGS="$WARNINGS\n  SHOULD FIX [$f]: Remove @ts-ignore/@ts-nocheck"
        SHOULD_FIX=$((SHOULD_FIX + 1))
      fi

      # Explicit 'any' type
      ANY_TYPE=$(grep -nE ':\s*any\b|<any>' "$f" 2>/dev/null || true)
      if [ -n "$ANY_TYPE" ]; then
        WARNINGS="$WARNINGS\n  SHOULD FIX [$f]: Avoid 'any' type — use specific types"
        SHOULD_FIX=$((SHOULD_FIX + 1))
      fi
      ;;

    # [SPEC] Python checks — uncomment if using Python
    # py)
    #   # print() — should use logging
    #   PRINT=$(grep -n '^[^#]*\bprint(' "$f" 2>/dev/null || true)
    #   if [ -n "$PRINT" ]; then
    #     WARNINGS="$WARNINGS\n  SHOULD FIX [$f]: Use logging instead of print()"
    #     SHOULD_FIX=$((SHOULD_FIX + 1))
    #   fi
    #
    #   # type: ignore
    #   TYPE_IGNORE=$(grep -n 'type:\s*ignore' "$f" 2>/dev/null || true)
    #   if [ -n "$TYPE_IGNORE" ]; then
    #     WARNINGS="$WARNINGS\n  SHOULD FIX [$f]: Remove type: ignore"
    #     SHOULD_FIX=$((SHOULD_FIX + 1))
    #   fi
    #   ;;

    # [SPEC] Go checks — uncomment if using Go
    # go)
    #   # fmt.Println — should use structured logging
    #   FMT_PRINT=$(grep -n 'fmt\.Print' "$f" 2>/dev/null || true)
    #   if [ -n "$FMT_PRINT" ]; then
    #     WARNINGS="$WARNINGS\n  SHOULD FIX [$f]: Use structured logger instead of fmt.Print*"
    #     SHOULD_FIX=$((SHOULD_FIX + 1))
    #   fi
    #   ;;
  esac
done

if [ $SHOULD_FIX -eq 0 ]; then
  echo "✅ Quality checks passed"
else
  echo "⚠️  $SHOULD_FIX quality warning(s) found"
  echo -e "$WARNINGS"
fi

# ─── 5. Error handling: external calls need try/catch ───────
echo ""
echo "── Error Handling ──"
ERR_ISSUES=""
for f in $STAGED_FILES; do
  case "$LANG_EXTENSIONS" in
    ts|tsx|js|jsx)
      HAS_FETCH=$(grep -c 'await fetch\|await axios\|\.fromUrl(' "$f" 2>/dev/null || true)
      HAS_CATCH=$(grep -c 'catch\s*(' "$f" 2>/dev/null || true)
      ;;
    py)
      HAS_FETCH=$(grep -c 'requests\.\|httpx\.\|aiohttp\.\|urllib' "$f" 2>/dev/null || true)
      HAS_CATCH=$(grep -c 'except\s' "$f" 2>/dev/null || true)
      ;;
    go)
      HAS_FETCH=$(grep -c 'http\.Get\|http\.Post\|http\.Do' "$f" 2>/dev/null || true)
      HAS_CATCH=$(grep -c 'if err != nil' "$f" 2>/dev/null || true)
      ;;
    *)
      HAS_FETCH=0
      HAS_CATCH=0
      ;;
  esac

  if [ "$HAS_FETCH" -gt 0 ] && [ "$HAS_CATCH" -eq 0 ]; then
    ERR_ISSUES="$ERR_ISSUES\n  SHOULD FIX [$f]: External calls without error handling"
    SHOULD_FIX=$((SHOULD_FIX + 1))
  fi
done

if [ -z "$ERR_ISSUES" ]; then
  echo "✅ Error handling OK"
else
  echo -e "$ERR_ISSUES"
fi

# ─── 6. Test coverage gap ──────────────────────────────────
echo ""
echo "── Test Coverage ──"
UNTESTED=""
for f in $STAGED_FILES; do
  BASENAME=$(basename "$f" ".$LANG_EXTENSIONS")
  TEST_FILE="${TEST_DIR}/${BASENAME}${TEST_SUFFIX}"
  if [ ! -f "$TEST_FILE" ]; then
    UNTESTED="$UNTESTED\n  CONSIDER [$f]: No test file at $TEST_FILE"
  fi
done

if [ -z "$UNTESTED" ]; then
  echo "✅ All changed files have tests"
else
  echo "ℹ️  Missing test files (consider adding):"
  echo -e "$UNTESTED"
fi

# ─── 7. Scope discipline: "Não alterou" ──────────────────────
echo ""
echo "── Scope ──"
echo "ℹ️  CONSIDER: Inclua 'Não alterou:' no commit message listando arquivos/módulos NÃO alterados intencionalmente"
echo "   Isso ajuda revisores a entender o escopo pretendido da mudança."

# ═══════════════════════════════════════════════════════════
# PROJECT-SPECIFIC CHECKS
# [SPEC] Add checks specific to your project below.
# These are the checks that catch YOUR bugs, not generic ones.
# ═══════════════════════════════════════════════════════════

# Example: block direct price calculations with coupons (learned from real bug)
# echo ""
# echo "── Business Logic ──"
# for f in $STAGED_FILES; do
#   PRICE_CALC=$(grep -n 'deal\.price.*coupon\.value\|fica R\$.*coupon' "$f" 2>/dev/null || true)
#   if [ -n "$PRICE_CALC" ]; then
#     echo "❌ MUST FIX [$f]: Direct price calculation with coupon — coupons may have hidden caps"
#     MUST_FIX=$((MUST_FIX + 1))
#   fi
# done

# Example: detect fetch without redirect control
# for f in $STAGED_FILES; do
#   FETCH_NO_REDIRECT=$(grep -n 'fetch(' "$f" 2>/dev/null | grep -v 'redirect' || true)
#   if [ -n "$FETCH_NO_REDIRECT" ]; then
#     echo "⚠️  SHOULD FIX [$f]: fetch() without explicit redirect policy"
#     SHOULD_FIX=$((SHOULD_FIX + 1))
#   fi
# done

# ═══════════════════════════════════════════════════════════
# AI REVIEW (hybrid/deep mode only)
# ═══════════════════════════════════════════════════════════
if [ "$REVIEW_LEVEL" = "hybrid" ] || [ "$REVIEW_LEVEL" = "deep" ]; then
  echo ""
  echo "── AI Review ($(echo $REVIEW_LEVEL | tr '[:lower:]' '[:upper:]')) ──"

  if [ "$REVIEW_LEVEL" = "deep" ]; then
    export AI_REVIEW_MODEL="opus"
    export AI_REVIEW_MAX_TOKENS=800
  else
    export AI_REVIEW_MODEL="sonnet"
    export AI_REVIEW_MAX_TOKENS=500
  fi

  if [ -f "scripts/ai-review.sh" ]; then
    AI_OUTPUT=$(bash scripts/ai-review.sh 2>&1) || true
    if [ -n "$AI_OUTPUT" ]; then
      echo "$AI_OUTPUT"
      # Count AI warnings (don't block, just count)
      AI_WARNINGS=$(echo "$AI_OUTPUT" | grep -c '⚠️\|SHOULD FIX' || true)
      if [ "$AI_WARNINGS" -gt 0 ]; then
        SHOULD_FIX=$((SHOULD_FIX + AI_WARNINGS))
      fi
    fi
  else
    echo "⚠️  scripts/ai-review.sh not found — skipping AI review"
  fi
fi

# ─── Summary ────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $MUST_FIX -gt 0 ]; then
  echo "🚫 BLOCKED: $MUST_FIX MUST FIX issue(s) found"
  echo "   Fix the issues above before committing."
  exit 2
elif [ $SHOULD_FIX -gt 0 ]; then
  echo "⚠️  PASSED with $SHOULD_FIX warning(s) [mode: $REVIEW_LEVEL]"
  echo "   Consider fixing before deploying."
  exit 0
else
  echo "✅ All checks passed! [mode: $REVIEW_LEVEL]"
  exit 0
fi
