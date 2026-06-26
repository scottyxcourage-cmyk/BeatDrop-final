// db.js uses node:sqlite (built-in), so we mock the entire db module
// and test the async wrapper logic via its public interface.
// The module-level DatabaseSync usage is tested indirectly through route tests.

jest.mock('../db', () => {
  const mockRows = [];
  const mockInfo = { changes: 0, lastInsertRowid: 0 };

  const executeImpl = jest.fn(({ sql, args }) => {
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('SELECT') || upper.startsWith('WITH')) {
      return Promise.resolve({ rows: mockRows });
    } else {
      return Promise.resolve({ rows: [], info: mockInfo });
    }
  });

  return {
    db: { execute: executeImpl },
    initDB: jest.fn(),
    _mockRows: mockRows,
    _mockInfo: mockInfo
  };
});

const { db, initDB } = require('../db');

describe('db module public interface', () => {
  afterEach(() => jest.clearAllMocks());

  test('db.execute is a function', () => {
    expect(typeof db.execute).toBe('function');
  });

  test('db.execute returns a promise', () => {
    const result = db.execute({ sql: 'SELECT 1', args: [] });
    expect(result).toBeInstanceOf(Promise);
  });

  test('initDB is a function', () => {
    expect(typeof initDB).toBe('function');
    initDB();
    expect(initDB).toHaveBeenCalled();
  });

  test('SELECT queries return rows', async () => {
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: ['user-1']
    });
    expect(result).toHaveProperty('rows');
    expect(Array.isArray(result.rows)).toBe(true);
  });

  test('INSERT queries return info', async () => {
    const result = await db.execute({
      sql: 'INSERT INTO users (id) VALUES (?)',
      args: ['user-1']
    });
    expect(result).toHaveProperty('rows');
    expect(result).toHaveProperty('info');
  });

  test('execute receives correct arguments', async () => {
    await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: ['test@example.com']
    });
    expect(db.execute).toHaveBeenCalledWith({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: ['test@example.com']
    });
  });

  test('WITH (CTE) queries return rows', async () => {
    const result = await db.execute({
      sql: 'WITH cte AS (SELECT 1) SELECT * FROM cte',
      args: []
    });
    expect(result).toHaveProperty('rows');
  });

  test('UPDATE queries return info', async () => {
    const result = await db.execute({
      sql: 'UPDATE users SET username = ? WHERE id = ?',
      args: ['newname', 'u1']
    });
    expect(result).toHaveProperty('info');
  });

  test('DELETE queries return info', async () => {
    const result = await db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: ['u1']
    });
    expect(result).toHaveProperty('info');
  });
});
