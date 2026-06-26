const express = require('express');

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.resetModules();
});

function mockReqRes(body = {}) {
  const req = { body };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe('download route', () => {
  let downloadHandler;

  function getHandler() {
    // Re-require to get fresh module
    jest.resetModules();
    const router = require('../routes/download');
    // Extract the POST '/' handler from the router stack
    const layer = router.stack.find(
      l => l.route && l.route.path === '/' && l.route.methods.post
    );
    // The handler is the last callback in the route stack
    return layer.route.stack[layer.route.stack.length - 1].handle;
  }

  test('returns 400 when no URL is provided', async () => {
    downloadHandler = getHandler();
    const { req, res } = mockReqRes({});
    await downloadHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'URL is required' });
  });

  test('returns 400 when body is undefined', async () => {
    downloadHandler = getHandler();
    const { req, res } = mockReqRes(undefined);
    req.body = undefined;
    await downloadHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns successful result from first working instance', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify({ status: 'redirect', url: 'https://dl.example.com/file.mp3' }))
    });

    downloadHandler = getHandler();
    const { req, res } = mockReqRes({ url: 'https://youtube.com/watch?v=abc', mode: 'audio' });
    await downloadHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'redirect', url: 'https://dl.example.com/file.mp3' })
    );
  });

  test('tries next instance on fetch failure', async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('timeout'));
      return Promise.resolve({
        text: () => Promise.resolve(JSON.stringify({ status: 'stream', url: 'https://ok.com' }))
      });
    });

    downloadHandler = getHandler();
    const { req, res } = mockReqRes({ url: 'https://youtube.com/watch?v=xyz', mode: 'auto' });
    await downloadHandler(req, res);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'stream' })
    );
  });

  test('tries next instance on non-JSON response', async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          text: () => Promise.resolve('not json at all')
        });
      }
      return Promise.resolve({
        text: () => Promise.resolve(JSON.stringify({ status: 'redirect', url: 'https://ok.com' }))
      });
    });

    downloadHandler = getHandler();
    const { req, res } = mockReqRes({ url: 'https://youtube.com/watch?v=xyz' });
    await downloadHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'redirect' })
    );
  });

  test('tries next instance on error status', async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          text: () => Promise.resolve(JSON.stringify({ status: 'error', message: 'bad' }))
        });
      }
      return Promise.resolve({
        text: () => Promise.resolve(JSON.stringify({ status: 'redirect', url: 'https://ok.com' }))
      });
    });

    downloadHandler = getHandler();
    const { req, res } = mockReqRes({ url: 'https://youtube.com/watch?v=xyz' });
    await downloadHandler(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'redirect' })
    );
  });

  test('returns 502 when all instances fail', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('connection refused'));

    downloadHandler = getHandler();
    const { req, res } = mockReqRes({ url: 'https://youtube.com/watch?v=fail' });
    await downloadHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('unavailable') })
    );
  });

  test('sends correct payload format to Cobalt instance', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify({ status: 'redirect', url: 'https://x.com' }))
    });

    downloadHandler = getHandler();
    const { req, res } = mockReqRes({ url: 'https://youtube.com/watch?v=test', mode: 'audio' });
    await downloadHandler(req, res);

    const fetchCall = global.fetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.url).toBe('https://youtube.com/watch?v=test');
    expect(body.downloadMode).toBe('audio');
    expect(body.audioFormat).toBe('mp3');
    expect(body.videoQuality).toBe('720');
    expect(body.filenameStyle).toBe('pretty');
  });

  test('uses auto mode when mode is not audio', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify({ status: 'redirect', url: 'https://x.com' }))
    });

    downloadHandler = getHandler();
    const { req, res } = mockReqRes({ url: 'https://youtube.com/watch?v=test', mode: 'video' });
    await downloadHandler(req, res);

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.downloadMode).toBe('auto');
  });
});
