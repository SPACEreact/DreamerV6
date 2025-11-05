/**
 * Authentication Context
 * Manages user authentication state throughout the application
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: any) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial session
    const loadSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) {
          // Session loading error handled silently
        }
        setSession(currentSession);
        setUser(currentSession?.user || null);
      } catch (error) {
        // Session loading error handled silently
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user || null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        toast.error(error.message || 'Failed to sign up');
        return { error };
      }

      if (data.user) {
        toast.success('Account created! Please check your email to verify.');
      }

      return { error: null };
    } catch (error: any) {
      toast.error('Failed to sign up');
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast.error(error.message || 'Failed to sign in');
        return { error };
      }

      if (data.user) {
        toast.success('Welcome back!');
      }

      return { error: null };
    } catch (error: any) {
      toast.error('Failed to sign in');
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error('Failed to sign out');
        return { error };
      }

      toast.success('Signed out successfully');
      return { error: null };
    } catch (error: any) {
      toast.error('Failed to sign out');
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        toast.error(error.message || 'Failed to send reset email');
        return { error };
      }

      toast.success('Password reset email sent!');
      return { error: null };
    } catch (error: any) {
      toast.error('Failed to send reset email');
      return { error };
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: updates
      });

      if (error) {
        toast.error(error.message || 'Failed to update profile');
        return { error };
      }

      toast.success('Profile updated successfully');
      return { error: null };
    } catch (error: any) {
      toast.error('Failed to update profile');
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
