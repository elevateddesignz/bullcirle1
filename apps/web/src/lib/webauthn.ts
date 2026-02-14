import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export class WebAuthnError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebAuthnError';
  }
}

export const webauthn = {
  isSupported: () => {
    return window.PublicKeyCredential !== undefined &&
           typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
  },

  isBiometricAvailable: async () => {
    if (!webauthn.isSupported()) return false;
    
    try {
      const platformAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      const conditionalUIAvailable = await window.PublicKeyCredential.isConditionalMediationAvailable?.() || false;
      return platformAvailable || conditionalUIAvailable;
    } catch (error) {
      console.warn('Error checking biometric availability:', error);
      return false;
    }
  },

  hasCredentials: async (_email: string) => {
    return false;
  },

  register: async (_userId: string, _email: string) => {
    throw new WebAuthnError('WebAuthn is not configured for custom auth yet.');
  },

  authenticate: async (_email: string) => {
    throw new WebAuthnError('WebAuthn is not configured for custom auth yet.');
  },
};
