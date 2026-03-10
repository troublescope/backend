import { useState } from "react";
import { Crown, Check, Lock, Zap } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/contexts/AuthContext";
import { upgradeSubscription } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import DramaCard from "@/components/DramaCard";
import { useQuery } from "@tanstack/react-query";
import { getVipDramas } from "@/lib/api";
import type { Drama } from "@/types/drama";

const plans = [
  {
    id: "weekly",
    duration: "7 Hari",
    durationEn: "7 Days",
    price: "Rp 29.000",
    priceUsd: "$1.99",
    popular: false,
  },
  {
    id: "monthly",
    duration: "30 Hari",
    durationEn: "30 Days",
    price: "Rp 79.000",
    priceUsd: "$4.99",
    popular: true,
  },
  {
    id: "yearly",
    duration: "365 Hari",
    durationEn: "365 Days",
    price: "Rp 499.000",
    priceUsd: "$29.99",
    popular: false,
  },
];

const VIP = () => {
  const { t, lang } = useLanguage();
  const { isAuthenticated, user, login } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [isUpgrading, setIsUpgrading] = useState(false);

  const { data: dramas = [], isLoading } = useQuery<Drama[]>({
    queryKey: ["vip-dramas", lang],
    queryFn: getVipDramas,
    staleTime: 5 * 60 * 1000,
  });

  const isVip = user?.plan === "vip" || user?.plan === "premium";

  const handleUpgrade = async () => {
    if (!isAuthenticated) {
      await login();
      return;
    }
    setIsUpgrading(true);
    try {
      await upgradeSubscription(selectedPlan);
      alert(lang === "id" ? "Berhasil upgrade ke VIP!" : "Successfully upgraded to VIP!");
    } catch (err) {
      alert(lang === "id" ? "Gagal upgrade. Coba lagi." : "Upgrade failed. Try again.");
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">{t("vip")}</h1>
        </div>
      </div>

      {/* VIP Banner */}
      <div className="mx-4 rounded-2xl p-5 mb-4" style={{ background: "var(--gradient-primary)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Crown className="w-6 h-6 text-primary-foreground" />
          <h2 className="text-lg font-bold text-primary-foreground">VIP Premium</h2>
        </div>
        <p className="text-xs text-primary-foreground/80 mb-3">
          {lang === "id"
            ? "Tonton semua episode tanpa batas. Tanpa iklan."
            : "Watch all episodes without limits. Ad-free."}
        </p>
        <div className="flex gap-2">
          {[
            { icon: Zap, text: lang === "id" ? "Semua Episode" : "All Episodes" },
            { icon: Check, text: lang === "id" ? "Tanpa Iklan" : "No Ads" },
            { icon: Crown, text: lang === "id" ? "Kualitas HD" : "HD Quality" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1">
              <Icon className="w-3 h-3 text-primary-foreground" />
              <span className="text-[10px] text-primary-foreground/90">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plans */}
      {!isVip && (
        <div className="px-4 mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            {lang === "id" ? "Pilih Paket" : "Choose Plan"}
          </h3>
          <div className="flex gap-2">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`flex-1 rounded-xl p-3 border-2 transition-all relative ${
                  selectedPlan === plan.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[9px] font-bold rounded-full bg-primary text-primary-foreground">
                    {lang === "id" ? "Populer" : "Popular"}
                  </span>
                )}
                <p className="text-xs font-semibold text-foreground">
                  {lang === "id" ? plan.duration : plan.durationEn}
                </p>
                <p className="text-sm font-bold text-primary mt-1">
                  {lang === "id" ? plan.price : plan.priceUsd}
                </p>
              </button>
            ))}
          </div>
          <button
            onClick={handleUpgrade}
            disabled={isUpgrading}
            className="w-full mt-3 py-3 rounded-xl font-semibold text-sm text-primary-foreground transition-all disabled:opacity-50"
            style={{ background: "var(--gradient-primary)" }}
          >
            {isUpgrading
              ? "..."
              : isAuthenticated
              ? lang === "id"
                ? "Upgrade Sekarang"
                : "Upgrade Now"
              : lang === "id"
              ? "Masuk untuk Upgrade"
              : "Login to Upgrade"}
          </button>
        </div>
      )}

      {isVip && (
        <div className="mx-4 mb-4 p-3 rounded-xl bg-primary/10 flex items-center gap-2">
          <Check className="w-5 h-5 text-primary" />
          <p className="text-sm font-medium text-primary">
            {lang === "id" ? "Anda sudah VIP!" : "You are VIP!"}
          </p>
        </div>
      )}

      {/* VIP Dramas */}
      <div className="px-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          {lang === "id" ? "Konten VIP Eksklusif" : "Exclusive VIP Content"}
        </h3>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] rounded-lg bg-muted" />
                <div className="mt-2 h-3 w-2/3 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {dramas.map((drama) => (
              <DramaCard key={drama.id} drama={drama} tag="VIP" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VIP;
