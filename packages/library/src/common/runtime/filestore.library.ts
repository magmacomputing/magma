/**
 * Universal Virtual File Store (VFS) abstraction.
 * Enforces authenticated AES-GCM encryption-at-rest with PBKDF2 key derivation.
 *
 * Dispatches asynchronously to:
 * - Browser: Origin Private File System (OPFS) via navigator.storage.getDirectory()
 * - Server: Sandboxed file operations via node:fs/promises
 * - Fallback: In-memory virtual filesystem for restricted sandboxes
 */

import { CONTEXT, getContext } from '#library/utility.library.js';
import { objectify, stringify } from '#library/serialize.library.js';
import { encryptWithPassword, decryptWithPassword } from '#library/cipher.library.js';
import { Logger } from '#library/logger.class.js';

const log = new Logger('[FileStore]');
const context = getContext();

/**
 * Options required to initialize an encrypted Virtual File Store.
 */
export interface FileStoreOptions {
	/** Secret password or passphrase used for PBKDF2 key derivation and AES-GCM encryption */
	password: string;
	/** Optional directory prefix/namespace */
	namespace?: string;
	/** Optional PBKDF2 iteration count (default: 100,000) */
	iterations?: number;
}

/**
 * Universal interface for asynchronous encrypted virtual file operations.
 */
export interface VirtualFileStore {
	read(path: string): Promise<string | null>;
	readBuffer(path: string): Promise<Uint8Array | null>;
	write(path: string, content: string | BufferSource | Uint8Array): Promise<void>;
	delete(path: string): Promise<boolean>;
	exists(path: string): Promise<boolean>;
	list(dir?: string): Promise<string[]>;
	readJSON<T = any>(path: string, fallback?: T): Promise<T | null>;
	writeJSON(path: string, data: any): Promise<void>;
}

/**
 * Low-level unencrypted storage provider interface.
 */
interface RawStorageProvider {
	readBuffer(path: string): Promise<ArrayBuffer | Uint8Array | null>;
	write(path: string, content: Uint8Array): Promise<void>;
	delete(path: string): Promise<boolean>;
	exists(path: string): Promise<boolean>;
	list(dir?: string): Promise<string[]>;
}

// In-Memory Fallback File Map for restricted environments
const memoryVFS = new Map<string, Uint8Array>();

const memoryRawProvider: RawStorageProvider = {
	async readBuffer(path: string): Promise<Uint8Array | null> {
		return memoryVFS.get(path) ?? null;
	},
	async write(path: string, content: Uint8Array): Promise<void> {
		memoryVFS.set(path, content);
	},
	async delete(path: string): Promise<boolean> {
		return memoryVFS.delete(path);
	},
	async exists(path: string): Promise<boolean> {
		return memoryVFS.has(path);
	},
	async list(dir = ''): Promise<string[]> {
		const prefix = dir ? (dir.endsWith('/') ? dir : dir + '/') : '';
		const entries = new Set<string>();
		for (const key of memoryVFS.keys()) {
			if (!prefix || key.startsWith(prefix)) {
				const rest = key.slice(prefix.length);
				if (rest.length > 0) {
					const segment = rest.split('/')[0];
					if (segment) entries.add(segment);
				}
			}
		}
		return Array.from(entries);
	}
};

let rawProviderPromise: Promise<RawStorageProvider> | null = null;

async function getRawProvider(): Promise<RawStorageProvider> {
	if (!rawProviderPromise) {
		rawProviderPromise = (async () => {
			if (context.type === CONTEXT.Browser || context.type === CONTEXT.WebWorker) {
				const { isOPFSSupported, opfsReadBuffer, opfsWrite, opfsDelete, opfsExists, opfsList } =
					await import('#browser/opfs.library.js');

				if (isOPFSSupported()) {
					return {
						readBuffer: opfsReadBuffer,
						write: (p: string, c: Uint8Array) => opfsWrite(p, c as unknown as BufferSource),
						delete: opfsDelete,
						exists: opfsExists,
						list: opfsList
					};
				}
			} else if (context.type === CONTEXT.NodeJS) {
				const { serverReadBuffer, serverWrite, serverDelete, serverExists, serverList } =
					await import('#server/filestore.library.js');

				return {
					readBuffer: (p: string) => serverReadBuffer(p),
					write: (p: string, c: Uint8Array) => serverWrite(p, c),
					delete: (p: string) => serverDelete(p),
					exists: (p: string) => serverExists(p),
					list: (d?: string) => serverList(d)
				};
			}
			return memoryRawProvider;
		})().catch(err => {
			rawProviderPromise = null;
			throw err;
		});
	}
	return rawProviderPromise;
}

function resolveNamespacedPath(path: string, namespace?: string): string {
	if (!namespace) return path;
	const cleanNs = namespace.replace(/^\/+|\/+$/g, '');
	const cleanPath = path.replace(/^\/+/, '');
	return `${cleanNs}/${cleanPath}`;
}

