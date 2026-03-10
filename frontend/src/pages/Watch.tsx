import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bookmark, ChevronDown, ChevronUp, ListVideo, Play, Share2, Volume2, VolumeX } from "lucide-react";
import {
  getCachedStreamUrl,
  getDramaDetail,
  getEpisodes,
  getFavoriteItems,
  invalidateCachedStreamUrl,
  toggleFavorite,
  type StreamQualityMode,
} from "@/lib/api";
import { getStoredMutedPreference, setStoredMutedPreference } from "@/lib/audio";
import { getStoredQualityModePreference, setStoredQualityModePreference } from "@/lib/player";
import { shareDrama } from "@/lib/telegram";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/contexts/AuthContext";
import EpisodePanel from "@/components/EpisodePanel";
import type { DramaDetail, Episode, FavoriteItem } from "@/types/drama";

const Watch = () => {
  const { id, episode: episodeParam } = useParams<{ id: string; episode: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, lang } = useLanguage();
  const { isAuthenticated, login, user } = useAuth();
  const [currentEpisode, setCurrentEpisode] = useState(Number(episodeParam) || 1);
  const [showPanel, setShowPanel] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [pendingEpisode, setPendingEpisode] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(getStoredMutedPreference());
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [qualityMode, setQualityMode] = useState<StreamQualityMode>(getStoredQualityModePreference());
  const [holdSeekDirection, setHoldSeekDirection] = useState<"left" | "right" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const episodeSwitchTimer = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const streamRetryKeyRef = useRef("");
  const holdSeekActivateTimerRef = useRef<number | null>(null);
  const holdSeekTickTimerRef = useRef<number | null>(null);
  const holdSeekPointerIdRef = useRef<number | null>(null);
  const holdSeekActivatedRef = useRef(false);
  const suppressTapRef = useRef(false);

  const { data: detail } = useQuery<DramaDetail>({
    queryKey: ["drama-detail", id, lang],
    queryFn: () => getDramaDetail(id!),
    enabled: !!id,
  });

  const { data: episodes = [] } = useQuery<Episode[]>({
    queryKey: ["episodes", id, lang],
    queryFn: () => getEpisodes(id!),
    enabled: !!id,
  });

  const { data: favorites = [] } = useQuery<FavoriteItem[]>({
    queryKey: ["favorites", lang],
    queryFn: getFavoriteItems,
    enabled: isAuthenticated,
  });

  const isFavorited = useMemo(
    () => favorites.some((favorite) => favorite.series_id === id),
    [favorites, id]
  );

  useEffect(() => {
    setCurrentEpisode(Number(episodeParam) || 1);
  }, [episodeParam]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
    }
    setStoredMutedPreference(isMuted);
  }, [isMuted]);

  useEffect(() => {
    setStoredQualityModePreference(qualityMode);
  }, [qualityMode]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const requestId = ++requestIdRef.current;
    setVideoLoading(true);
    void getCachedStreamUrl(id, currentEpisode, qualityMode).then((url) => {
      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!url) {
        const fallback = getNextFallbackQuality(qualityMode);
        if (fallback) {
          setQualityMode(fallback);
          return;
        }
        setVideoLoading(false);
        return;
      }

      setStreamUrl(url);
    });
  }, [currentEpisode, id, qualityMode]);

  useEffect(() => {
    streamRetryKeyRef.current = "";
  }, [id, currentEpisode, qualityMode]);

  useEffect(() => {
    if (!id || !episodes.length) {
      return;
    }

    const nextEpisode = currentEpisode + 1;
    const prevEpisode = currentEpisode - 1;

    if (nextEpisode <= episodes.length) {
      void getCachedStreamUrl(id, nextEpisode, qualityMode);
    }
    if (prevEpisode >= 1) {
      void getCachedStreamUrl(id, prevEpisode, qualityMode);
    }
  }, [currentEpisode, episodes.length, id, qualityMode]);

  useEffect(() => {
    if (!id) {
      return;
    }

    window.history.replaceState(null, "", `/watch/${id}/${currentEpisode}`);
  }, [currentEpisode, id]);

  useEffect(() => {
    const nextDramaId = id;
    if (!nextDramaId || !episodes.length) {
      return;
    }

    void queryClient.prefetchQuery({
      queryKey: ["episodes", nextDramaId, lang],
      queryFn: () => getEpisodes(nextDramaId),
    });
  }, [episodes.length, id, lang, queryClient]);

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error("Missing content id");
      }

      return toggleFavorite(id);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["favorites", lang] });
      const previousFavorites = queryClient.getQueryData<FavoriteItem[]>(["favorites", lang]) || [];

      if (!id || !detail) {
        return { previousFavorites };
      }

      const nextFavorites = isFavorited
        ? previousFavorites.filter((favorite) => favorite.series_id !== id)
        : [
            {
              series_id: id,
              created_at: new Date().toISOString(),
              title: detail.title,
              cover: detail.cover,
              chapters: detail.total_episodes,
            },
            ...previousFavorites.filter((favorite) => favorite.series_id !== id),
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

  const scheduleEpisodeChange = useCallback((nextEpisode: number) => {
    if (nextEpisode < 1 || nextEpisode > episodes.length) {
      return;
    }

    if (episodeSwitchTimer.current) {
      window.clearTimeout(episodeSwitchTimer.current);
    }

    setPendingEpisode(nextEpisode);
    episodeSwitchTimer.current = window.setTimeout(() => {
      setCurrentEpisode(nextEpisode);
      setPendingEpisode(null);
    }, 120);
  }, [episodes.length]);

  useEffect(() => {
    return () => {
      if (episodeSwitchTimer.current) {
        window.clearTimeout(episodeSwitchTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) {
      return;
    }

    setDuration(0);
    setCurrentTimeSec(0);
    video.src = streamUrl;
    video.load();
    const playPromise = video.play();
    if (playPromise) {
      void playPromise
        .then(() => {
          setIsPlaying(true);
          setShowPlayButton(false);
          setVideoLoading(false);
        })
        .catch(() => {
          setShowPlayButton(true);
          setIsPlaying(false);
          setVideoLoading(false);
        });
    }
  }, [streamUrl]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let startY = 0;
    const onStart = (event: TouchEvent) => {
      startY = event.touches[0].clientY;
    };
    const onEnd = (event: TouchEvent) => {
      const diff = startY - event.changedTouches[0].clientY;
      if (Math.abs(diff) <= 80) {
        return;
      }

      if (diff > 0) {
        scheduleEpisodeChange(currentEpisode + 1);
      } else {
        scheduleEpisodeChange(currentEpisode - 1);
      }
    };

    container.addEventListener("touchstart", onStart, { passive: true });
    container.addEventListener("touchend", onEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", onStart);
      container.removeEventListener("touchend", onEnd);
    };
  }, [currentEpisode, episodes.length, scheduleEpisodeChange]);

  const handleFavorite = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!isAuthenticated) {
      await login();
      return;
    }

    if (!favoriteMutation.isPending) {
      await favoriteMutation.mutateAsync();
    }
  };

  const handleShare = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!id) {
      return;
    }
    shareDrama(id, currentEpisode, detail?.title);
  };

  const getNextFallbackQuality = (mode: StreamQualityMode): StreamQualityMode | null => {
    if (mode === "high") {
      return "med";
    }
    if (mode === "med") {
      return "low";
    }
    if (mode === "low") {
      return "auto";
    }
    return null;
  };

  const stopHoldSeek = useCallback(() => {
    if (holdSeekActivateTimerRef.current) {
      window.clearTimeout(holdSeekActivateTimerRef.current);
      holdSeekActivateTimerRef.current = null;
    }
    if (holdSeekTickTimerRef.current) {
      window.clearInterval(holdSeekTickTimerRef.current);
      holdSeekTickTimerRef.current = null;
    }

    if (holdSeekActivatedRef.current) {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = 1;
      }
      suppressTapRef.current = true;
    }

    holdSeekActivatedRef.current = false;
    holdSeekPointerIdRef.current = null;
    setHoldSeekDirection(null);
  }, []);

  const startHoldSeek = useCallback((direction: "left" | "right") => {
    holdSeekActivatedRef.current = true;
    setHoldSeekDirection(direction);

    const video = videoRef.current;
    if (video) {
      video.playbackRate = 2;
    }

    holdSeekTickTimerRef.current = window.setInterval(() => {
      const currentVideo = videoRef.current;
      if (!currentVideo) {
        return;
      }

      const delta = direction === "right" ? 2 : -2;
      const max = Number.isFinite(currentVideo.duration) ? currentVideo.duration : currentVideo.currentTime + Math.abs(delta);
      const nextTime = Math.max(0, Math.min(max, currentVideo.currentTime + delta));
      currentVideo.currentTime = nextTime;
      setCurrentTimeSec(nextTime);
    }, 180);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest("button,input,select,textarea,[data-no-hold='true']")) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const direction: "left" | "right" = event.clientX < rect.left + rect.width / 2 ? "left" : "right";

    holdSeekPointerIdRef.current = event.pointerId;
    holdSeekActivateTimerRef.current = window.setTimeout(() => {
      startHoldSeek(direction);
    }, 180);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (holdSeekPointerIdRef.current !== null && holdSeekPointerIdRef.current !== event.pointerId) {
      return;
    }
    stopHoldSeek();
  };

  const cycleQualityMode = () => {
    const order: StreamQualityMode[] = ["auto", "med", "high", "low"];
    const index = order.indexOf(qualityMode);
    const nextMode = order[(index + 1) % order.length];
    setQualityMode(nextMode);
    if (id) {
      invalidateCachedStreamUrl(id, currentEpisode);
    }
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "00:00";
    }
    const total = Math.floor(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const qualityLabel = qualityMode === "auto" ? "AUTO" : qualityMode === "med" ? "MED" : qualityMode.toUpperCase();

  useEffect(() => {
    return () => {
      stopHoldSeek();
    };
  }, [stopHoldSeek]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-[100dvh] flex-col items-center justify-center overflow-hidden bg-black"
      onClick={(event) => {
        event.stopPropagation();
        if (suppressTapRef.current) {
          suppressTapRef.current = false;
          return;
        }
        setShowControls((value) => !value);
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <video
        ref={videoRef}
        className={`h-full w-full object-contain ${streamUrl ? "opacity-100" : "opacity-0"}`}
        playsInline
        muted={isMuted}
        onPlay={() => {
          setIsPlaying(true);
          setShowPlayButton(false);
        }}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setVideoLoading(true)}
        onPlaying={() => setVideoLoading(false)}
        onLoadedMetadata={() => {
          const video = videoRef.current;
          if (video) {
            setDuration(video.duration || 0);
          }
        }}
        onTimeUpdate={() => {
          const video = videoRef.current;
          if (video) {
            setCurrentTimeSec(video.currentTime || 0);
          }
        }}
        onError={() => {
          if (!id) {
            return;
          }
          const retryKey = `${id}-${currentEpisode}-${qualityMode}`;
          if (streamRetryKeyRef.current === retryKey) {
            const fallback = getNextFallbackQuality(qualityMode);
            if (fallback) {
              setQualityMode(fallback);
              return;
            }
            setVideoLoading(false);
            return;
          }
          streamRetryKeyRef.current = retryKey;
          setVideoLoading(true);
          invalidateCachedStreamUrl(id, currentEpisode, qualityMode);
          void getCachedStreamUrl(id, currentEpisode, qualityMode).then((url) => {
            if (url) {
              setStreamUrl(url);
            } else {
              setVideoLoading(false);
            }
          });
        }}
        onEnded={() => scheduleEpisodeChange(currentEpisode + 1)}
      />

      {!streamUrl && detail && (
        <img
          src={detail.cover}
          alt={detail.title}
          className="absolute inset-0 h-full w-full object-cover opacity-50 blur-sm"
        />
      )}

      {(videoLoading || pendingEpisode !== null) && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 z-20 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white shadow-lg backdrop-blur-md">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
            <span>{pendingEpisode !== null ? "Switching episode..." : "Loading video..."}</span>
          </div>
        </div>
      )}

      {holdSeekDirection && (
        <div className="pointer-events-none absolute top-16 left-1/2 z-20 -translate-x-1/2">
          <div className="rounded-full bg-black/20 px-3 py-1 text-sm font-medium tracking-wide text-white/50 backdrop-blur-sm">
            {holdSeekDirection === "right" ? ">> 2.0x" : "<< 2.0x"}
          </div>
        </div>
      )}

      {showPlayButton && (
        <div className="absolute inset-0 z-10 flex items-center justify-center" onClick={(event) => {
          event.stopPropagation();
          const video = videoRef.current;
          if (video) {
            void video.play().then(() => {
              setIsPlaying(true);
              setShowPlayButton(false);
            });
          }
        }}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/80">
            <Play className="h-8 w-8 fill-current text-primary-foreground" />
          </div>
        </div>
      )}

      {isPlaying && showControls && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            setIsMuted((value) => !value);
          }}
          className="absolute right-4 top-20 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40"
        >
          {isMuted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
        </button>
      )}

      {showControls && (
        <div
          className="absolute left-0 right-0 top-0 z-10 flex items-center gap-3 bg-gradient-to-b from-black/60 to-transparent p-4"
          onClick={(event) => event.stopPropagation()}
        >
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="h-6 w-6 text-white" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-white">{detail?.title}</h1>
            <p className="text-[10px] text-white/70">
              {t("episode")} {pendingEpisode ?? currentEpisode}
              {detail?.playCount ? ` • ${detail.playCount} views` : ""}
              {user?.is_owner ? " • OWNER" : ""}
            </p>
          </div>
        </div>
      )}

      {showControls && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 pb-20"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <p className="line-clamp-2 text-xs text-white/80">{detail?.description}</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => scheduleEpisodeChange(currentEpisode - 1)}
                className="flex flex-col items-center gap-0.5"
                disabled={currentEpisode <= 1}
              >
                <ChevronDown className={`h-6 w-6 ${currentEpisode <= 1 ? "text-white/40" : "text-white"}`} />
                <span className="text-[9px] text-white/80">Prev</span>
              </button>
              <button
                onClick={() => scheduleEpisodeChange(currentEpisode + 1)}
                className="flex flex-col items-center gap-0.5"
                disabled={episodes.length > 0 && currentEpisode >= episodes.length}
              >
                <ChevronUp className={`h-6 w-6 ${episodes.length > 0 && currentEpisode >= episodes.length ? "text-white/40" : "text-white"}`} />
                <span className="text-[9px] text-white/80">Next</span>
              </button>
              <button onClick={() => setShowPanel(true)} className="flex flex-col items-center gap-0.5">
                <ListVideo className="h-6 w-6 text-white" />
                <span className="text-[9px] text-white/80">{t("episode")}</span>
              </button>
              <button onClick={cycleQualityMode} className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] font-semibold text-white">{qualityLabel}</span>
                <span className="text-[9px] text-white/70">
                  {qualityMode === "high" ? "VIP 1080 / 720" : qualityMode === "med" ? "720p" : qualityMode === "low" ? "544p" : "Auto"}
                </span>
              </button>
              <button onClick={handleFavorite} className="flex flex-col items-center gap-0.5">
                <Bookmark className={`h-6 w-6 ${isFavorited ? "fill-white text-white" : "text-white"}`} />
                <span className="text-[9px] text-white/80">{t("bookmark")}</span>
              </button>
              <button onClick={handleShare} className="flex flex-col items-center gap-0.5">
                <Share2 className="h-6 w-6 text-white" />
                <span className="text-[9px] text-white/80">{t("share")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showControls && (
        <div
          className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/55 px-4 pb-4 pt-2 backdrop-blur-sm"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            data-no-hold="true"
            type="range"
            min={0}
            max={Math.max(duration, 0)}
            step={0.1}
            value={Math.min(currentTimeSec, duration || 0)}
            onChange={(event) => {
              const nextTime = Number(event.target.value);
              setCurrentTimeSec(nextTime);
              const video = videoRef.current;
              if (video) {
                video.currentTime = nextTime;
              }
            }}
            className="w-full accent-primary"
          />
          <div className="mt-1 flex justify-between text-[10px] text-white/70">
            <span>{formatTime(currentTimeSec)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}

      <EpisodePanel
        drama={detail || null}
        episodes={episodes}
        currentEpisode={pendingEpisode ?? currentEpisode}
        onSelectEpisode={(episode) => {
          setShowPanel(false);
          scheduleEpisodeChange(episode);
        }}
        onClose={() => setShowPanel(false)}
        isOpen={showPanel}
        isPremium={user?.plan === "vip" || user?.is_owner === true}
      />
    </div>
  );
};

export default Watch;
