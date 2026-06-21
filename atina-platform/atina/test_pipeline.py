#!/usr/bin/env python3
"""
Instant test: German job-posting intercept → Gemini/OpenRouter → surgical B2B email.

Usage (from atina-platform/atina):
  python test_pipeline.py

Reads AI_KEY + AI_URL from .env (OpenRouter → google/gemini-2.0-flash-001)
or GEMINI_API_KEY for Google Generative Language API.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent

EXAMPLE_JOB_POSTING = """Stellenanzeige: Mitarbeiter/in Datenerfassung (m/w/d)
Firma: Müller Logistik GmbH
Standort: Frankfurt am Main
Gehalt: 3.200 € brutto/Monat

Wir suchen ab sofort eine/n zuverlässige/n Mitarbeiter/in für die manuelle Erfassung von Lieferscheinen und Rechnungen in unser SAP-System.
Ihre Aufgaben: Eingangsrechnungen prüfen, Daten in SAP übertragen, Lieferanten per E-Mail kontaktieren, Fehler in Belegen korrigieren, monatliche Reports erstellen.
Voraussetzungen: Sorgfalt, MS Office, erste SAP-Erfahrung von Vorteil. Vollzeit, unbefristet.
Bewerbungen an: bewerbung@mueller-logistik.de"""


def load_dotenv(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        env[key.strip()] = val.strip().strip('"').strip("'")
    return env


def parse_salary_eur(text: str) -> int:
    patterns = [
        r"(\d{1,2}[.,]\d{3})\s*€?\s*brutto",
        r"Gehalt:\s*(\d{1,2}[.,]?\d{0,3})\s*€",
        r"(\d{3,5})\s*€\s*/\s*Monat",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.I)
        if not m:
            continue
        raw = m.group(1).replace(".", "").replace(",", ".")
        try:
            val = int(float(raw))
            if 800 <= val <= 25000:
                return val
        except ValueError:
            continue
    return 3200


def compute_economics(salary: int, ratio: float = 0.25) -> dict[str, int]:
    ratio = max(0.12, min(0.35, ratio))
    atina = max(499, min(1200, round(salary * ratio)))
    savings = max(0, salary - atina)
    pct = round((savings / salary) * 100) if salary else 0
    return {
        "salary_gross_monthly_eur": salary,
        "atina_monthly_eur": atina,
        "monthly_savings_eur": savings,
        "savings_percent": pct,
        "annual_savings_eur": savings * 12,
    }


SYSTEM_PROMPT = """Du bist ein Elite-B2B-Akquisiteur für den deutschen Mittelstand. Du schreibst EINZIGE Cold-Emails auf Deutsch.

PSYCHOLOGIE (strikt einhalten):
- Die Firma hat eine Stellenanzeige veröffentlicht → brennendes Problem, Budget freigegeben, Einstellung dauert Monate.
- Wir sind KEIN Softwarehaus das "Skripte" verkauft. Wir sind die SOFORTIGE Alternative zur Stelle: ein automatisierter Bot der dieselbe Arbeit 24/7 ohne Fehler macht.
- Ton: respektvoll, direkt, sachlich (Sie-Form). Kein Startup-Slang. Kein Druck für ein Meeting.

STRUKTUR (JSON only, keine Markdown-Fences):
{
  "betreff": "Betreff mit Bezug zur Stelle + Stadt + Automatisierung",
  "icebreaker": "Erste Satz: konkrete Schmerzpunkt aus der Anzeige (SAP, manuelle Erfassung, etc.)",
  "offer_and_math": "Angebot + klare Mathematik: Gehalt vs. Atina-Monatspreis vs. Ersparnis",
  "cta": "Niedrigschwellig: 90-Sekunden-Video anbieten, Link senden — kein Meeting-Zwang"
}

