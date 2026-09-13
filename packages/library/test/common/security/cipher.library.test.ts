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
	timingSafeEqual
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
});
