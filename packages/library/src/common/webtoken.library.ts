import { base64ToBuffer, bufferToBase64, encodeBuffer, decodeBuffer } from './buffer.library.js';
import { Logger } from './logger.class.js';
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
const toBase64Url = (str: string) => formatBase64Url(bufferToBase64(encodeBuffer(str)));
const bufToBase64Url = (buf: Uint8Array) => formatBase64Url(bufferToBase64(buf));

/**
 * Performs a fast, unverified decode of a JSON Web Token (JWT) payload.
 * The payload is unverified and attacker-controlled. Use only for reading public
 * claims and must not be used for authentication, authorization, or any other
 * security decision.
 * 
 * @param jwt - The JWT string to decode
 * @returns The parsed payload object, or null if decoding fails
 * @example
 * ```ts
 * const payload = decodeJWT`<MyClaims>`(token);
 * ```
 */
export const decodeJWT = <T = any>(jwt: string): T | null => {
	try {
		const part = jwt.split('.')[1];
		if (!part) return null;

		// 🛡️ Base64URL Normalization: replace -/_ with +/ and add padding
		const base64 = part
			.replace(RE_DASH, '+')
			.replace(RE_UNDERSCORE, '/')
			.padEnd(part.length + (4 - part.length % 4) % 4, '=');
		const bytes = base64ToBuffer(base64);
		const payload = decodeBuffer(bytes);

		return JSON.parse(payload);
	} catch { return null; }
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
		const dataBytes = encodeBuffer(signedData);

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
	try {
		const header64 = toBase64Url(JSON.stringify(headers));
		const payload64 = toBase64Url(JSON.stringify(payload));

		const unsignedToken = `${header64}.${payload64}`;
		const dataBytes = encodeBuffer(unsignedToken);

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
