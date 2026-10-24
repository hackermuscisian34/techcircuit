#!/usr/bin/env python3
"""
TECHCIRCUIT / FIDELIS Automated Performance & Latency Benchmark Suite.

Measures p50, p95, p99 latencies, throughput, and error rates across:
- Liveness and Readiness Probes (/health/live, /health/ready)
- Authentication (/api/v1/auth/login)
- Rulebook Retrieval & Active Directives (/api/v1/rulebooks/active)
- Audit Chain Verification (/api/v1/audit/verify)
- Full End-to-End Content Review (/api/v1/reviews/run)
"""

import math
import statistics
import sys
import time
from pathlib import Path
from typing import List, Dict, Any

# Add backend directory to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

def percentile(data: List[float], p: float) -> float:
    """Calculate the p-th percentile from a sorted list of numbers."""
    if not data:
        return 0.0
    k = (len(data) - 1) * (p / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return data[int(k)]
    d0 = data[int(f)] * (c - k)
    d1 = data[int(c)] * (k - f)
    return d0 + d1

def run_benchmark(client: TestClient, name: str, request_fn, iterations: int = 25) -> Dict[str, Any]:
    """Execute a series of requests and compute latency distribution metrics."""
    latencies: List[float] = []
    errors = 0

    # Warmup
    try:
        request_fn(client)
    except Exception:
        pass

    start_total = time.perf_counter()
    for _ in range(iterations):
        t0 = time.perf_counter()
        try:
            status_code = request_fn(client)
            if status_code >= 400:
                errors += 1
        except Exception:
            errors += 1
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000.0) # in ms

    total_duration = time.perf_counter() - start_total
    latencies.sort()

    p50 = percentile(latencies, 50)
    p95 = percentile(latencies, 95)
    p99 = percentile(latencies, 99)
    throughput = iterations / total_duration if total_duration > 0 else 0

    return {
        "benchmark": name,
        "samples": iterations,
        "p50_ms": round(p50, 2),
        "p95_ms": round(p95, 2),
        "p99_ms": round(p99, 2),
        "min_ms": round(min(latencies), 2),
        "max_ms": round(max(latencies), 2),
        "mean_ms": round(statistics.mean(latencies), 2),
        "throughput_rps": round(throughput, 1),
        "error_rate_pct": round((errors / iterations) * 100.0, 2),
    }

def main():
    print("=" * 75)
    print("TECHCIRCUIT / FIDELIS PRODUCTION PERFORMANCE BENCHMARK")
    print("=" * 75)

    client = TestClient(app)

    # Pre-generate valid auth token
    auth_token = create_access_token({
        "sub": "usr-creator-01",
        "email": "creator@apexdynamics.example",
        "role": "CREATOR",
        "workspace_id": "ws-apexdynamics-001"
    })
    headers = {"Authorization": f"Bearer {auth_token}"}

    benchmarks = [
        (
            "Liveness Probe (/health/live)",
            lambda c: c.get("/health/live").status_code,
            50
        ),
        (
            "Readiness Probe (/health/ready)",
            lambda c: c.get("/health/ready").status_code,
            30
        ),
        (
            "Auth Token Validation (/api/v1/auth/me)",
            lambda c: c.get("/api/v1/auth/me", headers=headers).status_code,
            40
        ),
        (
            "Active Rulebook Lookup (/api/v1/rulebooks/active)",
            lambda c: c.get("/api/v1/rulebooks/active", headers=headers).status_code,
            30
        ),
        (
            "Cryptographic Audit Chain Verification (/api/v1/audit/verify)",
            lambda c: c.get("/api/v1/audit/verify", headers=headers).status_code,
            20
        ),
        (
            "Typical Content Review Pipeline (/api/v1/reviews/run)",
            lambda c: c.post(
                "/api/v1/reviews/run",
                headers=headers,
                data={
                    "title": "Benchmark Promo Copy",
                    "content_text": "Apex Dynamics launches the new Alpha Core enterprise suite with seamless onboarding.",
                }
            ).status_code,
            15
        )
    ]

    results = []
    print(f"{'Benchmark':<42} | {'p50 (ms)':<9} | {'p95 (ms)':<9} | {'p99 (ms)':<9} | {'Req/s':<7} | {'Errors':<7}")
    print("-" * 88)

    for name, req_fn, iters in benchmarks:
        res = run_benchmark(client, name, req_fn, iters)
        results.append(res)
        print(f"{res['benchmark']:<42} | {res['p50_ms']:<9} | {res['p95_ms']:<9} | {res['p99_ms']:<9} | {res['throughput_rps']:<7} | {res['error_rate_pct']}%")

    print("=" * 88)
    return results

if __name__ == "__main__":
    main()
