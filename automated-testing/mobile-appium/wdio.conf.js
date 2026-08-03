const path = require('path');

exports.config = {
    runner: 'local',
    port: 4723,
    path: '/',
    specs: [
        './specs/**/*.spec.js'
    ],
    exclude: [],
    maxInstances: 1,
    capabilities: [{
        platformName: 'Android',
        'appium:deviceName': 'Android Emulator',
        'appium:platformVersion': '13.0',
        'appium:automationName': 'UiAutomator2',
        'appium:app': path.join(__dirname, '../../apps/mobile/build/app-release.apk'),
        'appium:appPackage': 'com.kaviyavarshini08.privacyshield',
        'appium:appActivity': '.MainActivity',
        'appium:noReset': true
    }],
    logLevel: 'warn',
    bail: 0,
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    }
};
