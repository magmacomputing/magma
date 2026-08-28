import { stringify, objectify } from '#library/serialize.library.js';

const CHUNK_SIZE = 8192;

/**
 * Encodes a text string into a Uint8Array using UTF-8 encoding.
 *
 * @param text - The string to encode
 * @returns A Uint8Array containing the encoded text
 * @example
 * ```ts
 * const bytes = encodeText('Hello');
 * ```
 */
export const encodeText = (text: string) => new TextEncoder().encode(text);

/**
 * Serializes any object to a string and encodes it into a Uint8Array.
 * 
 * @param str - The object or string to serialize and encode
 * @returns A Uint8Array containing the encoded data
 * @example
 * ```ts
 * const buf = encodeBuffer({ a: 1 });
 * ```
 */
export const encodeBuffer = (str: any) => new TextEncoder().encode(stringify(str));

/**
 * Decodes a Uint8Array or ArrayBuffer back into a string.
 * 
 * @param buf - The buffer to decode
 * @param encoding - The text encoding to use (default: 'utf-8')
 * @returns The decoded string
 * @example
 * ```ts
 * const str = decodeBuffer(buf);
 * ```
 */
export const decodeBuffer = (buf: Uint8Array | ArrayBuffer, encoding = 'utf-8', options?: TextDecoderOptions) => new TextDecoder(encoding, options).decode(buf);

/**
 * Encodes a raw Uint8Array into a Base64 string.
 * Uses native `Buffer` in Node.js and fallbacks to `btoa` in browsers.
 * 
 * @param buffer - The raw Uint8Array to encode
 * @returns The Base64 string representation
 * @example
 * ```ts
 * const b64 = bufferToBase64(new Uint8Array([104, 105]));
 * ```
 */
export const bufferToBase64 = (buffer: Uint8Array) => {
	if (typeof Buffer !== 'undefined')
		return Buffer.from(buffer).toString('base64');

	let binary = '';
	for (let i = 0; i < buffer.length; i += CHUNK_SIZE)
		binary += String.fromCharCode.apply(null, buffer.subarray(i, i + CHUNK_SIZE) as unknown as number[]);

	return btoa(binary);
}

/**
 * Decodes a Base64 string into a raw Uint8Array.
 * Uses native `Buffer` in Node.js and fallbacks to `atob` in browsers.
 * 
 * @param base64 - The Base64 string to decode
 * @returns A Uint8Array of the decoded data
 * @example
 * ```ts
 * const buf = base64ToBuffer('aGk=');
 * ```
 */
export const base64ToBuffer = (base64: string) => {
	if (typeof Buffer !== 'undefined')
		return new Uint8Array(Buffer.from(base64, 'base64'));

	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);

	for (let i = 0; i < binary.length; i++)
		bytes[i] = binary.charCodeAt(i);

	return bytes;
}

/**
 * Serializes any object, encodes it to a buffer, and outputs a Base64 string.
 * 
 * @param input - The object to serialize and encode
 * @returns A Base64 string representation of the serialized object
 * @example
 * ```ts
 * const token = encodeBase64({ user: 'michael' });
 * ```
 */
export const encodeBase64 = (input: unknown): string => {
	return bufferToBase64(encodeBuffer(input));
}

/**
 * Decodes a Base64 string and deserializes it back into a typed object.
 * 
 * @param base64 - The Base64 string to decode
 * @returns The deserialized object
 * @example
 * ```ts
 * const obj = decodeBase64`<User>`(token);
 * ```
 */
export const decodeBase64 = <T>(base64 = ''): T => {
	const uint8 = base64ToBuffer(base64);
	const str = decodeBuffer(uint8);

	return objectify(str);
}
