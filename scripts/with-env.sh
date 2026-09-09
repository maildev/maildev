#!/usr/bin/env bash
#
# Loads .env and runs the given command with those variables exported.
# Fails loudly if .env is missing or GITHUB_TOKEN is not set, so the release
# flow never silently produces a broken changelog.
#
# @changesets/changelog-github calls the GitHub API during `changeset version`
# to resolve PR numbers and author handles; it hard-requires GITHUB_TOKEN.
#
# Usage: ./scripts/with-env.sh <command> [args...]
set -euo pipefail

if [ ! -f .env ]; then
  echo "ERROR: .env not found." >&2
  echo "Create it in the repo root with a GitHub token (read access is enough):" >&2
  echo "  GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx" >&2
  echo "It is required by @changesets/changelog-github during 'changeset version'." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env
set +a

: "${GITHUB_TOKEN:?GITHUB_TOKEN is not set in .env}"

exec "$@"
