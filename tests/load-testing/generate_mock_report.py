import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from load_test import build_excel_report

mock_summary = {
    "vus": 10,
    "duration_seconds": 5.0,
    "total_requests": 150,
    "rps": 30.0,
    "success_count": 150,
    "success_rate": 100.0,
    "fail_count": 0,
    "fail_rate": 0.0,
    "min_latency_ms": 12.5,
    "avg_latency_ms": 34.2,
    "max_latency_ms": 89.1,
    "p50_ms": 28.0,
    "p90_ms": 52.4,
    "p95_ms": 68.1,
    "p99_ms": 85.0
}

mock_request_logs = [
    {
        "timestamp": "2026-08-10 10:00:00",
        "vu": i % 10 + 1,
        "url": "https://privacyshield-backend.onrender.com/health/readiness",
        "status": 200,
        "latency_ms": 25.0 + (i % 20),
        "result": "Success"
    } for i in range(150)
]

output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "load_test_report.xlsx")
print("[Load Test] Compiling mock performance report...")
build_excel_report(mock_summary, mock_request_logs, output_path)
print("[Load Test] Excel report created successfully at:", output_path)
