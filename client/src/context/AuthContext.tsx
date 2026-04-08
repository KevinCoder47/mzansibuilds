import { createContext, useContext, useState, ReactNode } from 'react';
import { authApi } from '../services/api';

interface Developer {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  user: Developer | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize state synchronously to prevent ANY flash of unauthenticated state
  const [state, setState] = useState<AuthState>(() => {
    const storedToken = localStorage.getItem('mb_token');
    const storedUser = localStorage.getItem('mb_user');

    if (storedToken && storedUser) {
      try {
        return {
          token: storedToken,
          user: JSON.parse(storedUser) as Developer,
          isLoading: false,
        };
      } catch (e) {
        // Clear corrupted data
        localStorage.removeItem('mb_token');
        localStorage.removeItem('mb_user');
      }
    }

    return {
      user: null,
      token: null,
      isLoading: false, // Set to false because we checked localStorage instantly
    };
  });

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    localStorage.setItem('mb_token', data.token);
    localStorage.setItem('mb_user', JSON.stringify(data.developer));
    setState({ user: data.developer, token: data.token, isLoading: false });
  };

  const register = async (username: string, email: string, password: string) => {
    const data = await authApi.register(username, email, password);
    localStorage.setItem('mb_token', data.token);
    localStorage.setItem('mb_user', JSON.stringify(data.developer));
    setState({ user: data.developer, token: data.token, isLoading: false });
  };

  const logout = () => {
    localStorage.removeItem('mb_token');
    localStorage.removeItem('mb_user');
    setState({ user: null, token: null, isLoading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
