import test from 'node:test';
import assert from 'node:assert/strict';
import { updateOperationItem } from '../lib/operationItems.js';

test('updateOperationItem patches the matching item without changing its key', () => {
    const items = [
        {
            key: 'ocr',
            title: 'OCR',
            checked: false,
            disabled: false,
        },
        {
            key: 'ask-ai',
            title: 'Ask AI',
            disabled: true,
        },
    ];

    const result = updateOperationItem(items, 'ocr', {
        checked: true,
        disabled: true,
        title: 'OCR Running',
        key: 'ignored-key',
    });

    assert.equal(result.updated, true);
    assert.deepEqual(result.items, [
        {
            key: 'ocr',
            title: 'OCR Running',
            checked: true,
            disabled: true,
        },
        {
            key: 'ask-ai',
            title: 'Ask AI',
            disabled: true,
        },
    ]);
    assert.notStrictEqual(result.items, items);
});

test('updateOperationItem returns the original items when the key does not exist', () => {
    const items = [
        {
            key: 'ocr',
            title: 'OCR',
            checked: false,
        },
    ];

    const result = updateOperationItem(items, 'missing', {
        checked: true,
    });

    assert.equal(result.updated, false);
    assert.strictEqual(result.items, items);
});