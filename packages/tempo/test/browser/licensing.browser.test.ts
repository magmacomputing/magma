
test('Commercial Licensing engine runs natively in browser', async () => {
	// 1. Import the granular ESM build which should contain the commercial engine
	const m = await import('../../dist/tempo.index.js');

	// 2. Create a mock JWT token (invalid signature)
	const payload = { scopes: { premium_feature: {} }, exp: Date.now() / 1000 + 10000 };
	const mockToken = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(payload))}.fakesignature`;

	// 3. Initialize Tempo with the token
	m.Tempo.init({ license: mockToken });
	const state = (m.Tempo as any)[Symbol.for('magmacomputing/tempo/internal')]();

	expect(state.license.key).toBe(mockToken);

	// 4. Await the background validation pledge
	const res = await state.license.jws;

	// 5. Verify the commercial engine actually executed.
	// If it was the Community Build, the error would say "Cryptographic engine missing..."
	// If it's the Commercial Build, it will actually attempt to verify the signature and fail securely.
	expect(res.status).toBe('invalid');
	expect(res.error).toBeDefined();
	expect(res.error).not.toContain('Community Build');
	expect(res.error).toContain('verify'); // e.g. "Cryptographic verification failed" or similar
});
