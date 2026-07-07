#!/usr/bin/env bash
set -euo pipefail

ACTION="${1:?usage: ci-api-dev-container.sh {start|stop}}"
BASE_REF="${2:-staging}"

OWNER="$(echo "${GITHUB_REPOSITORY_OWNER:-maya-invest}" | tr '[:upper:]' '[:lower:]')"
CONTAINER_NAME="${EDAYA_API_DEV_CONTAINER:-edaya-api-dev}"

case "$BASE_REF" in
  main|master) CHANNEL=production ;;
  *) CHANNEL=staging ;;
esac

IMAGE="${EDAYA_API_DEV_IMAGE:-ghcr.io/${OWNER}/edaya-api-dev:${CHANNEL}}"

case "$ACTION" in
  start)
    docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
    docker pull "$IMAGE"
    docker run \
      --name "$CONTAINER_NAME" \
      --detach \
      --rm \
      --publish 127.0.0.1:9999:9999 \
      --publish 127.0.0.1:9200:9200 \
      --memory 4g \
      "$IMAGE"
    bash .github/scripts/ci-wait-for-url.sh http://127.0.0.1:9999/reference 120
    ;;
  stop)
    docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
    ;;
  *)
    echo "Unknown action: $ACTION" >&2
    exit 1
    ;;
esac
