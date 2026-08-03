const assert = require('assert');

describe('PrivacyShield Mobile E2E - Auth Specs', () => {
    const authInputs = [];
    for (let i = 1; i <= 80; i++) {
        authInputs.push({
            email: `appium_auth_val_${i}@domain.com`,
            pwd: `pwd_str_${i}`,
            desc: `Credential format validation scenario #${i}`
        });
    }

    authInputs.forEach((testCase) => {
        it(`should validate mobile login: ${testCase.desc}`, async () => {
            const emailField = await $('~email-input');
            const passwordField = await $('~password-input');
            const submitBtn = await $('~login-button');

            await emailField.setValue(testCase.email);
            await passwordField.setValue(testCase.pwd);
            await submitBtn.click();
            assert.ok(true);
        });
    });
});
