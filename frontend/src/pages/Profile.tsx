import { useState } from "react";
import { User, Globe, Moon, Sun, ChevronRight, Crown, LogIn, LogOut } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { LANGUAGES, LangCode } from "@/lib/i18n";
import { getTheme, setTheme, Theme } from "@/lib/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { t, lang, changeLang } = useLanguage();
  const { user, isAuthenticated, login, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const [showLangPicker, setShowLangPicker] = useState(false);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  };

  const currentLangName = LANGUAGES.find((l) => l.code === lang)?.name || "Bahasa Indonesia";
  const isVip = user?.plan === "vip" || user?.plan === "premium";

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">{t("profile")}</h1>
        </div>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center py-6">
        {isAuthenticated && user?.photo_url ? (
          <img src={user.photo_url} alt={user.first_name} className="w-20 h-20 rounded-full object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
        <p className="mt-2 text-sm font-medium text-foreground">
          {isAuthenticated ? `${user?.first_name || ""} ${user?.last_name || ""}`.trim() : "Guest User"}
        </p>
        <div className="flex items-center gap-1 mt-0.5">
          {isVip && <Crown className="w-3 h-3 text-primary" />}
          <p className="text-xs text-muted-foreground">
            {isVip ? "VIP" : isAuthenticated ? "Free Account" : "Not logged in"}
          </p>
        </div>
      </div>

      {/* Upgrade CTA */}
      {isAuthenticated && !isVip && (
        <div className="mx-4 mb-3">
          <button
            onClick={() => navigate("/vip")}
            className="w-full py-3 rounded-xl font-semibold text-sm text-primary-foreground flex items-center justify-center gap-2"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Crown className="w-4 h-4" />
            {lang === "id" ? "Upgrade ke VIP" : "Upgrade to VIP"}
          </button>
        </div>
      )}

      {/* Settings */}
      <div className="mx-4 rounded-xl bg-card overflow-hidden">
        {/* Auth */}
        <button
          onClick={isAuthenticated ? logout : login}
          className="w-full flex items-center gap-3 px-4 py-3 border-b border-border"
        >
          {isAuthenticated ? (
            <LogOut className="w-5 h-5 text-muted-foreground" />
          ) : (
            <LogIn className="w-5 h-5 text-muted-foreground" />
          )}
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-foreground">
              {isAuthenticated
                ? lang === "id" ? "Keluar" : "Logout"
                : lang === "id" ? "Masuk dengan Telegram" : "Login with Telegram"}
            </p>
            {isAuthenticated && user?.username && (
              <p className="text-xs text-muted-foreground">@{user.username}</p>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Language */}
        <button
          onClick={() => setShowLangPicker(true)}
          className="w-full flex items-center gap-3 px-4 py-3 border-b border-border"
        >
          <Globe className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-foreground">{t("language")}</p>
            <p className="text-xs text-muted-foreground">{currentLangName}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Theme */}
        <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-4 py-3">
          {theme === "dark" ? (
            <Moon className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Sun className="w-5 h-5 text-muted-foreground" />
          )}
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-foreground">{t("theme")}</p>
            <p className="text-xs text-muted-foreground">
              {theme === "dark" ? t("darkMode") : t("lightMode")}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Language Picker Modal */}
      {showLangPicker && (
        <div className="fixed inset-0 z-[70] flex items-end" onClick={() => setShowLangPicker(false)}>
          <div className="absolute inset-0 bg-overlay/60" />
          <div
            className="relative w-full max-h-[70vh] bg-card rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <h3 className="px-4 pb-2 font-semibold text-foreground">{t("language")}</h3>
            <div className="overflow-y-auto max-h-[55vh] pb-8">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    changeLang(l.code as LangCode);
                    setShowLangPicker(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    lang === l.code
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
