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

	describe('signJWS', () => {
		let keyPair: CryptoKeyPair;

		beforeAll(async () => {
			keyPair = await globalThis.crypto.subtle.generateKey(
				{
					name: 'RSASSA-PKCS1-v1_5',
					modulusLength: 2048,
					publicExponent: new Uint8Array([1, 0, 1]),
					hash: 'SHA-256',
				},
				true,
				['sign', 'verify']
			);
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

			const valid = await verifyJWS(token, keyPair.publicKey);
			expect(valid).toBe(true);
		});
	});
});
