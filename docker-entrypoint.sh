#!/bin/sh
set -eu

if [ "${PRODUCTION_DEPLOYMENT:-false}" = "true" ]; then
  node scripts/production-check.mjs
fi

./node_modules/prisma/build/index.js migrate deploy
exec node .output/server/index.mjs
