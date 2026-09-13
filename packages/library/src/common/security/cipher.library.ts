import { toHex } from '#library/number.library.js';
import { objectify } from '#library/serialize.library.js';
import { asString, asError } from '#library/coercion.library.js';
import { isError, isString, isPlainObject } from '#library/assertion.library.js';
import { bufferToBase64, base64ToBuffer, encodeBuffer, encodeText, decodeBuffer } from '#library/buffer.library.js';

const crypto = globalThis.crypto;
const subtle = crypto.subtle;

/**
 * Cryptographic algorithm and encoding constants used throughout the cipher library.
 *
 * @property Algorithm - Default hash algorithm for digest operations
 * @property Encoding - Default text encoding for string conversion
 * @property SignKey - Asymmetric signature algorithm identifier
 * @property TypeKey - Symmetric encryption algorithm identifier
 */
export const keys = {
	Algorithm: 'SHA-256',
	Encoding: 'utf-8',
	SignKey: 'RSASSA-PKCS1-v1_5',
	TypeKey: 'AES-GCM',
} as const;

// Module-scoped state for ephemeral keys (lazily instantiated)
let _cryptoKeyPromise: Promise<CryptoKey | Error> | undefined;
const getCryptoKey = () => (_cryptoKeyPromise ??= subtle
	.generateKey({ name: keys.TypeKey, length: 128 }, false, ['encrypt', 'decrypt'])
	.catch(asError));

let _asymmetricKeyPromise: Promise<CryptoKeyPair | Error> | undefined;
const getAsymmetricKey = () => (_asymmetricKeyPromise ??= subtle.generateKey({
	name: keys.SignKey,
	modulusLength: 2048,
	publicExponent: new Uint8Array([1, 0, 1]),
	hash: { name: keys.Algorithm },
}, false, ['sign', 'verify'])
	.catch(asError));

/**
 * Generates a random, short UUID key based on standard Web Crypto API UUIDs.
 * 
 * @returns A randomly generated short string
 * @example
 * ```ts
 * const key = randomKey(); // 'e8b7a421'
 * ```
 */
export const randomKey = () => crypto.randomUUID().split('-')[0];

/**
 * Generates a Hash-based Message Authentication Code (HMAC) for a given source payload.
 * 
 * @param source - The data to hash
 * @param secret - The secret key used for hashing
 * @param alg - The hash algorithm to use (default: 'SHA-512')
 * @param len - Optional length to truncate the resulting hex string
 * @returns A promise resolving to the HMAC hex string
 */
export const hmac = async (source: string | Object, secret: string, alg = 'SHA-512', len?: number) => {
	const encoder = new TextEncoder();
	const keyData = encoder.encode(secret);
	const messageData = encoder.encode(asString(source));

	const key = await subtle.importKey(
		'raw',
		keyData,
		{ name: 'HMAC', hash: { name: alg } },
		false,
		['sign']
	);

	const signature = await subtle.sign('HMAC', key, messageData);

	return toHex(Array.from(new Uint8Array(signature)), len);
};

/**
 * Computes a cryptographic hash digest for the provided source payload.
 * 
 * @param source - The data to hash
 * @param len - Optional length to truncate the resulting hex string
 * @param alg - The hash algorithm to use (default: 'SHA-256')
 * @returns A promise resolving to the hash hex string
 */
export const hash = async (source: string | Object, len?: number, alg = 'SHA-256') => {
	const buffer = encodeText(asString(source));
	const hashBuf = await subtle.digest(alg, buffer);

	return toHex(Array.from(new Uint8Array(hashBuf)), len);
}

/**
 * Encrypts arbitrary data using AES-GCM and a module-scoped ephemeral symmetric key.
 * 
 * @param data - The data to encrypt
 * @returns A promise resolving to the Base64-encoded encrypted string (including IV)
 */
export const encrypt = async (data: any) => {
	const iv = crypto.getRandomValues(new Uint8Array(16));
	const key = await getCryptoKey();
	if (isError(key)) throw new Error(`Cipher: Key generation failed: ${key.message}`, { cause: key });

	const cipherBuf = await subtle.encrypt({ name: keys.TypeKey, iv }, key, encodeBuffer(data));
	const combined = new Uint8Array(16 + cipherBuf.byteLength);

	combined.set(iv, 0);
	combined.set(new Uint8Array(cipherBuf), 16);

	return bufferToBase64(combined);
}

/**
 * Decrypts a Base64-encoded encrypted string using the module-scoped ephemeral symmetric key.
 * 
 * @param secret - The encrypted string (or a promise resolving to one)
 * @returns A promise resolving to the decrypted, deserialized data
 */
export const decrypt = async (secret: Promise<string> | string) => {
	const [str, key] = await Promise.all([secret, getCryptoKey()]);
	if (isError(key)) throw new Error(`Cipher: Key generation failed: ${key.message}`, { cause: key });

	const uint8 = base64ToBuffer(str);
	const iv = uint8.slice(0, 16);
	const data = uint8.slice(16);

	return subtle.decrypt({ name: keys.TypeKey, iv }, key, data)
		.then(result => new Uint8Array(result))
		.then(decodeBuffer)
		.then(objectify);
}

