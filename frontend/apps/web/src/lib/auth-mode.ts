const TRUE_VALUE = "true";

export const DEMO_ACCESS_TOKEN = "optimora-demo-session";
export const DEV_ACCESS_TOKEN = "dev-stub-token";

function isEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === TRUE_VALUE;
}

export function isPlatformAuthConfigured(): boolean {
  return Boolean(process.env.PLATFORM_API_URL);
}

export function isLocalDevStubEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && !isPlatformAuthConfigured();
}

export function isStagingDemoLoginEnabled(): boolean {
  return (
    isEnabled(process.env.STAGING_DEMO_LOGIN) ||
    isEnabled(process.env.DEMO_MODE) ||
    isEnabled(process.env.NEXT_PUBLIC_DEMO_MODE)
  );
}

export function canUseDevAccessToken(token: string): boolean {
  return token === DEV_ACCESS_TOKEN && isLocalDevStubEnabled();
}

export function canUseDemoAccessToken(token: string): boolean {
  return token === DEMO_ACCESS_TOKEN && isStagingDemoLoginEnabled();
}
