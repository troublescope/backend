import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from "react";
import WebApp from "@twa-dev/sdk";
import { authenticateTelegram, getUserProfile, getToken, clearToken } from "@/lib/api";

interface AuthUser {
  id: string;
  telegram_id: number;
  username: string;
  first_name: string;
  last_name: string;
  photo_url: string;
  language_code: string;
  is_premium: boolean;
  is_owner?: boolean;
  plan: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(getToken());
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check if WebApp exists and has initData
      const initData = WebApp.initData;

      if (!initData) {
        if (!getToken()) {
          setIsLoading(false);
          return;
        }
      } else {
        const result = await authenticateTelegram(initData);
        
        if (result.token) {
          setToken(result.token);
          if (result.user) setUser(result.user);
        }
      }
    } catch (err) {
      clearToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;

    const init = async () => {
      const currentToken = getToken();

      try {
        WebApp.ready();
        WebApp.expand();
      } catch (e) {
        console.warn("WebApp ready/expand failed (expected if outside TG):", e);
      }

      if (currentToken) {
        try {
          const profile = await getUserProfile() as AuthUser | { user: AuthUser };
          if (!active) return;
          setUser("user" in profile ? profile.user : profile);
          setIsLoading(false);
        } catch {
          if (WebApp.initData) {
            await login();
          } else {
            if (!active) return;
            clearToken();
            setToken(null);
            setIsLoading(false);
          }
        }
      } else {
        if (WebApp.initData) {
          await login();
        } else {
          if (!active) return;
          setIsLoading(false);
        }
      }
    };

    void init();

    return () => {
      active = false;
    };
  }, [login]);

  const value = useMemo(() => ({
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
  }), [user, token, isLoading, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
