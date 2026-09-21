import {
	getFileStore,
	createEncryptedFileStore,
	fileWrite,
	fileRead,
	fileReadBuffer,
	fileExists,
	fileDelete,
	fileList,
	fileWriteJSON,
	fileReadJSON
} from '../../../src/common/runtime/filestore.library.js';

describe('filestore.library', () => {
	const masterPassword = 'secure-master-password-123';

	describe('initialization & password enforcement', () => {
		it('throws an error if no password is provided', async () => {
			// @ts-ignore
			await expect(getFileStore()).rejects.toThrow(
				'FileStore: A non-empty password is required. All virtual file stores must be encrypted at-rest.'
			);
			// @ts-ignore
			await expect(getFileStore('')).rejects.toThrow(
				'FileStore: A non-empty password is required. All virtual file stores must be encrypted at-rest.'
			);
			// @ts-ignore
			await expect(getFileStore({ password: '   ' })).rejects.toThrow(
				'FileStore: A non-empty password is required. All virtual file stores must be encrypted at-rest.'
			);
		});

		it('creates a VirtualFileStore instance with string password or options object', async () => {
			const store1 = await getFileStore(masterPassword);
			expect(store1).toBeDefined();
			expect(typeof store1.read).toBe('function');
			expect(typeof store1.write).toBe('function');

			const store2 = await createEncryptedFileStore({ password: masterPassword, namespace: 'app-data' });
			expect(store2).toBeDefined();
		});
	});

	describe('VirtualFileStore operations', () => {
		it('writes and reads encrypted text files', async () => {
			const store = await getFileStore({ password: masterPassword, namespace: 'docs' });
			const filePath = 'notes/readme.txt';
			const content = 'This is an encrypted document content.';

			await store.write(filePath, content);

			const exists = await store.exists(filePath);
			expect(exists).toBe(true);

			const readContent = await store.read(filePath);
			expect(readContent).toBe(content);
		});

		it('returns null when reading non-existent files', async () => {
			const store = await getFileStore(masterPassword);
			const result = await store.read('missing/file.txt');
			expect(result).toBeNull();

			const bufferResult = await store.readBuffer('missing/file.bin');
			expect(bufferResult).toBeNull();
		});

		it('writes and reads binary buffers', async () => {
			const store = await getFileStore({ password: masterPassword, namespace: 'binaries' });
			const rawData = new Uint8Array([1, 2, 3, 4, 5, 255, 128, 64]);

			await store.write('data.bin', rawData);
			const readBuffer = await store.readBuffer('data.bin');

			expect(readBuffer).toBeInstanceOf(Uint8Array);
			expect(Array.from(readBuffer!)).toEqual(Array.from(rawData));
		});

		it('supports JSON read and write with fallback', async () => {
			const store = await getFileStore({ password: masterPassword, namespace: 'configs' });
			const payload = { theme: 'dark', apiVersion: 'v2', debug: true, count: 100 };

			await store.writeJSON('settings.json', payload);
			const readData = await store.readJSON('settings.json');
			expect(readData).toEqual(payload);

			const missingFallback = await store.readJSON('not-found.json', { default: true });
			expect(missingFallback).toEqual({ default: true });
		});

		it('lists and deletes stored files', async () => {
			const store = await getFileStore({ password: masterPassword, namespace: 'temp-dir' });

			await store.write('file1.txt', '1');
			await store.write('file2.txt', '2');

			const list = await store.list();
			expect(list.some(f => f.includes('file1.txt'))).toBe(true);
			expect(list.some(f => f.includes('file2.txt'))).toBe(true);

			const deleted = await store.delete('file1.txt');
			expect(deleted).toBe(true);

			const stillExists = await store.exists('file1.txt');
			expect(stillExists).toBe(false);
		});

		it('returns only immediate child segments and deduplicates directories in list', async () => {
			const store = await getFileStore({ password: masterPassword, namespace: 'nested-dir' });

			await store.write('nested/sub1/a.txt', 'a');
			await store.write('nested/sub1/b.txt', 'b');
			await store.write('nested/sub2/c.txt', 'c');
			await store.write('nested/root-file.txt', 'root');

			const items = await store.list('nested');
			expect(items.sort()).toEqual(['root-file.txt', 'sub1', 'sub2']);
		});
	});

	describe('cryptographic security & isolation', () => {
		it('fails decryption when attempting to read with an incorrect password', async () => {
			const storeCorrect = await getFileStore({ password: 'correct-password', namespace: 'vault' });
			await storeCorrect.write('secrets.txt', 'Super secret data');

			const storeWrong = await getFileStore({ password: 'wrong-password', namespace: 'vault' });
			await expect(storeWrong.read('secrets.txt')).rejects.toThrow(
				'Cipher: Decryption failed. Incorrect password or data corrupted.'
			);
		});

		it('isolates different namespaces', async () => {
			const storeA = await getFileStore({ password: masterPassword, namespace: 'tenant-a' });
			const storeB = await getFileStore({ password: masterPassword, namespace: 'tenant-b' });

			await storeA.write('config.json', 'Config A');
			await storeB.write('config.json', 'Config B');

			expect(await storeA.read('config.json')).toBe('Config A');
			expect(await storeB.read('config.json')).toBe('Config B');
		});
	});

	describe('standalone convenience helpers', () => {
		it('performs direct file operations with explicit password parameter', async () => {
			const path = 'standalone/test.json';
			const testData = { enabled: true, tags: ['crypto', 'vfs'] };

			await fileWriteJSON(path, testData, masterPassword);
			expect(await fileExists(path)).toBe(true);

			const readData = await fileReadJSON(path, masterPassword);
			expect(readData).toEqual(testData);

			const rawText = await fileRead(path, masterPassword);
			expect(typeof rawText).toBe('string');
			expect(JSON.parse(rawText!)).toEqual(testData);

			const rawBuf = await fileReadBuffer(path, masterPassword);
			expect(rawBuf).toBeInstanceOf(Uint8Array);

			const deleted = await fileDelete(path);
			expect(deleted).toBe(true);
			expect(await fileExists(path)).toBe(false);
		});
	});
});
