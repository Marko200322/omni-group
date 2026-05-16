import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireAdmin, requireRole } from '../../api/middleware/auth.middleware';
import { query } from '../../database/connection';
import { AuthenticationError, AuthorizationError } from '../../utils/errors';

jest.mock('jsonwebtoken');
jest.mock('../../database/connection');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('auth.middleware', () => {
  const next = jest.fn();
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } as any };
    res = {};
  });

  it('authenticate sets user from valid Bearer token', () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      userId: 'u1',
      email: 'a@test.com',
      role: 'user',
    });
    req.headers!.authorization = 'Bearer tok';
    authenticate(req as Request, res as Response, next as NextFunction);
    expect(req.user).toMatchObject({ userId: 'u1', role: 'user' });
    expect(next).toHaveBeenCalled();
  });

  it('authenticate uses first Authorization value when header is duplicated (array)', () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      userId: 'u1',
      email: 'a@test.com',
      role: 'user',
    });
    (req.headers as Record<string, unknown>).authorization = ['Bearer first', 'Bearer ignored'];
    authenticate(req as Request, res as Response, next as NextFunction);
    expect(jwt.verify).toHaveBeenCalledWith('first', expect.anything());
    expect(req.user).toMatchObject({ userId: 'u1' });
  });

  it('authenticate throws when Authorization is an empty array', () => {
    (req.headers as Record<string, unknown>).authorization = [];
    expect(() =>
      authenticate(req as Request, res as Response, next as NextFunction)
    ).toThrow(AuthenticationError);
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('authenticate throws when first Authorization entry is empty (does not scan later entries)', () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      userId: 'u1',
      email: 'a@test.com',
      role: 'user',
    });
    (req.headers as Record<string, unknown>).authorization = ['', 'Bearer would-work'];
    expect(() =>
      authenticate(req as Request, res as Response, next as NextFunction)
    ).toThrow(AuthenticationError);
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('authenticate ignores empty x-api-key array and uses Bearer', () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      userId: 'u1',
      email: 'a@test.com',
      role: 'user',
    });
    (req.headers as Record<string, unknown>)['x-api-key'] = [];
    req.headers!.authorization = 'Bearer tok';
    authenticate(req as Request, res as Response, next as NextFunction);
    expect(req.user).toMatchObject({ userId: 'u1' });
    expect(jwt.verify).toHaveBeenCalled();
  });

  it('authenticate falls through to Bearer when first x-api-key entry is empty (does not scan later entries)', () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      userId: 'u1',
      email: 'a@test.com',
      role: 'user',
    });
    (req.headers as Record<string, unknown>)['x-api-key'] = ['', 'not-used-as-key'];
    req.headers!.authorization = 'Bearer tok';
    authenticate(req as Request, res as Response, next as NextFunction);
    expect(jwt.verify).toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('authenticate uses JWT payload role, not x-test-role, when Bearer is valid', () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      userId: 'u1',
      email: 'a@test.com',
      role: 'user',
    });
    req.headers!.authorization = 'Bearer tok';
    req.headers!['x-test-role'] = 'admin';
    authenticate(req as Request, res as Response, next as NextFunction);
    expect(req.user?.role).toBe('user');
    expect(next).toHaveBeenCalled();
  });

  it('authenticate forwards optional planSlug from JWT payload to req.user', () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      userId: 'u1',
      email: 'a@test.com',
      role: 'user',
      planSlug: 'pro',
    });
    req.headers!.authorization = 'Bearer tok';
    authenticate(req as Request, res as Response, next as NextFunction);
    expect(req.user).toMatchObject({ userId: 'u1', planSlug: 'pro' });
    expect(next).toHaveBeenCalled();
  });

  it('authenticate throws when no token', () => {
    expect(() =>
      authenticate(req as Request, res as Response, next as NextFunction)
    ).toThrow(AuthenticationError);
  });

  it('authenticate throws when only x-test-role is set (header is not a session)', () => {
    req.headers!['x-test-role'] = 'admin';
    expect(() =>
      authenticate(req as Request, res as Response, next as NextFunction)
    ).toThrow(AuthenticationError);
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('authenticate throws on expired token', () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new jwt.TokenExpiredError('expired', new Date());
    });
    req.headers!.authorization = 'Bearer x';
    expect(() =>
      authenticate(req as Request, res as Response, next as NextFunction)
    ).toThrow(/expired/);
  });

  it('authenticate throws on invalid token', () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('bad');
    });
    req.headers!.authorization = 'Bearer x';
    expect(() =>
      authenticate(req as Request, res as Response, next as NextFunction)
    ).toThrow(/Invalid authentication token/);
  });

  it('authenticate throws on invalid token even when x-test-role is admin', () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('bad');
    });
    req.headers!.authorization = 'Bearer x';
    req.headers!['x-test-role'] = 'admin';
    expect(() =>
      authenticate(req as Request, res as Response, next as NextFunction)
    ).toThrow(/Invalid authentication token/);
  });

  it('authenticate ignores empty x-api-key and uses Bearer when present', () => {
    (jwt.verify as jest.Mock).mockReturnValue({
      userId: 'u1',
      email: 'a@test.com',
      role: 'user',
    });
    req.headers!['x-api-key'] = '';
    req.headers!.authorization = 'Bearer tok';
    authenticate(req as Request, res as Response, next as NextFunction);
    expect(req.user).toMatchObject({ userId: 'u1', role: 'user' });
    expect(jwt.verify).toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('authenticate throws when Authorization is not a Bearer token', () => {
    req.headers!.authorization = 'Basic dGVzdA==';
    expect(() =>
      authenticate(req as Request, res as Response, next as NextFunction)
    ).toThrow(AuthenticationError);
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('authenticate throws when Authorization is Bearer without space-delimited token', () => {
    req.headers!.authorization = 'Bearer';
    expect(() =>
      authenticate(req as Request, res as Response, next as NextFunction)
    ).toThrow(AuthenticationError);
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('authenticate rejects blank JWT when Authorization is Bearer with empty token', () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('bad');
    });
    req.headers!.authorization = 'Bearer ';
    expect(() =>
      authenticate(req as Request, res as Response, next as NextFunction)
    ).toThrow(/Invalid authentication token/);
  });

  it('authenticate throws when Authorization uses lowercase bearer scheme', () => {
    req.headers!.authorization = 'bearer tok';
    expect(() =>
      authenticate(req as Request, res as Response, next as NextFunction)
    ).toThrow(AuthenticationError);
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('authenticate maps jwt.JsonWebTokenError from verify to invalid token', () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new jwt.JsonWebTokenError('invalid token');
    });
    req.headers!.authorization = 'Bearer not-a-jwt';
    expect(() =>
      authenticate(req as Request, res as Response, next as NextFunction)
    ).toThrow(/Invalid authentication token/);
  });

  it('authenticate maps jwt.NotBeforeError from verify to invalid token', () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new jwt.NotBeforeError('jwt not active', new Date());
    });
    req.headers!.authorization = 'Bearer future-token';
    expect(() =>
      authenticate(req as Request, res as Response, next as NextFunction)
    ).toThrow(/Invalid authentication token/);
  });

  it('authenticate resolves API key and sets user', async () => {
    (jwt.verify as jest.Mock).mockReset();
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: 'uid',
            email: 'k@test.com',
            role: 'admin',
            is_active: true,
            expires_at: null,
          },
        ],
        rowCount: 1,
      } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    req.headers!['x-api-key'] = 'secret-key';
    const p = new Promise<void>((resolve) => {
      authenticate(req as Request, res as Response, () => {
        resolve();
      });
    });
    await p;
    expect(req.user).toMatchObject({ userId: 'uid', role: 'admin' });
  });

  it('authenticate uses first x-api-key when header is duplicated (array)', async () => {
    (jwt.verify as jest.Mock).mockReset();
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: 'uid',
            email: 'k@test.com',
            role: 'user',
            is_active: true,
            expires_at: null,
          },
        ],
        rowCount: 1,
      } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    (req.headers as Record<string, unknown>)['x-api-key'] = ['secret-key', 'other-ignored'];

    await new Promise<void>((resolve) => {
      authenticate(req as Request, res as Response, () => resolve());
    });
    expect(req.user).toMatchObject({ userId: 'uid', role: 'user' });
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('authenticate uses API key row role from DB, not x-test-role, when key is valid', async () => {
    (jwt.verify as jest.Mock).mockReset();
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: 'uid',
            email: 'k@test.com',
            role: 'user',
            is_active: true,
            expires_at: null,
          },
        ],
        rowCount: 1,
      } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    req.headers!['x-api-key'] = 'secret-key';
    req.headers!['x-test-role'] = 'admin';
    await new Promise<void>((resolve) => {
      authenticate(req as Request, res as Response, () => resolve());
    });
    expect(req.user).toMatchObject({ userId: 'uid', role: 'user' });
  });

  it('authenticate prefers API key over Bearer when both are sent', async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('jwt.verify must not run when x-api-key is present');
    });
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: 'api-user',
            email: 'k@test.com',
            role: 'user',
            is_active: true,
            expires_at: null,
          },
        ],
        rowCount: 1,
      } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    req.headers!['x-api-key'] = 'secret-key';
    req.headers!.authorization = 'Bearer tok';
    await new Promise<void>((resolve) => {
      authenticate(req as Request, res as Response, () => resolve());
    });
    expect(req.user).toMatchObject({ userId: 'api-user', role: 'user' });
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('authenticate does not fall back to Bearer when API key lookup fails', async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('jwt.verify must not run after failed API key auth');
    });
    mockQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
    } as any);

    req.headers!['x-api-key'] = 'bad-key';
    req.headers!.authorization = 'Bearer tok';

    await new Promise<void>((resolve, reject) => {
      authenticate(
        req as Request,
        res as Response,
        ((err?: unknown) => {
          if (err) reject(err);
          else resolve();
        }) as NextFunction
      );
    }).catch((e) => {
      expect(e).toBeInstanceOf(AuthenticationError);
    });

    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('authenticate calls next with error when API key database query rejects', async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('jwt.verify must not run');
    });
    const dbErr = new Error('db unavailable');
    mockQuery.mockRejectedValueOnce(dbErr);

    req.headers!['x-api-key'] = 'any-key';

    await new Promise<void>((resolve, reject) => {
      authenticate(
        req as Request,
        res as Response,
        ((err?: unknown) => {
          if (err === dbErr) resolve();
          else reject(new Error('expected database error'));
        }) as NextFunction
      );
    });

    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('authenticate calls next when API key SELECT succeeds but last_used UPDATE fails', async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('jwt.verify must not run');
    });
    const updateErr = new Error('update last_used failed');
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: 'uid',
            email: 'k@test.com',
            role: 'user',
            is_active: true,
            expires_at: null,
          },
        ],
        rowCount: 1,
      } as any)
      .mockRejectedValueOnce(updateErr);

    req.headers!['x-api-key'] = 'secret-key';

    await new Promise<void>((resolve, reject) => {
      authenticate(
        req as Request,
        res as Response,
        ((err?: unknown) => {
          if (err === updateErr) resolve();
          else reject(new Error('expected update error'));
        }) as NextFunction
      );
    });

    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('authenticate fails API key path for whitespace-only x-api-key when no row matches', async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('jwt.verify must not run');
    });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    req.headers!['x-api-key'] = '   ';

    await new Promise<void>((resolve, reject) => {
      authenticate(
        req as Request,
        res as Response,
        ((err?: unknown) => {
          if (err) reject(err);
          else resolve();
        }) as NextFunction
      );
    }).catch((e) => {
      expect(e).toBeInstanceOf(AuthenticationError);
    });

    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('requireRole allows matching role', () => {
    req.user = { userId: '1', email: 'a@b.com', role: 'admin' };
    const mw = requireRole('admin');
    mw(req as Request, res as Response, next as NextFunction);
    expect(next).toHaveBeenCalled();
  });

  it('requireRole allows user when one of several roles matches', () => {
    req.user = { userId: '1', email: 'a@b.com', role: 'user' };
    const mw = requireRole('admin', 'user');
    mw(req as Request, res as Response, next as NextFunction);
    expect(next).toHaveBeenCalled();
  });

  it('requireRole throws AuthorizationError', () => {
    req.user = { userId: '1', email: 'a@b.com', role: 'user' };
    const mw = requireRole('admin');
    expect(() => mw(req as Request, res as Response, next as NextFunction)).toThrow(AuthorizationError);
  });

  it('requireRole with no allowed roles rejects any authenticated user', () => {
    req.user = { userId: '1', email: 'a@b.com', role: 'admin' };
    const mw = requireRole();
    expect(() => mw(req as Request, res as Response, next as NextFunction)).toThrow(AuthorizationError);
  });

  it('requireRole throws AuthenticationError when user is missing', () => {
    delete req.user;
    const mw = requireRole('admin');
    expect(() => mw(req as Request, res as Response, next as NextFunction)).toThrow(AuthenticationError);
  });

  it('requireAdmin is admin-only', () => {
    req.user = { userId: '1', email: 'a@b.com', role: 'admin' };
    requireAdmin(req as Request, res as Response, next as NextFunction);
    expect(next).toHaveBeenCalled();
  });

  it('requireAdmin throws AuthorizationError for non-admin user', () => {
    req.user = { userId: '1', email: 'a@b.com', role: 'user' };
    expect(() =>
      requireAdmin(req as Request, res as Response, next as NextFunction)
    ).toThrow(AuthorizationError);
  });

  it('API key rejects inactive key', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: 'u', email: 'a@b.com', role: 'user', is_active: false, expires_at: null }],
      rowCount: 1,
    } as any);
    req.headers!['x-api-key'] = 'bad';
    await new Promise<void>((resolve, reject) => {
      authenticate(
        req as Request,
        res as Response,
        ((err?: unknown) => {
          if (err) reject(err);
          else resolve();
        }) as NextFunction
      );
    }).catch((e) => {
      expect(e).toBeInstanceOf(AuthenticationError);
    });
  });

  it('API key rejects inactive key even when x-test-role is admin', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: 'u', email: 'a@b.com', role: 'user', is_active: false, expires_at: null }],
      rowCount: 1,
    } as any);
    req.headers!['x-api-key'] = 'bad';
    req.headers!['x-test-role'] = 'admin';
    await new Promise<void>((resolve, reject) => {
      authenticate(
        req as Request,
        res as Response,
        ((err?: unknown) => {
          if (err) reject(err);
          else resolve();
        }) as NextFunction
      );
    }).catch((e) => {
      expect(e).toBeInstanceOf(AuthenticationError);
    });
  });

  it('API key rejects expired key', async () => {
    const past = new Date('2020-01-01');
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          user_id: 'u',
          email: 'a@b.com',
          role: 'user',
          is_active: true,
          expires_at: past,
        },
      ],
      rowCount: 1,
    } as any);
    req.headers!['x-api-key'] = 'exp';
    await new Promise<void>((resolve, reject) => {
      authenticate(
        req as Request,
        res as Response,
        ((err?: unknown) => {
          if (err) reject(err);
          else resolve();
        }) as NextFunction
      );
    }).catch((e) => {
      expect(e).toBeInstanceOf(AuthenticationError);
    });
  });

  it('API key rejects expired key even when x-test-role is admin', async () => {
    const past = new Date('2020-01-01');
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          user_id: 'u',
          email: 'a@b.com',
          role: 'user',
          is_active: true,
          expires_at: past,
        },
      ],
      rowCount: 1,
    } as any);
    req.headers!['x-api-key'] = 'exp';
    req.headers!['x-test-role'] = 'admin';
    await new Promise<void>((resolve, reject) => {
      authenticate(
        req as Request,
        res as Response,
        ((err?: unknown) => {
          if (err) reject(err);
          else resolve();
        }) as NextFunction
      );
    }).catch((e) => {
      expect(e).toBeInstanceOf(AuthenticationError);
    });
  });
});