REGELN:
- Betreff Muster: "Bezüglich Ihrer Stellenanzeige für [Rolle] in [Stadt] / Automatisierung"
- Nenne "Atina" als automatisiertes System.
- Verwende die gelieferten Zahlen exakt (Gehalt, Atina-Preis, Ersparnis).
- Max. 180 Wörter im Gesamtkörper."""


def build_fallback_email(user_payload: dict, econ: dict) -> dict:
    city = user_payload.get("stadt") or "Ihrer Region"
    role = user_payload.get("rolle") or "Datenerfassung"
    company = user_payload.get("firma") or "Ihr Unternehmen"
    return {
        "betreff": f"Bezüglich Ihrer Stellenanzeige für {role} in {city} / Automatisierung",
        "icebreaker": (
            f"Ich habe gesehen, dass {company} aktuell eine Stelle für {role} ausschreibt — "
            "insbesondere die manuelle Übertragung von Belegen in SAP, während der Rückstau wächst."
        ),
        "offer_and_math": (
            f"Während das Einstellungsverfahren oft Monate dauert, kann unser System „Atina“ dieselben "
            f"Prozesse übernehmen: 24/7, ohne Fehler — für nur €{econ['atina_monthly_eur']:,} pro Monat "
            f"statt €{econ['salary_gross_monthly_eur']:,} Brutto-Gehalt "
            f"(Ersparnis ca. €{econ['monthly_savings_eur']:,}/Monat, {econ['savings_percent']}%)."
        ).replace(",", "."),
        "cta": (
            "Wir haben ein 90-Sekunden-Video, in dem Sie sehen, wie der Bot Ihre Datenerfassung "
            "automatisch erledigt. Darf ich Ihnen den Link senden?"
        ),
    }


def call_openrouter(api_key: str, model: str, user_payload: dict) -> str:
    base = os.environ.get("AI_URL", "https://openrouter.ai/api/v1").rstrip("/")
    if base.endswith("/chat/completions"):
        url = base
    else:
        url = base + "/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://omnigrouptech.com",
        "X-Title": "Atina Hunt Pipeline Test",
    }
    body = {
        "model": model,
        "temperature": 0.45,
        "max_tokens": 900,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False, indent=2)},
        ],
    }
    res = requests.post(url, headers=headers, json=body, timeout=90)
    if not res.ok:
        raise RuntimeError(f"OpenRouter {res.status_code}: {res.text[:400]}")
    data = res.json()
    return data["choices"][0]["message"]["content"]


def call_gemini_direct(api_key: str, model: str, user_payload: dict) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    params = {"key": api_key}
    body = {
        "contents": [
            {
                "parts": [
                    {"text": SYSTEM_PROMPT},
                    {"text": json.dumps(user_payload, ensure_ascii=False, indent=2)},
                ]
            }
        ],
        "generationConfig": {"temperature": 0.45, "maxOutputTokens": 900},
    }
    res = requests.post(url, params=params, json=body, timeout=90)
    res.raise_for_status()
    data = res.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


def parse_model_json(content: str) -> dict:
    m = re.search(r"\{[\s\S]*\}", content.strip())
    if not m:
        raise ValueError("Model did not return JSON")
    return json.loads(m.group(0))


def assemble_body(parts: dict, sender: str) -> str:
    blocks = [
        parts.get("icebreaker", "").strip(),
        parts.get("offer_and_math", "").strip(),
        parts.get("cta", "").strip(),
        "",
        "Mit freundlichen Grüßen",
        sender,
    ]
    return "\n\n".join([b for b in blocks if b is not None])


def main() -> int:
    parser = argparse.ArgumentParser(description='Job hunt pipeline instant test')
    parser.add_argument('--locale', default='de', help='Outreach locale code (de, en, fr, …)')
    args = parser.parse_args()
    locale = args.locale.lower().split('-')[0]

    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    env = load_dotenv(ROOT / ".env")
    for k, v in env.items():
        os.environ.setdefault(k, v)

    salary = parse_salary_eur(EXAMPLE_JOB_POSTING)
    econ = compute_economics(salary)

    user_payload = {
        "stellenanzeige": EXAMPLE_JOB_POSTING,
        "firma": "Müller Logistik GmbH",
        "stadt": "Frankfurt am Main",
        "rolle": "Datenerfassung",
        "gehalt_brutto_monat_eur": econ["salary_gross_monthly_eur"],
        "atina_monatspreis_eur": econ["atina_monthly_eur"],
        "ersparnis_monat_eur": econ["monthly_savings_eur"],
        "ersparnis_prozent": econ["savings_percent"],
        "ersparnis_jahr_eur": econ["annual_savings_eur"],
        "absender": "Omni Group — Atina Automatisierung",
    }

    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    openrouter_key = os.environ.get("AI_KEY", "").strip()
    model = os.environ.get("HUNT_GEMINI_MODEL", "google/gemini-2.5-flash").strip()

    print(f"=== JOB HUNT PIPELINE TEST (locale={locale}) ===\n")
    print(f"Salary (brutto): EUR {econ['salary_gross_monthly_eur']}/mo")
    print(f"Atina offer:     EUR {econ['atina_monthly_eur']}/mo")
    print(f"Monthly savings: EUR {econ['monthly_savings_eur']}/mo ({econ['savings_percent']}%)")
    print(f"Annual savings:  EUR {econ['annual_savings_eur']}\n")

    parsed = None
    raw = ""
    try:
        if gemini_key:
            print(f"Calling Gemini direct ({model})...\n")
            raw = call_gemini_direct(gemini_key, model.replace("google/", ""), user_payload)
        elif openrouter_key:
            print(f"Calling OpenRouter ({model})...\n")
            raw = call_openrouter(openrouter_key, model, user_payload)
        else:
            print("ERROR: Set GEMINI_API_KEY or AI_KEY in .env", file=sys.stderr)
            return 1
        parsed = parse_model_json(raw)
    except Exception as exc:
        print(f"AI call failed ({exc}). Using surgical fallback template.\n")
        parsed = build_fallback_email(user_payload, econ)

    betreff = parsed.get("betreff", "").strip()
    body = assemble_body(parsed, user_payload["absender"])

    print("--- BETREFF ---")
    print(betreff)
    print("\n--- EMAIL BODY (DE) ---")
    print(body)
    print("\n--- RAW MODEL JSON ---")
    print(json.dumps(parsed, ensure_ascii=False, indent=2))
    print("\n=== TEST COMPLETE ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
