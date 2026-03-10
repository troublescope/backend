import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, ChevronUp, ListVideo, Play, Share2, Volume2, VolumeX } from "lucide-react";
import {
  getCachedStreamUrl,
  getDramaDetail,
  getEpisodes,
  getFavoriteItems,
  getHomeData,
  invalidateCachedStreamUrl,
  preloadStreamUrls,
  toggleFavorite,
  type HomeResponse,
} from "@/lib/api";
import { getStoredMutedPreference, setStoredMutedPreference } from "@/lib/audio";
import { shareDrama } from "@/lib/telegram";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/contexts/AuthContext";
import EpisodePanel from "@/components/EpisodePanel";
import type { Drama, DramaDetail, Episode, FavoriteItem } from "@/types/drama";

const ForYou = () => {
  const { t, lang } = useLanguage();
  const { isAuthenticated, login, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showEpisodePanel, setShowEpisodePanel] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(getStoredMutedPreference());

  const { data: homeData } = useQuery<HomeResponse>({
    queryKey: ["foryou-data", lang],
    queryFn: () => getHomeData(1, 20),
  });

  const { data: favorites = [] } = useQuery<FavoriteItem[]>({
    queryKey: ["favorites", lang],
    queryFn: getFavoriteItems,
    enabled: isAuthenticated,
  });

  const dramas = useMemo<Drama[]>(() => homeData?.forYou || [], [homeData]);
  const currentDrama = dramas[currentIndex];

  const { data: detail } = useQuery<DramaDetail>({
    queryKey: ["drama-detail", currentDrama?.id, lang],
    queryFn: () => getDramaDetail(currentDrama!.id),
    enabled: !!currentDrama,
  });

  const { data: episodes = [] } = useQuery<Episode[]>({
    queryKey: ["episodes", currentDrama?.id, lang],
    queryFn: () => getEpisodes(currentDrama!.id),
    enabled: !!currentDrama,
  });

  useEffect(() => {
    setStoredMutedPreference(isMuted);
  }, [isMuted]);

  useEffect(() => {
    if (!currentDrama) {
      return;
    }

    preloadStreamUrls(dramas, currentIndex);
    void queryClient.prefetchQuery({
      queryKey: ["drama-detail", currentDrama.id, lang],
      queryFn: () => getDramaDetail(currentDrama.id),
    });
    void queryClient.prefetchQuery({
      queryKey: ["episodes", currentDrama.id, lang],
      queryFn: () => getEpisodes(currentDrama.id),
    });
  }, [currentDrama, currentIndex, dramas, lang, queryClient]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            if (!Number.isNaN(index)) {
              setCurrentIndex(index);
              setExpanded(false);
            }
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    container.querySelectorAll("[data-index]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [dramas]);

  const renderRange = useMemo(() => {
    const start = Math.max(0, currentIndex - 1);
    const end = Math.min(dramas.length, currentIndex + 2);
    return { start, end };
  }, [currentIndex, dramas.length]);

  const favoriteMutation = useMutation({
    mutationFn: async (drama: Drama) => toggleFavorite(drama.id),
    onMutate: async (drama) => {
      await queryClient.cancelQueries({ queryKey: ["favorites", lang] });
      const previousFavorites = queryClient.getQueryData<FavoriteItem[]>(["favorites", lang]) || [];
      const isFavorited = previousFavorites.some((favorite) => favorite.series_id === drama.id);

      const nextFavorites = isFavorited
        ? previousFavorites.filter((favorite) => favorite.series_id !== drama.id)
        : [
            {
              series_id: drama.id,
              created_at: new Date().toISOString(),
              title: drama.title,
              cover: drama.cover,
              chapters: drama.chapters,
            },
            ...previousFavorites.filter((favorite) => favorite.series_id !== drama.id),
          ];

      queryClient.setQueryData(["favorites", lang], nextFavorites);
      return { previousFavorites };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(["favorites", lang], context.previousFavorites);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["favorites", lang] });
    },
  });

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-background">
      <div
        ref={containerRef}
        className="h-full snap-y snap-mandatory overflow-y-auto scrollbar-hide"
        style={{ scrollBehavior: "smooth" }}
      >
        {dramas.map((drama, index) => (
          <div
            key={drama.id}
            data-index={index}
            className="relative h-[100dvh] snap-start snap-always flex-shrink-0"
          >
            {index >= renderRange.start && index < renderRange.end ? (
              <ReelItem
                drama={drama}
                isActive={index === currentIndex}
                expanded={expanded && index === currentIndex}
                setExpanded={setExpanded}
                isMuted={isMuted}
                onToggleMute={() => setIsMuted((value) => !value)}
                isFavorited={favorites.some((favorite) => favorite.series_id === drama.id)}
                onFavorite={async () => {
                  if (!isAuthenticated) {
                    await login();
                    return;
                  }
                  await favoriteMutation.mutateAsync(drama);
                }}
                onShare={() => shareDrama(drama.id, 1, drama.title)}
                onTap={() => navigate(`/watch/${drama.id}/1`)}
                onEpisode={() => setShowEpisodePanel(true)}
                episodeCount={index === currentIndex ? episodes.length : 0}
                isAuthenticated={isAuthenticated}
                t={t}
              />
            ) : (
              <div className="h-full w-full bg-black" />
            )}
          </div>
        ))}
      </div>

      {currentIndex === 0 && dramas.length > 1 && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 animate-bounce text-white/50">
          <ChevronUp className="h-6 w-6" />
        </div>
      )}

      <EpisodePanel
        drama={detail || null}
        episodes={episodes}
        currentEpisode={1}
        onSelectEpisode={(episode) => {
          setShowEpisodePanel(false);
          if (currentDrama) {
            navigate(`/watch/${currentDrama.id}/${episode}`);
          }
        }}
        onClose={() => setShowEpisodePanel(false)}
        isOpen={showEpisodePanel}
        isPremium={user?.plan === "vip" || user?.is_owner === true}
      />
    </div>
  );
};

