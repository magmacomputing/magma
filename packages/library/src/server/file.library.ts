import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { ifNumeric } from '#library/coercion.library.js';

/**
 * A utility class for sandboxed file operations within a temporary directory.
 * Prevents path traversal and forces all operations to occur in os.tmpdir().
 */
export class File {
	static tmpDir = os.tmpdir();
	static encoding: BufferEncoding = 'utf8';

	/**
	 * Safely resolves a filename within the target tmpDir.
	 * 
	 * @param filename - The filename to resolve
	 * @throws {Error} If path traversal is detected
	 * @returns The resolved absolute path
	 */
	private static _resolvePath(filename: string): string {
		if (path.isAbsolute(filename)) {
			throw new Error(`Absolute paths are not allowed: ${filename}`);
		}

		const baseDir = path.resolve(File.tmpDir);
		const targetPath = path.resolve(path.join(baseDir, filename));

		// Validation: targetPath must be within baseDir
		if (!targetPath.startsWith(baseDir) || path.relative(baseDir, targetPath).startsWith('..')) {
			throw new Error(`Path traversal detected: ${filename} is outside of the sandbox.`);
		}

		return targetPath;
	}

	/**
	 * Read a file's contents from the temporary directory.
	 * 
	 * @param file - The filename to read
	 * @returns A promise resolving to the file contents (coerced to number/bigint if applicable)
	 * @example
	 * ```ts
	 * const content = await File.read('data.txt');
	 * ```
	 */
	static read = (file: string): Promise<string | number | bigint> => new Promise<string | number | bigint>((resolve, reject) => {
		try {
			const target = File._resolvePath(file);
			fs.readFile(target, File.encoding, (err, data) => {
				if (err)
					return (err.code === 'ENOENT')
						? reject(new Error(`ENOENT: file not found: ${target}`))		// file not found
						: reject(err);																							// coerce to number if possible

				resolve(ifNumeric(data));
			});
		} catch (err) {
			reject(err);
		}
	})

	/**
	 * Write content to a file in the temporary directory.
	 * 
	 * @param file - The filename to write to
	 * @param doc - The content to write
	 * @returns A promise resolving to the written content
	 * @example
	 * ```ts
	 * await File.write('output.json', '{"status":"ok"}');
	 * ```
	 */
	static write = (file: string, doc: string | NodeJS.ArrayBufferView) => new Promise<string | NodeJS.ArrayBufferView>((resolve, reject) => {
		try {
			const target = File._resolvePath(file);
			fs.writeFile(target, doc, File.encoding, (err => err ? reject(err) : resolve(doc)));
		} catch (err) {
			reject(err);
		}
	})

	/**
	 * Check if a file exists in the temporary directory.
	 * 
	 * @param file - The filename to check
	 * @returns A promise resolving to true if the file exists, false otherwise
	 * @example
	 * ```ts
	 * const hasConfig = await File.exist('config.json');
	 * ```
	 */
	static exist = (file: string) => new Promise<boolean>((resolve, reject) => {
		try {
			const target = File._resolvePath(file);
			fs.access(target, (err =>
				err && err.code !== 'ENOENT'
					? reject(err)																			// anything other than 'file not-exists'
					: resolve(!err))
			);
		} catch (err) {
			reject(err);
		}
	})

	/**
	 * Remove a file from the temporary directory.
	 * 
	 * @param file - The filename to remove
	 * @returns A promise resolving when the file is deleted
	 * @example
	 * ```ts
	 * await File.remove('temp-data.txt');
	 * ```
	 */
	static remove = (file: string) => new Promise<void>((resolve, reject) => {
		try {
			const target = File._resolvePath(file);
			fs.unlink(target, (err =>
				err && err.code !== 'ENOENT'
					? reject(err)																			// anything other than 'file not-exists'
					: resolve())
			);
		} catch (err) {
			reject(err);
		}
	})
}
