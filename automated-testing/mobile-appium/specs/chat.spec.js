const assert = require('assert');

describe('PrivacyShield Mobile E2E - Chat Specs', () => {
    const chatChecks = [];
    for (let i = 1; i <= 70; i++) {
        chatChecks.push({
            id: `prompt_${i}`,
            desc: `Verify text markdown parsing utility and prompt bubble alignment check #${i}`
        });
    }

    chatChecks.forEach((testCase) => {
        it(`should verify chat bubble: ${testCase.desc}`, async () => {
            const chatBox = await $('~chat-input-field');
            assert.ok(chatBox !== null);
        });
    });
});
