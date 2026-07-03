/**
 * Auth provider abstraction (T-2.1).
 *
 * Magic-link email is the only provider enabled now. OAuth providers
 * (Google/Microsoft) implement the same `AuthProvider` shape and register an
 * authorize/callback handler later — no redesign of the session/token flow,
 * which is provider-agnostic (see auth/service.ts).
 */

export type AuthProviderType = "email" | "oauth";

export interface AuthProvider {
  id: string;
  type: AuthProviderType;
}

/** The currently-enabled magic-link email provider. */
export const emailProvider: AuthProvider = { id: "email", type: "email" };

/** Email delivery abstraction; swap StubEmailSender for Resend in production. */
export interface MagicLinkMessage {
  to: string;
  url: string;
  token: string;
  tenantId: string;
}

export interface EmailSender {
  sendMagicLink(message: MagicLinkMessage): Promise<void>;
}

/** In-memory email sender for dev/test; records what would have been sent. */
export class StubEmailSender implements EmailSender {
  readonly sent: MagicLinkMessage[] = [];

  async sendMagicLink(message: MagicLinkMessage): Promise<void> {
    this.sent.push(message);
  }

  /** Most recent message for an address (test helper). */
  lastFor(to: string): MagicLinkMessage | undefined {
    for (let i = this.sent.length - 1; i >= 0; i--) {
      if (this.sent[i]!.to === to) return this.sent[i];
    }
    return undefined;
  }
}
