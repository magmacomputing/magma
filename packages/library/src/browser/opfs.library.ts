/**
 * Browser-only Origin Private File System (OPFS) utilities.
 * Provides high-performance, private, origin-isolated virtual filesystem access
 * without polluting the global DOM or exposing secrets to localStorage inspectors.
 */

import { objectify, stringify } from '#library/serialize.library.js';
import { Logger } from '#library/logger.class.js';

const log = new Logger('[OPFS]');

/**
 * Checks whether the Origin Private File System (OPFS) is supported in the current environment.
 */
export function isOPFSSupported(): boolean {
	return typeof navigator !== 'undefined' &&
		Boolean(navigator.storage?.getDirectory);
}

/**
 * Traverses or creates nested directory handles for a given path.
 * 
 * @param root - The base directory handle
 * @param pathParts - Array of subdirectory names
 * @param create - Whether to create directories if they don't exist
 * @returns The target directory handle, or null if not found
 */
async function resolveDirHandle(
	root: FileSystemDirectoryHandle,
	pathParts: string[],
	create = false
): Promise<FileSystemDirectoryHandle | null> {
	let current = root;
	for (const part of pathParts) {
		if (!part || part === '.') continue;
		try {
			current = await current.getDirectoryHandle(part, { create });
		} catch {
			return null;
		}
	}
	return current;
}

/**
 * Splits a file path into directory segments and filename.
 */
function parseFilePath(filePath: string): { dirParts: string[]; fileName: string } {
	const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
	const segments = normalized.split('/');
	const fileName = segments.pop() || '';
	return { dirParts: segments, fileName };
}

/**
 * Retrieves the root directory handle for the Origin Private File System (OPFS).
 * 
 * @param subDir - Optional sub-directory path to navigate into
 * @param create - Whether to create sub-directories if they do not exist (default: true)
 * @returns The directory handle or null if unsupported/unavailable
 */
export async function getOPFSRoot(subDir?: string, create = true): Promise<FileSystemDirectoryHandle | null> {
	if (!isOPFSSupported()) return null;
	try {
		const root = await navigator.storage.getDirectory();
		if (!subDir) return root;
		const parts = subDir.replace(/\\/g, '/').split('/').filter(Boolean);
		return await resolveDirHandle(root, parts, create);
	} catch (err) {
		log.warn('Failed to access OPFS root:', err);
		return null;
	}
}

/**
 * Reads a text file from the browser OPFS virtual filesystem.
 * 
 * @param path - Virtual path relative to OPFS root (e.g. "keys/openai.json")
 * @returns The string file contents, or null if file not found
 */
export async function opfsRead(path: string): Promise<string | null> {
	if (!isOPFSSupported()) return null;
	try {
		const root = await navigator.storage.getDirectory();
		const { dirParts, fileName } = parseFilePath(path);
		const dirHandle = await resolveDirHandle(root, dirParts, false);
		if (!dirHandle || !fileName) return null;

		const fileHandle = await dirHandle.getFileHandle(fileName);
		const file = await fileHandle.getFile();
		return await file.text();
	} catch (err: any) {
		if (err.name === 'NotFoundError') return null;
		log.warn(`Failed to read OPFS file "${path}":`, err);
		return null;
	}
}

/**
 * Reads a binary file as an ArrayBuffer from the browser OPFS.
 * 
 * @param path - Virtual path relative to OPFS root
 * @returns ArrayBuffer containing binary data, or null if file not found
 */
export async function opfsReadBuffer(path: string): Promise<ArrayBuffer | null> {
	if (!isOPFSSupported()) return null;
	try {
		const root = await navigator.storage.getDirectory();
		const { dirParts, fileName } = parseFilePath(path);
		const dirHandle = await resolveDirHandle(root, dirParts, false);
		if (!dirHandle || !fileName) return null;

		const fileHandle = await dirHandle.getFileHandle(fileName);
		const file = await fileHandle.getFile();
		return await file.arrayBuffer();
	} catch (err: any) {
		if (err.name === 'NotFoundError') return null;
		log.warn(`Failed to read OPFS buffer "${path}":`, err);
		return null;
	}
}

