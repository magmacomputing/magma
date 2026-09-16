import { parseJWT, signJWS, verifyJWS } from '../../../src/common/security/webtoken.library.js';

describe('webtoken.library', () => {
	const validHeader = { alg: 'HS256', typ: 'JWT' };
	const validPayload = { sub: '1234567890', name: 'John Doe', iat: 1516239022 };
	
	// Base64Url helper for constructing test tokens
	const toBase64Url = (obj: any) => {
		const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
		return Buffer.from(str)
			.toString('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '');
	};

	const makeToken = (h: any, p: any, s = 'sig') => {
		const hStr = typeof h === 'string' ? h : toBase64Url(h);
		const pStr = typeof p === 'string' ? p : toBase64Url(p);
		return `${hStr}.${pStr}.${s}`;
	};

	it('parses valid JWT with standard generic invocation syntax', () => {
		const tokenStr = makeToken(validHeader, validPayload);
		const result = parseJWT<{ alg: string }, { sub: string }>(tokenStr);
		expect(result).not.toBeNull();
		expect(result?.header.alg).toBe('HS256');
		expect(result?.payload.sub).toBe('1234567890');
	});

	it('rejects invalid base64url characters in JWT segments', () => {
		const invalidToken = 'eyJhbGciOiJIUzI1NiJ9!.eyJzdWIiOiIxMjM0NTY3ODkwIn0=.sig';
		expect(parseJWT(invalidToken)).toBeNull();
		expect(() => parseJWT(invalidToken, { strict: true })).toThrow('Invalid JWT: Segment decoding failed.');
	});

	it('rejects segments with length modulo 4 equal to 1', () => {
		// A segment with length 1 (1 % 4 === 1)
		const invalidToken = 'a.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig';
		expect(parseJWT(invalidToken)).toBeNull();
		expect(() => parseJWT(invalidToken, { strict: true })).toThrow('Invalid JWT: Segment decoding failed.');
	});

	it('rejects invalid UTF-8 in header or payload segments with fatal UTF-8 error', () => {
		// 0xFF 0xFF is invalid UTF-8
		const invalidUtf8Base64Url = Buffer.from([0xff, 0xff])
			.toString('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '');

		const badHeaderToken = `${invalidUtf8Base64Url}.${toBase64Url(validPayload)}.sig`;
		const badPayloadToken = `${toBase64Url(validHeader)}.${invalidUtf8Base64Url}.sig`;

		expect(parseJWT(badHeaderToken)).toBeNull();
		expect(() => parseJWT(badHeaderToken, { strict: true })).toThrow('Invalid JWT: Segment decoding failed.');

		expect(parseJWT(badPayloadToken)).toBeNull();
		expect(() => parseJWT(badPayloadToken, { strict: true })).toThrow('Invalid JWT: Segment decoding failed.');
	});

	it('rejects header or payload when parsed JSON is not a non-null object', () => {
		const stringToken = makeToken('"just a string"', validPayload);
		const arrayToken = makeToken(validHeader, [1, 2, 3]);
		const nullToken = makeToken('null', validPayload);

		expect(parseJWT(stringToken)).toBeNull();
		expect(() => parseJWT(stringToken, { strict: true })).toThrow('Invalid JWT: Segment decoding failed.');

		expect(parseJWT(arrayToken)).toBeNull();
		expect(() => parseJWT(arrayToken, { strict: true })).toThrow('Invalid JWT: Segment decoding failed.');

		expect(parseJWT(nullToken)).toBeNull();
		expect(() => parseJWT(nullToken, { strict: true })).toThrow('Invalid JWT: Segment decoding failed.');
	});

	describe('signJWS & verifyJWS', () => {
		let keyPair: CryptoKeyPair;
		let publicPem: string;
		let privatePem: string;

		beforeAll(async () => {
			const { generateKeyPair } = await import('../../../src/common/security/cipher.library.js');
			const { bufferToBase64 } = await import('../../../src/common/security/buffer.library.js');

			keyPair = await generateKeyPair();

			const spki = await globalThis.crypto.subtle.exportKey('spki', keyPair.publicKey);
			publicPem = `-----BEGIN PUBLIC KEY-----\n${bufferToBase64(new Uint8Array(spki))}\n-----END PUBLIC KEY-----`;

			const pkcs8 = await globalThis.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
			privatePem = `-----BEGIN PRIVATE KEY-----\n${bufferToBase64(new Uint8Array(pkcs8))}\n-----END PRIVATE KEY-----`;
		});

		it('rejects non-object or null payloads with TypeError', async () => {
			await expect(signJWS(null as any, keyPair.privateKey)).rejects.toThrow(
				new TypeError('WebToken: Payload must be a non-null object')
			);
			await expect(signJWS('string' as any, keyPair.privateKey)).rejects.toThrow(
				new TypeError('WebToken: Payload must be a non-null object')
			);
			await expect(signJWS(12345 as any, keyPair.privateKey)).rejects.toThrow(
				new TypeError('WebToken: Payload must be a non-null object')
			);
		});

		it('accepts class instances and non-plain objects that can be serialized by JSON.stringify', async () => {
			class CustomPayload {
				constructor(public sub: string, public role: string) {}
			}

			const payload = new CustomPayload('user_42', 'admin');
			const token = await signJWS(payload, keyPair.privateKey);

			expect(typeof token).toBe('string');
			const parsed = parseJWT(token);
			expect(parsed?.payload.sub).toBe('user_42');
			expect(parsed?.payload.role).toBe('admin');

			const valid = await verifyJWS(token, keyPair.publicKey, 'RS256');
			expect(valid).toBe(true);

			await expect(signJWS(new Date(), keyPair.privateKey)).rejects.toThrow(
				new TypeError('WebToken: Payload must be a non-null object')
			);

			const payloadWithDate = { date: new Date(), sub: 'user_42' };
			const tokenWithDate = await signJWS(payloadWithDate, keyPair.privateKey);
			expect(await verifyJWS(tokenWithDate, keyPair.publicKey, 'RS256')).toBe(true);
		});

		it('signs and verifies RS256 token using PEM formatted strings', async () => {
			const payload = { sub: 'user_pem_test', scope: 'read:write' };
			const token = await signJWS(payload, privatePem, { alg: 'RS256', typ: 'JWT' });

			expect(typeof token).toBe('string');
			const parsed = parseJWT(token);
			expect(parsed?.header.alg).toBe('RS256');
			expect(parsed?.payload.sub).toBe('user_pem_test');

			const valid = await verifyJWS(token, publicPem, 'RS256');
			expect(valid).toBe(true);
		});

		it('signs and verifies symmetric tokens with HS256, HS384, and HS512', async () => {
			const payload = { sub: 'user_hmac_test', role: 'editor' };
			const secret = 'super-secret-hmac-key';

			// HS256
			const token256 = await signJWS(payload, secret, { alg: 'HS256', typ: 'JWT' });
			expect(await verifyJWS(token256, secret, 'HS256')).toBe(true);
			expect(await verifyJWS(token256, 'wrong-secret', 'HS256')).toBe(false);

			// HS384
			const token384 = await signJWS(payload, secret, { alg: 'HS384', typ: 'JWT' });
			expect(await verifyJWS(token384, secret, 'HS384')).toBe(true);

			// HS512
			const token512 = await signJWS(payload, secret, { alg: 'HS512', typ: 'JWT' });
			expect(await verifyJWS(token512, secret, 'HS512')).toBe(true);
		});

		it('rejects signature verification if token payload or signature is tampered', async () => {
			const payload = { sub: 'tamper_test' };
			const secret = 'my-secret';
			const token = await signJWS(payload, secret, { alg: 'HS256', typ: 'JWT' });

			const [h, , s] = token.split('.');
			const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'attacker' }))
				.toString('base64')
				.replace(/\+/g, '-')
				.replace(/\//g, '_')
				.replace(/=/g, '');

			const tamperedToken = `${h}.${tamperedPayload}.${s}`;
			expect(await verifyJWS(tamperedToken, secret, 'HS256')).toBe(false);
		});

		it('rejects unsupported algorithms gracefully', async () => {
			const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			try {
				const payload = { sub: 'unsupported_test' };
				await expect(signJWS(payload, 'secret', { alg: 'NONE' as any })).rejects.toThrow('Unsupported algorithm "NONE"');
			} finally {
				errorSpy.mockRestore();
			}
		});

		it('refuses to use asymmetric PEM key as HMAC secret in signJWS', async () => {
			const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			try {
				const payload = { sub: 'attacker', role: 'admin' };
				await expect(signJWS(payload, publicPem, { alg: 'HS256', typ: 'JWT' })).rejects.toThrow(
					new TypeError('WebToken: Refusing to use asymmetric PEM key as HMAC secret')
				);
				await expect(signJWS(payload, privatePem, { alg: 'HS384', typ: 'JWT' })).rejects.toThrow(
					new TypeError('WebToken: Refusing to use asymmetric PEM key as HMAC secret')
				);
				await expect(signJWS(payload, publicPem, { alg: 'HS512', typ: 'JWT' })).rejects.toThrow(
					new TypeError('WebToken: Refusing to use asymmetric PEM key as HMAC secret')
				);
			} finally {
				errorSpy.mockRestore();
			}
		});

		it('rejects algorithm confusion attack in verifyJWS when public PEM is used as HMAC secret', async () => {
			const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			try {
				const payload = { sub: 'attacker', role: 'admin' };
				const hmacToken = await signJWS(payload, 'symmetric-secret', { alg: 'HS256', typ: 'JWT' });

				expect(await verifyJWS(hmacToken, publicPem, 'RS256')).toBe(false);
				expect(await verifyJWS(hmacToken, publicPem, '' as any)).toBe(false);
			} finally {
				errorSpy.mockRestore();
			}
		});

		it('rejects tokens with missing, empty, or non-string alg header in verifyJWS', async () => {
			const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			try {
				const noAlgToken = makeToken({ typ: 'JWT' }, { sub: 'user_1' });
				expect(await verifyJWS(noAlgToken, keyPair.publicKey, 'RS256')).toBe(false);

				const emptyAlgToken = makeToken({ alg: '', typ: 'JWT' }, { sub: 'user_1' });
				expect(await verifyJWS(emptyAlgToken, keyPair.publicKey, 'RS256')).toBe(false);

				const nonStringAlgToken = makeToken({ alg: 123, typ: 'JWT' }, { sub: 'user_1' });
				expect(await verifyJWS(nonStringAlgToken, keyPair.publicKey, 'RS256')).toBe(false);
			} finally {
				errorSpy.mockRestore();
			}
		});

		it('normalizes headers.alg to RS256 in signJWS if alg is omitted from headers', async () => {
			const tokenNoHeaderAlg = await signJWS({ sub: 'user_default' }, keyPair.privateKey, { typ: 'JWT' } as any);
			const parsed = parseJWT(tokenNoHeaderAlg);
			expect(parsed?.header.alg).toBe('RS256');
			expect(await verifyJWS(tokenNoHeaderAlg, keyPair.publicKey, 'RS256')).toBe(true);
		});
	});
});
