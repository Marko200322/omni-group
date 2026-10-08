#!/bin/bash
set -euo pipefail
WEB="${WEB:-http://127.0.0.1:3010}"
EMAIL="$1"
PASS="$2"
OUT="/tmp/anti-fake-thousand-20261008"
mkdir -p "$OUT"
COOKIE="$OUT/cookies.txt"
rm -f "$COOKIE"

login=$(curl -sS -m 60 -c "$COOKIE" -b "$COOKIE" -X POST "$WEB/api/auth/login" \
  -H 'Content-Type: application/json' -H "Origin: $WEB" -H "Referer: $WEB/" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
echo "$login" | head -c 200; echo
csrf=$(grep -E 'og_csrf' "$COOKIE" | awk '{print $NF}' | tail -1)
echo "csrf_len=${#csrf}"

SKUS=(
  "landing__healthcare"
  "landing__construction"
  "audit__healthcare"
  "audit__construction"
  "setup-quick__legal"
  "sales-enablement__fitness"
  "workflow-design__agriculture"
  "integration__hospitality"
  "website-business__retail"
  "vertical-package__education_training"
  "lead-gen-retainer__logistics"
  "bundle-ops-clarity__finance"
)

RESULTS="$OUT/results.jsonl"
: > "$RESULTS"

for sku in "${SKUS[@]}"; do
  echo "=== FULFILL $sku ==="
  body=$(printf '{"deliverableId":"%s","paymentProvider":"manual"}' "$sku")
  co=$(curl -sS -m 90 -c "$COOKIE" -b "$COOKIE" -X POST "$WEB/api/atina/payments/manual/deliverable-checkout" \
    -H 'Content-Type: application/json' -H "x-csrf-token: $csrf" -H "Origin: $WEB" -H "Referer: $WEB/" \
    -d "$body")
  echo "$co" | head -c 400; echo
  pid=$(echo "$co" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d.get("data",{}).get("paymentId",""))' 2>/dev/null || true)
  if [ -z "$pid" ]; then
    echo "{\"sku\":\"$sku\",\"status\":\"CHECKOUT_FAIL\"}" >> "$RESULTS"
    sleep 5
    continue
  fi
  curl -sS -m 60 -c "$COOKIE" -b "$COOKIE" -X POST "$WEB/api/atina/payments/manual/mark-sent/$pid" \
    -H 'Content-Type: application/json' -H "x-csrf-token: $csrf" -H "Origin: $WEB" -d '{}' >/dev/null
  curl -sS -m 60 -c "$COOKIE" -b "$COOKIE" -X POST "$WEB/api/atina/payments/manual/confirm/$pid" \
    -H 'Content-Type: application/json' -H "x-csrf-token: $csrf" -H "Origin: $WEB" -d '{}' >/dev/null

  job=""
  for i in $(seq 1 60); do
    sleep 4
    jr=$(curl -sS -m 60 -c "$COOKIE" -b "$COOKIE" "$WEB/api/atina/billing/fulfillment/jobs/$pid")
    status=$(echo "$jr" | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("data") or {}).get("status",""))' 2>/dev/null || true)
    if [ "$status" = "completed" ] || [ "$status" = "failed" ]; then
      job="$jr"
      break
    fi
  done
  if [ -z "$job" ]; then
    echo "{\"sku\":\"$sku\",\"paymentId\":\"$pid\",\"status\":\"TIMEOUT\"}" >> "$RESULTS"
    sleep 15
    continue
  fi
  echo "$job" > "$OUT/job-$sku.json"
  python3 - <<PY
import json
sku="$sku"
pid="$pid"
out="$OUT"
jr=json.load(open(f"{out}/job-{sku}.json"))
job=jr.get("data") or {}
score=job.get("checklistScore")
passed=job.get("checklistPassed")
arts=job.get("artifacts") or []
md_names=[a.get("filename") for a in arts if str(a.get("filename","")).endswith(".md")]
meta = {}
fm = job.get("fulfillmentMeta") or {}
res = job.get("result") or {}
if isinstance(fm, dict):
    meta.update(fm)
if isinstance(res.get("metadata"), dict):
    meta.update(res["metadata"])
print(f"status={job.get('status')} score={score!r} passed={passed!r} arts={len(arts)} md={md_names[:3]} problems={meta.get('problemsCoveredCount')} embedded={meta.get('problemsEmbeddedInDoc')}")
row={
  "sku":sku,"paymentId":pid,"jobStatus":job.get("status"),
  "checklistScore":score,"checklistPassed":passed,
  "industryCategory":job.get("industryCategory"),
  "artifactCount":len(arts),
  "mdFiles":md_names,
  "problemsCoveredCount": meta.get("problemsCoveredCount"),
  "problemsEmbeddedInDoc": meta.get("problemsEmbeddedInDoc"),
  "problemsCovered": meta.get("problemsCovered"),
}
open(f"{out}/results.jsonl","a").write(json.dumps(row)+"\n")
PY
  python3 - <<PY
import json, urllib.parse, subprocess, os
sku="$sku"
pid="$pid"
out="$OUT"
web="$WEB"
cookie="$COOKIE"
arts=json.load(open(f"{out}/job-{sku}.json")).get("data",{}).get("artifacts") or []
mds=[a.get("filename") for a in arts if str(a.get("filename","")).endswith(".md")][:2]
for fn in mds:
    enc=urllib.parse.quote(fn, safe="")
    dest=f"{out}/{sku}__{fn}"
    subprocess.run([
      "curl","-sS","-m","90","-c",cookie,"-b",cookie,"-o",dest,
      f"{web}/api/atina/billing/fulfillment/jobs/{pid}/artifacts/{enc}"
    ], check=False)
    print("downloaded", dest, "bytes", os.path.getsize(dest) if os.path.exists(dest) else 0)
PY
  sleep 20
done

echo "DONE"
ls -la "$OUT" | head -50