/**
 * Writes text or binary data to a file in the browser OPFS virtual filesystem.
 * Automatically creates parent directories as needed.
 * 
 * @param path - Virtual path relative to OPFS root (e.g. "vault/credentials.json")
 * @param content - String, ArrayBuffer, or Uint8Array data to write
 */
export async function opfsWrite(path: string, content: string | BufferSource): Promise<void> {
	if (!isOPFSSupported()) {
		throw new Error('OPFS is not supported in this browser environment.');
	}
	const root = await navigator.storage.getDirectory();
	const { dirParts, fileName } = parseFilePath(path);
	if (!fileName) throw new Error(`Invalid file path: "${path}"`);

	const dirHandle = await resolveDirHandle(root, dirParts, true);
	if (!dirHandle) throw new Error(`Failed to resolve directory for path: "${path}"`);

	const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
	const writable = await fileHandle.createWritable();
	await writable.write(content);
	await writable.close();
}

/**
 * Deletes a file from the browser OPFS.
 * 
 * @param path - Virtual path relative to OPFS root
 * @returns True if deleted successfully, false if file did not exist
 */
export async function opfsDelete(path: string): Promise<boolean> {
	if (!isOPFSSupported()) return false;
	try {
		const root = await navigator.storage.getDirectory();
		const { dirParts, fileName } = parseFilePath(path);
		const dirHandle = await resolveDirHandle(root, dirParts, false);
		if (!dirHandle || !fileName) return false;

		await dirHandle.removeEntry(fileName);
		return true;
	} catch (err: any) {
		if (err.name === 'NotFoundError') return false;
		log.warn(`Failed to delete OPFS file "${path}":`, err);
		return false;
	}
}

/**
 * Checks whether a file exists in the browser OPFS.
 * 
 * @param path - Virtual path relative to OPFS root
 */
export async function opfsExists(path: string): Promise<boolean> {
	if (!isOPFSSupported()) return false;
	try {
		const root = await navigator.storage.getDirectory();
		const { dirParts, fileName } = parseFilePath(path);
		const dirHandle = await resolveDirHandle(root, dirParts, false);
		if (!dirHandle || !fileName) return false;

		await dirHandle.getFileHandle(fileName);
		return true;
	} catch {
		return false;
	}
}

/**
 * Lists all file and subdirectory names within a given OPFS directory.
 * 
 * @param dir - Optional subdirectory path (default: root)
 * @returns Array of entry names
 */
export async function opfsList(dir = ''): Promise<string[]> {
	if (!isOPFSSupported()) return [];
	try {
		const root = await navigator.storage.getDirectory();
		const parts = dir.replace(/\\/g, '/').split('/').filter(Boolean);
		const dirHandle = await resolveDirHandle(root, parts, false);
		if (!dirHandle) return [];

		const entries: string[] = [];
		// @ts-ignore - async iterator on FileSystemDirectoryHandle
		for await (const name of dirHandle.keys()) {
			entries.push(name);
		}
		return entries;
	} catch (err) {
		log.warn(`Failed to list OPFS directory "${dir}":`, err);
		return [];
	}
}

/**
 * Reads and deserializes a JSON file from OPFS.
 * 
 * @param path - Virtual path relative to OPFS root
 * @param fallback - Default value if file not found or invalid
 */
export async function opfsReadJSON<T = any>(path: string, fallback?: T): Promise<T | null> {
	const raw = await opfsRead(path);
	if (raw === null) return fallback ?? null;
	try {
		return objectify<T>(raw) ?? fallback ?? null;
	} catch {
		return fallback ?? null;
	}
}

/**
 * Serializes and writes an object or value to a JSON file in OPFS.
 * 
 * @param path - Virtual path relative to OPFS root
 * @param data - Object or value to serialize
 */
export async function opfsWriteJSON(path: string, data: any): Promise<void> {
	const str = stringify(data);
	await opfsWrite(path, str);
}
