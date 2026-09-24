#!/bin/bash
# Builds the maildev/maildev image.
#
# Usage: ./scripts/dockerBuild.sh [--push] [platform]
#
#   --push      Build and push the multi-arch manifest list straight to Docker
#               Hub, with provenance and SBOM attestations. Without it, the
#               image is loaded into the local Docker daemon.
#   platform    Defaults to linux/amd64,linux/arm64. Loading a multi-platform
#               build requires the containerd image store (default on recent
#               Docker Desktop); pass a single platform (e.g. linux/arm64) to
#               build locally on older setups.
#
# Requires docker with buildx. Multi-platform builds use a docker-container
# driver builder (created below if missing); Linux hosts additionally need
# qemu-user-static for cross-arch emulation — Docker Desktop ships with it.
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# The published version comes from the git tag on HEAD (see dockerVersion.sh).
VERSION=$("$SCRIPT_DIR/dockerVersion.sh")

IMAGE="maildev/maildev"
BUILDER="multiarch"
DEFAULT_PLATFORM="linux/amd64,linux/arm64"

PUSH=false
PLATFORM="$DEFAULT_PLATFORM"
for arg in "$@"; do
  case "$arg" in
    --push) PUSH=true ;;
    *) PLATFORM="$arg" ;;
  esac
done

# Multi-platform builds need the docker-container driver, not the default
# docker driver. Creating it is a no-op when it already exists.
if ! docker buildx inspect "$BUILDER" >/dev/null 2>&1; then
  docker buildx create --name "$BUILDER" --driver docker-container >/dev/null
fi

ARGS=(
  --builder "$BUILDER"
  --platform "$PLATFORM"
  --tag "$IMAGE:$VERSION"
  --tag "$IMAGE:latest"
)

if [[ $PUSH == true ]]; then
  # The registry is the merge point for multi-arch images, so a single
  # buildx --push command publishes the manifest list; no separate
  # `docker push` step. Inline caching lets later builds (and other
  # machines) reuse layers from the previously pushed image.
  docker buildx build "${ARGS[@]}" \
    --provenance=mode=max \
    --sbom=true \
    --cache-from "type=registry,ref=$IMAGE:latest" \
    --cache-to type=inline \
    --push .
else
  docker buildx build "${ARGS[@]}" --load .
fi
