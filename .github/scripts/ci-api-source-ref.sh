#!/usr/bin/env bash
# Map the web head branch to the Identity + school git ref.
# staging → staging, main/master → main, anything else → dev
set -euo pipefail

WEB_REF="${1:?usage: ci-api-source-ref.sh <web-head-ref>}"
WEB_REF="${WEB_REF#refs/heads/}"

case "$WEB_REF" in
	staging)
		echo staging
		;;
	main | master)
		echo main
		;;
	*)
		echo dev
		;;
esac
