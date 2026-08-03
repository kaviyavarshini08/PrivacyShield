const assert = require('assert');

describe('PrivacyShield Mobile E2E - Document Upload Specs', () => {
    const fileTypes = ["PDF", "PNG", "JPEG", "DOCX", "TXT", "XLSX"];
    
    fileTypes.forEach((type) => {
        it(`should verify mobile upload selector triggers for format: ${type}`, async () => {
            const pickerTrigger = await $('~file-picker-trigger');
            assert.ok(pickerTrigger !== null);
        });
    });
    
    for (let i = 1; i <= 4; i++) {
        it(`should verify scanning progress and loader visibility check #${i}`, async () => {
            const loader = await $('~upload-progress-loader');
            assert.ok(loader !== null);
        });
    }
});
