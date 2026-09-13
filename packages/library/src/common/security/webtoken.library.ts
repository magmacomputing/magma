import { base64UrlToBuffer, bufferToBase64Url, toBase64Url, decodeBuffer } from './buffer.library.js';
import { Logger } from '../runtime/logger.class.js';
import { keys, importPublicKey, importPrivateKey, signData, verifyData, signHmac, verifyHmac } from './cipher.library.js';
import { isPlainObject, isPrimitive, isString } from '#library/assertion.library.js';

const logger = new Logger('WebToken');

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

export interface JWSHeader {
	alg?: 'RS256' | 'HS256' | 'HS384' | 'HS512' | string;
	typ?: string;
	[key: string]: any;
}

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
		const headerJson = decodeBuffer(base64UrlToBuffer(parts[0]), keys.Encoding, { fatal: true });
		const payloadJson = decodeBuffer(base64UrlToBuffer(parts[1]), keys.Encoding, { fatal: true });
		const signatureBuf = base64UrlToBuffer(parts[2]);

		const header = JSON.parse(headerJson);
		const payload = JSON.parse(payloadJson);

		if (!isPlainObject(header) || !isPlainObject(payload))
			throw new Error('Invalid JWT shape');

		return {
			header,
			payload,
			signature: signatureBuf,
			raw: { header: parts[0], payload: parts[1], signature: parts[2] },
		};
	} catch {
		if (options?.strict) throw new Error('Invalid JWT: Segment decoding failed.');
		return null;
	}
}

/**
 * Verifies a JSON Web Signature (JWS) against a provided key or secret.
 * Inspects the token header's `alg` and supports:
 * - Asymmetric `RS256`: via CryptoKey or PEM public key string
 * - Symmetric `HS256`, `HS384`, `HS512`: via shared secret string or Uint8Array
 * 
 * @param token - The JWS string to verify
 * @param keyOrSecret - The public CryptoKey, PEM public key string, or HMAC shared secret
 * @param expectedAlg - Optional expected algorithm to enforce (e.g. 'RS256', 'HS256')
 * @returns A promise resolving to true if the signature is valid
 */
export const verifyJWS = async (
	token: string,
	keyOrSecret: CryptoKey | string | Uint8Array,
	expectedAlg?: string
): Promise<boolean> => {
	try {
		const parsed = parseJWT(token);
		if (!parsed) return false;

		const { header, signature, raw } = parsed;
		const signedData = `${raw.header}.${raw.payload}`;
		const alg = header.alg ?? 'RS256';

		if (expectedAlg && alg !== expectedAlg) {
			logger.error(`VERIFY_ERROR: Algorithm mismatch. Expected "${expectedAlg}", got "${alg}"`);
			return false;
		}

		if (alg === 'RS256') {
			const publicKey = isString(keyOrSecret)
				? await importPublicKey(keyOrSecret)
				: keyOrSecret as CryptoKey;

			return await verifyData(signature, signedData, publicKey, keys.SignKey);
		}

		if (alg === 'HS256' || alg === 'HS384' || alg === 'HS512') {
			if (isString(keyOrSecret) && keyOrSecret.includes('-----BEGIN ') && keyOrSecret.includes('KEY-----')) {
				logger.error('VERIFY_ERROR: Refusing to use asymmetric PEM key as HMAC secret');
				return false;
			}

			const hashAlg = alg === 'HS512' ? 'SHA-512' : alg === 'HS384' ? 'SHA-384' : 'SHA-256';
			return await verifyHmac(
				signature,
				signedData,
				keyOrSecret as string | Uint8Array,
				hashAlg
			);
		}

		logger.error(`VERIFY_ERROR: Unsupported algorithm "${alg}"`);
		return false;
	} catch (e: any) {
		logger.error('VERIFY_ERROR:', e.stack);
		return false;
	}
}

/**
 * Natively signs a JSON Web Signature (JWS) payload.
 * Inspects `headers.alg` (default: `{ alg: 'RS256', typ: 'JWT' }`) and supports:
 * - Asymmetric `RS256`: via CryptoKey or PEM private key string
 * - Symmetric `HS256`, `HS384`, `HS512`: via shared secret string or Uint8Array
 * 
 * @param payload - The payload object to sign
 * @param keyOrSecret - The private CryptoKey, PEM private key string, or HMAC shared secret
 * @param headers - Optional JWS headers (default: `{ alg: 'RS256', typ: 'JWT' }`)
 * @returns A promise resolving to the signed JWS string
 */
export const signJWS = async (
	payload: object,
	keyOrSecret: CryptoKey | string | Uint8Array,
	headers: JWSHeader = { alg: 'RS256', typ: 'JWT' }
): Promise<string> => {
	if (isPrimitive(payload))
		throw new TypeError('WebToken: Payload must be a non-null object');

	const serializedPayload = JSON.stringify(payload);
	if (!serializedPayload || !isPlainObject(JSON.parse(serializedPayload)))
		throw new TypeError('WebToken: Payload must be a non-null object');

	try {
		const header64 = toBase64Url(JSON.stringify(headers));
		const payload64 = toBase64Url(serializedPayload);

		const unsignedToken = `${header64}.${payload64}`;
		const alg = headers.alg ?? 'RS256';

		let signatureBytes: Uint8Array;

		if (alg === 'RS256') {
			const privateKey = isString(keyOrSecret)
				? await importPrivateKey(keyOrSecret)
				: keyOrSecret as CryptoKey;

			signatureBytes = await signData(unsignedToken, privateKey, keys.SignKey);
		} else if (alg === 'HS256' || alg === 'HS384' || alg === 'HS512') {
			const hashAlg = alg === 'HS512' ? 'SHA-512' : alg === 'HS384' ? 'SHA-384' : 'SHA-256';
			signatureBytes = await signHmac(
				unsignedToken,
				keyOrSecret as string | Uint8Array,
				hashAlg
			);
		} else {
			throw new Error(`WebToken: Unsupported algorithm "${alg}"`);
		}

		return `${unsignedToken}.${bufferToBase64Url(signatureBytes)}`;
	} catch (e: any) {
		logger.error('SIGN_ERROR:', e.stack);
		throw e;
	}
}
