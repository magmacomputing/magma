import { Tempo } from '@magmacomputing/tempo';
import { BatchPlugin, BatchOrchestrator } from '../src/index.js';

describe('Batch Plugin', () => {
	it('should successfully register the Tempo.batch namespace', () => {
		Tempo.use(BatchPlugin);
		expect((Tempo as any).batch).toBeTypeOf('function');
	});

	describe('sanitizeExecArgv', () => {
		it('should only preserve allowlisted flags with separate and inline values', () => {
			const input = [
				'--max-old-space-size=4096',
				'--title', 'worker-title',
				'--import', 'tsx',
				'-r', 'ts-node/register',
				'--require', 'source-map-support/register',
				'--experimental-temporal',
				'--eval=console.log(1)',
				'--inspect=9229',
			];

			const sanitized = BatchOrchestrator.sanitizeExecArgv(input);
			expect(sanitized).toEqual([
				'--import', 'tsx',
				'-r', 'ts-node/register',
				'--require', 'source-map-support/register',
				'--experimental-temporal',
				'--inspect=9229',
			]);
		});

		it('should strip unsupported flags with separate following values', () => {
			const input = [
				'--trace-warnings',
				'-e', 'console.log("hi")',
				'--title', 'worker-title',
				'--max-old-space-size', '2048',
				'--input-type', 'module',
				'-p', 'test()',
				'--inspect',
			];

			const sanitized = BatchOrchestrator.sanitizeExecArgv(input);
			expect(sanitized).toEqual(['--trace-warnings', '--inspect']);
		});

		it('should strip unsupported flags with inline = values', () => {
			const input = [
				'--max-old-space-size=4096',
				'--max_old_space_size=2048',
				'--title=my-service',
				'--eval=1+1',
				'--print=hello',
				'--input-type=commonjs',
				'--experimental-vm-modules',
			];

			const sanitized = BatchOrchestrator.sanitizeExecArgv(input);
			expect(sanitized).toEqual(['--experimental-vm-modules']);
		});

		it('should strip unsupported boolean flags', () => {
			const input = [
				'--check',
				'-c',
				'-i',
				'--interactive',
				'--expose-gc',
				'--prof-process',
				'--loader=ts-node/esm',
			];

			const sanitized = BatchOrchestrator.sanitizeExecArgv(input);
			expect(sanitized).toEqual(['--loader=ts-node/esm']);
		});

		it('should handle trailing flags without value and empty arrays', () => {
			expect(BatchOrchestrator.sanitizeExecArgv(['--title'])).toEqual([]);
			expect(BatchOrchestrator.sanitizeExecArgv(['--max-old-space-size'])).toEqual([]);
			expect(BatchOrchestrator.sanitizeExecArgv([])).toEqual([]);
		});
	});

	it.todo('should successfully orchestrate a batch mutation (Requires Node 26+ native Temporal)', async () => {
		Tempo.use(BatchPlugin);
		const startEpoch = new Tempo().epoch.ms;
		const epochs = [startEpoch, startEpoch + 1000];

		// This will crash on Node 24 because the spawned worker isolate lacks the JS polyfill
		const result = await (Tempo as any).batch(epochs, '+1w', { weeks: 1 });

		expect(result).toHaveLength(2);
	});
});
