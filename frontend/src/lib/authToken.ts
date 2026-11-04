const TOKEN_STORAGE_KEY = "brandguard.access-token";

let accessToken: string | null =
  typeof window === "undefined"
    ? null
    : window.sessionStorage.getItem(TOKEN_STORAGE_KEY);

export function getAuthToken(): string | null {
  return accessToken;
}

export function setAuthToken(token: string): void {
  window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  accessToken = token;
}

export function clearAuthToken(): void {
  window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  accessToken = null;
}

export function notifyAuthenticationExpired(): void {
  window.dispatchEvent(new Event("brandguard:unauthorized"));
}
