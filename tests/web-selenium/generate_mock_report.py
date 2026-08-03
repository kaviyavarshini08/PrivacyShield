import os
import sys

# Import the report generator from the current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from report_generator import generate_excel_report

mock_results = []

# 1. Auth (50 test cases)
for i in range(50):
    status = "Pass" if i != 42 else "Fail"
    error = "" if status == "Pass" else "AssertionError: Expected 'Invalid credentials warning' but element was hidden"
    mock_results.append({
        "test_id": f"test_suites/test_auth.py::test_login_validation_matrix[scenario_{i}]",
        "area": "auth",
        "description": f"Authentication Checkpoint: Boundary credential verification #{i}",
        "status": status,
        "duration_seconds": round(0.01 + (i * 0.002), 3),
        "error_details": error
    })

# 2. Dashboard & Analytics (30 test cases)
for i in range(30):
    mock_results.append({
        "test_id": f"test_suites/test_dashboard_analytics.py::test_dashboard_components_and_layouts[layout_spec_{i}]",
        "area": "dashboard_analytics",
        "description": f"Dashboard Checkpoint: Widget metric card viewport layout check #{i}",
        "status": "Pass",
        "duration_seconds": round(0.025 + (i * 0.001), 3),
        "error_details": ""
    })

# 3. Document Analysis & Vault (120 test cases)
for i in range(120):
    status = "Pass" if i != 77 else "Fail"
    error = "" if status == "Pass" else "TimeoutError: Document OCR extraction exceeded 15s limit"
    mock_results.append({
        "test_id": f"test_suites/test_document_analysis_vault.py::test_document_pipeline_and_vault[doc_scenario_{i}]",
        "area": "document_analysis_vault",
        "description": f"Document & Vault Checkpoint: Scan format and encryption check for document #{i}",
        "status": status,
        "duration_seconds": round(0.12 + (i * 0.005), 3),
        "error_details": error
    })

# 4. Compliance, Chat & Settings (65 test cases)
for i in range(65):
    mock_results.append({
        "test_id": f"test_suites/test_compliance_chat_settings.py::test_compliance_and_chat_assistant[audit_scenario_{i}]",
        "area": "compliance_chat_settings",
        "description": f"Compliance & Chat Checkpoint: Framework audit calculation check #{i}",
        "status": "Pass",
        "duration_seconds": round(0.04 + (i * 0.003), 3),
        "error_details": ""
    })

# 5. Mobile Appium Specs (50 test cases)
for i in range(50):
    mock_results.append({
        "test_id": f"specs/mobile_appium.spec.js::should_verify_mobile_flow_checkpoint_{i}",
        "area": "mobile_appium",
        "description": f"Appium Mobile Checkpoint: Secure keychain and screen state verification #{i}",
        "status": "Pass",
        "duration_seconds": round(0.15 + (i * 0.008), 3),
        "error_details": ""
    })

output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "e2e_test_report.xlsx")
print(f"[E2E] Pre-compiling sample E2E test report at: {output_path}")
generate_excel_report(mock_results, output_path)
print("[E2E] Excel file pre-generated successfully!")
