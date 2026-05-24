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
  const [session, setSession]               = useState(null);
  const [profile, setProfile]               = useState(null);
  const [isLoadingAuth, setIsLoadingAuth]   = useState(true);
  // Controla se o perfil está sendo carregado APÓS uma troca de sessão
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const loadProfile = useCallback(async (userId) => {
    setIsLoadingProfile(true);
    try {
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
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    // ── Carga inicial (page reload / deep link) ──────────────────────────────
    // isLoadingAuth permanece true até session + profile estarem resolvidos.
    (async () => {
      try {
        const { data: { session: initial } } = await supabase.auth.getSession();
        if (cancelled) return;
        setSession(initial);
        if (initial?.user?.id) {
          await loadProfile(initial.user.id);
        }
      } catch (err) {
        console.error('[auth] sessão/perfil:', err);
      } finally {
        if (!cancelled) setIsLoadingAuth(false);
      }
    })();

    // ── Mudanças de auth em tempo real (login / logout / refresh) ────────────
    // isLoadingProfile = true enquanto o perfil carrega → RoleRoute aguarda.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (cancelled) return;
        setSession(nextSession);
        if (nextSession?.user?.id) {
          // Carrega perfil de forma assíncrona; isLoadingProfile bloqueia RoleRoute
          loadProfile(nextSession.user.id);
        } else {
          setProfile(null);
        }
      },
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const user = useMemo(
    () => mapSessionUser(session?.user ?? null, profile),
    [session, profile],
  );

  const signInWithPassword = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithPassword = useCallback(async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || '' } },
    });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    const email = session?.user?.email;
    if (!email) throw new Error('Sessão inválida. Faça login novamente.');
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
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
    // Combina os dois estados de loading: RoleRoute e Navbar esperam ambos
    isLoadingAuth: isLoadingAuth || isLoadingProfile,
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
