import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Crown } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  getCategoryFeed,
  getForYouFeed,
  getHomeData,
  getNewestFeed,
  getTrendingFeed,
  type FeedResponse,
  type HomeResponse,
} from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import DramaCard from "@/components/DramaCard";
import type { Drama, FeedCategory } from "@/types/drama";

const TABS = [
  { key: "forYou", label: "forYouTab" },
  { key: "newest", label: "latest" },
  { key: "trending", label: "ranking" },
  { key: "category", label: "category" },
] as const;

const PAGE_SIZE = 20;

const Home = () => {
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("forYou");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ["home-feed", lang, activeTab, selectedCategory],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      if (activeTab === "category" && selectedCategory) {
        return getCategoryFeed(selectedCategory, pageParam, PAGE_SIZE);
      }

      if (activeTab === "trending") {
        return getTrendingFeed(pageParam, PAGE_SIZE);
      }

      if (activeTab === "newest") {
        return getNewestFeed(pageParam, PAGE_SIZE);
      }

      if (pageParam === 1) {
        return getHomeData(pageParam, PAGE_SIZE);
      }

      return getForYouFeed(pageParam, PAGE_SIZE);
    },
    getNextPageParam: (lastPage, allPages) => {
      const hasMore = "has_more" in lastPage ? lastPage.has_more : false;
      return hasMore ? allPages.length + 1 : undefined;
    },
  });

  const categories = useMemo<FeedCategory[]>(() => {
    const firstPage = data?.pages[0];
    if (!firstPage || !("categories" in firstPage) || !firstPage.categories) {
      return [];
    }
    return firstPage.categories;
  }, [data]);

  useEffect(() => {
    if (activeTab === "category" && !selectedCategory && categories.length) {
      setSelectedCategory(categories[0].id);
    }
  }, [activeTab, categories, selectedCategory]);

  const allDramas = useMemo<Drama[]>(() => {
    const pages = data?.pages || [];
    const merged = pages.flatMap((page) => {
      if ("forYou" in page || "trending" in page || "newest" in page) {
        return page[activeTab] || page.forYou || [];
      }

      if ("items" in page) {
        return page.items;
      }

      return (page as FeedResponse).items || [];
    });

    return Array.from(new Map(merged.map((drama) => [drama.id, drama])).values());
  }, [activeTab, data]);

  const filteredDramas = useMemo(() => {
    if (!searchQuery) {
      return allDramas;
    }

    const query = searchQuery.toLowerCase();
    return allDramas.filter(
      (drama) =>
        drama.title.toLowerCase().includes(query) ||
        drama.description.toLowerCase().includes(query) ||
        drama.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [allDramas, searchQuery]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, filteredDramas.length]);

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("search")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-9 w-full rounded-full bg-muted pl-9 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={() => navigate("/vip")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10"
          >
            <Crown className="h-4 w-4 text-primary" />
          </button>
        </div>

        <div className="mt-3 flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground"
              }`}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>

        {activeTab === "category" && categories.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`rounded-full px-3 py-1 text-xs whitespace-nowrap ${
                  selectedCategory === category.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-2">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="aspect-[3/4] rounded-lg bg-muted" />
                <div className="mt-2 h-3 w-2/3 rounded bg-muted" />
                <div className="mt-1 h-2 w-1/2 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {filteredDramas.map((drama, index) => (
                <DramaCard
                  key={drama.id}
                  drama={drama}
                  tag={drama.tags[0] || (index < 3 ? t("popular") : undefined)}
                />
              ))}
            </div>

            {isFetchingNextPage && (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading more...</div>
            )}

            {!hasNextPage && filteredDramas.length > 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">No more content</div>
            )}

            <div ref={sentinelRef} className="h-4" />
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
