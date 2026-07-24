const fs = require('fs');
const os = require('os');
const path = require('path');

const { ConfigStore } = require('../lib/config-store');

describe('ConfigStore', () => {
  let directory;
  let filePath;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'proost-config-'));
    filePath = path.join(directory, 'config.json');
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test('returns defaults and persists nested management tokens', () => {
    const store = new ConfigStore({
      filePath,
      defaults: { api_key: '', base_url: 'https://api.passwordroost.com' }
    });

    expect(store.get('base_url')).toBe('https://api.passwordroost.com');
    store.set('job_tokens.PR-123', 'one-time-token');

    const reloaded = new ConfigStore({ filePath });
    expect(reloaded.get('job_tokens.PR-123')).toBe('one-time-token');
  });

  test('writes credentials with owner-only file permissions', () => {
    const store = new ConfigStore({ filePath });
    store.set('api_key', 'secret-api-key');

    if (process.platform !== 'win32') {
      expect(fs.statSync(filePath).mode & 0o777).toBe(0o600);
      expect(fs.statSync(directory).mode & 0o777).toBe(0o700);
    }
  });

  test('deletes nested values without deleting sibling tokens', () => {
    const store = new ConfigStore({ filePath });
    store.set('job_tokens.PR-123', 'first');
    store.set('job_tokens.PR-456', 'second');

    store.delete('job_tokens.PR-123');

    expect(store.get('job_tokens.PR-123')).toBeUndefined();
    expect(store.get('job_tokens.PR-456')).toBe('second');
  });
});
