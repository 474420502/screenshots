import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getOperationItemHandlers,
    mapOperationItemsForRenderer,
    updateOperationItem,
} from '../lib/operationItems.js';

test('mapOperationItemsForRenderer strips runtime handlers before renderer transport', () => {
    const handler = () => { };
    const items = [
        {
            key: 'ocr',
            title: 'OCR',
            label: 'OCR',
            handler,
        },
    ];

    assert.deepEqual(mapOperationItemsForRenderer(items), [
        {
            key: 'ocr',
            title: 'OCR',
            label: 'OCR',
        },
    ]);
});

test('mapOperationItemsForRenderer applies requiresSelection without leaking it to renderer payloads', () => {
    const items = [
        {
            key: 'ocr',
            title: 'OCR',
            requiresSelection: true,
        },
        {
            key: 'ask-ai',
            title: 'Ask AI',
            requiresSelection: true,
            disabled: true,
        },
    ];

    assert.deepEqual(mapOperationItemsForRenderer(items, { hasSelection: false }), [
        {
            key: 'ocr',
            title: 'OCR',
            disabled: true,
        },
        {
            key: 'ask-ai',
            title: 'Ask AI',
            disabled: true,
        },
    ]);

    assert.deepEqual(mapOperationItemsForRenderer(items, { hasSelection: true }), [
        {
            key: 'ocr',
            title: 'OCR',
            disabled: false,
        },
        {
            key: 'ask-ai',
            title: 'Ask AI',
            disabled: true,
        },
    ]);
});

test('getOperationItemHandlers collects inline handlers by key', () => {
    const ocrHandler = () => 'ocr';
    const askAiHandler = () => 'ask-ai';
    const handlers = getOperationItemHandlers([
        {
            key: 'ocr',
            title: 'OCR',
            handler: ocrHandler,
        },
        {
            key: 'ask-ai',
            title: 'Ask AI',
            handler: askAiHandler,
        },
        {
            key: 'plain',
            title: 'Plain',
        },
    ]);

    assert.equal(handlers.get('ocr'), ocrHandler);
    assert.equal(handlers.get('ask-ai'), askAiHandler);
    assert.equal(handlers.has('plain'), false);
});

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