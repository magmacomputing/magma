

test('Granular ESM loads and initializes natively in browser', async () => {
	// Import the Granular ESM bundle
	const m = await import('../../dist/tempo.index.js');
	expect(m.Tempo).toBeDefined();

	// Ensure initialization doesn't throw
	m.Tempo.init();
	expect(m.Tempo.properties).toBeDefined();
});

test('Bundled ESM loads and initializes natively in browser', async () => {
	// Import the Bundled ESM bundle
	// @ts-ignore - TS cannot automatically infer the type of the built bundle
	const m = await import('../../dist/tempo.bundle.esm.js');
	expect(m.Tempo).toBeDefined();

	m.Tempo.init();
	expect(m.Tempo.properties).toBeDefined();
});
