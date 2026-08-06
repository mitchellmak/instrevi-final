describe('API base selection', () => {
  const originalApiUrl = process.env.REACT_APP_API_URL;

  beforeEach(() => {
    delete process.env.REACT_APP_API_URL;
    jest.resetModules();
  });

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.REACT_APP_API_URL;
    } else {
      process.env.REACT_APP_API_URL = originalApiUrl;
    }
  });

  it('defaults to the public Instrevi API while keeping a localhost fallback for local development', () => {
    const { API_BASE, API_FALLBACK_BASE } = require('../utils/apiBase');

    expect(API_BASE).toBe('https://api.instrevi.com');
    expect(API_FALLBACK_BASE).toBe('http://localhost:5000');
  });
});
