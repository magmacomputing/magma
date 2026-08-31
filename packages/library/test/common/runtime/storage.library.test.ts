import { getStorage, setStorage } from '#library/storage.library.js';

describe('Storage Tombstone Behavior (NodeJS)', () => {
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
    setEnv(envKey, undefined);
    setEnv(tombstoneKey, undefined);
  });

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
