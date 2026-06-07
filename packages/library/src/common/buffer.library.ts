import { stringify, objectify } from '#library/serialize.library.js';

const CHUNK_SIZE = 8192;

/** serialize any object and encode string into a Uint8Array */
export const encodeBuffer = (str: any) => new TextEncoder().encode(stringify(str));

/** decode a Uint8Array back to a string */
export const decodeBuffer = (buf: Uint8Array | ArrayBuffer, encoding = 'utf-8') => new TextDecoder(encoding).decode(buf);

/** encode a raw Uint8Array into a Base64 string natively */
export const bufferToBase64 = (buffer: Uint8Array) => {
	if (typeof Buffer !== 'undefined')
		return Buffer.from(buffer).toString('base64');

	let binary = '';
	for (let i = 0; i < buffer.length; i += CHUNK_SIZE)
		binary += String.fromCharCode.apply(null, buffer.subarray(i, i + CHUNK_SIZE) as unknown as number[]);

	return btoa(binary);
}

/** decode a Base64 string into a raw Uint8Array natively */
export const base64ToBuffer = (base64: string) => {
	if (typeof Buffer !== 'undefined')
		return new Uint8Array(Buffer.from(base64, 'base64'));

	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);

	for (let i = 0; i < binary.length; i++)
		bytes[i] = binary.charCodeAt(i);

	return bytes;
}

/** serialize any object and encode it to Base64 */
export const encodeBase64 = (input: unknown): string => {
	const str = stringify(input);

	return bufferToBase64(encodeBuffer(str));
}

/** decode a Base64 string and deserialize it back into an object */
export const decodeBase64 = <T>(base64 = ''): T => {
	const uint8 = base64ToBuffer(base64);
	const str = decodeBuffer(uint8);

	return objectify(str);
}
