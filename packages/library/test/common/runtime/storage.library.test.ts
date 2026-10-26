import { getStorage, setStorage, clearStorage, nodeStorage, createMemoryStorage, toSignal } from '#library/storage.library.js';

describe('Storage Tombstone & BoundedCache Integration (NodeJS)', () => {
  const envKey = 'TEST_ENV_FALLBACK_KEY';
  const tombstoneKey = 'TEST_TOMBSTONE_KEY';

  const setEnv = (key: string, val?: string) => {
    const env = Reflect.get(process, 'env');
    if (env) {
      if (val !== undefined) Reflect.set(env, key, val);
      else Reflect.deleteProperty(env, key);
    }
  };

  beforeEach(() => {
    clearStorage();
    nodeStorage.maxSize = 1000;
    setEnv(envKey, undefined);
    setEnv(tombstoneKey, undefined);
  });

  afterEach(() => {
    nodeStorage.maxSize = 1000;
    clearStorage();
    setEnv(envKey, undefined);
    setEnv(tombstoneKey, undefined);
  });

  describe('Tombstone Behavior', () => {
    it('should fall back to process.env for untouched keys', () => {
      setEnv(envKey, 'env_value');
      expect(getStorage<string>(envKey)).toBe('env_value');
    });

    it('should honor deletion tombstone and prevent process.env fallback for cleared keys', () => {
      setEnv(tombstoneKey, 'env_fallback_value');

      // Store value initially
      setStorage(tombstoneKey, 'initial_value');
      expect(getStorage<string>(tombstoneKey)).toBe('initial_value');

      // Explicitly delete key (records tombstone)
      setStorage(tombstoneKey, undefined);

      // Reading cleared key must NOT fall back to process.env
      expect(getStorage<string>(tombstoneKey)).toBeUndefined();
      expect(getStorage<string>(tombstoneKey, 'dflt')).toBe('dflt');
    });
  });

  describe('BoundedCache LRU Eviction & Recency', () => {
    it('should evict oldest unaccessed keys when nodeStorage maxSize is exceeded', () => {
      nodeStorage.maxSize = 3;

      setStorage('k1', 'v1');
      setStorage('k2', 'v2');
      setStorage('k3', 'v3');
      expect(getStorage<string>('k1')).toBe('v1');
      expect(getStorage<string>('k2')).toBe('v2');
      expect(getStorage<string>('k3')).toBe('v3');

      // Adding 4th item evicts the oldest (k1)
      setStorage('k4', 'v4');
      expect(getStorage<string>('k1')).toBeUndefined();
      expect(getStorage<string>('k2')).toBe('v2');
      expect(getStorage<string>('k3')).toBe('v3');
      expect(getStorage<string>('k4')).toBe('v4');
    });

    it('should update recency when calling getStorage() so accessed items avoid eviction', () => {
      nodeStorage.maxSize = 3;

      setStorage('k1', 'v1');
      setStorage('k2', 'v2');
      setStorage('k3', 'v3');

      // Access k1 to make it most recently used; k2 is now the oldest
      expect(getStorage<string>('k1')).toBe('v1');

      // Insert k4 -> should evict k2, retaining k1, k3, k4
      setStorage('k4', 'v4');
      expect(getStorage<string>('k1')).toBe('v1');
      expect(getStorage<string>('k2')).toBeUndefined();
      expect(getStorage<string>('k3')).toBe('v3');
      expect(getStorage<string>('k4')).toBe('v4');
    });

    it('should evict tombstones under LRU pressure like normal entries', () => {
      nodeStorage.maxSize = 2;

      setStorage('tombstone', undefined);
      setStorage('active1', 'val1');

      // Both keys are present (one as a tombstone)
      expect(nodeStorage.has('tombstone')).toBe(true);

      // Insert active2 -> evicts the oldest entry ('tombstone')
      setStorage('active2', 'val2');
      expect(nodeStorage.has('tombstone')).toBe(false);
      expect(getStorage<string>('active1')).toBe('val1');
      expect(getStorage<string>('active2')).toBe('val2');
    });
  });

  describe('ServerStorageOptions (TTL & Static)', () => {
    it('should support per-entry custom TTL in server context', async () => {
      setStorage('permanent', 'stays');
      setStorage('temporary', 'expires_soon', { ttl: 30 }); // 30ms TTL

      expect(getStorage<string>('permanent')).toBe('stays');
      expect(getStorage<string>('temporary')).toBe('expires_soon');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(getStorage<string>('permanent')).toBe('stays');
      expect(getStorage<string>('temporary')).toBeUndefined();
    });

    it('should protect static keys from LRU eviction', () => {
      nodeStorage.maxSize = 2;

      setStorage('glossary_term', 'immutable_definition', { static: true });
      setStorage('d1', 'dyn1');
      setStorage('d2', 'dyn2');

      // Static keys do not consume non-static capacity
      expect(getStorage<string>('glossary_term')).toBe('immutable_definition');
      expect(getStorage<string>('d1')).toBe('dyn1');
      expect(getStorage<string>('d2')).toBe('dyn2');

      // Adding 3rd dynamic key exceeds maxSize=2 and evicts oldest non-static key (d1)
      setStorage('d3', 'dyn3');
      expect(getStorage<string>('glossary_term')).toBe('immutable_definition');
      expect(getStorage<string>('d1')).toBeUndefined();
      expect(getStorage<string>('d2')).toBe('dyn2');
      expect(getStorage<string>('d3')).toBe('dyn3');
    });
  });

  describe('clearStorage Utility', () => {
    it('should clear all nodeStorage entries', () => {
      setStorage('k1', 'v1');
      setStorage('k2', 'v2', { static: true });
      expect(nodeStorage.size).toBe(2);

      clearStorage();
      expect(nodeStorage.size).toBe(0);
      expect(getStorage<string>('k1')).toBeUndefined();
      expect(getStorage<string>('k2')).toBeUndefined();
    });
  });

  describe('createMemoryStorage Bounded Limits', () => {
    it('should respect maxSize in createMemoryStorage fallback', () => {
      const memStore = createMemoryStorage(2);

      memStore.setItem('a', 'valA');
      memStore.setItem('b', 'valB');
      expect(memStore.length).toBe(2);
      expect(memStore.getItem('a')).toBe('valA');

      // Adding 3rd item evicts 'b' (since 'a' was accessed)
      memStore.setItem('c', 'valC');
      expect(memStore.length).toBe(2);
      expect(memStore.getItem('b')).toBeNull();
      expect(memStore.getItem('a')).toBe('valA');
      expect(memStore.getItem('c')).toBe('valC');
    });
  });

  describe('toSignal reactive bridge', () => {
    it('should synchronize reactive signals with storage', () => {
      const theme = toSignal('user.pref.theme', 'dark');
      expect(theme()).toBe('dark');
      expect(getStorage('user.pref.theme')).toBe('dark');

      theme('light');
      expect(theme()).toBe('light');
      expect(getStorage('user.pref.theme')).toBe('light');

      theme.value = 'high-contrast';
      expect(theme.value).toBe('high-contrast');
      expect(getStorage('user.pref.theme')).toBe('high-contrast');


      const font = toSignal('user.pref.font', 'monospace');
      expect(font()).toBe('monospace');
      font('sans-serif');
      expect(font()).toBe('sans-serif');
      expect(getStorage('user.pref.font')).toBe('sans-serif');
    });

    it('should notify other local signals bound to the same key and respect disposal', () => {
      const sig1 = toSignal<string>('shared.config', 'v1');
      const sig2 = toSignal<string>('shared.config', 'v1');

      expect(sig1()).toBe('v1');
      expect(sig2()).toBe('v1');

      // Writing to sig1 updates sig2 immediately in same document
      sig1.value = 'v2';
      expect(sig1()).toBe('v2');
      expect(sig2()).toBe('v2');

      // Disposing sig2 unregisters it
      (sig2 as any).dispose();
      sig1.value = 'v3';
      expect(sig1()).toBe('v3');
      expect(sig2()).toBe('v2'); // Disposed signal no longer receives updates
    });

    it('should notify existing bound signals when a new binding initializes with default value', () => {
      // First signal bound without default value when storage has nothing
      const sigA = toSignal<string>('uninit.key');
      expect(sigA()).toBeUndefined();

      // Second signal binds with default value
      const sigB = toSignal<string>('uninit.key', 'initialized_default');
      expect(sigB()).toBe('initialized_default');
      expect(sigA()).toBe('initialized_default'); // Existing binding received default
    });

    it('should support explicit Symbol.dispose on storage signals', () => {
      const sig = toSignal<string>('disposable.key', 'initial');
      expect(typeof (sig as any).dispose).toBe('function');
      expect(typeof (sig as any)[Symbol.dispose]).toBe('function');

      (sig as any)[Symbol.dispose]();
      // Safe to call multiple times
      expect(() => (sig as any).dispose()).not.toThrow();
    });
  });
});
