jest.mock('../db', () => ({
  db: { execute: jest.fn() },
  initDB: jest.fn()
}));

jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => {
    req.user = { id: 'user-1', username: 'testuser', avatar: 'av.png', role: 'user' };
    next();
  },
  adminOnly: (req, res, next) => next()
}));

const { db } = require('../db');
const postsRouter = require('../routes/posts');

function getRouteHandler(method, path) {
  const layer = postsRouter.stack.find(
    l => l.route && l.route.path === path && l.route.methods[method]
  );
  if (!layer) throw new Error(`Route ${method} ${path} not found`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

function mockReqRes(overrides = {}) {
  const req = {
    user: { id: 'user-1', username: 'testuser', avatar: 'av.png', role: 'user' },
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

describe('GET /posts (paginated feed)', () => {
  let handler;
  beforeAll(() => { handler = getRouteHandler('get', '/'); });

  test('returns paginated posts with like status', async () => {
    db.execute
      .mockResolvedValueOnce({
        rows: [
          { id: 'p1', content: 'Hello', media_url: '', created_at: '2024-01-01',
            author_id: 'u2', author_username: 'alice', author_avatar: 'a.png',
            like_count: 3, comment_count: 1 },
          { id: 'p2', content: 'World', media_url: 'img.jpg', created_at: '2024-01-02',
            author_id: 'u3', author_username: 'bob', author_avatar: 'b.png',
            like_count: 0, comment_count: 0 }
        ]
      })
      .mockResolvedValueOnce({ rows: [{ post_id: 'p1' }] });

    const { req, res } = mockReqRes({ query: { page: '1' } });
    await handler(req, res);

    const result = res.json.mock.calls[0][0];
    expect(result).toHaveLength(2);
    expect(result[0].liked).toBe(true);
    expect(result[1].liked).toBe(false);
    expect(result[0].author.username).toBe('alice');
  });

  test('defaults to page 1', async () => {
    db.execute
      .mockResolvedValueOnce({ rows: [] });

    const { req, res } = mockReqRes({ query: {} });
    await handler(req, res);

    const call = db.execute.mock.calls[0][0];
    expect(call.args).toContain(0); // offset = 0 for page 1
  });

  test('handles empty feed', async () => {
    db.execute.mockResolvedValueOnce({ rows: [] });

    const { req, res } = mockReqRes({ query: {} });
    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });
});

describe('POST /posts (create)', () => {
  let handler;
  beforeAll(() => { handler = getRouteHandler('post', '/'); });

  test('returns 400 when content is missing', async () => {
    const { req, res } = mockReqRes({ body: {} });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Content is required' });
  });

  test('creates post successfully', async () => {
    db.execute.mockResolvedValue({ rows: [] });

    const { req, res } = mockReqRes({ body: { content: 'My post', mediaUrl: 'pic.jpg' } });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const result = res.json.mock.calls[0][0];
    expect(result.content).toBe('My post');
    expect(result.mediaUrl).toBe('pic.jpg');
    expect(result.likeCount).toBe(0);
    expect(result.liked).toBe(false);
  });

  test('defaults mediaUrl to empty string', async () => {
    db.execute.mockResolvedValue({ rows: [] });

    const { req, res } = mockReqRes({ body: { content: 'No media' } });
    await handler(req, res);

    const result = res.json.mock.calls[0][0];
    expect(result.mediaUrl).toBe('');
  });
});

describe('PUT /posts/:id/like (toggle)', () => {
  let handler;
  beforeAll(() => { handler = getRouteHandler('put', '/:id/like'); });

  test('adds like when not already liked', async () => {
    db.execute
      .mockResolvedValueOnce({ rows: [] }) // not liked yet
      .mockResolvedValueOnce({ rows: [] }) // insert like
      .mockResolvedValueOnce({ rows: [{ total: 1 }] }); // count

    const { req, res } = mockReqRes({ params: { id: 'p1' } });
    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ likes: 1, liked: true });
  });

  test('removes like when already liked', async () => {
    db.execute
      .mockResolvedValueOnce({ rows: [{ post_id: 'p1' }] }) // already liked
      .mockResolvedValueOnce({ rows: [] }) // delete like
      .mockResolvedValueOnce({ rows: [{ total: 0 }] }); // count

    const { req, res } = mockReqRes({ params: { id: 'p1' } });
    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ likes: 0, liked: false });
  });
});

describe('POST /posts/:id/comment', () => {
  let handler;
  beforeAll(() => { handler = getRouteHandler('post', '/:id/comment'); });

  test('returns 404 when post not found', async () => {
    db.execute.mockResolvedValue({ rows: [] });

    const { req, res } = mockReqRes({ params: { id: 'missing' }, body: { text: 'comment' } });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('creates comment and returns all comments', async () => {
    db.execute
      .mockResolvedValueOnce({ rows: [{ id: 'p1' }] }) // post exists
      .mockResolvedValueOnce({ rows: [] }) // insert comment
      .mockResolvedValueOnce({
        rows: [
          { id: 'c1', text: 'comment', created_at: '2024-01-01', author_id: 'user-1', username: 'testuser', avatar: 'av.png' }
        ]
      });

    const { req, res } = mockReqRes({ params: { id: 'p1' }, body: { text: 'Great post!' } });
    await handler(req, res);

    const result = res.json.mock.calls[0][0];
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('comment');
  });
});

describe('DELETE /posts/:id', () => {
  let handler;
  beforeAll(() => { handler = getRouteHandler('delete', '/:id'); });

  test('returns 404 when post not found', async () => {
    db.execute.mockResolvedValue({ rows: [] });

    const { req, res } = mockReqRes({ params: { id: 'missing' } });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('returns 403 when non-author non-admin tries to delete', async () => {
    db.execute.mockResolvedValue({ rows: [{ id: 'p1', author_id: 'other-user' }] });

    const { req, res } = mockReqRes({ params: { id: 'p1' } });
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('allows author to delete own post', async () => {
    db.execute
      .mockResolvedValueOnce({ rows: [{ id: 'p1', author_id: 'user-1' }] })
      .mockResolvedValueOnce({ rows: [] });

    const { req, res } = mockReqRes({ params: { id: 'p1' } });
    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Post deleted' });
  });

  test('allows admin to delete any post', async () => {
    db.execute
      .mockResolvedValueOnce({ rows: [{ id: 'p1', author_id: 'other-user' }] })
      .mockResolvedValueOnce({ rows: [] });

    const { req, res } = mockReqRes({
      params: { id: 'p1' },
      user: { id: 'admin-1', role: 'admin' }
    });
    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Post deleted' });
  });
});
