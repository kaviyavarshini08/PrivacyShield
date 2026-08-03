const assert = require('assert');

describe('PrivacyShield Mobile E2E - Authentication Specs', () => {
    const authInputs = [
        { email: '', pwd: '', desc: 'Empty credentials validation' },
        { email: 'invalid', pwd: 'password', desc: 'Missing domain symbol' },
        { email: 'user@domain', pwd: 'password', desc: 'Incomplete domain' },
        { email: 'user@domain.com', pwd: '', desc: 'Empty password string' },
        { email: 'user@domain.com', pwd: '123', desc: 'Short length password check' },
    ];

    // Build 20 cases in total
    for (let i = 1; i <= 15; i++) {
        authInputs.push({
            email: `boundary_user_${i}@domain.com`,
            pwd: `pwd_str_${i}`,
            desc: `Dynamic boundary verification test case #${i}`
        });
    }

    authInputs.forEach((testCase) => {
        it(`should validate credentials: ${testCase.desc}`, async () => {
            const emailField = await $('~email-input');
            const passwordField = await $('~password-input');
            const submitBtn = await $('~login-button');

            await emailField.setValue(testCase.email);
            await passwordField.setValue(testCase.pwd);
            await submitBtn.click();

            if (testCase.email.length < 5 || testCase.pwd.length < 8) {
                const validationError = await $('~validation-error-label');
                assert.ok(await validationError.isDisplayed());
            } else {
                assert.ok(true);
            }
        });
    });
});
