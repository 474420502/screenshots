import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveOperationLayout } from '../lib/Screenshots/operationItems.js';

function getNonDividerKeys(layout) {
    return layout.items
        .filter((item) => item.type !== 'divider')
        .map((item) => item.key);
}

test('default custom operations are inserted before confirm actions', () => {
    const layout = resolveOperationLayout([
        {
            key: 'ocr',
            title: 'OCR',
        },
    ]);

    assert.equal(layout.errors.length, 0);
    assert.deepEqual(getNonDividerKeys(layout).slice(-5), [
        'Redo',
        'ocr',
        'Save',
        'Cancel',
        'Ok',
    ]);
});

test('custom operations can anchor after an earlier custom operation', () => {
    const layout = resolveOperationLayout([
        {
            key: 'ocr',
            title: 'OCR',
        },
        {
            key: 'ask-ai',
            title: 'Ask AI',
            position: { after: 'ocr' },
        },
    ]);

    assert.equal(layout.errors.length, 0);
    assert.deepEqual(getNonDividerKeys(layout).slice(-6), [
        'Redo',
        'ocr',
        'ask-ai',
        'Save',
        'Cancel',
        'Ok',
    ]);
});

test('duplicate or reserved custom keys are rejected', () => {
    const layout = resolveOperationLayout([
        {
            key: 'Save',
            title: 'Invalid Save',
        },
        {
            key: 'ocr',
            title: 'OCR',
        },
        {
            key: 'ocr',
            title: 'OCR duplicate',
        },
    ]);

    assert.deepEqual(
        layout.errors.map((error) => error.code),
        ['duplicate-key', 'duplicate-key'],
    );
    assert.deepEqual(getNonDividerKeys(layout).filter((key) => key === 'ocr'), [
        'ocr',
    ]);
});

test('unknown anchors are rejected instead of silently appending', () => {
    const layout = resolveOperationLayout([
        {
            key: 'ocr',
            title: 'OCR',
            position: { after: 'missing-anchor' },
        },
    ]);

    assert.deepEqual(layout.errors, [
        {
            code: 'missing-anchor',
            key: 'ocr',
            anchor: 'missing-anchor',
            message:
                'Custom operation key "ocr" references unknown anchor "missing-anchor".',
        },
    ]);
    assert.equal(getNonDividerKeys(layout).includes('ocr'), false);
});