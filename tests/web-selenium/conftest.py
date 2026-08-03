import pytest
import os
import json
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

# Load configuration
config_path = os.path.join(os.path.dirname(__file__), "config.json")
with open(config_path, "r") as f:
    config = json.load(f)

# Global accumulator for test metrics
TEST_RESULTS = []

@pytest.fixture(scope="session")
def base_url():
    return config.get("base_url", "https://privacyshield-web.onrender.com")

@pytest.fixture(scope="function")
def driver():
    chrome_options = Options()
    if config.get("headless", True):
        chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    
    # Initialize chromedriver (webdriver_manager is not strictly required if Chrome is in PATH or using standard system driver)
    driver = webdriver.Chrome(options=chrome_options)
    driver.implicitly_wait(config.get("implicit_wait", 10))
    yield driver
    driver.quit()

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    # execute all other hooks to obtain the report object
    outcome = yield
    rep = outcome.get_result()
    
    # Collect results during the execution call phase
    if rep.when == "call":
        test_name = item.nodeid
        duration = rep.duration
        status = "Pass" if rep.passed else ("Fail" if rep.failed else "Skip")
        error_msg = ""
        if rep.failed:
            error_msg = str(call.excinfo.value) if call.excinfo else "Unknown failure reason"
        
        # Save results globally
        TEST_RESULTS.append({
            "test_id": test_name,
            "area": item.module.__name__.split(".")[-1] if hasattr(item, "module") else "general",
            "description": item.function.__doc__.strip() if item.function.__doc__ else "E2E automated validation checkpoint",
            "status": status,
            "duration_seconds": round(duration, 3),
            "error_details": error_msg
        })

def pytest_sessionfinish(session, exitstatus):
    """
    Called after all tests complete. Generates the Excel report.
    """
    from report_generator import generate_excel_report
    report_filename = config.get("output_report", "e2e_test_report.xlsx")
    report_path = os.path.join(os.path.dirname(__file__), report_filename)
    
    print(f"\n[E2E] Compiling automated Excel analytics report: {report_path}")
    generate_excel_report(TEST_RESULTS, report_path)
