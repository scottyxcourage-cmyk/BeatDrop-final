const jwt = require('jsonwebtoken');

const TEST_SECRET = 'test-jwt-secret-key';

// Mock db before requiring the module
jest.mock('../db', () => ({
  db: {
    execute: jest.fn()
  },
  initDB: jest.fn()
}));

const { db } = require('../db');
const { protect, adminOnly } = require('../middleware/auth');

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

function mockReqResNext(overrides = {}) {
  const req = { headers: {}, ...overrides };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('protect middleware', () => {
  afterEach(() => jest.clearAllMocks());

  test('returns 401 when no Authorization header', async () => {
    const { req, res, next } = mockReqResNext();
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, no token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when Authorization header lacks Bearer prefix', async () => {
    const { req, res, next } = mockReqResNext({
      headers: { authorization: 'Token abc123' }
    });
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not authorized, no token' });
  });

  test('returns 401 when token is invalid', async () => {
    const { req, res, next } = mockReqResNext({
      headers: { authorization: 'Bearer invalid-token' }
    });
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token invalid or expired' });
  });

  test('returns 401 when user not found in database', async () => {
    const token = jwt.sign({ id: 'user-123' }, TEST_SECRET);
    db.execute.mockResolvedValue({ rows: [] });

    const { req, res, next } = mockReqResNext({
      headers: { authorization: `Bearer ${token}` }
    });
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
  });

  test('sets req.user and calls next() on valid token + existing user', async () => {
    const token = jwt.sign({ id: 'user-123' }, TEST_SECRET);
    const mockUser = { id: 'user-123', username: 'testuser', email: 'a@b.com', role: 'user' };
    db.execute.mockResolvedValue({ rows: [mockUser] });

    const { req, res, next } = mockReqResNext({
      headers: { authorization: `Bearer ${token}` }
    });
    await protect(req, res, next);
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns 401 when token is expired', async () => {
    const token = jwt.sign({ id: 'user-123' }, TEST_SECRET, { expiresIn: '0s' });

    const { req, res, next } = mockReqResNext({
      headers: { authorization: `Bearer ${token}` }
    });

    // Small delay to ensure token is expired
    await new Promise(r => setTimeout(r, 10));
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token invalid or expired' });
  });
});

describe('adminOnly middleware', () => {
  test('returns 403 when user is not admin', () => {
    const { req, res, next } = mockReqResNext();
    req.user = { role: 'user' };
    adminOnly(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Admins only' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 when req.user is undefined', () => {
    const { req, res, next } = mockReqResNext();
    adminOnly(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('calls next() when user is admin', () => {
    const { req, res, next } = mockReqResNext();
    req.user = { role: 'admin' };
    adminOnly(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
