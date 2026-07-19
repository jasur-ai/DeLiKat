#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║  🚀 DELIKET — Universal Test Runner                             ║
║  API/DB tests + E2E Browser tests + Health Dashboard Report     ║
╚══════════════════════════════════════════════════════════════════╝

Usage:
    python3 tests/run_all.py                          # Run all
    python3 tests/run_all.py --comprehensive-only     # Only API/DB tests
    python3 tests/run_all.py --e2e-only               # Only browser E2E tests
    python3 tests/run_all.py --dashboard-report       # Generate health.json report
    python3 tests/run_all.py --json                   # JSON output
"""

import os
import sys
import json
import time
import subprocess
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = os.environ.get("TEST_BASE_URL", "https://delikat.vercel.app")
E2E_RESULTS_FILE = "/tmp/deliket-e2e-results.json"
HEALTH_REPORT_FILE = ROOT / "static" / "health-report.json"


# ── Colors ──
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"
DIM = "\033[2m"


def print_header(text):
    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}  {text}{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")


COMPREHENSIVE_RESULTS_FILE = "/tmp/deliket-comprehensive-results.json"

def run_comprehensive_tests():
    """Run the comprehensive API/DB test suite"""
    print_header("🔍 COMPREHENSIVE API/DB TESTS")

    cmd = [
        sys.executable, "tests/test_comprehensive.py",
        "--json"
    ]
    env = os.environ.copy()
    env["TEST_BASE_URL"] = BASE_URL

    start = time.time()
    proc = subprocess.run(
        cmd,
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=180,
        env=env,
    )
    duration = time.time() - start

    # Print output (the comprehensive test handles its own formatting)
    if proc.stdout:
        print(proc.stdout)
    if proc.stderr and proc.returncode != 0:
        print(f"{YELLOW}⚠️  Stderr:{RESET}")
        print(proc.stderr[:1000])

    # Parse results from last JSON line in stdout (test_comprehensive.py --json outputs JSON as last line)
    results = {}
    lines = proc.stdout.strip().split("\n")
    for line in reversed(lines):
        try:
            results = json.loads(line)
            break
        except json.JSONDecodeError:
            pass

    # Print summary
    if results:
        print(f"\n  {GREEN}✅ Passed:  {results.get('passed', 0)}{RESET}")
        print(f"  {RED}❌ Failed:  {results.get('failed', 0)}{RESET}")
        print(f"  {YELLOW}⏭️  Skipped: {results.get('skipped', 0)}{RESET}")
        print(f"  ⏱️  Duration: {duration:.2f}s")
        print(f"  🎯 Score:   {results.get('score', 0)}%")
    else:
        print(f"{YELLOW}  ⚠️  No results parsed (exit code: {proc.returncode}){RESET}")

    return {**results, "duration": round(duration, 2), "timestamp": datetime.now().isoformat()}


def run_e2e_tests():
    """Run Playwright E2E tests with JSON output"""
    print_header("🧪 E2E BROWSER TESTS")

    cmd = [
        sys.executable, "tests/e2e_test.py",
        "--json", "--save"
    ]
    env = os.environ.copy()
    env["BASE_URL"] = BASE_URL

    start = time.time()
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=300,  # E2E can take up to 5 minutes
            env=env,
        )
        duration = time.time() - start

        # Print output
        print(proc.stdout[-1500:] if len(proc.stdout) > 1500 else proc.stdout)
        if proc.stderr:
            print(f"{YELLOW}⚠️  Stderr:{RESET}")
            print(proc.stderr[-500:])

        # Parse results from saved file
        results = {}
        if os.path.exists(E2E_RESULTS_FILE):
            with open(E2E_RESULTS_FILE) as f:
                results = json.load(f)

        if results:
            print(f"\n  {GREEN}✅ Passed:  {results.get('passed', 0)}{RESET}")
            print(f"  {RED}❌ Failed:  {results.get('failed', 0)}{RESET}")
            print(f"  🎯 Score:   {results.get('score', 0)}%")
            print(f"  📸 Screenshots: {results.get('screenshots', 0)}")
        else:
            print(f"  {YELLOW}⚠️  No JSON results found{RESET}")

        return {**results, "duration": round(duration, 2), "timestamp": datetime.now().isoformat()}

    except subprocess.TimeoutExpired:
        print(f"{RED}  ❌ E2E tests timed out after 5 minutes{RESET}")
        return {"error": "Timeout", "passed": 0, "failed": 0, "score": 0, "duration": 300}
    except FileNotFoundError:
        print(f"{YELLOW}  ⏭️  E2E tests skipped — Playwright not installed{RESET}")
        return {"error": "Playwright not installed", "passed": 0, "failed": 0, "score": 0}
    except Exception as e:
        print(f"{RED}  ❌ E2E error: {e}{RESET}")
        return {"error": str(e), "passed": 0, "failed": 0, "score": 0}


def generate_dashboard_report(comprehensive_results, e2e_results):
    """Generate a unified health-report.json for the dashboard"""
    print_header("📊 GENERATING DASHBOARD REPORT")

    report = {
        "timestamp": datetime.now().isoformat(),
        "base_url": BASE_URL,
        "comprehensive": comprehensive_results or {},
        "e2e": e2e_results or {},
        "summary": {
            "total_passed": (comprehensive_results or {}).get("passed", 0) + (e2e_results or {}).get("passed", 0),
            "total_failed": (comprehensive_results or {}).get("failed", 0) + (e2e_results or {}).get("failed", 0),
            "total_skipped": (comprehensive_results or {}).get("skipped", 0),
            "overall_score": 0,
        }
    }

    # Calculate overall score
    total_tests = report["summary"]["total_passed"] + report["summary"]["total_failed"]
    if total_tests > 0:
        report["summary"]["overall_score"] = round(
            report["summary"]["total_passed"] / total_tests * 100, 1
        )

    # Save
    with open(HEALTH_REPORT_FILE, "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"  💾 Saved: {HEALTH_REPORT_FILE}")
    print(f"  🎯 Overall score: {report['summary']['overall_score']}%")
    print(f"  ✅ Total: {report['summary']['total_passed']} passed")
    print(f"  ❌ Total: {report['summary']['total_failed']} failed")
    print(f"  ⏭️  Total: {report['summary']['total_skipped']} skipped")

    return report


def print_summary(comprehensive_results, e2e_results):
    """Print final summary"""
    print_header("📊 FINAL SUMMARY")

    c = comprehensive_results or {}
    e = e2e_results or {}

    c_passed = c.get("passed", 0)
    c_failed = c.get("failed", 0)
    c_skipped = c.get("skipped", 0)
    c_score = c.get("score", 0)

    e_passed = e.get("passed", 0)
    e_failed = e.get("failed", 0)
    e_score = e.get("score", 0)

    total_passed = c_passed + e_passed
    total_failed = c_failed + e_failed
    total_tests = total_passed + total_failed
    overall = round(total_passed / max(total_tests, 1) * 100, 1)

    print(f"\n  {BOLD}API/DB Tests:{RESET}  {c_score}%  ({c_passed}✅ / {c_failed}❌ / {c_skipped}⏭️)")
    print(f"  {BOLD}E2E Tests:{RESET}    {e_score}%  ({e_passed}✅ / {e_failed}❌)")
    print(f"  {BOLD}{'─'*40}{RESET}")
    print(f"  {BOLD}OVERALL:{RESET}       {overall}%  ({total_passed}✅ / {total_failed}❌)")

    if c_failed > 0 or e_failed > 0:
        print(f"\n  {RED}⚠️  {c_failed + e_failed} test(s) failed!{RESET}")
        return 1
    else:
        print(f"\n  {GREEN}🎉 All tests passed!{RESET}")
        return 0


def main():
    # ── Parse args ──
    run_comprehensive = "--e2e-only" not in sys.argv
    run_e2e = "--comprehensive-only" not in sys.argv
    dashboard_only = "--dashboard-report" in sys.argv
    json_output = "--json" in sys.argv

    if dashboard_only:
        run_comprehensive = False
        run_e2e = False

    # ── Run tests ──
    comprehensive_results = None
    e2e_results = None

    if run_comprehensive:
        comprehensive_results = run_comprehensive_tests()
    else:
        print(f"\n{YELLOW}⏭️  API/DB tests skipped ({'--e2e-only' if '--e2e-only' in sys.argv else '--dashboard-report'}){RESET}")

    if run_e2e:
        e2e_results = run_e2e_tests()
    else:
        print(f"\n{YELLOW}⏭️  E2E tests skipped ({'--comprehensive-only' if '--comprehensive-only' in sys.argv else '--dashboard-report'}){RESET}")

    # ── Generate report ──
    report = generate_dashboard_report(comprehensive_results, e2e_results)

    # ── Print summary ──
    exit_code = print_summary(comprehensive_results, e2e_results)

    # ── JSON output ──
    if json_output:
        print(json.dumps(report, indent=2, ensure_ascii=False))

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
