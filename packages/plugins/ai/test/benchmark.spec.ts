import { normalizeCacheInput, getNamespacedCacheKey } from '../src/core/cache.js';

describe('AI Support Helpers Benchmark & Integrity', () => {
  it('should normalize cache input string whitespace and case', () => {
    const raw = '  NEXT   Friday   at   3PM  ';
    const normalized = normalizeCacheInput(raw);
    expect(normalized).toBe('next friday at 3pm');
  });

  it('should generate properly namespaced cache keys', () => {
    const key = getNamespacedCacheKey('extractAI', 'user-event-prompt');
    expect(key).toBe('ai:extractAI::user-event-prompt');
    expect(key.startsWith('ai:')).toBe(true);
  });
});
