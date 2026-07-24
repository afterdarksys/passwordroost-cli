const axios = require('axios');
const { config } = require('../commands/config');

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn()
}));

jest.mock('ora', () => jest.fn(() => {
  const spinner = {
    start: jest.fn(() => spinner),
    stop: jest.fn()
  };
  return spinner;
}));

jest.mock('../commands/config', () => ({
  config: {
    get: jest.fn(),
    set: jest.fn()
  }
}));

const breach = require('../commands/breach');
const crack = require('../commands/crack');
const monitor = require('../commands/monitor');

describe('backend contract alignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;
    config.get.mockImplementation(key => {
      if (key === 'api_key') return 'pr_test_key';
      if (key === 'base_url') return 'https://api.example.test';
      if (key.startsWith('job_tokens.')) return 'saved-job-token';
      return undefined;
    });
  });

  afterEach(() => {
    console.log.mockRestore();
    process.exitCode = undefined;
  });

  test('email exposure uses the authenticated versioned endpoint', async () => {
    axios.post.mockResolvedValue({
      data: {
        found: true,
        breachCount: 1,
        breaches: [{ name: 'Example' }]
      }
    });

    await breach.checkEmail('owner@example.com', { json: true });

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.example.test/v1/email/check',
      { email: 'owner@example.com' },
      { headers: { 'X-API-Key': 'pr_test_key' } }
    );
  });

  test('crack creation sends the current request shape and saves its token', async () => {
    axios.post.mockResolvedValue({
      data: {
        jobId: 'CR-123',
        accessToken: 'new-crack-token',
        status: 'pending',
        gpuType: 'rtx4090',
        totalPrice: 0.89
      }
    });

    await crack.create({
      type: 'md5',
      file: __filename,
      gpu: 'rtx4090',
      hours: '1',
      wordlist: 'rockyou'
    });

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.example.test/api/gpu/crack-jobs',
      expect.objectContaining({
        hashType: 'md5',
        hashFileName: 'commands.test.js',
        gpuType: 'rtx4090',
        rentalHours: 1
      }),
      { headers: { 'X-API-Key': 'pr_test_key' } }
    );
    expect(axios.post.mock.calls[0][1]).not.toHaveProperty('jobType');
    expect(config.set).toHaveBeenCalledWith(
      'job_tokens.CR-123',
      'new-crack-token'
    );
  });

  test('crack status sends the stored management token and reads direct data', async () => {
    axios.get.mockResolvedValue({
      data: { jobId: 'CR-123', status: 'running', progress: 25 }
    });

    await crack.status('CR-123', { json: true });

    expect(axios.get).toHaveBeenCalledWith(
      'https://api.example.test/api/gpu/crack-jobs/CR-123',
      {
        headers: {
          'X-API-Key': 'pr_test_key',
          'X-Job-Token': 'saved-job-token'
        }
      }
    );
  });

  test('monitor creation stores its one-time management token', async () => {
    axios.post.mockResolvedValue({
      data: {
        jobId: 'PR-123',
        accessToken: 'new-monitor-token',
        existing: false
      }
    });

    await monitor.create('not-a-real-password', {
      email: 'owner@example.com'
    });

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.example.test/api/jobs',
      expect.objectContaining({
        hashValue: expect.stringMatching(/^[a-f0-9]{40}$/),
        email: 'owner@example.com'
      }),
      { headers: { 'X-API-Key': 'pr_test_key' } }
    );
    expect(config.set).toHaveBeenCalledWith(
      'job_tokens.PR-123',
      'new-monitor-token'
    );
  });

  test('monitor status sends the stored token and reads direct data', async () => {
    axios.get.mockResolvedValue({
      data: {
        jobId: 'PR-123',
        breachCount: 0,
        lastCheckedAt: '2026-07-24T00:00:00Z',
        alertEnabled: false
      }
    });

    await monitor.status('PR-123');

    expect(axios.get).toHaveBeenCalledWith(
      'https://api.example.test/api/jobs/PR-123',
      {
        headers: {
          'X-API-Key': 'pr_test_key',
          'X-Job-Token': 'saved-job-token'
        }
      }
    );
  });
});
