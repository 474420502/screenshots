import assert from 'node:assert/strict';
import test from 'node:test';

import {
    createEmptyHistory,
    resetHistoryState,
    resetScreenshotsState,
    setProgrammaticBounds,
    setTrackedOperation,
} from '../lib/Screenshots/stateTransitions.js';

test('setTrackedOperation emits operationChange only when the operation changes', () => {
    const calls = [];

    setTrackedOperation(
        {
            setOperation: (operation) => {
                calls.push(['setOperation', operation]);
            },
            emitEvent: (name, payload) => {
                calls.push(['emitEvent', name, payload]);
            },
        },
        'Text',
        'Brush',
    );

    assert.deepEqual(calls, [
        ['setOperation', 'Brush'],
        [
            'emitEvent',
            'operationChange',
            {
                operation: 'Brush',
                previousOperation: 'Text',
            },
        ],
    ]);

    calls.length = 0;

    setTrackedOperation(
        {
            setOperation: (operation) => {
                calls.push(['setOperation', operation]);
            },
            emitEvent: (name, payload) => {
                calls.push(['emitEvent', name, payload]);
            },
        },
        'Brush',
        'Brush',
    );

    assert.deepEqual(calls, []);
});

test('setProgrammaticBounds emits selectionChange and selectionEnd for action context updates', () => {
    const events = [];
    const bounds = {
        x: 1,
        y: 2,
        width: 30,
        height: 40,
    };

    setProgrammaticBounds(
        {
            setBounds: (nextBounds) => {
                events.push(['setBounds', nextBounds]);
            },
            emitEvent: (name, payload) => {
                events.push(['emitEvent', name, payload]);
            },
        },
        bounds,
    );

    setProgrammaticBounds(
        {
            setBounds: (nextBounds) => {
                events.push(['setBounds', nextBounds]);
            },
            emitEvent: (name, payload) => {
                events.push(['emitEvent', name, payload]);
            },
        },
        null,
    );

    assert.deepEqual(events, [
        ['setBounds', bounds],
        ['emitEvent', 'selectionChange', { bounds }],
        ['setBounds', null],
        ['emitEvent', 'selectionEnd', { bounds: null }],
    ]);
});

test('resetHistoryState restores empty history and emits a reset historyChange event', () => {
    const calls = [];
    const emptyHistory = createEmptyHistory();

    resetHistoryState({
        setHistory: (history) => {
            calls.push(['setHistory', history]);
        },
        emitEvent: (name, payload) => {
            calls.push(['emitEvent', name, payload]);
        },
    });

    assert.deepEqual(calls, [
        ['setHistory', emptyHistory],
        ['emitEvent', 'historyChange', { action: 'reset', history: emptyHistory }],
    ]);
});

test('resetScreenshotsState keeps reset event ordering after delegated resets', () => {
    const calls = [];

    resetScreenshotsState(
        {
            resetEmitter: () => {
                calls.push('resetEmitter');
            },
            resetHistory: () => {
                calls.push('resetHistory');
            },
            resetBounds: () => {
                calls.push('resetBounds');
            },
            resetCursor: () => {
                calls.push('resetCursor');
            },
            resetOperation: () => {
                calls.push('resetOperation');
            },
            emitEvent: (name, payload) => {
                calls.push(['emitEvent', name, payload]);
            },
        },
        'api',
    );

    assert.deepEqual(calls, [
        'resetEmitter',
        'resetHistory',
        'resetBounds',
        'resetCursor',
        'resetOperation',
        ['emitEvent', 'reset', { source: 'api' }],
    ]);
});