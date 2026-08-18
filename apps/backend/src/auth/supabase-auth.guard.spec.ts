import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';

interface FakeRequest {
  headers: { authorization?: string };
  user?: unknown;
}

function buildContext(authorization?: string): { context: ExecutionContext; request: FakeRequest } {
  const request: FakeRequest = { headers: { authorization } };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { context, request };
}

function buildGuard(getUser: jest.Mock): SupabaseAuthGuard {
  const supabaseService = {
    getClient: () => ({ auth: { getUser } }),
  } as unknown as SupabaseService;

  return new SupabaseAuthGuard(supabaseService);
}

describe('SupabaseAuthGuard', () => {
  it('acepta una request con un JWT válido y adjunta el usuario resuelto a la request', async () => {
    const getUser = jest.fn().mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user1@test.com' } },
      error: null,
    });
    const guard = buildGuard(getUser);
    const { context, request } = buildContext('Bearer valid-jwt');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(getUser).toHaveBeenCalledWith('valid-jwt');
    expect(request.user).toEqual({ id: 'user-1', email: 'user1@test.com' });
  });

  it('rechaza una request sin header Authorization', async () => {
    const getUser = jest.fn();
    const guard = buildGuard(getUser);
    const { context } = buildContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('rechaza un header Authorization sin esquema Bearer', async () => {
    const getUser = jest.fn();
    const guard = buildGuard(getUser);
    const { context } = buildContext('Basic somecreds');

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('rechaza un token inválido o expirado', async () => {
    const getUser = jest.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid JWT' },
    });
    const guard = buildGuard(getUser);
    const { context } = buildContext('Bearer expired-jwt');

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
