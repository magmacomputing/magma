import { Tempo } from '#tempo';
import { parseJSONC } from '@magmacomputing/tempo/library';

describe('#setConfig refactor verification', () => {

  beforeEach(() => {
    Tempo[Symbol.dispose]();																// Reset global config to defaults
  })

  test('should handle snippet as a single RegExp', () => {
    using _ = Tempo;																				// ensure cleanup after test
    Tempo.init({ registry: { snippets: { 'test': /test-regex/ } } });
    const parse = Tempo.parse;
    // Symbol.for('test') or whatever Token['test'] returns
    const sym = Tempo.getSymbol('test');
    expect(parse.snippet[sym]).toBeInstanceOf(RegExp);
    expect(parse.snippet[sym].source).toBe('test-regex')
  })

  test('should handle snippet as a string (converted to RegExp)', () => {
    using _ = Tempo;
    Tempo.init({ registry: { snippets: { 'testStr': 'test-string' } } });
    const sym = Tempo.getSymbol('testStr');
    expect(Tempo.parse.snippet[sym]).toBeInstanceOf(RegExp);
    expect(Tempo.parse.snippet[sym].source).toBe('test-string')
  })

  test('should handle layout as a single string', () => {
    using _ = Tempo;
    Tempo.init({ registry: { layouts: { 'myLayout': '{dd}{mm}{yy}' } } });
    const sym = Tempo.getSymbol('myLayout');
    expect(Tempo.parse.layout[sym]).toBe('{dd}{mm}{yy}')
  })

  test('should parse custom date layout registered via registry.layouts', () => {
    using _ = Tempo;
    Tempo.init({ timeZone: 'UTC', locale: 'en-GB', registry: { layouts: { dot_date: '{dd}\\.{mm}\\.{yy}' } } });
    const date = new Tempo('04.08.2026');
    expect(date.isValid).toBe(true);
    expect(date.dd).toBe(4);
    expect(date.mm).toBe(8);
    expect(date.yy).toBe(2026);
  })

  test('should handle custom string layout with escaped star delimiters', () => {
    using _ = Tempo;
    Tempo.init({ registry: { layouts: { star_date: '{mm}\\*{dd}\\*{yy}' } } });
    const date = new Tempo('08*04*2026');
    expect(date.isValid).toBe(true);
    expect(date.mm).toBe(8);
    expect(date.dd).toBe(4);
    expect(date.yy).toBe(2026);
  })

  test('should handle custom string layout with escaped pipe delimiters', () => {
    using _ = Tempo;
    Tempo.init({ registry: { layouts: { pipe_date: '{mm}\\|{dd}\\|{yy}' } } });
    const date = new Tempo('08|04|2026');
    expect(date.isValid).toBe(true);
    expect(date.mm).toBe(8);
    expect(date.dd).toBe(4);
    expect(date.yy).toBe(2026);
  })

  test('should handle layout as a RegExp (converted to source string)', () => {
    Tempo.init({ registry: { layouts: { 'myRegExpLayout': /^\d{4}$/ } } });
    const sym = Tempo.getSymbol('myRegExpLayout');
    expect(Tempo.parse.layout[sym]).toBe('^\\d{4}$')
  })

  test('should handle snippet as an array of objects/strings', () => {
    Tempo.init({
      registry: {
        snippets: [
          { 'snip1': 'val1' },
          'val2'																							// Unnamed
        ]
      }
    });
    expect(Tempo.parse.snippet[Tempo.getSymbol('snip1')].source).toBe('val1');
    // Unnamed is added via #setConfig collect case 'String' -> getSymbol()
    const getValues = (obj: any) => Reflect.ownKeys(obj).map(k => obj[k]);
    const snippets = getValues(Tempo.parse.snippet).map(r => (r as RegExp).source);
    expect(snippets).toContain('val1');
    expect(snippets).toContain('val2')
  })

  test('should handle nested arrays in options', () => {
    Tempo.init({
      registry: {
        layouts: [
          { 'lay1': 'v1' },
          [
            { 'lay2': 'v2' },
            'v3'
          ]
        ]
      }
    });
    const getValues = (obj: any) => Reflect.ownKeys(obj).map(k => obj[k]);
    const layouts = getValues(Tempo.parse.layout);
    expect(layouts).toContain('v1');
    expect(layouts).toContain('v2');
    expect(layouts).toContain('v3')
  })

  test('should handle mixed objects and single values in snippets', () => {
    Tempo.init({
      registry: {
        snippets: [
          { 'key1': 'val1' },
          'single-val-regex'
        ]
      }
    });
    const getValues = (obj: any) => Reflect.ownKeys(obj).map(k => obj[k]);
    const snippets = getValues(Tempo.parse.snippet).map(r => (r as RegExp).source);
    expect(snippets).toContain('val1');
    expect(snippets).toContain('single-val-regex')
  })

  test('should correctly set local config overrides', () => {
    const t = new Tempo({
      timeZone: 'UTC',
      registry: { snippets: { 'localSnip': 'locVal' } }
    });
    expect(t.config.timeZone).toBe('UTC');
    const getValues = (obj: any) => Reflect.ownKeys(obj).map(k => obj[k]);
    const snippets = getValues(t.parse.snippet).map(r => (r as RegExp).source);
    expect(snippets).toContain('locVal')
  })

  test('should omit anchor and value (but retain scope) from public config getter', () => {
    const t = new Tempo('now', { timeZone: 'America/New_York' });
    const config = t.config as any;
    expect(config.timeZone).toBe('America/New_York');
    expect(config.scope).toBeDefined();
    expect(config.anchor).toBeUndefined();
    expect(config.value).toBeUndefined();
  })

  test('should parse JSONC config with comments and trailing commas during bootstrap', async () => {
    using _ = Tempo;

    const jsoncText = `
    {
      // Default timezone
      "timeZone": "Australia/Sydney",
      "plugins": {
        // AI Configuration
        "ai": {
          "mode": "fallback",
          "providers": [
            { "id": "groq" },
          ],
        },
      },
    }
    `;
    const parsed = parseJSONC(jsoncText);
    expect(parsed.timeZone).toBe('Australia/Sydney');
    expect(parsed.plugins.ai.mode).toBe('fallback');
    expect(parsed.plugins.ai.providers).toEqual([{ id: 'groq' }]);

    await Tempo.init(parsed);
    expect(Tempo.config.timeZone).toBe('Australia/Sydney');
    expect((Tempo.config as any).plugins?.ai?.mode).toBe('fallback');
  })

  test('should handle custom layouts containing regex alternatives', () => {
    using _ = Tempo;
    Tempo.init({ registry: { layouts: { alt_layout: 'today|tomorrow' } } });
    const dateToday = new Tempo('today');
    const dateTomorrow = new Tempo('tomorrow');
    expect(dateToday.isValid).toBe(true);
    expect(dateTomorrow.isValid).toBe(true);
  })

  test('should export defineConfig and resolveConfig from config module', async () => {
    const { defineConfig, resolveConfig } = await import('@magmacomputing/tempo/config');
    expect(typeof defineConfig).toBe('function');
    expect(typeof resolveConfig).toBe('function');
    const dummy = { timeZone: 'UTC' };
    expect(defineConfig(dummy)).toBe(dummy);
  })

})

