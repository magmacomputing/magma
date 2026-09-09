import { getStorage, setStorage, clearStorage, nodeStorage, createMemoryStorage } from '#library/storage.library.js';

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
});
