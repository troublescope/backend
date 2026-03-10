import { useState, useMemo } from "react";
import { Eye, Star, Lock, X } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import type { DramaDetail, Episode } from "@/types/drama";

interface EpisodePanelProps {
  drama: DramaDetail | null;
  episodes: Episode[];
  currentEpisode: number;
  onSelectEpisode: (ep: number) => void;
  onClose: () => void;
  isOpen: boolean;
  isPremium?: boolean;
}

const FREE_EPISODE_LIMIT = 10;

const EpisodePanel = ({ drama, episodes, currentEpisode, onSelectEpisode, onClose, isOpen, isPremium = false }: EpisodePanelProps) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"desc" | "episodes">("episodes");
  const [selectedRange, setSelectedRange] = useState(0);

  const ranges = useMemo(() => {
    if (!episodes.length) return [];
    const r: { label: string; start: number; end: number }[] = [];
    for (let i = 0; i < episodes.length; i += 30) {
      const end = Math.min(i + 30, episodes.length);
      r.push({ label: `${i + 1}-${end}`, start: i, end });
    }
    return r;
  }, [episodes]);

  const visibleEpisodes = useMemo(() => {
    if (!ranges.length) return episodes;
    const range = ranges[selectedRange];
    return episodes.slice(range.start, range.end);
  }, [episodes, ranges, selectedRange]);

  if (!isOpen || !drama) return null;

  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      <div className="absolute inset-0 bg-overlay/60" />
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[75vh] bg-card rounded-t-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 px-4 pb-3">
          <img src={drama.cover} alt={drama.title} className="w-16 h-20 rounded-lg object-cover" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm line-clamp-1">{drama.title}</h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>--</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-primary" />
                <span>4.8</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {episodes.length} {t("episodes")}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-4">
          {(["desc", "episodes"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              {tab === "desc" ? t("description") : t("episodes")}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "desc" ? (
            <p className="text-sm text-muted-foreground leading-relaxed">{drama.description}</p>
          ) : (
            <>
              {/* Range selector */}
              {ranges.length > 1 && (
                <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
                  {ranges.map((r, i) => (
                    <button
                      key={r.label}
                      onClick={() => setSelectedRange(i)}
                      className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                        selectedRange === i
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
              {/* Episode grid */}
              <div className="grid grid-cols-6 gap-2">
                {visibleEpisodes.map((ep) => {
                  const isLocked = !isPremium && ep.index > FREE_EPISODE_LIMIT;
                  const isCurrent = ep.index === currentEpisode;
                  return (
                    <button
                      key={ep.id}
                      onClick={() => {
                        if (isLocked) {
                          alert(t("locked"));
                          return;
                        }
                        onSelectEpisode(ep.index);
                      }}
                      className={`relative aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                        isCurrent
                          ? "bg-primary text-primary-foreground ring-2 ring-primary"
                          : isLocked
                          ? "bg-muted/60 text-muted-foreground/50"
                          : "bg-muted text-foreground hover:bg-secondary"
                      }`}
                    >
                      {ep.index}
                      {isLocked && <Lock className="absolute top-1 right-1 w-2.5 h-2.5" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EpisodePanel;
