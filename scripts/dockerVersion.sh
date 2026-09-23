#!/bin/bash
# Resolves the Docker image version from git rather than package.json, which
# can be stale locally (it is only bumped when `changeset version` runs).
#
# Resolution order:
#   1. A `maildev@X.Y.Z` tag (created by `changeset publish`) pointing at HEAD
#   2. Any other tag pointing at HEAD (e.g. the legacy `vX.Y.Z` format)
# The tag prefix is stripped, so `maildev@3.0.0` becomes `3.0.0`.
# Exits non-zero when HEAD is untagged, so images are never built or pushed
# with a stale or unknown version.
set -euo pipefail

TAG=$(git tag --list 'maildev@*' --points-at HEAD | head -n1 || true)

if [[ -z $TAG ]]; then
  TAG=$(git describe --tags --exact-match HEAD 2>/dev/null || true)
fi

if [[ -z $TAG ]]; then
  {
    echo "Error: HEAD is not tagged, so the Docker image version cannot be resolved."
    echo "Tag the current commit (e.g. git tag maildev@1.2.3) or publish via"
    echo "changesets (pnpm release), which tags automatically."
  } >&2
  exit 1
fi

# Strip the changesets package prefix (maildev@3.0.0, @maildev/ui@3.0.0) or a
# legacy 'v' prefix (v2.0.5).
VERSION="${TAG##*@}"
VERSION="${VERSION#v}"

# Docker tags must match [A-Za-z0-9][A-Za-z0-9._-]* (max 128 chars).
if ! [[ $VERSION =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]]; then
  echo "Error: resolved version '$VERSION' (from tag '$TAG') is not a valid Docker tag." >&2
  exit 1
fi

echo "$VERSION"
