#!/usr/bin/env python3
"""E2E: all 17 deliverable packages — checkout, confirm, fulfillment checklist pass.

Cross-platform counterpart of e2e-fulfillment-all-packages.ps1 (Linux / CI / Cloud Agent).
Expects omnigroup-web (:3010) and Atina API (:3000) already running; it does not restart them.
Run Atina with RATE_LIMIT_DISABLED=true (as restart-atina-dev.ps1 -RelaxRateLimit does) or the
default 100 req / 15 min limit will throttle a full 17-package run.

Examples:
  python3 scripts/e2e-fulfillment-all-packages.py
  python3 scripts/e2e-fulfillment-all-packages.py --ids setup-quick landing
  python3 scripts/e2e-fulfillment-all-packages.py --skip-slow --json-out /tmp/e2e.json
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

import requests

ALL_IDS = [
    "setup-quick", "setup-full", "setup-custom", "audit", "integration", "workflow-design",
    "support-priority", "support-dedicated", "landing", "website-business", "website-ecommerce",
    "white-label-setup", "sales-enablement", "vertical-package", "lead-gen-retainer",
    "ai-support-retainer", "custom-software",
]
SLOW_IDS = {"website-business", "website-ecommerce", "white-label-setup", "custom-software", "setup-custom"}
REPO_ROOT = Path(__file__).resolve().parent.parent


def admin_credentials() -> tuple[str, str]:
    email = os.environ.get("ADMIN_EMAIL", "admin@atina.io")
    password = os.environ.get("ADMIN_PASSWORD", "Admin@123456")
    creds_file = REPO_ROOT / "atina-platform" / "atina" / "ADMIN-CREDENTIALS.local.txt"
    if creds_file.exists():
        for line in creds_file.read_text(encoding="utf-8").splitlines():
            m = re.match(r"^ADMIN_(EMAIL|PASSWORD)=(.+)$", line)
            if m and m.group(1) == "EMAIL":
                email = m.group(2).strip()
            elif m:
                password = m.group(2).strip()
    return email, password


def call(session: requests.Session, method: str, url: str, label: str, body: dict | None = None,
         attempts: int = 4) -> dict:
    for attempt in range(1, attempts + 1):
        r = session.request(method, url, json=body, timeout=120)
        if r.status_code == 429 and attempt < attempts:
            wait = int(r.headers.get("Retry-After") or 15 * attempt)
            print(f"  {label}: 429, retry in {wait}s")
            time.sleep(wait)
            continue
        try:
            data = r.json()
        except ValueError:
            raise RuntimeError(f"{label}: HTTP {r.status_code} non-JSON response: {r.text[:200]}")
        if r.status_code >= 400:
            raise RuntimeError(f"{label}: HTTP {r.status_code} {json.dumps(data)[:300]}")
        return data
    raise RuntimeError(f"{label}: rate limited after {attempts} attempts")


def run_package(session: requests.Session, web: str, deliverable_id: str, industry: str, poll_sec: int) -> dict:
    dco = call(session, "POST", f"{web}/api/atina/payments/manual/deliverable-checkout", f"checkout-{deliverable_id}",
               {"deliverableId": deliverable_id, "industryCategory": industry, "paymentProvider": "manual"})
    if not dco.get("ok"):
        raise RuntimeError(f"checkout failed: {json.dumps(dco)[:300]}")
    payment_id = dco["data"]["paymentId"]

    call(session, "POST", f"{web}/api/atina/payments/manual/mark-sent/{payment_id}", f"mark-sent-{deliverable_id}", {})
    call(session, "POST", f"{web}/api/atina/payments/manual/confirm/{payment_id}", f"confirm-{deliverable_id}", {})

    deadline = time.time() + poll_sec
    job = None
    while time.time() < deadline:
        time.sleep(3)
        job = call(session, "GET", f"{web}/api/atina/billing/fulfillment/jobs/{payment_id}", f"job-{deliverable_id}").get("data")
        if job and job.get("status") in ("completed", "failed"):
            break

    if not job:
        raise RuntimeError("No fulfillment job")
    if job["status"] == "failed":
        raise RuntimeError(f"Fulfillment failed: {job.get('error')}")
    if job["status"] != "completed":
        raise RuntimeError(f"Timeout - status={job['status']}")

    checklist = job.get("qualityChecklist")
    if not checklist:
        raise RuntimeError("No qualityChecklist on job (admin view) — quality gate result not verifiable")
    score = checklist.get("score")
    if not checklist.get("passed"):
        fails = [i["id"] for i in checklist.get("items", []) if not i.get("passed")]
        raise RuntimeError(f"Checklist failed ({score}pct): {', '.join(fails)}")
    if job.get("reviewStatus") == "approved" and not job.get("clientVisible"):
        raise RuntimeError("Approved job is not client-visible")

    return {
        "paymentId": payment_id,
        "status": job["status"],
        "reviewStatus": job.get("reviewStatus"),
        "artifacts": len(job.get("artifacts") or []),
        "artifactFiles": [a.get("filename") for a in job.get("artifacts") or []],
        "publicUrl": job.get("publicUrl"),
        "score": score,
        "attempt": checklist.get("attemptNumber"),
        "checklistItems": [i.get("id") for i in checklist.get("items", [])],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ids", nargs="*", default=[], help="deliverable ids (default: all 17)")
    ap.add_argument("--web-base", default="http://127.0.0.1:3010")
    ap.add_argument("--industry", default="marketing")
    ap.add_argument("--skip-slow", action="store_true")
    ap.add_argument("--poll-sec", type=int, default=90)
    ap.add_argument("--pause-sec", type=int, default=2, help="pause between packages")
    ap.add_argument("--json-out", help="write per-package results as JSON")
    args = ap.parse_args()

    web = args.web_base.rstrip("/")
    ids = args.ids or ALL_IDS
    if args.skip_slow:
        ids = [i for i in ids if i not in SLOW_IDS]

    session = requests.Session()
    email, password = admin_credentials()
    login = call(session, "POST", f"{web}/api/auth/login", "login", {"email": email, "password": password})
    if login.get("ok") is not True:
        print("Login failed", file=sys.stderr)
        return 1

    print("== E2E fulfillment all packages ==")
    print(f"  Packages: {len(ids)}  Industry: {args.industry}")
    results = []
    for deliverable_id in ids:
        print(f"\n-- {deliverable_id} --")
        started = time.time()
        try:
            res = run_package(session, web, deliverable_id, args.industry, args.poll_sec)
            res.update(deliverableId=deliverable_id, result="PASS", seconds=round(time.time() - started, 1))
            print(f"  PASS status={res['status']} artifacts={res['artifacts']} checklist={res['score']}pct "
                  f"({res['seconds']}s)")
        except Exception as exc:  # noqa: BLE001 — report and continue with the next package
            res = {"deliverableId": deliverable_id, "result": "FAIL", "error": str(exc),
                   "seconds": round(time.time() - started, 1)}
            print(f"  FAIL {exc}")
        results.append(res)
        time.sleep(args.pause_sec)

    passed = sum(r["result"] == "PASS" for r in results)
    failed = len(results) - passed
    print(f"\ne2e-fulfillment-all-packages: {passed} passed, {failed} failed")
    for r in results:
        print(f"  {r['deliverableId']:<22} {r['result']:<5} score={r.get('score')} artifacts={r.get('artifacts')}"
              + (f" error={r['error']}" if r.get("error") else ""))
    if args.json_out:
        Path(args.json_out).write_text(json.dumps(results, indent=2), encoding="utf-8")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