/**
 * Creates or retrieves an encrypted Virtual File Store.
 * A non-empty password is required. All data stored is encrypted at-rest using AES-GCM (256-bit).
 *
 * @param options - Encryption password string or FileStoreOptions object
 * @returns Encrypted VirtualFileStore instance
 */
export async function getFileStore(options: FileStoreOptions | string): Promise<VirtualFileStore> {
	const config: FileStoreOptions = typeof options === 'string' ? { password: options } : options;
	if (!config || !config.password || typeof config.password !== 'string' || config.password.trim() === '') {
		throw new Error('FileStore: A non-empty password is required. All virtual file stores must be encrypted at-rest.');
	}

	const { password, namespace, iterations = 100_000 } = config;
	const provider = await getRawProvider();

	const store: VirtualFileStore = {
		async read(path: string): Promise<string | null> {
			const target = resolveNamespacedPath(path, namespace);
			const raw = await provider.readBuffer(target);
			if (raw === null) return null;
			const decrypted = await decryptWithPassword(raw, password, iterations);
			return new TextDecoder().decode(decrypted);
		},

		async readBuffer(path: string): Promise<Uint8Array | null> {
			const target = resolveNamespacedPath(path, namespace);
			const raw = await provider.readBuffer(target);
			if (raw === null) return null;
			return decryptWithPassword(raw, password, iterations);
		},

		async write(path: string, content: string | BufferSource | Uint8Array): Promise<void> {
			const target = resolveNamespacedPath(path, namespace);
			const encrypted = await encryptWithPassword(content, password, iterations);
			await provider.write(target, encrypted);
		},

		async delete(path: string): Promise<boolean> {
			const target = resolveNamespacedPath(path, namespace);
			return provider.delete(target);
		},

		async exists(path: string): Promise<boolean> {
			const target = resolveNamespacedPath(path, namespace);
			return provider.exists(target);
		},

		async list(dir = ''): Promise<string[]> {
			const target = resolveNamespacedPath(dir, namespace);
			return provider.list(target);
		},

		async readJSON<T = any>(path: string, fallback?: T): Promise<T | null> {
			const raw = await store.read(path);
			if (raw === null) return fallback ?? null;
			try {
				const parsed = objectify<T>(raw);
				return parsed !== undefined ? parsed : (fallback ?? null);
			} catch {
				return fallback ?? null;
			}
		},

		async writeJSON(path: string, data: any): Promise<void> {
			await store.write(path, stringify(data));
		}
	};

	return store;
}

/**
 * Convenience alias for getFileStore.
 */
export const createEncryptedFileStore = getFileStore;

/**
 * Reads an encrypted text file from the default Virtual File Store.
 * 
 * @param path - Virtual relative path
 * @param password - Decryption password
 */
export async function fileRead(path: string, password: string): Promise<string | null> {
	const store = await getFileStore(password);
	return store.read(path);
}

/**
 * Reads an encrypted binary file as a Uint8Array from the default Virtual File Store.
 * 
 * @param path - Virtual relative path
 * @param password - Decryption password
 */
export async function fileReadBuffer(path: string, password: string): Promise<Uint8Array | null> {
	const store = await getFileStore(password);
	return store.readBuffer(path);
}

/**
 * Encrypts and writes data to the default Virtual File Store.
 * 
 * @param path - Virtual relative path
 * @param content - String or binary payload
 * @param password - Encryption password
 */
export async function fileWrite(
	path: string,
	content: string | BufferSource | Uint8Array,
	password: string
): Promise<void> {
	const store = await getFileStore(password);
	return store.write(path, content);
}

/**
 * Deletes a file from the default Virtual File Store.
 * 
 * @param path - Virtual relative path
 */
export async function fileDelete(path: string): Promise<boolean> {
	const provider = await getRawProvider();
	return provider.delete(path);
}

/**
 * Checks whether a file exists in the default Virtual File Store.
 * 
 * @param path - Virtual relative path
 */
export async function fileExists(path: string): Promise<boolean> {
	const provider = await getRawProvider();
	return provider.exists(path);
}

/**
 * Lists entry names within a virtual directory.
 * 
 * @param dir - Optional subdirectory
 */
export async function fileList(dir = ''): Promise<string[]> {
	const provider = await getRawProvider();
	return provider.list(dir);
}

/**
 * Reads and decrypts a JSON file from the default Virtual File Store.
 * 
 * @param path - Virtual relative path
 * @param password - Decryption password
 * @param fallback - Optional fallback value
 */
export async function fileReadJSON<T = any>(path: string, password: string, fallback?: T): Promise<T | null> {
	const store = await getFileStore(password);
	return store.readJSON<T>(path, fallback);
}

/**
 * Serializes, encrypts, and writes data to a JSON file in the default Virtual File Store.
 * 
 * @param path - Virtual relative path
 * @param data - Object or value to store
 * @param password - Encryption password
 */
export async function fileWriteJSON(path: string, data: any, password: string): Promise<void> {
	const store = await getFileStore(password);
	return store.writeJSON(path, data);
}
