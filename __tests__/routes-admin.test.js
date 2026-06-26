jest.mock('../db', () => ({
  db: { execute: jest.fn() },
  initDB: jest.fn()
}));

jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => {
    req.user = { id: 'admin-1', username: 'admin', role: 'admin' };
    next();
  },
  adminOnly: (req, res, next) => next()
}));

const { db } = require('../db');
const adminRouter = require('../routes/admin');

function getRouteHandler(method, path) {
  const layer = adminRouter.stack.find(
    l => l.route && l.route.path === path && l.route.methods[method]
  );
  if (!layer) throw new Error(`Route ${method} ${path} not found`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

function mockReqRes(overrides = {}) {
  const req = {
    user: { id: 'admin-1', username: 'admin', role: 'admin' },
    query: {},
    params: {},
    body: {},
    ...overrides
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

afterEach(() => jest.clearAllMocks());

describe('GET /admin/users', () => {
  let handler;
  beforeAll(() => { handler = getRouteHandler('get', '/users'); });

  test('returns list of users', async () => {
    const mockUsers = [{ id: 'u1', username: 'alice' }, { id: 'u2', username: 'bob' }];
    db.execute.mockResolvedValue({ rows: mockUsers });

    const { req, res } = mockReqRes();
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith({ users: mockUsers });
  });

  test('handles database error', async () => {
    db.execute.mockRejectedValue(new Error('DB error'));
    const { req, res } = mockReqRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('DELETE /admin/users/:id', () => {
  let handler;
  beforeAll(() => { handler = getRouteHandler('delete', '/users/:id'); });

  test('deletes user', async () => {
    db.execute.mockResolvedValue({ rows: [] });
    const { req, res } = mockReqRes({ params: { id: 'u1' } });
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'User deleted' });
    expect(db.execute).toHaveBeenCalledWith(expect.objectContaining({ args: ['u1'] }));
  });
});

describe('PUT /admin/users/:id/role', () => {
  let handler;
  beforeAll(() => { handler = getRouteHandler('put', '/users/:id/role'); });

  test('returns 400 for invalid role', async () => {
    const { req, res } = mockReqRes({ params: { id: 'u1' }, body: { role: 'superadmin' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid role' });
  });

  test('updates role to admin', async () => {
    db.execute.mockResolvedValue({ rows: [] });
    const { req, res } = mockReqRes({ params: { id: 'u1' }, body: { role: 'admin' } });
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Role updated' });
  });

  test('updates role to user', async () => {
    db.execute.mockResolvedValue({ rows: [] });
    const { req, res } = mockReqRes({ params: { id: 'u1' }, body: { role: 'user' } });
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Role updated' });
  });
});

describe('POST /admin/wallet/topup', () => {
  let handler;
  beforeAll(() => { handler = getRouteHandler('post', '/wallet/topup'); });

  test('returns 400 when userId or amount missing', async () => {
    const { req, res } = mockReqRes({ body: { userId: 'u1' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 400 when amount is NaN', async () => {
    const { req, res } = mockReqRes({ body: { userId: 'u1', amount: 'abc' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 404 when user not found', async () => {
    db.execute.mockResolvedValue({ rows: [] });
    const { req, res } = mockReqRes({ body: { userId: 'missing', amount: 100 } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('tops up wallet successfully', async () => {
    db.execute
      .mockResolvedValueOnce({ rows: [{ wallet_balance: 50 }] })
      .mockResolvedValueOnce({ rows: [] }) // update balance
      .mockResolvedValueOnce({ rows: [] }); // insert transaction

    const { req, res } = mockReqRes({ body: { userId: 'u1', amount: 100, description: 'Bonus' } });
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Wallet topped up', balance: 150 });
  });
});

describe('POST /admin/wallet/deduct', () => {
  let handler;
  beforeAll(() => { handler = getRouteHandler('post', '/wallet/deduct'); });

  test('deducts from wallet, clamped at 0', async () => {
    db.execute
      .mockResolvedValueOnce({ rows: [{ wallet_balance: 30 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const { req, res } = mockReqRes({ body: { userId: 'u1', amount: 50 } });
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Wallet deducted', balance: 0 });
  });

  test('deducts partial amount', async () => {
    db.execute
      .mockResolvedValueOnce({ rows: [{ wallet_balance: 100 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const { req, res } = mockReqRes({ body: { userId: 'u1', amount: 30 } });
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Wallet deducted', balance: 70 });
  });
});

describe('POST /admin/news', () => {
  let handler;
  beforeAll(() => { handler = getRouteHandler('post', '/news'); });

  test('returns 400 when title or body is missing', async () => {
    const { req, res } = mockReqRes({ body: { title: 'Test' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'title and body required' });
  });

  test('creates news with defaults', async () => {
    const mockNews = { id: 'n1', title: 'Breaking', body: 'Content', icon: 'newspaper', color: '#00ffcc', category: 'general' };
    db.execute
      .mockResolvedValueOnce({ rows: [] }) // insert
      .mockResolvedValueOnce({ rows: [mockNews] }); // select

    const { req, res } = mockReqRes({ body: { title: 'Breaking', body: 'Content' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ news: mockNews }));
  });
});

describe('PUT /admin/news/:id', () => {
  let handler;
  beforeAll(() => { handler = getRouteHandler('put', '/news/:id'); });

  test('updates news', async () => {
    const updatedNews = { id: 'n1', title: 'Updated' };
    db.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [updatedNews] });

    const { req, res } = mockReqRes({ params: { id: 'n1' }, body: { title: 'Updated' } });
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ news: updatedNews }));
  });
});

describe('DELETE /admin/news/:id', () => {
  let handler;
  beforeAll(() => { handler = getRouteHandler('delete', '/news/:id'); });

  test('deletes news', async () => {
    db.execute.mockResolvedValue({ rows: [] });
    const { req, res } = mockReqRes({ params: { id: 'n1' } });
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'News deleted' });
  });
});

describe('GET /admin/stats', () => {
  let handler;
  beforeAll(() => { handler = getRouteHandler('get', '/stats'); });

  test('returns aggregated stats', async () => {
    db.execute
      .mockResolvedValueOnce({ rows: [{ total: 100 }] })  // users
      .mockResolvedValueOnce({ rows: [{ total: 80 }] })   // verified
      .mockResolvedValueOnce({ rows: [{ total: 50 }] })   // posts
      .mockResolvedValueOnce({ rows: [{ total: 10 }] })   // news
      .mockResolvedValueOnce({ rows: [{ total: 5000 }] }); // cops

    const { req, res } = mockReqRes();
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith({
      totalUsers: 100,
      verifiedUsers: 80,
      totalPosts: 50,
      totalNews: 10,
      totalCopsInCirculation: 5000
    });
  });
});

describe('POST /admin/announce', () => {
  let handler;
  beforeAll(() => { handler = getRouteHandler('post', '/announce'); });

  test('returns 400 when content missing', async () => {
    const { req, res } = mockReqRes({ body: {} });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('creates pinned announcement', async () => {
    db.execute
      .mockResolvedValueOnce({ rows: [] }) // clear old pinned
      .mockResolvedValueOnce({ rows: [] }); // insert new

    const { req, res } = mockReqRes({ body: { content: 'Important announcement!' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Announcement posted' }));
  });
});

describe('POST /admin/posts', () => {
  let handler;
  beforeAll(() => { handler = getRouteHandler('post', '/posts'); });

  test('returns 400 when content missing', async () => {
    const { req, res } = mockReqRes({ body: {} });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Content required' });
  });

  test('creates admin post', async () => {
    db.execute.mockResolvedValue({ rows: [] });
    const { req, res } = mockReqRes({ body: { content: 'Admin post' } });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('DELETE /admin/posts/:id', () => {
  let handler;
  beforeAll(() => { handler = getRouteHandler('delete', '/posts/:id'); });

  test('deletes post', async () => {
    db.execute.mockResolvedValue({ rows: [] });
    const { req, res } = mockReqRes({ params: { id: 'p1' } });
    await handler(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Post deleted' });
  });
});
