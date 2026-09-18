import { Tempo } from '@magmacomputing/tempo';
import { AiPlugin, resetAI } from '../src/index.js';

describe('AiPlugin & Tempo.ai Namespace', () => {
	beforeEach(() => {
		resetAI();
		Tempo.use(AiPlugin);
	});

	afterEach(() => {
		resetAI();
		vi.restoreAllMocks();
	});

	it('should mount Tempo.ai static namespace upon installation', () => {
		expect(Tempo.ai).toBeDefined();
		expect(typeof Tempo.ai.parse).toBe('function');
		expect(typeof Tempo.ai.schedule).toBe('function');
		expect(typeof Tempo.ai.format).toBe('function');
		expect(typeof Tempo.ai.extract).toBe('function');
		expect(typeof Tempo.ai.diff).toBe('function');
		expect(typeof Tempo.ai.recurrence).toBe('function');
		expect(typeof Tempo.ai.context).toBe('function');
		expect(typeof Tempo.ai.init).toBe('function');
		expect(typeof Tempo.ai.reset).toBe('function');
		expect(typeof Tempo.ai.models).toBe('function');
	});

	it('should expose frozen immutable Tempo.ai namespace object', () => {
		expect(Object.isFrozen(Tempo.ai)).toBe(true);
		expect(() => {
			(Tempo.ai as any).parse = () => { };
		}).toThrow();
	});

	it('should configure AI provider via Tempo.ai.init()', async () => {
		await Tempo.ai.init({
			remoteConfigUrl: false,
			providers: [{ id: 'groq', key: 'test-key' }],
		});

		expect(Tempo.ai.config.providers).toHaveLength(1);
		expect(Tempo.ai.config.providers?.[0].id).toBe('groq');
	});

	it('should maintain 100% namespace purity on Tempo interface', () => {
		const t = new Tempo('2026-05-15');
		expect((t as any).formatAI).toBeUndefined();
		expect(typeof Tempo.ai.format).toBe('function');
	});

	it('should auto-register when importing install entry point', async () => {
		const mod = await import('../src/install.js');
		expect(mod.AiPlugin).toBe(AiPlugin);
		expect(Tempo.ai).toBeDefined();
		expect(typeof Tempo.ai.parse).toBe('function');
	});
});
