import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import New from "./pages/New";
import Profile from "./pages/Profile";
import Post from "./pages/Post";
import Analytics from "./pages/Analytics";
import ApiKeys from "./pages/ApiKeys";
import Developers from "./pages/Developers";
import Explore from "./pages/Explore";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          {/* Add specific routes BEFORE the username route */}
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />
          <Route path="/features" element={<Index />} />
          <Route path="/pricing" element={<Index />} />
          <Route path="/docs" element={<Index />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new" element={<New />} />
          <Route path="/edit/:id" element={<New />} />
          <Route path="/dashboard/analytics" element={<Analytics />} />
          <Route path="/dashboard/api-keys" element={<ApiKeys />} />
          <Route path="/developers" element={<Developers />} />
          {/* Username routes should come LAST to avoid conflicts */}
          <Route path="/:username" element={<Profile />} />
          <Route path="/:username/:slug" element={<Post />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
