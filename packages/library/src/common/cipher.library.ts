import { toHex } from '#library/number.library.js';
import { asString, asError } from '#library/coercion.library.js';
import { isError } from '#library/assertion.library.js';
import { bufferToBase64, base64ToBuffer, encodeBuffer, decodeBuffer } from '#library/buffer.library.js';

const crypto = globalThis.crypto;
const subtle = crypto.subtle;

export const keys = {
	Algorithm: 'SHA-256',
	Encoding: 'utf-8',
	SignKey: 'RSASSA-PKCS1-v1_5',
	TypeKey: 'AES-GCM',
} as const;

// Module-scoped state for ephemeral keys
const _cryptoKey = subtle
	.generateKey({ name: keys.TypeKey, length: 128 }, false, ['encrypt', 'decrypt'])
	.catch(asError);

const _asymmetricKey = subtle.generateKey({
	name: keys.SignKey,
	modulusLength: 2048,
	publicExponent: new Uint8Array([1, 0, 1]),
	hash: { name: keys.Algorithm },
}, false, ['sign', 'verify'])
	.catch(asError);

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
	const buffer = encodeBuffer(asString(source));
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
	const key = await _cryptoKey;
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
	const [str, key] = await Promise.all([secret, _cryptoKey]);
	if (isError(key)) throw new Error(`Cipher: Key generation failed: ${key.message}`, { cause: key });

	const uint8 = base64ToBuffer(str);
	const iv = uint8.slice(0, 16);
	const data = uint8.slice(16);

	return subtle.decrypt({ name: keys.TypeKey, iv }, key, data)
		.then(result => new Uint8Array(result))
		.then(decodeBuffer);
}

/**
 * Signs arbitrary data using RSASSA-PKCS1-v1_5 and a module-scoped ephemeral asymmetric keypair.
 * 
 * @param doc - The data to sign
 * @returns A promise resolving to the Uint8Array signature
 */
export const sign = async (doc: any) => {
	const keypair = await _asymmetricKey;
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
	const [buffer, keypair] = await Promise.all([signature, _asymmetricKey]);
	if (isError(keypair)) throw new Error(`Cipher: Key generation failed: ${keypair.message}`, { cause: keypair });
	if (!keypair.publicKey) throw new Error('Cipher: Missing public key');

	return subtle.verify(keys.SignKey, keypair.publicKey, buffer as BufferSource, encodeBuffer(doc));
}

/**
 * Imports a PEM-formatted public key string into a native Web Crypto API CryptoKey object.
 * 
 * @param pem - The PEM-formatted public key string
 * @returns A promise resolving to the imported CryptoKey
 */
export const importPublicKey = async (pem: string): Promise<CryptoKey> => {
	const pemHeader = '-----BEGIN PUBLIC KEY-----';
	const pemFooter = '-----END PUBLIC KEY-----';
	const pemContents = pem
		.substring(pem.indexOf(pemHeader) + pemHeader.length, pem.indexOf(pemFooter))
		.replace(/\s+/g, '');

	const binaryDerString = atob(pemContents);
	const binaryDer = new Uint8Array(binaryDerString.length);
	for (let i = 0; i < binaryDerString.length; i++) {
		binaryDer[i] = binaryDerString.charCodeAt(i);
	}

	return subtle.importKey(
		'spki',
		binaryDer,
		{ name: keys.SignKey, hash: keys.Algorithm },
		false,
		['verify']
	);
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