/**
 * Signs arbitrary data using RSASSA-PKCS1-v1_5 and a module-scoped ephemeral asymmetric keypair.
 * 
 * @param doc - The data to sign
 * @returns A promise resolving to the Uint8Array signature
 */
export const sign = async (doc: any) => {
	const keypair = await getAsymmetricKey();
	if (isError(keypair)) throw new Error(`Cipher: Key generation failed: ${keypair.message}`, { cause: keypair });
	if (!keypair.privateKey) throw new Error('Cipher: Missing private key');

	return subtle.sign(keys.SignKey, keypair.privateKey, encodeBuffer(doc))
		.then(result => new Uint8Array(result));
}

/**
 * Verifies a signature against the provided data using the module-scoped ephemeral asymmetric public key.
 * 
 * @param signature - The signature buffer to verify
 * @param doc - The original data payload
 * @returns A promise resolving to a boolean indicating verification success
 */
export const verify = async (signature: Promise<ArrayBuffer> | ArrayBuffer | Uint8Array, doc: any) => {
	const [buffer, keypair] = await Promise.all([signature, getAsymmetricKey()]);
	if (isError(keypair)) throw new Error(`Cipher: Key generation failed: ${keypair.message}`, { cause: keypair });
	if (!keypair.publicKey) throw new Error('Cipher: Missing public key');

	return subtle.verify(keys.SignKey, keypair.publicKey, buffer as BufferSource, encodeBuffer(doc));
}

const RE_WHITESPACE = /\s+/g;

/**
 * Compares two byte buffers in constant time to prevent timing attacks.
 * 
 * @param a - First byte buffer
 * @param b - Second byte buffer
 * @returns True if both buffers are identical in length and content
 * @example
 * ```ts
 * const match = timingSafeEqual(sigA, sigB);
 * ```
 */
export const timingSafeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
	if (a.length !== b.length) return false;

	let mismatch = 0;
	for (let i = 0; i < a.length; i++) {
		mismatch |= a[i]! ^ b[i]!;
	}
	return mismatch === 0;
}

/**
 * Imports a PEM-formatted public key string into a native Web Crypto API CryptoKey object.
 * 
 * @param pem - The PEM-formatted public key string
 * @param alg - The signature algorithm identifier (default: keys.SignKey)
 * @param hash - The hash algorithm identifier (default: keys.Algorithm)
 * @returns A promise resolving to the imported CryptoKey
 */
export const importPublicKey = async (pem: string, alg: string = keys.SignKey, hash: string = keys.Algorithm): Promise<CryptoKey> => {
	const pemHeader = '-----BEGIN PUBLIC KEY-----';
	const pemFooter = '-----END PUBLIC KEY-----';
	if (!pem || !pem.includes(pemHeader) || !pem.includes(pemFooter))
		throw new Error('Invalid PEM key format');

	const pemContents = pem
		.substring(pem.indexOf(pemHeader) + pemHeader.length, pem.indexOf(pemFooter))
		.replace(RE_WHITESPACE, '');

	const binaryDer = base64ToBuffer(pemContents);

	return subtle.importKey(
		'spki',
		binaryDer,
		{ name: alg, hash },
		false,
		['verify']
	);
}

/**
 * Imports a PKCS#8 PEM-formatted private key string into a native Web Crypto API CryptoKey object.
 * 
 * @param pem - The PEM-formatted private key string
 * @param alg - The signature algorithm identifier (default: keys.SignKey)
 * @param hash - The hash algorithm identifier (default: keys.Algorithm)
 * @returns A promise resolving to the imported CryptoKey
 */
export const importPrivateKey = async (pem: string, alg: string = keys.SignKey, hash: string = keys.Algorithm): Promise<CryptoKey> => {
	const pemHeader = '-----BEGIN PRIVATE KEY-----';
	const pemFooter = '-----END PRIVATE KEY-----';
	if (!pem || !pem.includes(pemHeader) || !pem.includes(pemFooter))
		throw new Error('Invalid PEM key format');

	const pemContents = pem
		.substring(pem.indexOf(pemHeader) + pemHeader.length, pem.indexOf(pemFooter))
		.replace(RE_WHITESPACE, '');

	const binaryDer = base64ToBuffer(pemContents);

	return subtle.importKey(
		'pkcs8',
		binaryDer,
		{ name: alg, hash },
		false,
		['sign']
	);
}

/**
 * Imports a JSON Web Key (JWK) into a native Web Crypto API CryptoKey object.
 * Supports RSA keys (RS256, RS384, RS512) and symmetric oct keys (HS256, HS384, HS512).
 * 
 * @param jwk - The standard JsonWebKey object
 * @param usage - Optional explicit key usages
 * @returns A promise resolving to the imported CryptoKey
 */
