import {
	keys,
	randomKey,
	hash,
	hmac,
	encrypt,
	decrypt,
	generateKeyPair,
	importPublicKey,
	importPrivateKey,
	importJWK,
	exportJWK,
	signData,
	verifyData,
	signHmac,
	verifyHmac,
	timingSafeEqual,
	encryptWithPassword,
	decryptWithPassword
} from '../../../src/common/security/cipher.library.js';
import { bufferToBase64 } from '../../../src/common/security/buffer.library.js';

describe('cipher.library', () => {
	let keyPair: CryptoKeyPair;
	let publicPem: string;
	let privatePem: string;

	beforeAll(async () => {
		keyPair = await generateKeyPair();

		const spki = await globalThis.crypto.subtle.exportKey('spki', keyPair.publicKey);
		publicPem = `-----BEGIN PUBLIC KEY-----\n${bufferToBase64(new Uint8Array(spki))}\n-----END PUBLIC KEY-----`;

		const pkcs8 = await globalThis.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
		privatePem = `-----BEGIN PRIVATE KEY-----\n${bufferToBase64(new Uint8Array(pkcs8))}\n-----END PRIVATE KEY-----`;
	});

	describe('key generation & PEM import', () => {
		it('generates valid RSASSA-PKCS1-v1_5 keypair', () => {
			expect(keyPair.publicKey).toBeDefined();
			expect(keyPair.privateKey).toBeDefined();
			expect(keyPair.publicKey.algorithm.name).toBe(keys.SignKey);
		});

		it('imports valid SPKI PEM public key', async () => {
			const imported = await importPublicKey(publicPem);
			expect(imported.type).toBe('public');
			expect(imported.algorithm.name).toBe(keys.SignKey);
		});

		it('imports valid PKCS#8 PEM private key', async () => {
			const imported = await importPrivateKey(privatePem);
			expect(imported.type).toBe('private');
			expect(imported.algorithm.name).toBe(keys.SignKey);
		});

		it('throws on malformed PEM string', async () => {
			await expect(importPublicKey('invalid-pem')).rejects.toThrow('Invalid PEM key format');
			await expect(importPrivateKey('invalid-pem')).rejects.toThrow('Invalid PEM key format');
		});
	});

	describe('JWK import & export', () => {
		it('exports and imports RSA key via JWK', async () => {
			const jwk = await exportJWK(keyPair.publicKey);
			expect(jwk.kty).toBe('RSA');

			const importedKey = await importJWK(jwk);
			expect(importedKey.type).toBe('public');
			expect(importedKey.algorithm.name).toBe(keys.SignKey);
			expect(importedKey.extractable).toBe(false);

			const optInKey = await importJWK(jwk, undefined, true);
			expect(optInKey.extractable).toBe(true);
		});

		it('imports oct symmetric JWK', async () => {
			const octJwk: JsonWebKey = {
				kty: 'oct',
				k: 'GawgguFyGrWKav7AX4VKUg',
				alg: 'HS256',
			};

			const key = await importJWK(octJwk);
			expect(key.type).toBe('secret');
			expect(key.algorithm.name).toBe('HMAC');
			expect(key.extractable).toBe(false);

			const optInOct = await importJWK(octJwk, undefined, true);
			expect(optInOct.extractable).toBe(true);
		});

		it('throws on unsupported JWK key type', async () => {
			await expect(importJWK({ kty: 'EC' } as any)).rejects.toThrow('Unsupported JWK key type');
			await expect(importJWK(null as any)).rejects.toThrow('JWK must be an object');
		});
	});

	describe('signData & verifyData', () => {
		const message = 'Hello Magma Secure Tokens';

		it('signs and verifies data with CryptoKey pair', async () => {
			const signature = await signData(message, keyPair.privateKey);
			expect(signature).toBeInstanceOf(Uint8Array);
			expect(signature.length).toBeGreaterThan(0);

			const valid = await verifyData(signature, message, keyPair.publicKey);
			expect(valid).toBe(true);
		});

		it('verifies data using key imported from PEM', async () => {
			const priv = await importPrivateKey(privatePem);
			const pub = await importPublicKey(publicPem);

			const signature = await signData(message, priv);
			const valid = await verifyData(signature, message, pub);
			expect(valid).toBe(true);
		});

		it('fails verification if data is tampered with', async () => {
			const signature = await signData(message, keyPair.privateKey);
			const valid = await verifyData(signature, 'Tampered Message', keyPair.publicKey);
			expect(valid).toBe(false);
		});

		it('fails verification with different keypair', async () => {
			const otherPair = await generateKeyPair();
			const signature = await signData(message, keyPair.privateKey);
			const valid = await verifyData(signature, message, otherPair.publicKey);
			expect(valid).toBe(false);
		});
	});

	describe('signHmac & verifyHmac', () => {
		const message = 'Authenticated payload content';
		const secret = 'super-secret-key-12345';

		it('signs and verifies HMAC with default SHA-256', async () => {
			const signature = await signHmac(message, secret);
			expect(signature).toBeInstanceOf(Uint8Array);

			const valid = await verifyHmac(signature, message, secret);
			expect(valid).toBe(true);
		});

		it('supports SHA-384 and SHA-512 algorithms', async () => {
			const sig384 = await signHmac(message, secret, 'SHA-384');
			const valid384 = await verifyHmac(sig384, message, secret, 'SHA-384');
			expect(valid384).toBe(true);

			const sig512 = await signHmac(message, secret, 'SHA-512');
			const valid512 = await verifyHmac(sig512, message, secret, 'SHA-512');
			expect(valid512).toBe(true);
		});

		it('rejects tampered data or incorrect secret', async () => {
			const signature = await signHmac(message, secret);
			expect(await verifyHmac(signature, 'different message', secret)).toBe(false);
			expect(await verifyHmac(signature, message, 'wrong secret')).toBe(false);
		});

		it('verifies signature when passed as non-Uint8Array ArrayBufferView with byteOffset', async () => {
			const signature = await signHmac(message, secret);
			const paddedBuffer = new Uint8Array(signature.length + 20);
			paddedBuffer.set(signature, 10);
			const dataView = new DataView(paddedBuffer.buffer, 10, signature.length);

			expect(await verifyHmac(dataView, message, secret)).toBe(true);
		});
	});

	describe('timingSafeEqual', () => {
		it('returns true for identical buffers', () => {
			const a = new Uint8Array([1, 2, 3, 4]);
			const b = new Uint8Array([1, 2, 3, 4]);
			expect(timingSafeEqual(a, b)).toBe(true);
		});

		it('returns false for differing contents', () => {
			const a = new Uint8Array([1, 2, 3, 4]);
			const b = new Uint8Array([1, 2, 99, 4]);
			expect(timingSafeEqual(a, b)).toBe(false);
		});

		it('returns false for differing lengths', () => {
			const a = new Uint8Array([1, 2, 3]);
			const b = new Uint8Array([1, 2, 3, 4]);
			expect(timingSafeEqual(a, b)).toBe(false);
		});

		it('returns true for empty buffers', () => {
			expect(timingSafeEqual(new Uint8Array([]), new Uint8Array([]))).toBe(true);
		});
	});

	describe('encrypt & decrypt (AES-GCM)', () => {
		it('encrypts and decrypts structured objects', async () => {
			const data = { user: 'michael', roles: ['admin', 'dev'], counter: 42 };
			const encrypted = await encrypt(data);
			expect(typeof encrypted).toBe('string');

			const decrypted = await decrypt(encrypted);
			expect(decrypted).toEqual(data);
		});
	});

	describe('hash, hmac, randomKey', () => {
		it('computes sha256 hash in hex format', async () => {
			const h = await hash('magma');
			expect(typeof h).toBe('string');
			expect(h.length).toBe(64);
		});

		it('generates random keys', () => {
			const k1 = randomKey();
			const k2 = randomKey();
			expect(typeof k1).toBe('string');
			expect(k1).not.toBe(k2);
		});
	});

	describe('encryptWithPassword & decryptWithPassword (AES-GCM + PBKDF2)', () => {
		const password = 'correct-horse-battery-staple';
		const plaintext = 'Secret database payload for Magma';

		it('encrypts and decrypts string data with password', async () => {
			const encrypted = await encryptWithPassword(plaintext, password);
			expect(encrypted).toBeInstanceOf(Uint8Array);
			expect(encrypted.length).toBeGreaterThan(32);

			// Magic header verification ('MFS1')
			expect(encrypted[0]).toBe(0x4D); // 'M'
			expect(encrypted[1]).toBe(0x46); // 'F'
			expect(encrypted[2]).toBe(0x53); // 'S'
			expect(encrypted[3]).toBe(0x31); // '1'

			const decrypted = await decryptWithPassword(encrypted, password);
			expect(decrypted).toBeInstanceOf(Uint8Array);
			expect(new TextDecoder().decode(decrypted)).toBe(plaintext);
		});

		it('encrypts and decrypts raw binary Uint8Array', async () => {
			const binary = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
			const encrypted = await encryptWithPassword(binary, password);
			const decrypted = await decryptWithPassword(encrypted, password);
			expect(Array.from(decrypted)).toEqual(Array.from(binary));
		});

		it('throws on wrong password decryption', async () => {
			const encrypted = await encryptWithPassword(plaintext, password);
			await expect(decryptWithPassword(encrypted, 'incorrect-password')).rejects.toThrow(
				'Cipher: Decryption failed. Incorrect password or data corrupted.'
			);
		});

		it('throws on tampered ciphertext', async () => {
			const encrypted = await encryptWithPassword(plaintext, password);
			// Tamper with a ciphertext byte
			encrypted[encrypted.length - 1] ^= 0xff;
			await expect(decryptWithPassword(encrypted, password)).rejects.toThrow(
				'Cipher: Decryption failed. Incorrect password or data corrupted.'
			);
		});

		it('rejects corrupted magic header', async () => {
			const encrypted = await encryptWithPassword(plaintext, password);
			encrypted[0] = 0x00;
			await expect(decryptWithPassword(encrypted, password)).rejects.toThrow(
				'Cipher: Invalid encrypted file signature'
			);
		});

		it('encrypts and decrypts various BufferSource types (ArrayBuffer, views, slices)', async () => {
			// ArrayBuffer
			const ab = new Uint8Array([1, 2, 3, 4]).buffer;
			const encAb = await encryptWithPassword(ab, password);
			const decAb = await decryptWithPassword(encAb, password);
			expect(Array.from(decAb)).toEqual([1, 2, 3, 4]);

			// TypedArray slice / view with offset
			const full = new Uint8Array([0, 0, 42, 43, 44, 0, 0]);
			const slice = full.subarray(2, 5); // [42, 43, 44], byteOffset = 2, byteLength = 3
			const encSlice = await encryptWithPassword(slice, password);
			const decSlice = await decryptWithPassword(encSlice, password);
			expect(Array.from(decSlice)).toEqual([42, 43, 44]);

			// Uint16Array view
			const u16 = new Uint16Array([0x1234, 0x5678]);
			const encU16 = await encryptWithPassword(u16, password);
			const decU16 = await decryptWithPassword(encU16, password);
			expect(decU16.byteLength).toBe(4);
			expect(new Uint16Array(decU16.buffer, decU16.byteOffset, 2)).toEqual(u16);
		});

		it('validates password input presence and type', async () => {
			// @ts-ignore
			await expect(encryptWithPassword(plaintext, '')).rejects.toThrow(TypeError);
			// @ts-ignore
			await expect(encryptWithPassword(plaintext, null)).rejects.toThrow(TypeError);
			// @ts-ignore
			await expect(decryptWithPassword(new Uint8Array(40), '')).rejects.toThrow(TypeError);
		});
	});
});

