import pytest
import os
import json
from appium import webdriver
from appium.options.common import AppiumOptions

# Load config
config_path = os.path.join(os.path.dirname(__file__), "config.json")
with open(config_path, "r") as f:
    config = json.load(f)

TEST_RESULTS = []

@pytest.fixture(scope="function")
def driver():
    # Setup Appium capabilities options
    options = AppiumOptions()
    options.load_capabilities({
        "platformName": config.get("platform_name", "Android"),
        "appium:deviceName": config.get("device_name", "Android Emulator"),
        "appium:platformVersion": config.get("platform_version", "13.0"),
        "appium:automationName": config.get("automation_name", "UiAutomator2"),
        "appium:app": os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "build", "app-release.apk")),
        "appium:noReset": True
    })
    
    server_url = config.get("appium_server_url", "http://localhost:4723")
    driver = webdriver.Remote(server_url, options=options)
    yield driver
    driver.quit()

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    
    if rep.when == "call":
        test_name = item.nodeid
        duration = rep.duration
        status = "Pass" if rep.passed else ("Fail" if rep.failed else "Skip")
        error_msg = ""
        if rep.failed:
            error_msg = str(call.excinfo.value) if call.excinfo else "Appium E2E assertion failed"
            
        TEST_RESULTS.append({
            "test_id": test_name.split("::")[-1],
            "test_type": "E2E Mobile Testing",
            "area": item.module.__name__.split(".")[-1] if hasattr(item, "module") else "mobile_core",
            "description": item.function.__doc__.strip() if item.function.__doc__ else "E2E mobile automated validation",
            "status": status,
            "duration_seconds": round(duration, 3),
            "error_details": error_msg
        })

def pytest_sessionfinish(session, exitstatus):
    """
    Triggers Excel generation for mobile Appium tests upon session end.
    """
    from report_generator import generate_excel_report
    report_filename = config.get("output_report", "mobile_appium_test_report.xlsx")
    report_path = os.path.join(os.path.dirname(__file__), report_filename)
    
    print(f"\n[APPIUM] Compiling mobile E2E test report at: {report_path}")
    generate_excel_report(TEST_RESULTS, report_path)
