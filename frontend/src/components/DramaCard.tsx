import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Eye } from "lucide-react";
import type { Drama } from "@/types/drama";

interface DramaCardProps {
  drama: Drama;
  tag?: string;
}

const DramaCard = memo(({ drama, tag }: DramaCardProps) => {
  const navigate = useNavigate();

  return (
    <div
      className="relative cursor-pointer group"
      onClick={() => navigate(`/watch/${drama.id}/1`)}
    >
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
        <img
          src={drama.cover}
          alt={drama.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Play overlay */}
        <div className="absolute inset-0 bg-overlay/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center">
            <Play className="w-5 h-5 text-primary-foreground fill-current" />
          </div>
        </div>
        {/* Tag */}
        {tag && (
          <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-semibold rounded bg-tag text-tag-foreground">
            {tag}
          </span>
        )}
        {/* View count */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] font-medium text-primary-foreground drop-shadow-md">
          <Eye className="w-3 h-3" />
          <span>{drama.playCount}</span>
        </div>
      </div>
      <h3 className="mt-1.5 text-xs font-medium text-foreground line-clamp-1">{drama.title}</h3>
      <p className="text-[10px] text-muted-foreground line-clamp-1">{drama.description}</p>
    </div>
  );
});

DramaCard.displayName = "DramaCard";
export default DramaCard;
