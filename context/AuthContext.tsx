import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/authApi';
import { DEFAULT_AVATAR_URL } from '@/lib/appConfig';

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
  updateProfile: (partial: Pick<User, 'displayName' | 'avatar' | 'avatarFrame' | 'gender'>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) loadProfile(data.session?.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) loadProfile(session?.user.id);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  async function loadProfile(userId?: string) {
    if (!userId) { setState({ user: null, isLoading: false }); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setState({ user: mapProfile(data), isLoading: false });
    else setState((prev) => ({ ...prev, isLoading: false }));
  }

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    let email = usernameOrEmail.trim().toLowerCase();
    if (!email.includes('@')) {
      const { data, error } = await supabase.rpc('get_email_by_username', { p_username: email });
      if (error || !data) throw new Error('Tên đăng nhập không tồn tại.');
      email = data;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const register = useCallback(
    async (payload: {
      email: string;
      username: string;
      password: string;
      displayName?: string;
    }) => {
      const username = payload.username.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        options: { data: { username, display_name: payload.displayName?.trim(), avatar: DEFAULT_AVATAR_URL } },
      });
      if (error) throw new Error(error.message);
      if (!data.session) throw new Error('Đăng ký thành công. Hãy xác nhận email trước khi đăng nhập.');
    },
    []
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, isLoading: false });
  }, []);

  const updateUser = useCallback((partial: Partial<User>) => {
    setState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...partial } : prev.user,
    }));
  }, []);

  const updateProfile = useCallback(async (partial: Pick<User, 'displayName' | 'avatar' | 'avatarFrame' | 'gender'>) => {
    if (!state.user) throw new Error('Chưa đăng nhập.');
    const payload = {
      display_name: partial.displayName,
      avatar: partial.avatar,
      avatar_frame: partial.avatarFrame,
      gender: partial.gender,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('profiles').update(payload).eq('id', state.user.id).select('*').single();
    if (error) throw new Error(error.message);
    if (data) setState((prev) => ({ ...prev, user: mapProfile(data) }));
  }, [state.user]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!state.user?.email) throw new Error('Chưa đăng nhập.');
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: state.user.email, password: currentPassword });
    if (verifyError) throw new Error('Mật khẩu hiện tại không đúng.');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }, [state.user]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

function mapProfile(profile: any): User {
  return {
    id: profile.id,
    email: profile.email || '',
    username: profile.username,
    displayName: profile.display_name || undefined,
    avatar: profile.avatar || undefined,
    avatarFrame: profile.avatar_frame || undefined,
    gender: profile.gender || 'other',
    role: profile.role || 'user',
    isActive: true,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
