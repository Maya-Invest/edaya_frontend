#!/usr/bin/env bash
# Full browser qualification on an owned disposable unified API.
set -euo pipefail
WEB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export BACKEND_ROOT="${BACKEND_ROOT:-$(dirname "$WEB_ROOT")/edaya_backend}"
export GITHUB_WORKSPACE="$WEB_ROOT"
export EDAYA_CI_API_PORT="${EDAYA_CI_API_PORT:-11999}"
export EDAYA_CI_FILES_PORT="${EDAYA_CI_FILES_PORT:-19200}"
web_port="${EDAYA_CI_WEB_PORT:-14173}"
demo_port="${EDAYA_CI_DEMO_PORT:-14174}"
export EDAYA_CI_WEBAPP_ORIGIN="http://127.0.0.1:$web_port"
export EDAYA_CI_EXTRA_ORIGINS="http://127.0.0.1:$demo_port"
export EDAYA_CI_API_PID_DIR="${EDAYA_CI_API_PID_DIR:-$(mktemp -d "${TMPDIR:-/tmp}/edaya-ci-browsers-XXXXXX")}"
export API_URL="http://127.0.0.1:$EDAYA_CI_API_PORT"
export EDAYA_TEST_API_URL="$API_URL"
export EDAYA_TEST_OTP_FILE="$EDAYA_CI_API_PID_DIR/otp.jsonl"
export EDAYA_TEST_CLOCK_FILE="$EDAYA_CI_API_PID_DIR/clock-offset"
export EDAYA_TEST_POLICY_FILE="$EDAYA_CI_API_PID_DIR/privileged-accounts.json"
export SEED_ENV_FILE="$EDAYA_CI_API_PID_DIR/school.env"
export SEED_API_URL="$API_URL"
export SEED_APP_ORIGIN="$EDAYA_CI_WEBAPP_ORIGIN"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$WEB_ROOT/apps/webapp/.cache/ms-playwright}"
web_pid=''
demo_pid=''
cleanup() {
  for pid in "$web_pid" "$demo_pid"; do
    if [ -n "$pid" ]; then kill "$pid" 2>/dev/null || true; fi
  done
  bash "$WEB_ROOT/.github/scripts/ci-start-local-apis.sh" stop
}
trap cleanup EXIT
# Do not export local capture credentials into later workflow steps.
GITHUB_ENV='' bash "$WEB_ROOT/.github/scripts/ci-start-local-apis.sh" start
cd "$WEB_ROOT/apps/webapp"
bunx playwright install --with-deps chromium
PUBLIC_API_URL="$API_URL" PUBLIC_TEST_OTP_ACCESS=true PUBLIC_APP_ENV=staging bun run build
./node_modules/.bin/wrangler dev --local --port "$web_port" --ip 127.0.0.1 > "$EDAYA_CI_API_PID_DIR/web.log" 2>&1 &
web_pid=$!
bash "$WEB_ROOT/.github/scripts/ci-wait-for-url.sh" "$EDAYA_CI_WEBAPP_ORIGIN/login"
export WEBAPP_URL="$EDAYA_CI_WEBAPP_ORIGIN" WEBAPP_READINESS_PATH=/login
failed=0
run_suite() {
  if "$@"; then return 0; else failed=1; return 0; fi
}
run_suite bun run test:integration:availability
run_suite bun run test:integration:onboarding
run_suite env INTEGRATION_FAIL_ON=not_ok bun run test:integration:provisioned
run_suite bun run test:integration:webadmin
# The development URL picker requires the seeded demo profiles and a dev build.
if (cd "$BACKEND_ROOT" && bun --no-env-file repo seed --skip-profile-photos --skip-attachments); then
  PUBLIC_APP_ENV=development PUBLIC_API_URL="$API_URL" PUBLIC_TEST_OTP_ACCESS=true \
    bun run dev --host 127.0.0.1 --port "$demo_port" --strictPort > "$EDAYA_CI_API_PID_DIR/demo-web.log" 2>&1 &
  demo_pid=$!
  if bash "$WEB_ROOT/.github/scripts/ci-wait-for-url.sh" "http://127.0.0.1:$demo_port/login"; then
    run_suite env WEBAPP_URL="http://127.0.0.1:$demo_port" DEMO_DRY_RUN_OUT_DIR="$WEB_ROOT/apps/webapp/.demo-dry-run" \
      bun test tests/integration/demo-dry-run/demo-dry-run.test.ts
  else failed=1; fi
else failed=1; fi
run_suite env WEBAPP_URL="http://127.0.0.1:$demo_port" bun run test:integration:messaging-ui
run_suite env WEBAPP_URL="http://127.0.0.1:$demo_port" bun run test:integration:family-feedback-ui
run_suite env WEBAPP_URL="http://127.0.0.1:$demo_port" bun run test:integration:permission-profiles
run_suite bun run test:integration:timetable-selection
run_suite bun run test:integration:coverage
exit "$failed"
