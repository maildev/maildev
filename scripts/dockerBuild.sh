#!/bin/bash
# Requires:
#   jq (https://stedolan.github.io/jq/)

# Build cross platform by default
DEFAULT_PLATFORM="linux/amd64,linux/arm64"
PLATFORM="${1:-$DEFAULT_PLATFORM}"

VERSION=`npm version --json | jq -r .maildev`

CMD="docker buildx build --load --platform $PLATFORM -t maildev/maildev:$VERSION -t maildev/maildev:latest ."

echo "Running $CMD..."

$CMD