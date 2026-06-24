import { supabase } from '@/lib/supabase';

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error('Missing authenticated session.');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  return fetch(input, {
    ...init,
    headers,
  });
}