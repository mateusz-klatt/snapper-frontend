#!/usr/bin/env bash
#
# Regenerate TypeScript types from a running Snapper backend.
#
# Usage: ./scripts/gen-from-backend.sh
#        BACKEND_URL=http://localhost:8000 ./scripts/gen-from-backend.sh
#        WS_SCHEMAS_PATH=/path/to/ws-schemas.json ./scripts/gen-from-backend.sh
#
# Requires: a Snapper backend exposing /openapi.json. The WebSocket schema file
# is exported by the backend's `make ui-gen-ws-types` target — point at it via
# WS_SCHEMAS_PATH or copy it into ./build/ws-schemas.json before running.

set -euo pipefail

BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
BUILD_DIR="$(cd "$(dirname "$0")/.." && pwd)/build"
mkdir -p "$BUILD_DIR"

echo "==> Fetching OpenAPI spec from $BACKEND_URL/openapi.json"
curl -fsS "$BACKEND_URL/openapi.json" -o "$BUILD_DIR/openapi.json"

echo "==> Generating src/types/api.generated.ts"
pnpm gen:api-types

if [[ -n "${WS_SCHEMAS_PATH:-}" ]]; then
    echo "==> Copying WebSocket schemas from $WS_SCHEMAS_PATH"
    cp "$WS_SCHEMAS_PATH" "$BUILD_DIR/ws-schemas.json"
fi

if [[ -f "$BUILD_DIR/ws-schemas.json" ]]; then
    echo "==> Generating src/types/ws.generated.ts"
    pnpm gen:ws-types
else
    echo "==> Skipping ws-types: $BUILD_DIR/ws-schemas.json not found"
    echo "    Set WS_SCHEMAS_PATH or run the backend's ws-schema export first."
fi

echo "==> Done."
