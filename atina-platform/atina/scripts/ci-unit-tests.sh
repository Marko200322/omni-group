#!/usr/bin/env bash
set -euo pipefail

npx jest --runInBand --forceExit --testPathIgnorePatterns=integration \
  --json --outputFile=jest-results.json || true

node scripts/jest-ci-gate.mjs jest-results.json
