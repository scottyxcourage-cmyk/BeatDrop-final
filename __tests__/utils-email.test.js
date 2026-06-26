const originalFetch = global.fetch;

beforeEach(() => {
  process.env.RESEND_API_KEY = 'test-resend-key';
  process.env.SMTP_FROM = 'test@example.com';
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.resetModules();
});

describe('sendEmail', () => {
  test('calls Resend API with correct parameters', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'msg-123' })
    });

    // Re-require to pick up the mock
    const { sendOTP } = require('../utils/email');
    await sendOTP('user@test.com', 'TestUser', '123456');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-resend-key',
          'Content-Type': 'application/json'
        })
      })
    );

    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callBody.from).toBe('test@example.com');
    expect(callBody.to).toBe('user@test.com');
    expect(callBody.subject).toContain('OTP');
    expect(callBody.html).toContain('123456');
    expect(callBody.html).toContain('TestUser');
  });

  test('throws on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('API rate limited')
    });

    jest.resetModules();
    const { sendOTP } = require('../utils/email');
    await expect(sendOTP('user@test.com', 'User', '111111'))
      .rejects.toThrow('Resend API error: API rate limited');
  });
});

describe('sendVerification', () => {
  test('sends verification email with correct subject and OTP', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'msg-456' })
    });

    jest.resetModules();
    const { sendVerification } = require('../utils/email');
    await sendVerification('newuser@test.com', 'NewUser', '654321');

    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callBody.to).toBe('newuser@test.com');
    expect(callBody.subject).toContain('Verify');
    expect(callBody.html).toContain('654321');
    expect(callBody.html).toContain('NewUser');
  });
});

describe('sendOTP', () => {
  test('sends OTP email with correct subject', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'msg-789' })
    });

    jest.resetModules();
    const { sendOTP } = require('../utils/email');
    await sendOTP('reset@test.com', 'ResetUser', '999999');

    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callBody.subject).toContain('OTP');
    expect(callBody.html).toContain('999999');
  });

  test('uses default from address when SMTP_FROM is not set', async () => {
    delete process.env.SMTP_FROM;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'msg-000' })
    });

    jest.resetModules();
    const { sendOTP } = require('../utils/email');
    await sendOTP('user@test.com', 'User', '111111');

    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callBody.from).toBe('onboarding@resend.dev');
  });
});
