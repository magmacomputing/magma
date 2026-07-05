import { fetchRequest, fetchHead, HttpError } from '../../src/common/request.library.js';

describe('request.library', () => {
	const mockFetch = vi.fn();

	beforeEach(() => {
		globalThis.fetch = mockFetch;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('fetchRequest', () => {
		it('should parse JSON when Content-Type is application/json', async () => {
			const mockData = { message: 'hello' };
			mockFetch.mockResolvedValueOnce({
				ok: true,
				headers: new Headers({ 'Content-Type': 'application/json; charset=utf-8' }),
				json: async () => mockData
			} as unknown as Response);

			const result = await fetchRequest('https://example.com/api');
			expect(result).toEqual(mockData);
		});

		it('should return raw text when Content-Type is not JSON', async () => {
			const mockText = 'hello world';
			mockFetch.mockResolvedValueOnce({
				ok: true,
				headers: new Headers({ 'Content-Type': 'text/plain' }),
				text: async () => mockText
			} as unknown as Response);

			const result = await fetchRequest('https://example.com/text');
			expect(result).toEqual(mockText);
		});

		it('should strip prefix if provided', async () => {
			const prefix = ')]}\'\n';
			const rawText = `${prefix}{"a":1}`;
			mockFetch.mockResolvedValueOnce({
				ok: true,
				headers: new Headers({ 'Content-Type': 'application/json' }),
				text: async () => rawText
			} as unknown as Response);

			const result = await fetchRequest('https://example.com/data', {}, { prefix });
			expect(result).toEqual({ a: 1 });
		});

		it('should throw HttpError with JSON body on 400', async () => {
			const errorBody = { error: 'Bad request' };
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				text: async () => JSON.stringify(errorBody)
			} as unknown as Response);

			try {
				await fetchRequest('https://example.com/api');
				expect.fail('Should have thrown HttpError');
			} catch (err: any) {
				expect(err).toBeInstanceOf(HttpError);
				expect(err.status).toBe(400);
				expect(err.statusText).toBe('Bad Request');
				expect(err.body).toEqual(errorBody);
			}
		});

		it('should throw HttpError with text body on 500 when JSON parsing fails', async () => {
			const errorText = 'Internal Server Error Occurred';
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Server Error',
				text: async () => errorText
			} as unknown as Response);

			try {
				await fetchRequest('https://example.com/api');
				expect.fail('Should have thrown HttpError');
			} catch (err: any) {
				expect(err).toBeInstanceOf(HttpError);
				expect(err.status).toBe(500);
				expect(err.body).toBe(errorText);
			}
		});
	});

	describe('fetchHead', () => {
		it('should return status and headers on ok response', async () => {
			const mockHeaders = new Headers({ 'Content-Length': '123' });
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				headers: mockHeaders
			} as unknown as Response);

			const result = await fetchHead('https://example.com/api');
			expect(result.status).toBe(200);
			expect(result.headers).toBe(mockHeaders);
		});

		it('should throw Error on non-ok response (except Forbidden)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: 'Not Found'
			} as unknown as Response);

			await expect(fetchHead('https://example.com/api')).rejects.toThrow('404: Not Found');
		});

		it('should return status and headers on Forbidden (403)', async () => {
			const mockHeaders = new Headers();
			mockFetch.mockResolvedValueOnce({
				ok: false,
				status: 403,
				headers: mockHeaders
			} as unknown as Response);

			const result = await fetchHead('https://example.com/api');
			expect(result.status).toBe(403);
			expect(result.headers).toBe(mockHeaders);
		});
	});
});
