import sys
import subprocess
import os

def main():
    print("==========================================================")
    print("   Starting PrivacyShield Mobile Appium E2E Test Suite    ")
    print("==========================================================")
    
    # 1. Install dependencies
    print("[1/2] Resolving Python Appium requirements...")
    requirements_path = os.path.join(os.path.dirname(__file__), "requirements.txt")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", requirements_path])
    except Exception as e:
        print(f"Warning: Failed to auto-install dependencies: {e}")
        
    # 2. Run Pytest
    print("\n[2/2] Running E2E Test Scenarios via Pytest...")
    test_suites_dir = os.path.join(os.path.dirname(__file__), "test_suites")
    pytest_cmd = [sys.executable, "-m", "pytest", test_suites_dir, "-v", "--tb=short"]
    try:
        subprocess.run(pytest_cmd, check=True)
    except subprocess.CalledProcessError:
        print("\nNote: Some validations completed with failures (logged in Excel).")
    except Exception as e:
        print(f"Error executing pytest runner: {e}")
        
    print("\n==========================================================")
    print("   E2E Mobile Appium run finished! Check report file.     ")
    print("==========================================================")

if __name__ == "__main__":
    main()
