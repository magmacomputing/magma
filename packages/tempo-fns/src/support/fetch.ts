/**
 * A generic fetch wrapper that adds a timeout using AbortController.
 */
export const fetchWithTimeout = async (url: string, timeoutMs = 2000, options: RequestInit = {}): Promise<Response> => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	const signal = options.signal
		? AbortSignal.any([options.signal, controller.signal])
		: controller.signal;

	const response = await fetch(url, { ...options, signal });
	clearTimeout(timeoutId);

	if (!response.ok) throw new Error(`API returned ${response.status} for ${url}`);

	return response;
}
