import { supabase } from './api';
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
      // Check for platform authenticator (built-in biometrics)
      const platformAvailable = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      // Also check for conditional UI support (better UX)
      const conditionalUIAvailable = await window.PublicKeyCredential.isConditionalMediationAvailable?.() || false;
      
      return platformAvailable || conditionalUIAvailable;
    } catch (error) {
      console.warn('Error checking biometric availability:', error);
      return false;
    }
  },

  // Register a new biometric credential
  register: async (userId: string, email: string) => {
    try {
      if (!webauthn.isSupported()) {
        throw new WebAuthnError('WebAuthn is not supported on this device');
      }

      // Get challenge from server
      const { data, error: challengeError } = await supabase
        .functions.invoke('webauthn-register', {
          body: { userId, email }
        });

      if (challengeError) throw challengeError;

      // Enhanced registration options for better compatibility
      const registrationOptions = {
        ...data.challenge,
        authenticatorSelection: {
          // Allow both platform (built-in) and cross-platform (external) authenticators
          authenticatorAttachment: undefined, // Don't restrict to platform only
          requireResidentKey: false,
          residentKey: 'preferred', // Prefer resident keys but don't require them
          userVerification: 'preferred' // Prefer user verification but don't require it
        },
        attestation: 'none', // Don't require attestation for better compatibility
        extensions: {
          // Enable credential properties extension for better device support
          credProps: true
        }
      };

      // Create credential using SimpleWebAuthn browser lib
      const credential = await startRegistration(registrationOptions);

      // Send credential to server
      const { error: registrationError } = await supabase
        .functions.invoke('webauthn-verify', {
          body: {
            userId,
            credential
          }
        });

      if (registrationError) throw registrationError;

      return true;
    } catch (error) {
      console.error('WebAuthn registration error:', error);
      
      // Provide more specific error messages
      if (error.name === 'NotSupportedError') {
        throw new WebAuthnError('Biometric authentication is not supported on this device');
      } else if (error.name === 'NotAllowedError') {
        throw new WebAuthnError('Biometric registration was cancelled or not allowed');
      } else if (error.name === 'InvalidStateError') {
        throw new WebAuthnError('A credential for this account already exists');
      } else if (error.name === 'SecurityError') {
        throw new WebAuthnError('Security error occurred during registration');
      } else {
        throw new WebAuthnError(error instanceof Error ? error.message : 'Failed to register biometric credential');
      }
    }
  },

  // Authenticate with biometric
  authenticate: async (email: string) => {
    try {
      if (!webauthn.isSupported()) {
        throw new WebAuthnError('WebAuthn is not supported on this device');
      }

      // Get challenge from server
      const { data, error: challengeError } = await supabase
        .functions.invoke('webauthn-authenticate', {
          body: { email }
        });

      if (challengeError || !data?.challenge) {
        throw new Error(challengeError?.message || 'Failed to get authentication challenge');
      }

      // Enhanced authentication options for better compatibility
      const authenticationOptions = {
        ...data.challenge,
        userVerification: 'preferred', // Prefer user verification but don't require it
        extensions: {
          // Enable large blob extension for better compatibility
          largeBlob: {
            support: 'preferred'
          }
        }
      };

      // Get assertion using SimpleWebAuthn browser lib
      const assertion = await startAuthentication(authenticationOptions);

      // Verify assertion with server
      const { data: { session }, error: authError } = await supabase
        .functions.invoke('webauthn-verify', {
          body: {
            email,
            assertion
          }
        });

      if (authError) throw authError;

      // Set session
      const { error: sessionError } = await supabase.auth.setSession(session);
      if (sessionError) throw sessionError;

      return true;
    } catch (error) {
      console.error('WebAuthn authentication error:', error);
      
      // Provide more specific error messages
      if (error.name === 'NotSupportedError') {
        throw new WebAuthnError('Biometric authentication is not supported on this device');
      } else if (error.name === 'NotAllowedError') {
        throw new WebAuthnError('Biometric authentication was cancelled or not allowed');
      } else if (error.name === 'InvalidStateError') {
        throw new WebAuthnError('No biometric credentials found for this account');
      } else if (error.name === 'SecurityError') {
        throw new WebAuthnError('Security error occurred during authentication');
      } else if (error.name === 'NetworkError') {
        throw new WebAuthnError('Network error occurred during authentication');
      } else {
        throw new WebAuthnError(error instanceof Error ? error.message : 'Failed to authenticate with biometric');
      }
    }
  },

  // Check if user has registered credentials
  hasCredentials: async (email: string) => {
    try {
      const { data, error } = await supabase
        .functions.invoke('webauthn-check-credentials', {
          body: { email }
        });

      if (error) return false;
      return data?.hasCredentials || false;
    } catch (error) {
      console.warn('Error checking credentials:', error);
      return false;
    }
  }
};