interface ReelItemProps {
  drama: Drama;
  isActive: boolean;
  expanded: boolean;
  setExpanded: (value: boolean) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isFavorited: boolean;
  onFavorite: () => Promise<void>;
  onShare: () => void;
  onTap: () => void;
  onEpisode: () => void;
  episodeCount: number;
  isAuthenticated: boolean;
  t: (key: string) => string;
}

const ReelItem = ({
  drama,
  isActive,
  expanded,
  setExpanded,
  isMuted,
  onToggleMute,
  isFavorited,
  onFavorite,
  onShare,
  onTap,
  onEpisode,
  episodeCount,
  isAuthenticated,
  t,
}: ReelItemProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const retriedRef = useRef(false);

  useEffect(() => {
    let active = true;
    retriedRef.current = false;
    if (isActive) {
      setIsLoading(true);
    }
    void getCachedStreamUrl(drama.id, 1).then((url) => {
      if (active && url) {
        setStreamUrl(url);
      }
    });

    return () => {
      active = false;
    };
  }, [drama.id, isActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) {
      return;
    }

    video.src = streamUrl;
    video.muted = isMuted;

    if (isActive) {
      const timer = window.setTimeout(() => {
        const playPromise = video.play();
        if (playPromise) {
          void playPromise
            .then(() => {
              setIsPlaying(true);
              setShowPlayButton(false);
              setIsLoading(false);
            })
            .catch(() => {
              setShowPlayButton(true);
              setIsLoading(false);
            });
        }
      }, 80);

      return () => window.clearTimeout(timer);
    }

    video.pause();
    video.currentTime = 0;
    setIsPlaying(false);
  }, [isActive, isMuted, streamUrl]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black" onClick={onTap}>
      <img
        src={drama.cover}
        alt={drama.title}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
          isPlaying ? "opacity-0" : "opacity-100"
        }`}
        loading={isActive ? "eager" : "lazy"}
      />

      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        loop
        muted={isMuted}
        playsInline
        onPlay={() => {
          setIsPlaying(true);
          setShowPlayButton(false);
        }}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onError={() => {
          if (retriedRef.current) {
            setIsLoading(false);
            return;
          }
          retriedRef.current = true;
          invalidateCachedStreamUrl(drama.id, 1);
          setIsLoading(true);
          void getCachedStreamUrl(drama.id, 1).then((url) => {
            if (url) {
              setStreamUrl(url);
            } else {
              setIsLoading(false);
            }
          });
        }}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

      {isLoading && isActive && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 z-20 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white shadow-lg backdrop-blur-md">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
            <span>Loading video...</span>
          </div>
        </div>
      )}

      {showPlayButton && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/80 shadow-lg">
            <Play className="h-8 w-8 fill-current text-white" />
          </div>
        </div>
      )}

      {isPlaying && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onToggleMute();
          }}
          className="absolute right-4 top-4 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
        </button>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 pb-20">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white drop-shadow-lg">{drama.title}</h2>
            {drama.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {drama.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded bg-white/20 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p
              className={`mt-1 text-xs text-white/90 ${expanded ? "" : "line-clamp-2"}`}
              onClick={(event) => {
                event.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {drama.description}
              {!expanded && <span className="ml-1 font-bold text-primary">{t("more")}</span>}
            </p>
            {episodeCount > 0 && <p className="mt-1 text-[10px] text-white/60">EP.1 / EP.{episodeCount}</p>}
          </div>

          <div className="mb-2 flex flex-col items-center gap-4">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onEpisode();
              }}
              className="flex flex-col items-center gap-0.5"
            >
              <ListVideo className="h-7 w-7 text-white" />
              <span className="text-[9px] font-medium text-white/90">{t("episode")}</span>
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                void onFavorite();
              }}
              className="flex flex-col items-center gap-0.5"
            >
              <Bookmark className={`h-7 w-7 ${isFavorited ? "fill-white text-white" : "text-white"}`} />
              <span className="text-[9px] font-medium text-white/90">{t("bookmark")}</span>
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onShare();
              }}
              className="flex flex-col items-center gap-0.5"
            >
              <Share2 className="h-7 w-7 text-white" />
              <span className="text-[9px] font-medium text-white/90">{t("share")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForYou;
