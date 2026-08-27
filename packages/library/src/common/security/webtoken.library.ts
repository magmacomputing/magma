import { base64ToBuffer, bufferToBase64, encodeText, decodeBuffer } from './buffer.library.js';
import { Logger } from '../runtime/logger.class.js';
import { keys } from './cipher.library.js';

const logger = new Logger('WebToken');

const RE_PLUS = /\+/g;
const RE_SLASH = /\//g;
const RE_EQUALS = /=/g;
const RE_DASH = /-/g;
const RE_UNDERSCORE = /_/g;

const formatBase64Url = (base64: string) => base64
	.replace(RE_PLUS, '-')
	.replace(RE_SLASH, '_')
	.replace(RE_EQUALS, '');
const toBase64Url = (str: string) => formatBase64Url(bufferToBase64(encodeText(str)));
const bufToBase64Url = (buf: Uint8Array) => formatBase64Url(bufferToBase64(buf));

const MAX_TOKEN_LENGTH = 8192;															// 8 KB
const MAX_PAYLOAD_LENGTH = 4096;														// 4 KB

export interface ParseJWTOptions {
	/** If true, throws explicit Errors on length or format validation failures instead of returning null */
	strict?: boolean;
}

export interface JWTComponents<Header = Record<string, any>, Payload = Record<string, any>> {
	/** Decoded JSON header object */
	header: Header;
	/** Decoded JSON payload object */
	payload: Payload;
	/** Raw binary signature buffer */
	signature: Uint8Array;
	/** Original encoded string segments */
	raw: {
		header: string;
		payload: string;
		signature: string;
	};
}

const base64UrlToBuffer = (part: string): Uint8Array => {
	const base64 = part
		.replace(RE_DASH, '+')
		.replace(RE_UNDERSCORE, '/')
		.padEnd(part.length + (4 - part.length % 4) % 4, '=');
	return base64ToBuffer(base64);
};

/**
 * Parses and decodes all three segments of a JSON Web Token (Header, Payload, Signature) without signature verification.
 * 
 * @param jwt - The JWT string to parse
 * @param options - Optional parsing behavior (e.g. strict: true to throw on failure)
 * @returns Object containing decoded header, payload, raw signature buffer, and raw segments, or null if invalid
 * @example
 * ```ts
 * const token = parseJWT`<MyHeader, MyPayload>`(jwtString);
 * const payload = token?.payload;
 * ```
 */
export const parseJWT = <Header = Record<string, any>, Payload = Record<string, any>>(
	jwt: string,
	options?: ParseJWTOptions
): JWTComponents<Header, Payload> | null => {
	if (!jwt || jwt.length > MAX_TOKEN_LENGTH) {
		if (options?.strict) throw new Error('JWT too large: Exceeds maximum length.');
		return null;
	}

	const parts = jwt.split('.');
	if (parts.length !== 3) {
		if (options?.strict) throw new Error('Invalid JWT format: Expected 3 segments (header.payload.signature)');
		return null;
	}

	if (parts[1].length > MAX_PAYLOAD_LENGTH) {
		if (options?.strict) throw new Error('JWT payload too large: Encoded segment exceeds maximum length.');
		return null;
	}

	try {
		const headerJson = decodeBuffer(base64UrlToBuffer(parts[0]));
		const payloadJson = decodeBuffer(base64UrlToBuffer(parts[1]));
		const signatureBuf = base64UrlToBuffer(parts[2]);

		return {
			header: JSON.parse(headerJson),
			payload: JSON.parse(payloadJson),
			signature: signatureBuf,
			raw: { header: parts[0], payload: parts[1], signature: parts[2] },
		};
	} catch {
		if (options?.strict) throw new Error('Invalid JWT: Segment decoding failed.');
		return null;
	}
}

/**
 * Verifies a JSON Web Signature (JWS) against a provided public key.
 * 
 * @param token - The JWS string to verify
 * @param publicKey - The CryptoKey used for verification
 * @returns A promise resolving to true if the signature is valid
 */
export const verifyJWS = async (token: string, publicKey: CryptoKey): Promise<boolean> => {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return false;

		const [header, payload, signatureBase64url] = parts;
		const signedData = `${header}.${payload}`;

		// Base64url to Base64 normalization
		const signatureBase64 = signatureBase64url
			.replace(RE_DASH, '+')
			.replace(RE_UNDERSCORE, '/')
			.padEnd(signatureBase64url.length + (4 - signatureBase64url.length % 4) % 4, '=');
		const signatureBytes = base64ToBuffer(signatureBase64);

		// crypto.subtle.verify takes signature, key, data
		const crypto = globalThis.crypto;
		const dataBytes = encodeText(signedData);

		return await crypto.subtle.verify(
			keys.SignKey,
			publicKey,
			signatureBytes.buffer,
			dataBytes
		);
	} catch (e: any) {
		logger.error('VERIFY_ERROR:', e.stack);
		return false;
	}
}

/**
 * Natively signs a JSON Web Signature (JWS) payload using the Web Crypto API.
 * 
 * @param payload - The payload object to sign
 * @param privateKey - The CryptoKey used for signing
 * @param headers - Optional JWS headers (default: `{ alg: 'RS256', typ: 'JWT' }`)
 * @returns A promise resolving to the signed JWS string
 */
export const signJWS = async (payload: object, privateKey: CryptoKey, headers: object = { alg: 'RS256', typ: 'JWT' }): Promise<string> => {
	if (typeof payload !== 'object' || payload === null)
		throw new TypeError('WebToken: Payload must be a non-null object');

	try {
		const header64 = toBase64Url(JSON.stringify(headers));
		const payload64 = toBase64Url(JSON.stringify(payload));

		const unsignedToken = `${header64}.${payload64}`;
		const dataBytes = encodeText(unsignedToken);

		const signatureBytes = await globalThis.crypto.subtle.sign(
			keys.SignKey,
			privateKey,
			dataBytes
		);

		return `${unsignedToken}.${bufToBase64Url(new Uint8Array(signatureBytes))}`;
	} catch (e: any) {
		logger.error('SIGN_ERROR:', e.stack);
		throw e;
	}
}
