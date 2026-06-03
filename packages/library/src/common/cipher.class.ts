import { toHex } from '#library/number.library.js';
import { asString } from '#library/coercion.library.js';
import { Immutable, Static } from '#library/class.library.js';
import { stringify, objectify } from '#library/serialize.library.js';
import { base64DecToArr, base64EncArr, strToUTF8Arr, UTF8ArrToStr } from '#library/buffer.library.js';

const crypto = globalThis.crypto;
const subtle = crypto.subtle;
const keys = {
	Algorithm: 'SHA-256',
	Encoding: 'utf-8',
	SignKey: 'RSASSA-PKCS1-v1_5',
	TypeKey: 'AES-GCM',
} as const

const _cryptoKey = subtle.generateKey({ name: keys.TypeKey, length: 128 }, false, ['encrypt', 'decrypt']);
const _asymmetricKey = subtle.generateKey({
	name: keys.SignKey,
	modulusLength: 2048,
	publicExponent: new Uint8Array([1, 0, 1]),
	hash: { name: keys.Algorithm },
}, false, ['sign', 'verify']);

/** Static-only cryptographic methods */
@Immutable
@Static																											// prevent instantiation
export class Cipher {
	/** random UUID */
	static randomKey = () => crypto.randomUUID().split('-')[0];

	/** decode base64 back into object */
	static decodeBase64 = <T>(buf = ''): T => {
		const uint8 = base64DecToArr(buf);											// first, convert to UInt8Array
		const str = UTF8ArrToStr(uint8);												// convert to string

		return objectify(str);																	// rebuild the original object
	}

	/** encode object into base64 */
	static encodeBase64 = (buf: unknown) => {
		const str = stringify(buf);															// first, stringify the incoming buffer
		const uint8 = strToUTF8Arr(str);												// convert to Uint8Array

		return base64EncArr(uint8);															// convert to string
	}

	static hmac = async (source: string | Object, secret: string, alg = 'SHA-512', len?: number) => {
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
	}

	static hash = async (source: string | Object, len?: number, alg = 'SHA-256') => {
		const buffer = Cipher.encodeBuffer(asString(source));
		const hash = await subtle.digest(alg, buffer);

		return toHex(Array.from(new Uint8Array(hash)), len);
	}

	static encodeBuffer = (str: string) => new TextEncoder().encode(str);
	static decodeBuffer = (buf: Uint8Array | ArrayBuffer) => new TextDecoder(keys.Encoding).decode(buf);

	static encrypt = async (data: any) => {
		const iv = crypto.getRandomValues(new Uint8Array(16));
		const cipherBuf = await subtle.encrypt({ name: keys.TypeKey, iv }, await _cryptoKey, Cipher.encodeBuffer(data));
		const combined = new Uint8Array(16 + cipherBuf.byteLength);
		combined.set(iv, 0);
		combined.set(new Uint8Array(cipherBuf), 16);
		return base64EncArr(combined);
	}

	static decrypt = async (secret: Promise<string> | string) => {
		const str = await secret;
		const uint8 = base64DecToArr(str);
		const iv = uint8.slice(0, 16);
		const data = uint8.slice(16);
		return subtle.decrypt({ name: keys.TypeKey, iv }, await _cryptoKey, data)
			.then(result => new Uint8Array(result))
			.then(Cipher.decodeBuffer);
	}

	static sign = async (doc: any) =>
		subtle.sign(keys.SignKey, (await _asymmetricKey).privateKey!, Cipher.encodeBuffer(doc))
			.then(result => new Uint8Array(result))
			.then(Cipher.decodeBuffer);

	static verify = async (signature: Promise<ArrayBuffer>, doc: any) =>
		subtle.verify(keys.SignKey, (await _asymmetricKey).publicKey!, await signature, Cipher.encodeBuffer(doc));
}
