import { base64ToBuffer, bufferToBase64, encodeBuffer, decodeBuffer } from './buffer.library.js';
import { Logger } from './logger.class.js';
import { keys } from './cipher.library.js';

const logger = new Logger('WebToken');

const formatBase64Url = (base64: string) => base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
const toBase64Url = (str: string) => formatBase64Url(bufferToBase64(encodeBuffer(str)));
const bufToBase64Url = (buf: Uint8Array) => formatBase64Url(bufferToBase64(buf));

/** fast, unverified decode of a JWT payload */
export const decodeJWT = <T = any>(jwt: string): T | null => {
	try {
		const part = jwt.split('.')[1];
		if (!part) return null;

		// 🛡️ Base64URL Normalization: replace -/_ with +/ and add padding
		const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(part.length + (4 - part.length % 4) % 4, '=');
		const bytes = base64ToBuffer(base64);
		const payload = decodeBuffer(bytes);

		return JSON.parse(payload);
	} catch { return null; }
}

/** verify a JSON Web Signature */
export const verifyJWS = async (token: string, publicKey: CryptoKey): Promise<boolean> => {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return false;

		const [header, payload, signatureBase64url] = parts;
		const signedData = `${header}.${payload}`;

		// Base64url to Base64 normalization
		const signatureBase64 = signatureBase64url
			.replace(/-/g, '+')
			.replace(/_/g, '/')
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

/** natively sign a JSON Web Signature */
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
