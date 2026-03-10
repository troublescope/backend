import { NavLink, useLocation } from "react-router-dom";
import { Home, Compass, Crown, BookOpen, User } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

const BottomNav = () => {
  const { t } = useLanguage();
  const location = useLocation();

  const tabs = [
    { to: "/", icon: Home, label: t("home") },
    { to: "/for-you", icon: Compass, label: t("forYou") },
    { to: "/vip", icon: Crown, label: t("vip") },
    { to: "/my-list", icon: BookOpen, label: t("myList") },
    { to: "/profile", icon: User, label: t("profile") },
  ];

  // Hide nav on watch page
  if (location.pathname.startsWith("/watch/")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-nav border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-nav-active" : "text-nav-foreground"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
