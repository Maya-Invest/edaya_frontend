#!/usr/bin/env bash
set -euo pipefail

# Only ephemeral GitHub-hosted Linux runners may remove preinstalled SDKs.
if [[ ${GITHUB_ACTIONS:-} != true || ${RUNNER_OS:-} != Linux || ${RUNNER_KIND:-} != github-hosted ]]; then
  echo 'Integration disk preparation requires a GitHub-hosted Linux runner.' >&2
  exit 1
fi
: "${GITHUB_WORKSPACE:?Missing workspace}"
: "${RUNNER_TEMP:?Missing runner temp directory}"
mkdir -p "$GITHUB_WORKSPACE/.ci-evidence"
report="$GITHUB_WORKSPACE/.ci-evidence/disk-usage.txt"

case "${1:-}" in
  prepare)
    df -h "$GITHUB_WORKSPACE" "$RUNNER_TEMP" | tee "$report"
    # Neither frontend nor backend integration uses Android or .NET.
    sudo rm -rf -- /usr/local/lib/android /usr/share/dotnet
    df -h "$GITHUB_WORKSPACE" "$RUNNER_TEMP" | tee -a "$report"
    available=$(df -Pk "$GITHUB_WORKSPACE" | awk 'END {print $4}')
    if [[ ! $available =~ ^[0-9]+$ ]] || (( available < 12 * 1024 * 1024 )); then
      echo 'Integration requires at least 12 GiB free before dependency installation.' | tee -a "$report" >&2
      exit 1
    fi
    ;;
  report)
    df -h "$GITHUB_WORKSPACE" "$RUNNER_TEMP" | tee -a "$report"
    # Directory totals only: never print fixture files, credentials or contents.
    du -sh "$GITHUB_WORKSPACE/node_modules" "$GITHUB_WORKSPACE/.ci/edaya_backend" \
      "$GITHUB_WORKSPACE/apps/webapp/.svelte-kit" "$GITHUB_WORKSPACE/apps/webapp/build" \
      "$GITHUB_WORKSPACE/apps/webapp/.cache" "$RUNNER_TEMP" /tmp \
      2>/dev/null | tee -a "$report" || true
    ;;
  *) echo 'Expected prepare or report' >&2; exit 1 ;;
esac
