import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

import {
	serverRead,
	serverReadBuffer,
	serverWrite,
	serverDelete,
	serverExists,
	serverList,
	serverReadJSON,
	serverWriteJSON
} from '../../src/server/filestore.library.js';

describe('server/filestore.library', () => {
	const testRoot = path.join(os.tmpdir(), `magma_server_test_${Date.now()}`);

	afterAll(async () => {
		try {
			await fs.rm(testRoot, { recursive: true, force: true });
		} catch {
			// ignore cleanup error
		}
	});

	it('writes and reads text and binary files within sandbox', async () => {
		await serverWrite('test.txt', 'hello server', testRoot);
		expect(await serverExists('test.txt', testRoot)).toBe(true);

		const text = await serverRead('test.txt', testRoot);
		expect(text).toBe('hello server');

		const buf = await serverReadBuffer('test.txt', testRoot);
		expect(buf).toBeInstanceOf(Buffer);
		expect(buf?.toString('utf8')).toBe('hello server');

		const deleted = await serverDelete('test.txt', testRoot);
		expect(deleted).toBe(true);
		expect(await serverExists('test.txt', testRoot)).toBe(false);
	});

	it('writes and reads JSON objects', async () => {
		const data = { alpha: 1, beta: 'two' };
		await serverWriteJSON('data.json', data, testRoot);
		const readData = await serverReadJSON('data.json', undefined, testRoot);
		expect(readData).toEqual(data);
	});

	it('lists files in directory', async () => {
		await serverWrite('sub/file1.txt', '1', testRoot);
		await serverWrite('sub/file2.txt', '2', testRoot);

		const files = await serverList('sub', testRoot);
		expect(files).toContain('file1.txt');
		expect(files).toContain('file2.txt');
	});

	it('rejects path traversal attempts escaping sandbox', async () => {
		await expect(serverWrite('../outside.txt', 'hacked', testRoot)).rejects.toThrow(
			/Path traversal denied/
		);
		// serverRead catches errors and safely returns null
		expect(await serverRead('../outside.txt', testRoot)).toBeNull();
		expect(await serverRead('foo/../../outside.txt', testRoot)).toBeNull();
	});

	it('rejects prefix collision attacks (e.g. sandbox_other dir)', async () => {
		const baseDir = path.join(os.tmpdir(), 'magma_sandbox_base');
		const siblingDir = path.join(os.tmpdir(), 'magma_sandbox_base_other');
		const traversalPath = `../${path.basename(siblingDir)}/leak.txt`;

		await expect(serverWrite(traversalPath, 'leak', baseDir)).rejects.toThrow(
			/Path traversal denied/
		);
	});

	it('rejects symlink traversal pointing outside the sandbox', async () => {
		const outsideDir = path.join(os.tmpdir(), `magma_outside_${Date.now()}`);
		const sandboxDir = path.join(os.tmpdir(), `magma_sandbox_sym_${Date.now()}`);
		await fs.mkdir(outsideDir, { recursive: true });
		await fs.mkdir(sandboxDir, { recursive: true });

		try {
			await fs.symlink(outsideDir, path.join(sandboxDir, 'sym_link'), 'dir');
			await expect(serverWrite('sym_link/stolen.txt', 'evil', sandboxDir)).rejects.toThrow(
				/Path traversal denied/
			);
		} finally {
			await fs.rm(outsideDir, { recursive: true, force: true });
			await fs.rm(sandboxDir, { recursive: true, force: true });
		}
	});
});
