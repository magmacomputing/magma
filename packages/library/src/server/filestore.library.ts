/**
 * Server-only file storage utilities backed by node:fs/promises.
 * Provides safe, sandboxed file operations preventing path traversal.
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { objectify, stringify } from '#library/serialize.library.js';
import { Logger } from '#library/logger.class.js';

const log = new Logger('[ServerFileStore]');

/** Default sandbox root directory on server (e.g. OS tmpdir / magma_filestore) */
const DEFAULT_ROOT_DIR = path.join(os.tmpdir(), 'magma_filestore');

/**
 * Safely resolves and sandboxes a relative path within the base root directory.
 * Prevents directory traversal attacks.
 */
function resolveSandboxPath(filePath: string, rootDir = DEFAULT_ROOT_DIR): string {
	const base = path.resolve(rootDir);
	const target = path.resolve(base, filePath);
	const relative = path.relative(base, target);
	if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
		throw new Error(`Path traversal denied: "${filePath}" escapes sandbox "${base}"`);
	}
	return target;
}

/**
 * Reads a text file from the server sandboxed storage.
 * 
 * @param filePath - Relative path inside the sandboxed root
 * @param rootDir - Optional root directory override
 * @returns File content as string, or null if file not found
 */
export async function serverRead(filePath: string, rootDir?: string): Promise<string | null> {
	try {
		const target = resolveSandboxPath(filePath, rootDir);
		return await fs.readFile(target, 'utf8');
	} catch (err: any) {
		if (err.code === 'ENOENT') return null;
		log.warn(`Failed to read file "${filePath}":`, err);
		return null;
	}
}

/**
 * Reads a binary file as a Buffer from the server storage.
 * 
 * @param filePath - Relative path inside the sandboxed root
 * @param rootDir - Optional root directory override
 * @returns Buffer containing file bytes, or null if not found
 */
export async function serverReadBuffer(filePath: string, rootDir?: string): Promise<Buffer | null> {
	try {
		const target = resolveSandboxPath(filePath, rootDir);
		return await fs.readFile(target);
	} catch (err: any) {
		if (err.code === 'ENOENT') return null;
		log.warn(`Failed to read buffer "${filePath}":`, err);
		return null;
	}
}

/**
 * Writes text or binary data to a file in the server sandboxed storage.
 * Automatically creates parent directories as needed.
 * 
 * @param filePath - Relative path inside the sandboxed root
 * @param content - Text string or Buffer/Uint8Array
 * @param rootDir - Optional root directory override
 */
export async function serverWrite(
	filePath: string,
	content: string | NodeJS.ArrayBufferView,
	rootDir?: string
): Promise<void> {
	const target = resolveSandboxPath(filePath, rootDir);
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, content, typeof content === 'string' ? 'utf8' : undefined);
}

/**
 * Deletes a file from the server sandboxed storage.
 * 
 * @param filePath - Relative path inside the sandboxed root
 * @param rootDir - Optional root directory override
 * @returns True if deleted, false if file did not exist
 */
export async function serverDelete(filePath: string, rootDir?: string): Promise<boolean> {
	try {
		const target = resolveSandboxPath(filePath, rootDir);
		await fs.unlink(target);
		return true;
	} catch (err: any) {
		if (err.code === 'ENOENT') return false;
		log.warn(`Failed to delete file "${filePath}":`, err);
		return false;
	}
}

/**
 * Checks whether a file exists in the server sandboxed storage.
 * 
 * @param filePath - Relative path inside the sandboxed root
 * @param rootDir - Optional root directory override
 */
export async function serverExists(filePath: string, rootDir?: string): Promise<boolean> {
	try {
		const target = resolveSandboxPath(filePath, rootDir);
		await fs.access(target);
		return true;
	} catch {
		return false;
	}
}

/**
 * Lists all file names in a given subdirectory of the server storage.
 * 
 * @param dir - Optional subdirectory path
 * @param rootDir - Optional root directory override
 */
export async function serverList(dir = '', rootDir?: string): Promise<string[]> {
	try {
		const target = resolveSandboxPath(dir, rootDir);
		return await fs.readdir(target);
	} catch (err: any) {
		if (err.code === 'ENOENT') return [];
		log.warn(`Failed to list directory "${dir}":`, err);
		return [];
	}
}

/**
 * Reads and parses a JSON file from the server storage.
 * 
 * @param filePath - Relative path inside the sandboxed root
 * @param fallback - Default fallback if file does not exist or is invalid
 * @param rootDir - Optional root directory override
 */
export async function serverReadJSON<T = any>(
	filePath: string,
	fallback?: T,
	rootDir?: string
): Promise<T | null> {
	const raw = await serverRead(filePath, rootDir);
	if (raw === null) return fallback ?? null;
	try {
		return objectify<T>(raw) ?? fallback ?? null;
	} catch {
		return fallback ?? null;
	}
}

/**
 * Serializes and writes data to a JSON file in the server storage.
 * 
 * @param filePath - Relative path inside the sandboxed root
 * @param data - Data object or value to write
 * @param rootDir - Optional root directory override
 */
export async function serverWriteJSON(
	filePath: string,
	data: any,
	rootDir?: string
): Promise<void> {
	const str = stringify(data);
	await serverWrite(filePath, str, rootDir);
}
