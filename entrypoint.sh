#!/usr/bin/env sh

set -e

OPTS=""

if [ "${VERBOSE}" = 1 ]; then
    OPTS="${OPTS} --verbose"
fi

exec "$@ ${OPTS}"
