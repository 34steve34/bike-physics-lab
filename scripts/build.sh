#!/usr/bin/env bash
set -euo pipefail
mkdir -p dist build
cp web/* dist/
cp LICENSE dist/LICENSE.txt
cp README.md dist/README.txt
SOURCES=(src/lab.c vendor/bikerace-vita/src/engine/body.c vendor/bikerace-vita/src/engine/geom.c vendor/bikerace-vita/src/game/bike.c)
emcc "${SOURCES[@]}" -std=c99 -O2 -ffp-contract=off -fno-fast-math \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,node \
  -sALLOW_MEMORY_GROWTH=1 -sFILESYSTEM=0 -sASSERTIONS=1 \
  -sEXPORTED_FUNCTIONS='["_lab_reset","_lab_step","_lab_get","_lab_board_count","_lab_board_get"]' \
  --no-entry -o dist/core.mjs
STAMP="${GITHUB_SHA:-local}"
sed -i "s/__BUILD__/${STAMP}/g" dist/sw.js
VERSION="$(node -p 'JSON.parse(require("fs").readFileSync("package.json","utf8")).version')"
printf '{"version":"%s","commit":"%s","upstream":"a697be26244cddfb294f147055b7ea0eb5c04fc6"}\n' "$VERSION" "$STAMP" > dist/build.json
touch dist/.nojekyll
cc "${SOURCES[@]}" tests/physics.c -std=c99 -O2 -ffp-contract=off -fno-fast-math -lm -o build/physics-test
./build/physics-test
./build/physics-test --trace > build/native-trace.json
node scripts/verify-wasm.mjs
