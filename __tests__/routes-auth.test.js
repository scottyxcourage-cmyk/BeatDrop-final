const jwt = require('jsonwebtoken');

const TEST_SECRET = 'test-jwt-secret-for-auth';

jest.mock('../db', () => ({
  db: { execute: jest.fn() },
  initDB: jest.fn()
}));

jest.mock('../utils/email', () => ({
  sendOTP: jest.fn().mockResolvedValue({}),
  sendVerification: jest.fn().mockResolvedValue({})
}));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn()
  }))
}));

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
});

const authRouter = require('../routes/auth');
const { _generateOTP, _generateToken, _validateEmail } = authRouter;
const { db } = require('../db');
const { sendVerification, sendOTP } = require('../utils/email');

describe('generateOTP', () => {
  test('returns a 6-digit string', () => {
    for (let i = 0; i < 50; i++) {
      const otp = _generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
      const num = parseInt(otp, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });
});

describe('generateToken', () => {
  test('returns a valid JWT with the user id', () => {
    const token = _generateToken('user-abc');
    const decoded = jwt.verify(token, TEST_SECRET);
    expect(decoded.id).toBe('user-abc');
  });

  test('token expires in 7 days', () => {
    const token = _generateToken('user-abc');
    const decoded = jwt.verify(token, TEST_SECRET);
    const expiry = decoded.exp - decoded.iat;
    expect(expiry).toBe(7 * 24 * 60 * 60);
  });
});

describe('validateEmail', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('returns false for disposable email', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ disposable: true, valid: true })
    });
    const result = await _validateEmail('test@tempmail.com');
    expect(result).toBe(false);
  });

  test('returns false for invalid email', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ disposable: false, valid: false })
    });
    const result = await _validateEmail('not-real@fake.xyz');
    expect(result).toBe(false);
  });

  test('returns true for valid non-disposable email', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ disposable: false, valid: true })
    });
    const result = await _validateEmail('user@gmail.com');
    expect(result).toBe(true);
  });

  test('returns true when verification API is down', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'));
    const result = await _validateEmail('user@example.com');
    expect(result).toBe(true);
  });

  test('returns true when API returns non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    const result = await _validateEmail('user@example.com');
    expect(result).toBe(true);
  });
});

