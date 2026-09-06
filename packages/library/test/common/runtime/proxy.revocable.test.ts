import { revocable, ephemeral, sym } from '#library';

describe('revocable proxy', () => {
	test('allows access prior to revocation and throws TypeError afterwards', () => {
		const target = { id: 'auth-123', count: 10 };
		const { proxy, revoke } = revocable(target);

		expect(proxy.id).toBe('auth-123');
		expect(proxy.count).toBe(10);
		expect('id' in proxy).toBe(true);
		expect(Object.keys(proxy)).toEqual(['id', 'count']);

		revoke();

		expect(() => proxy.id).toThrow(TypeError);
		expect(() => {
			proxy.count = 20;
		}).toThrow(TypeError);
		expect(() => 'id' in proxy).toThrow(TypeError);
		expect(() => Object.keys(proxy)).toThrow(TypeError);
	});

	test('supports unwrap symbol prior to revocation', () => {
		const target = { secret: 'top-secret' };
		const { proxy, revoke } = revocable(target);

		expect((proxy as any)[sym.$Target]).toBe(target);

		revoke();

		expect(() => (proxy as any)[sym.$Target]).toThrow(TypeError);
	});

	test('respects ProxyOptions such as frozen', () => {
		const target = { writable: true };
		const { proxy, revoke } = revocable(target, { frozen: true });

		expect(() => {
			(proxy as any).writable = false;
		}).toThrow(/frozen/);

		revoke();
		expect(() => proxy.writable).toThrow(TypeError);
	});
});

describe('ephemeral proxy', () => {
	test('executes synchronous callback and revokes proxy immediately on return', () => {
		let leakedProxy: any = null;
		const target = { token: 'bearer-abc', user: 'alice' };

		const result = ephemeral(target, (scoped) => {
			leakedProxy = scoped;
			return `${scoped.user}:${scoped.token}`;
		});

		expect(result).toBe('alice:bearer-abc');
		expect(leakedProxy).not.toBeNull();
		// Accessing the leaked handle outside the ephemeral scope must fail
		expect(() => leakedProxy.token).toThrow(TypeError);
		expect(() => leakedProxy.user).toThrow(TypeError);
	});

	test('handles asynchronous callback and revokes proxy after Promise settles', async () => {
		let leakedProxy: any = null;
		const target = { secret: 'async-token' };

		const promise = ephemeral(target, async (scoped) => {
			leakedProxy = scoped;
			await new Promise((resolve) => setTimeout(resolve, 10));
			return scoped.secret.toUpperCase();
		});

		// During execution, proxy is active
		expect(leakedProxy.secret).toBe('async-token');

		const result = await promise;
		expect(result).toBe('ASYNC-TOKEN');

		// After resolution, proxy is revoked
		expect(() => leakedProxy.secret).toThrow(TypeError);
	});

	test('revokes proxy even if the synchronous callback throws', () => {
		let leakedProxy: any = null;
		const target = { data: 'test' };

		expect(() => {
			ephemeral(target, (scoped) => {
				leakedProxy = scoped;
				throw new Error('Callback failure');
			});
		}).toThrow('Callback failure');

		expect(leakedProxy).not.toBeNull();
		expect(() => leakedProxy.data).toThrow(TypeError);
	});

	test('revokes proxy even if the asynchronous callback rejects', async () => {
		let leakedProxy: any = null;
		const target = { data: 'async-failure' };

		await expect(
			ephemeral(target, async (scoped) => {
				leakedProxy = scoped;
				await new Promise((resolve) => setTimeout(resolve, 5));
				throw new Error('Async error');
			})
		).rejects.toThrow('Async error');

		expect(leakedProxy).not.toBeNull();
		expect(() => leakedProxy.data).toThrow(TypeError);
	});
});
