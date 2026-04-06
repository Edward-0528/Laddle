// ---------------------------------------------------------------------------
// Authentication Context
// Provides application-wide access to the current user's authentication
// state. Wraps Firebase Authentication and exposes login, register,
// sign-out, and Google sign-in methods.
//
// Usage:
//   const { user, isLoading, login, register, signOut } = useAuth();
// ---------------------------------------------------------------------------

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  User,
} from 'firebase/auth';
import { auth } from '../services/firebase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthContextValue {
  /** The currently authenticated Firebase user, or null if not signed in. */
  user: User | null;
  /** True while the initial auth state is being determined. */
  isLoading: boolean;
  /** Sign in with email and password. Returns an error message on failure. */
  login: (email: string, password: string) => Promise<string | null>;
  /** Create a new account with email and password. Returns an error message on failure. */
  register: (email: string, password: string, displayName: string) => Promise<string | null>;
  /** Sign in with a Google account popup. Returns an error message on failure. */
  loginWithGoogle: () => Promise<string | null>;
  /** Sign out the current user. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider Component
// ---------------------------------------------------------------------------

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      // Firebase is not configured. Mark loading as complete and
      // continue in unauthenticated mode.
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Translates Firebase error codes into user-friendly messages.
   */
  function getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code: string }).code;
      switch (code) {
        case 'auth/invalid-email':
          return 'Please enter a valid email address.';
        case 'auth/user-disabled':
          return 'This account has been disabled. Please contact support.';
        case 'auth/user-not-found':
          return 'No account found with this email. Please register first.';
        case 'auth/wrong-password':
          return 'Incorrect password. Please try again.';
        case 'auth/invalid-credential':
          return 'Invalid email or password. Please try again.';
        case 'auth/email-already-in-use':
          return 'An account with this email already exists. Please sign in.';
        case 'auth/weak-password':
          return 'Password must be at least 6 characters long.';
        case 'auth/too-many-requests':
          return 'Too many failed attempts. Please try again later.';
        case 'auth/popup-closed-by-user':
          return 'Sign in was cancelled. Please try again.';
        default:
          return 'An unexpected error occurred. Please try again.';
      }
    }
    return 'An unexpected error occurred. Please try again.';
  }

  const login = async (email: string, password: string): Promise<string | null> => {
    if (!auth) return 'Authentication is not configured.';
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return null;
    } catch (error) {
      console.error('[Ladle] Login error:', error);
      return getErrorMessage(error);
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<string | null> => {
    if (!auth) return 'Authentication is not configured.';
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName });
      return null;
    } catch (error) {
      console.error('[Ladle] Registration error:', error);
      return getErrorMessage(error);
    }
  };

  const loginWithGoogle = async (): Promise<string | null> => {
    if (!auth) return 'Authentication is not configured.';
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      return null;
    } catch (error) {
      console.error('[Ladle] Google sign-in error:', error);
      return getErrorMessage(error);
    }
  };

  const signOut = async (): Promise<void> => {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('[Ladle] Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, loginWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
