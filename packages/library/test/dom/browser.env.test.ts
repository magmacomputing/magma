// @vitest-environment happy-dom
import { WebStore } from '../../src/browser/webstore.class.js';
import { alert, prompt, confirm } from '../../src/browser/window.library.js';
import { onAbort, anySignal, timeoutSignal, Aborter } from '../../src/common/runtime/aborter.library.js';

describe('Browser DOM Environment (happy-dom)', () => {
	it('provides a simulated DOM environment with window, document, and DOM APIs', () => {
		expect(typeof window).toBe('object');
		expect(typeof document).toBe('object');
		expect(typeof document.createElement).toBe('function');
		expect(typeof window.addEventListener).toBe('function');
	});

	it('interacts with DOM elements and EventTarget dispatching', () => {
		const div = document.createElement('div');
		div.id = 'test-node';
		document.body.appendChild(div);

		let clicked = false;
		div.addEventListener('click', () => { clicked = true; });
		div.dispatchEvent(new MouseEvent('click'));

		expect(clicked).toBe(true);
		expect(document.getElementById('test-node')).toBe(div);
		div.remove();
	});

	it('persists and retrieves data in WebStore with native localStorage', () => {
		const store = new WebStore('local');
		store.set('browser-key', { time: '2026-10-08', value: 123 });

		const retrieved = store.get<{ time: string; value: number }>('browser-key');
		expect(retrieved).toEqual({ time: '2026-10-08', value: 123 });

		store.del('browser-key');
		expect(store.get('browser-key')).toBeNull();
	});

	it('supports window dialog stubs (alert, prompt, confirm)', () => {
		window.alert = vi.fn();
		window.prompt = vi.fn().mockReturnValue('UserInput');
		window.confirm = vi.fn().mockReturnValue(true);

		alert('Hello DOM');
		expect(window.alert).toHaveBeenCalledWith('Hello DOM');

		const input = prompt('Enter value');
		expect(input).toBe('UserInput');

		const ok = confirm('Continue?');
		expect(ok).toBe(true);
	});

	it('works seamlessly with Aborter and signal utilities in browser DOM', () => {
		using aborter = new Aborter();
		const received: string[] = [];

		const unbind = onAbort(aborter.signal, () => {
			received.push('aborted');
		});

		expect(received).toEqual([]);
		aborter.abort();
		expect(received).toEqual(['aborted']);
	});
});
