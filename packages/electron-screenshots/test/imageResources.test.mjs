import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ImageResourceStore } from '../lib/imageResources.js';

async function pathExists(filePath) {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

test('ImageResourceStore creates and revokes a png resource from a buffer', async () => {
    const directory = await mkdtemp(
        path.join(os.tmpdir(), 'screenshots-resource-buffer-'),
    );
    const store = new ImageResourceStore();
    const resource = await store.create(Buffer.from('png-data'), {
        directory,
        fileNamePrefix: 'ocr',
    });

    assert.match(resource.filePath, /ocr-.*\.png$/);
    assert.equal(resource.mimeType, 'image/png');
    assert.equal(resource.size, Buffer.byteLength('png-data'));
    assert.equal(store.get(resource.token)?.filePath, resource.filePath);
    assert.equal(store.getPath(resource.token), resource.filePath);
    assert.equal(await pathExists(resource.filePath), true);

    assert.equal(await store.revoke(resource.token), true);
    assert.equal(await pathExists(resource.filePath), false);
    assert.equal(store.get(resource.token), undefined);

    await rm(directory, { force: true, recursive: true });
});

test('ImageResourceStore creates resources from data URLs and clear removes all files', async () => {
    const directory = await mkdtemp(
        path.join(os.tmpdir(), 'screenshots-resource-data-url-'),
    );
    const store = new ImageResourceStore();
    const resource = await store.create(
        'data:image/png;base64,c2NyZWVuc2hvdHM=',
        {
            directory,
            fileNamePrefix: 'history-item',
        },
    );

    assert.match(resource.filePath, /history-item-.*\.png$/);
    assert.equal(resource.mimeType, 'image/png');
    assert.equal(await readFile(resource.filePath, 'utf8'), 'screenshots');

    await store.clear();

    assert.equal(await pathExists(resource.filePath), false);
    assert.equal(store.get(resource.token), undefined);

    await rm(directory, { force: true, recursive: true });
});