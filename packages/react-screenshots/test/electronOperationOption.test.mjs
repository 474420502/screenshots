import test from 'node:test';
import assert from 'node:assert/strict';
import { Fragment, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderElectronOperationOption } from '../lib/electron/operationOption.js';

test('renderElectronOperationOption renders plain text results as a panel', () => {
    const markup = renderToStaticMarkup(
        createElement(
            Fragment,
            null,
            renderElectronOperationOption('line 1\nline 2'),
        ),
    );

    assert.match(markup, /screenshots-electron-option-panel/);
    assert.match(markup, /screenshots-electron-option-text/);
    assert.match(markup, /line 1/);
    assert.match(markup, /line 2/);
});

test('renderElectronOperationOption renders structured key-value results', () => {
    const markup = renderToStaticMarkup(
        createElement(
            Fragment,
            null,
            renderElectronOperationOption({
                type: 'key-value',
                title: 'OCR Result',
                description: 'Recognized metadata',
                items: [
                    { label: 'Language', value: 'zh-CN' },
                    { label: 'Confidence', value: '0.98' },
                ],
            }),
        ),
    );

    assert.match(markup, /OCR Result/);
    assert.match(markup, /Recognized metadata/);
    assert.match(markup, /Language/);
    assert.match(markup, /zh-CN/);
    assert.match(markup, /Confidence/);
    assert.match(markup, /0.98/);
});