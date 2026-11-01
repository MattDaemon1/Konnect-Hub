/**
 * @file api.ts
 * @description Client HTTP sécurisé pour My Konnect
 * Assure la double persistance des sessions (Cookie HTTP-Only + En-tête Authorization Bearer)
 * Empêche toute déconnexion inattendue ou blocage de cookies en environnement iFrame/Safari.
 */

const TOKEN_KEY = 'konnect_jwt_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignorer si localStorage restreint
  }
}

export async function apiFetch(input: string | URL | Request, init: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(init.headers || {});

  // Attachement automatique du token JWT Bearer en secours du cookie HTTP-Only
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Accepte le JSON par défaut si non spécifié
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: 'include', // Envoi systématique du cookie de session HTTP-Only
  });

  return response;
}
