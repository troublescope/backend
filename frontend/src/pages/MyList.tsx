import { BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getFavoriteItems } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/hooks/use-language";
import type { FavoriteItem } from "@/types/drama";

const MyList = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: favorites = [], isLoading } = useQuery<FavoriteItem[]>({
    queryKey: ["favorites", lang],
    queryFn: getFavoriteItems,
    enabled: isAuthenticated,
  });

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">{t("myList")}</h1>
        </div>
      </div>

      <div className="px-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-[3/4] rounded-lg bg-muted" />
                <div className="mt-2 h-3 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : favorites.length ? (
          <div className="grid grid-cols-2 gap-3">
            {favorites.map((favorite) => (
              <button
                key={favorite.series_id}
                onClick={() => navigate(`/watch/${favorite.series_id}/1`)}
                className="text-left"
              >
                <div className="aspect-[3/4] overflow-hidden rounded-lg bg-muted">
                  <img src={favorite.cover} alt={favorite.title} className="h-full w-full object-cover" />
                </div>
                <h3 className="mt-1.5 line-clamp-1 text-xs font-medium text-foreground">{favorite.title}</h3>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-[60vh] flex-col items-center justify-center text-muted-foreground">
            <BookOpen className="mb-3 h-12 w-12 opacity-30" />
            <p className="text-sm">
              {isAuthenticated ? "Belum ada drama tersimpan" : "Login untuk melihat bookmark"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyList;
