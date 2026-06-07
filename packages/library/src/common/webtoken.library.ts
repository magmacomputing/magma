import { base64ToBuffer } from './buffer.library.js';
import { isFunction } from './assertion.library.js';
import { Logger } from './logger.class.js';
import { keys } from './cipher.library.js';

const logger = new Logger('WebToken');

/** fast, unverified decode of a JWT payload */
export const decodeJWT = <T = any>(jwt: string): T | null => {
	try {
		const part = jwt.split('.')[1];
		if (!part) return null;

		// 🛡️ Base64URL Normalization: replace -/_ with +/ and add padding
		const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(part.length + (4 - part.length % 4) % 4, '=');
		const payload = isFunction(atob) ? atob(base64) : Buffer.from(base64, 'base64').toString();

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
			.replace(/_/g, '/');
		const signatureBytes = base64ToBuffer(signatureBase64);

		// crypto.subtle.verify takes signature, key, data
		const crypto = globalThis.crypto;
		const dataBytes = new TextEncoder().encode(signedData);

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
