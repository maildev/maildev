#!/bin/bash
# Requires:
#   jq (https://stedolan.github.io/jq/)
set -euo pipefail

# Build cross platform by default
DEFAULT_PLATFORM="linux/amd64,linux/arm64"
PLATFORM="${1:-$DEFAULT_PLATFORM}"

# The published version lives in the CLI package (the root is a private,
# unversioned monorepo).
VERSION=$(jq -r .version packages/cli/package.json)

CMD="docker buildx build --push --platform $PLATFORM -t maildev/maildev:$VERSION -t maildev/maildev:latest ."

echo "Running $CMD..."

$CMD