export const importJWK = async (jwk: JsonWebKey, usage?: KeyUsage[]): Promise<CryptoKey> => {
	if (!isPlainObject(jwk))
		throw new TypeError('Cipher: JWK must be an object');

	if (jwk.kty === 'RSA') {
		const hashName = jwk.alg === 'RS512' ? 'SHA-512' : jwk.alg === 'RS384' ? 'SHA-384' : 'SHA-256';
		const defaultUsage: KeyUsage[] = jwk.d ? ['sign'] : ['verify'];
		return subtle.importKey(
			'jwk',
			jwk,
			{ name: keys.SignKey, hash: hashName },
			true,
			usage ?? defaultUsage
		);
	}

	if (jwk.kty === 'oct') {
		const hashName = jwk.alg === 'HS512' ? 'SHA-512' : jwk.alg === 'HS384' ? 'SHA-384' : 'SHA-256';
		const defaultUsage: KeyUsage[] = ['sign', 'verify'];
		return subtle.importKey(
			'jwk',
			jwk,
			{ name: 'HMAC', hash: hashName },
			true,
			usage ?? defaultUsage
		);
	}

	throw new Error(`Cipher: Unsupported JWK key type "${jwk.kty}"`);
}

/**
 * Exports a native Web Crypto API CryptoKey object to a JSON Web Key (JWK).
 * 
 * @param key - The CryptoKey to export
 * @returns A promise resolving to the exported JsonWebKey
 */
export const exportJWK = async (key: CryptoKey): Promise<JsonWebKey> => {
	return subtle.exportKey('jwk', key);
}

export type BinaryData = BufferSource | Uint8Array;

/**
 * Cryptographically signs raw data using the provided CryptoKey.
 * 
 * @param data - The string or binary data to sign
 * @param privateKey - The private CryptoKey with 'sign' usage
 * @param alg - The signature algorithm identifier (default: keys.SignKey)
 * @returns A promise resolving to the signature Uint8Array
 */
export const signData = async (
	data: BinaryData | string,
	privateKey: CryptoKey,
	alg: AlgorithmIdentifier = keys.SignKey
): Promise<Uint8Array> => {
	const bytes = isString(data) ? encodeText(data) : data;
	const signature = await subtle.sign(alg, privateKey, bytes as BufferSource);
	return new Uint8Array(signature);
}

/**
 * Verifies a signature against raw data using the provided CryptoKey.
 * 
 * @param signature - The signature buffer
 * @param data - The original string or binary data
 * @param publicKey - The public CryptoKey with 'verify' usage
 * @param alg - The signature algorithm identifier (default: keys.SignKey)
 * @returns A promise resolving to true if valid
 */
export const verifyData = async (
	signature: BinaryData,
	data: BinaryData | string,
	publicKey: CryptoKey,
	alg: AlgorithmIdentifier = keys.SignKey
): Promise<boolean> => {
	const bytes = isString(data) ? encodeText(data) : data;
	return subtle.verify(alg, publicKey, signature as BufferSource, bytes as BufferSource);
}

/**
 * Computes an HMAC signature as a raw binary buffer for the provided data and secret.
 * 
 * @param data - The string or binary data to sign
 * @param secret - The secret key as a string or binary buffer
 * @param alg - The hash algorithm to use (default: 'SHA-256')
 * @returns A promise resolving to the HMAC signature Uint8Array
 */
export const signHmac = async (
	data: BinaryData | string,
	secret: string | BinaryData,
	alg = 'SHA-256'
): Promise<Uint8Array> => {
	const secretBytes = isString(secret) ? encodeText(secret) : secret;
	const messageBytes = isString(data) ? encodeText(data) : data;

	const key = await subtle.importKey(
		'raw',
		secretBytes as BufferSource,
		{ name: 'HMAC', hash: { name: alg } },
		false,
		['sign']
	);

	const signature = await subtle.sign('HMAC', key, messageBytes as BufferSource);
	return new Uint8Array(signature);
}

/**
 * Verifies an HMAC signature against the provided data and secret using constant-time comparison.
 * 
 * @param signature - The signature buffer to verify
 * @param data - The original data
 * @param secret - The secret key as a string or binary buffer
 * @param alg - The hash algorithm to use (default: 'SHA-256')
 * @returns A promise resolving to true if the HMAC signature matches
 */
export const verifyHmac = async (
	signature: BinaryData,
	data: BinaryData | string,
	secret: string | BinaryData,
	alg = 'SHA-256'
): Promise<boolean> => {
	const expected = await signHmac(data, secret, alg);
	const actual = signature instanceof Uint8Array
		? signature
		: new Uint8Array(signature instanceof ArrayBuffer ? signature : signature.buffer);
	return timingSafeEqual(expected, actual);
}

/**
 * Generates a new RSASSA-PKCS1-v1_5 asymmetric keypair using the Web Crypto API.
 * 
 * @returns A promise resolving to the generated CryptoKeyPair
 */
export const generateKeyPair = async (): Promise<CryptoKeyPair> => {
	return subtle.generateKey({
		name: keys.SignKey,
		modulusLength: 2048,
		publicExponent: new Uint8Array([1, 0, 1]),
		hash: { name: keys.Algorithm },
	},
		true,
		['sign', 'verify']
	);
}
