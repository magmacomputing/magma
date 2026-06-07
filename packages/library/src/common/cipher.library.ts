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
const _cryptoKey = subtle.generateKey({ name: keys.TypeKey, length: 128 }, false, ['encrypt', 'decrypt'])
	.catch(asError);

const _asymmetricKey = subtle.generateKey({
	name: keys.SignKey,
	modulusLength: 2048,
	publicExponent: new Uint8Array([1, 0, 1]),
	hash: { name: keys.Algorithm },
}, false, ['sign', 'verify'])
	.catch(asError);

/** random UUID */
export const randomKey = () => crypto.randomUUID().split('-')[0];

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

export const hash = async (source: string | Object, len?: number, alg = 'SHA-256') => {
	const buffer = encodeBuffer(asString(source));
	const hashBuf = await subtle.digest(alg, buffer);

	return toHex(Array.from(new Uint8Array(hashBuf)), len);
}

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

export const sign = async (doc: any) => {
	const keypair = await _asymmetricKey;
	if (isError(keypair)) throw new Error(`Cipher: Key generation failed: ${keypair.message}`, { cause: keypair });
	if (!keypair.privateKey) throw new Error('Cipher: Missing private key');

	return subtle.sign(keys.SignKey, keypair.privateKey, encodeBuffer(doc))
		.then(result => new Uint8Array(result))
		.then(decodeBuffer);
}

export const verify = async (signature: Promise<ArrayBuffer>, doc: any) => {
	const [buffer, keypair] = await Promise.all([signature, _asymmetricKey]);
	if (isError(keypair)) throw new Error(`Cipher: Key generation failed: ${keypair.message}`, { cause: keypair });
	if (!keypair.publicKey) throw new Error('Cipher: Missing public key');

	return subtle.verify(keys.SignKey, keypair.publicKey, buffer, encodeBuffer(doc));
}

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
