import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { applyTheme } from "@/lib/theme";
import { AuthProvider } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";

const Home = lazy(() => import("@/pages/Home"));
const ForYou = lazy(() => import("@/pages/ForYou"));
const VIP = lazy(() => import("@/pages/VIP"));
const MyList = lazy(() => import("@/pages/MyList"));
const Profile = lazy(() => import("@/pages/Profile"));
const Watch = lazy(() => import("@/pages/Watch"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const RouteFallback = () => <div className="min-h-screen bg-background pb-16 animate-pulse" />;

const App = () => {
  useEffect(() => {
    applyTheme();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/for-you" element={<ForYou />} />
                <Route path="/vip" element={<VIP />} />
                <Route path="/my-list" element={<MyList />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/watch/:id/:episode" element={<Watch />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <BottomNav />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
