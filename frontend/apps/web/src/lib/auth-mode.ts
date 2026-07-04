export const DEV_ACCESS_TOKEN = "dev-stub-token";

export function isPlatformAuthConfigured(): boolean {
  return Boolean(process.env.PLATFORM_API_URL);
}

/**
 * Local development only: when no platform API is configured AND we are not in
 * a production build, the app renders with a stub session so the UI is
 * workable without a backend. Never active in production — production without
 * PLATFORM_API_URL fails closed to the login screen.
 */
export function isLocalDevStubEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && !isPlatformAuthConfigured();
}

export function canUseDevAccessToken(token: string): boolean {
  return token === DEV_ACCESS_TOKEN && isLocalDevStubEnabled();
}
