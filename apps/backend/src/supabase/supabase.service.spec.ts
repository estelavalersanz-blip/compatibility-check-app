import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('SupabaseService', () => {
  const mockedCreateClient = createClient as jest.Mock;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('lanza un error claro si falta SUPABASE_URL', () => {
    delete process.env.SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    expect(() => new SupabaseService()).toThrow(/SUPABASE_URL/);
  });

  it('lanza un error claro si falta SUPABASE_SERVICE_ROLE_KEY', () => {
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => new SupabaseService()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('crea el cliente una sola vez con la service_role key y sin persistir sesión', () => {
    process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    const fakeClient = { from: jest.fn() };
    mockedCreateClient.mockReturnValue(fakeClient);

    const service = new SupabaseService();

    expect(mockedCreateClient).toHaveBeenCalledTimes(1);

    const [url, key, options] = mockedCreateClient.mock.calls[0] as [
      string,
      string,
      { auth: { autoRefreshToken: boolean; persistSession: boolean } },
    ];
    expect(url).toBe('http://127.0.0.1:54321');
    expect(key).toBe('service-role-key');
    expect(options.auth.autoRefreshToken).toBe(false);
    expect(options.auth.persistSession).toBe(false);

    expect(service.getClient()).toBe(fakeClient);
  });
});