describe('auth route handlers', () => {
  function mockReqRes(body = {}, headers = {}) {
    const req = { body, headers };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    return { req, res };
  }

  function getRouteHandler(method, path) {
    const layer = authRouter.stack.find(
      l => l.route && l.route.path === path && l.route.methods[method]
    );
    if (!layer) throw new Error(`Route ${method} ${path} not found`);
    return layer.route.stack[layer.route.stack.length - 1].handle;
  }

  afterEach(() => {
    db.execute.mockReset();
    sendVerification.mockReset();
    sendOTP.mockReset();
  });

  describe('POST /register', () => {
    let handler;
    beforeAll(() => { handler = getRouteHandler('post', '/register'); });

    test('returns 400 when fields are missing', async () => {
      const { req, res } = mockReqRes({ username: 'test' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'All fields are required' });
    });

    test('returns 400 when email is disposable', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ disposable: true })
      });
      const { req, res } = mockReqRes({
        username: 'test', email: 'test@tempmail.com', password: 'pass123'
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('non-disposable') })
      );
    });

    test('returns 400 when email already taken', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ disposable: false, valid: true })
      });
      db.execute.mockResolvedValue({ rows: [{ id: 'existing' }] });
      const { req, res } = mockReqRes({
        username: 'test', email: 'taken@mail.com', password: 'pass123'
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email or username already taken' });
    });

    test('successfully registers a new user', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ disposable: false, valid: true })
      });
      db.execute
        .mockResolvedValueOnce({ rows: [] })  // check existing
        .mockResolvedValueOnce({ rows: [] }); // insert
      sendVerification.mockResolvedValue({});

      const { req, res } = mockReqRes({
        username: 'newuser', email: 'new@mail.com', password: 'password123'
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Registered'),
          userId: expect.any(String)
        })
      );
    });

    test('registers even when email send fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ disposable: false, valid: true })
      });
      db.execute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      sendVerification.mockRejectedValue(new Error('SMTP fail'));

      const { req, res } = mockReqRes({
        username: 'user2', email: 'user2@mail.com', password: 'pass123'
      });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('could not be sent')
        })
      );
    });
  });

  describe('POST /verify', () => {
    let handler;
    beforeAll(() => { handler = getRouteHandler('post', '/verify'); });

    test('returns 404 when user not found', async () => {
      db.execute.mockResolvedValue({ rows: [] });
      const { req, res } = mockReqRes({ userId: 'nope', otp: '123456' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 400 when already verified', async () => {
      db.execute.mockResolvedValue({ rows: [{ is_verified: 1 }] });
      const { req, res } = mockReqRes({ userId: 'u1', otp: '123456' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Already verified' });
    });

    test('returns 400 for invalid OTP', async () => {
      db.execute.mockResolvedValue({
        rows: [{
          is_verified: 0,
          otp_code: '111111',
          otp_expires: new Date(Date.now() + 60000).toISOString()
        }]
      });
      const { req, res } = mockReqRes({ userId: 'u1', otp: '999999' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired OTP' });
    });

    test('returns 400 for expired OTP', async () => {
      db.execute.mockResolvedValue({
        rows: [{
          is_verified: 0,
          otp_code: '123456',
          otp_expires: new Date(Date.now() - 60000).toISOString()
        }]
      });
      const { req, res } = mockReqRes({ userId: 'u1', otp: '123456' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('verifies user with correct OTP', async () => {
      const futureDate = new Date(Date.now() + 600000).toISOString();
      // ensureAdmin is a no-op for non-admin emails, so only 3 db calls:
      // 1. SELECT user  2. UPDATE verified  3. SELECT updated user
      db.execute
        .mockResolvedValueOnce({
          rows: [{
            id: 'u1', email: 'test@test.com', is_verified: 0,
            otp_code: '123456', otp_expires: futureDate
          }]
        })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE is_verified
        .mockResolvedValueOnce({
          rows: [{ id: 'u1', username: 'test', email: 'test@test.com', role: 'user' }]
        });

      const { req, res } = mockReqRes({ userId: 'u1', otp: '123456' });
      await handler(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Account verified!',
          token: expect.any(String)
        })
      );
    });
  });

  describe('POST /login', () => {
    let handler;
    beforeAll(() => { handler = getRouteHandler('post', '/login'); });

    test('returns 401 for non-existent email', async () => {
      db.execute.mockResolvedValue({ rows: [] });
      const { req, res } = mockReqRes({ email: 'nope@test.com', password: 'pass' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
    });

    test('returns 401 for wrong password', async () => {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('correctpass', 10);
      db.execute.mockResolvedValue({
        rows: [{ id: 'u1', email: 'test@test.com', password: hash, is_verified: 1 }]
      });
      const { req, res } = mockReqRes({ email: 'test@test.com', password: 'wrongpass' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    test('returns 403 for unverified user', async () => {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('mypass', 10);
      db.execute.mockResolvedValue({
        rows: [{ id: 'u1', email: 'test@test.com', password: hash, is_verified: 0 }]
      });
      const { req, res } = mockReqRes({ email: 'test@test.com', password: 'mypass' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Please verify your email first' });
    });

    test('successfully logs in verified user', async () => {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('mypass', 10);
      // ensureAdmin is no-op for non-admin email, so only 2 db calls:
      // 1. SELECT user  2. SELECT updated user
      db.execute
        .mockResolvedValueOnce({
          rows: [{ id: 'u1', email: 'test@test.com', password: hash, is_verified: 1 }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'u1', username: 'testuser', email: 'test@test.com', role: 'user', avatar: '' }]
        });

      const { req, res } = mockReqRes({ email: 'test@test.com', password: 'mypass' });
      await handler(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          token: expect.any(String),
          user: expect.objectContaining({ id: 'u1' })
        })
      );
    });
  });

  describe('POST /send-otp', () => {
    let handler;
    beforeAll(() => { handler = getRouteHandler('post', '/send-otp'); });

    test('returns 404 for unknown email', async () => {
      db.execute.mockResolvedValue({ rows: [] });
      const { req, res } = mockReqRes({ email: 'unknown@test.com' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('sends OTP successfully', async () => {
      db.execute
        .mockResolvedValueOnce({ rows: [{ id: 'u1', username: 'tester' }] })
        .mockResolvedValueOnce({ rows: [] });
      sendOTP.mockResolvedValue({});

      const { req, res } = mockReqRes({ email: 'tester@test.com' });
      await handler(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'OTP sent!', userId: 'u1' })
      );
    });

    test('handles email send failure gracefully', async () => {
      db.execute
        .mockResolvedValueOnce({ rows: [{ id: 'u1', username: 'tester' }] })
        .mockResolvedValueOnce({ rows: [] });
      sendOTP.mockRejectedValue(new Error('SMTP down'));

      const { req, res } = mockReqRes({ email: 'tester@test.com' });
      await handler(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('failed to send') })
      );
    });
  });

  describe('POST /reset-password', () => {
    let handler;
    beforeAll(() => { handler = getRouteHandler('post', '/reset-password'); });

    test('returns 404 for unknown user', async () => {
      db.execute.mockResolvedValue({ rows: [] });
      const { req, res } = mockReqRes({ userId: 'nope', otp: '111111', newPassword: 'newpass' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 400 for invalid OTP', async () => {
      db.execute.mockResolvedValue({
        rows: [{
          otp_code: '222222',
          otp_expires: new Date(Date.now() + 60000).toISOString()
        }]
      });
      const { req, res } = mockReqRes({ userId: 'u1', otp: '111111', newPassword: 'newpass' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('successfully resets password', async () => {
      const futureDate = new Date(Date.now() + 600000).toISOString();
      db.execute
        .mockResolvedValueOnce({
          rows: [{ otp_code: '123456', otp_expires: futureDate }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const { req, res } = mockReqRes({ userId: 'u1', otp: '123456', newPassword: 'newpass123' });
      await handler(req, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'Password reset successful!' });
    });
  });
});
