import util from 'node:util';
import { Tempo } from '@magmacomputing/tempo';
import {
	initAI,
	resetAI,
	parseAI,
	formatAI,
	extractAI,
	diffAI,
	contextAI,
	scheduleAI,
	recurrenceAI,
} from '../src/index.js';
import { maskPii, sanitizeForLog, logDebug, warnDebug, attachCustomInspect } from '../src/core/logger.js';

describe('Smart Debug & PII Protection Infrastructure', () => {
	const originalEnv = process.env.NODE_ENV;

	beforeEach(async () => {
		resetAI();
		Tempo.cache.clear();
		process.env.NODE_ENV = 'test';
		await initAI({
			remoteConfigUrl: false,
			providers: [{ id: 'groq', key: 'gsk-1234567890abcdef1234567890' }],
		});
	});

	afterEach(() => {
		process.env.NODE_ENV = originalEnv;
		resetAI();
		Tempo.cache.clear();
		vi.restoreAllMocks();
	});

	describe('maskPii utility', () => {
		it('should preserve full text when isProd is false (development mode)', () => {
			const raw = 'Contact user john.smith@company.org or call +1-555-867-5309 with Bearer sk-ant-secret12345';
			const masked = maskPii(raw, false);
			expect(masked).toBe(raw);
		});

		it('should mask emails, phone numbers, and bearer tokens when isProd is true', () => {
			const raw = 'Reach out to support@magma.com or sales.desk@domain.co.uk';
			const masked = maskPii(raw, true);
			expect(masked).not.toContain('support@magma.com');
			expect(masked).not.toContain('sales.desk@domain.co.uk');
			expect(masked).toContain('s***@magma.com');
			expect(masked).toContain('s***@domain.co.uk');
		});

		it('should mask phone numbers in production', () => {
			const raw = 'Direct line: +1-555-867-5309 or 555-123-4567';
			const masked = maskPii(raw, true);
			expect(masked).toContain('***-***-5309');
			expect(masked).toContain('***-***-4567');
		});

		it('should mask API keys and bearer tokens in production', () => {
			const raw = 'Authorization: Bearer gsk_99887766554433221100 and key sk-proj-1234567890abcdef1234';
			const masked = maskPii(raw, true);
			expect(masked).toContain('Bearer gsk_...1100');
			expect(masked).toContain('sk-pr...1234');
		});

		it('should recognize production environment aliases (prod, live, PROD=true)', () => {
			process.env.NODE_ENV = 'prod';
			expect(maskPii('email test@corp.com')).toContain('t***@corp.com');

			process.env.NODE_ENV = 'live';
			expect(maskPii('email test@corp.com')).toContain('t***@corp.com');

			process.env.NODE_ENV = 'development';
			process.env.PROD = 'true';
			expect(maskPii('email test@corp.com')).toContain('t***@corp.com');
			delete process.env.PROD;
		});
	});

	describe('sanitizeForLog utility', () => {
		it('should truncate strings exceeding 256 characters in production', () => {
			const longStr = 'A'.repeat(400);
			const sanitizedProd = sanitizeForLog(longStr, true);
			expect(typeof sanitizedProd).toBe('string');
			expect((sanitizedProd as string).length).toBeLessThan(400);
			expect((sanitizedProd as string)).toContain('... [truncated');

			const sanitizedDev = sanitizeForLog(longStr, false);
			expect(sanitizedDev).toBe(longStr);
		});

		it('should recursively sanitize objects and mask sensitive values in production', () => {
			const payload = {
				user: 'alice@example.com',
				details: {
					phone: '555-987-6543',
					notes: 'Regular note',
				},
				tags: ['confidential: Bearer secret-token-123456'],
			};

			const sanitized = sanitizeForLog(payload, true) as any;
			expect(sanitized.user).toBe('a***@example.com');
			expect(sanitized.details.phone).toBe('***-***-6543');
			expect(sanitized.tags[0]).toContain('Bearer secr...3456');
		});
	});

	describe('attachCustomInspect & Proxy Introspection', () => {
		it('should redact inspect/JSON output while maintaining 100% in-memory data integrity', () => {
			const rawMeta = {
				rawPrompt: 'Meeting with ceo@acme.com on next Friday',
				reasoning: 'Parsed meeting request for next Friday',
				confidence: 0.95,
			};

			const inspectable = attachCustomInspect(rawMeta, (obj, isProd) => ({
				confidence: obj.confidence,
				rawPrompt: maskPii(obj.rawPrompt, isProd),
				reasoning: maskPii(obj.reasoning, isProd),
			}));

			// In-memory data is completely unredacted
			expect(inspectable.rawPrompt).toBe('Meeting with ceo@acme.com on next Friday');
			expect(inspectable.reasoning).toBe('Parsed meeting request for next Friday');

			// Custom inspect in production
			process.env.NODE_ENV = 'production';
			const inspectCustomSymbol = Symbol.for('nodejs.util.inspect.custom');
			const inspectFn = (inspectable as any)[inspectCustomSymbol];
			expect(typeof inspectFn).toBe('function');

			const inspectedProd = inspectFn();
			expect(inspectedProd.rawPrompt).toContain('c***@acme.com');
			expect(inspectedProd.rawPrompt).not.toContain('ceo@acme.com');

			const jsonProd = (inspectable as any).toJSON();
			expect(jsonProd.rawPrompt).toContain('c***@acme.com');

			// In-memory data still untouched
			expect(inspectable.rawPrompt).toBe('Meeting with ceo@acme.com on next Friday');

			// Node.js util.inspect integration
			const terminalOutput = util.inspect(inspectable);
			expect(terminalOutput).toContain('c***@acme.com');
			expect(terminalOutput).not.toContain('ceo@acme.com');
		});
	});

	describe('Smart Logger (logDebug / warnDebug)', () => {
		it('should only log when debug flag is active', () => {
			const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			logDebug('test-tag', 'Message 1', undefined, { debug: false });
			expect(logSpy).not.toHaveBeenCalled();

			logDebug('test-tag', 'Message 2', undefined, { debug: true });
			expect(logSpy).toHaveBeenCalledTimes(1);
			expect(logSpy.mock.calls[0][0]).toContain('[test-tag] Message 2');

			warnDebug('test-tag', 'Warning 1', new Error('Err'), { debug: false });
			expect(warnSpy).not.toHaveBeenCalled();

			warnDebug('test-tag', 'Warning 2', new Error('Err'), { debug: true });
			expect(warnSpy).toHaveBeenCalledTimes(1);
		});

		it('should sanitize PII in console.log when in production environment', () => {
			process.env.NODE_ENV = 'production';
			const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			logDebug('test-tag', 'User email is sensitive@corp.com with token Bearer sk-1234567890', undefined, { debug: true });
			expect(logSpy).toHaveBeenCalledTimes(1);
			const loggedMsg = logSpy.mock.calls[0][0];
			expect(loggedMsg).not.toContain('sensitive@corp.com');
			expect(loggedMsg).toContain('s***@corp.com');
			expect(loggedMsg).toContain('Bearer sk-1...7890');
		});
	});

	describe('End-to-End AI Function Inspect Hardening', () => {
		it('should protect parseAI returned Tempo instance metadata', async () => {
			const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{
					message: {
						content: JSON.stringify({
							iso: '2026-08-15T10:00:00Z',
							confidence: 0.99,
							reasoning: 'User john.doe@example.com requested next Saturday',
						}),
					},
				}],
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

			const target = await parseAI('Meeting with john.doe@example.com next Saturday', { debug: true });
			expect(target.isValid).toBe(true);

			// In-memory access is 100% full fidelity
			expect(target.ai?.rawPrompt).toBe('Meeting with john.doe@example.com next Saturday');
			expect(target.ai?.reasoning).toBe('User john.doe@example.com requested next Saturday');

			// In production, util.inspect output masks PII
			process.env.NODE_ENV = 'production';
			const terminalLog = util.inspect(target.ai);
			expect(terminalLog).toContain('j***@example.com');
			expect(terminalLog).not.toContain('john.doe@example.com');
		});

		it('should protect formatAI result object inspection', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{
					message: {
						content: JSON.stringify({
							formatted: 'Saturday morning at 10:00 AM',
							confidence: 0.95,
							reasoning: 'Formatted for client alice.smith@partner.org with note call 555-123-4567',
						}),
					},
				}],
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

			const res = await formatAI(new Tempo('2026-08-15T10:00:00Z'), 'friendly tone');
			expect(res.formatted).toBe('Saturday morning at 10:00 AM');
			expect(res.reasoning).toContain('alice.smith@partner.org');

			// Under production inspect
			process.env.NODE_ENV = 'production';
			const inspected = util.inspect(res);
			expect(inspected).toContain('a***@partner.org');
			expect(inspected).not.toContain('alice.smith@partner.org');
			expect(inspected).toContain('***-***-4567');
		});

		it('should protect extractAI result object inspection', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{
					message: {
						content: JSON.stringify({
							events: [{
								label: 'Interview with candidate bob.ross@art.com',
								start: '2026-08-15T14:00:00Z',
								type: 'point',
								rawText: 'Interview bob.ross@art.com (555-888-9999) at 2pm',
							}],
							confidence: 0.98,
							reasoning: 'Extracted single candidate event',
						}),
					},
				}],
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

			const res = await extractAI('Interview bob.ross@art.com (555-888-9999) at 2pm');
			expect(res.events[0].label).toBe('Interview with candidate bob.ross@art.com');
			expect(res.events[0].rawText).toContain('555-888-9999');

			// Under production inspect
			process.env.NODE_ENV = 'production';
			const inspected = util.inspect(res);
			expect(inspected).toContain('b***@art.com');
			expect(inspected).not.toContain('bob.ross@art.com');
			expect(inspected).toContain('***-***-9999');
		});

		it('should protect diffAI result object inspection', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{
					message: {
						content: JSON.stringify({
							formatted: '3 business days',
							confidence: 0.95,
							reasoning: 'Calculated for ticket user#42 (urgent contact 555-333-2222)',
						}),
					},
				}],
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

			const res = await diffAI(new Tempo('2026-08-10T09:00:00Z'), new Tempo('2026-08-13T09:00:00Z'), 'in business days');
			expect(res.reasoning).toContain('555-333-2222');

			process.env.NODE_ENV = 'production';
			const inspected = util.inspect(res);
			expect(inspected).toContain('***-***-2222');
			expect(inspected).not.toContain('555-333-2222');
		});

		it('should protect scheduleAI result object inspection', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{
					message: {
						content: JSON.stringify({
							start: '2026-08-17T10:00:00Z',
							end: '2026-08-17T11:00:00Z',
							summary: 'Meeting with client client@enterprise.com',
							reasoning: 'Found available 1hr slot for client@enterprise.com',
							confidence: 0.95,
						}),
					},
				}],
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

			const res = await scheduleAI('Schedule 1 hour with client@enterprise.com next Monday');
			expect(res.summary).toBe('Meeting with client client@enterprise.com');

			process.env.NODE_ENV = 'production';
			const inspected = util.inspect(res);
			expect(inspected).toContain('c***@enterprise.com');
			expect(inspected).not.toContain('client@enterprise.com');
		});

		it('should protect recurrenceAI result object inspection', async () => {
			vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
				choices: [{
					message: {
						content: JSON.stringify({
							rrule: 'FREQ=WEEKLY;BYDAY=TU;BYHOUR=15',
							summary: 'Weekly sync with dev-team@internal.org at 3pm',
							reasoning: 'Configured recurring meeting for dev-team@internal.org',
							confidence: 0.95,
						}),
					},
				}],
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));

			const res = await recurrenceAI('Every Tuesday at 3pm for dev-team@internal.org');
			expect(res.summary).toBe('Weekly sync with dev-team@internal.org at 3pm');

			process.env.NODE_ENV = 'production';
			const inspected = util.inspect(res);
			expect(inspected).toContain('d***@internal.org');
			expect(inspected).not.toContain('dev-team@internal.org');
		});
	});
});
