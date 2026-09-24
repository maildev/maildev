#!/bin/bash
# Publishes the maildev/maildev image to Docker Hub as a multi-arch manifest
# list (linux/amd64 + linux/arm64). Version is resolved from the git tag on
# HEAD — see dockerVersion.sh. Requires push access to maildev/maildev.
#
# Usage: ./scripts/dockerPush.sh [platform]
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

exec "$SCRIPT_DIR/dockerBuild.sh" --push "$@"
