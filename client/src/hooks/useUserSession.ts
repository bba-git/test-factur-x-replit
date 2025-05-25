import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
}

interface UserSession {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
}

export function useUserSession(): UserSession {
  const [session, setSession] = useState<UserSession>({
    user: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Not authenticated, which is fine
            setSession({ user: null, isLoading: false, error: null });
            return;
          }
          throw new Error('Failed to fetch user session');
        }

        const user = await response.json();
        setSession({ user, isLoading: false, error: null });
      } catch (err) {
        setSession({
          user: null,
          isLoading: false,
          error: err instanceof Error ? err : new Error('Unknown error occurred'),
        });
      }
    }

    fetchUser();
  }, []);

  return session;
} 