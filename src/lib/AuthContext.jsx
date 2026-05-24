import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { supabase } from '@/lib/supabase/client';
import { mapSessionUser } from '@/lib/auth/mapSessionUser';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.error('[auth] perfil:', error);
      setProfile(null);
      return;
    }
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data: { session: initial } }) => {
        if (cancelled) return;
        setSession(initial);
      })
      .catch((err) => {
        console.error('[auth] sessão:', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAuth(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession?.user) setProfile(null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) {
      setProfile(null);
      return;
    }
    loadProfile(userId);
  }, [session?.user?.id, loadProfile]);

  const user = useMemo(
    () => mapSessionUser(session?.user ?? null, profile),
    [session, profile]
  );

  const signInWithPassword = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithPassword = useCallback(async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || '' },
      },
    });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    const email = session?.user?.email;
    if (!email) throw new Error('Sessão inválida. Faça login novamente.');

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (verifyError) throw new Error('Senha atual incorreta.');

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, [session?.user?.email]);

  const refreshProfile = useCallback(async () => {
    const uid = session?.user?.id;
    if (uid) await loadProfile(uid);
  }, [session?.user?.id, loadProfile]);

  const value = {
    session,
    user,
    profile,
    isAuthenticated: !!session?.user,
    isLoadingAuth,
    signInWithPassword,
    signUpWithPassword,
    logout,
    updatePassword,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
};
