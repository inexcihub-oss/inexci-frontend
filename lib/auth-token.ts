let accessToken: string | null = null;

export function setAccessToken(token: string | null | undefined): void {
  accessToken = token ? String(token) : null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = null;
}
