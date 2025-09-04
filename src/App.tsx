import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Web3Provider } from "./services/web3Provider";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import LiveAuctions from "./pages/LiveAuctions";
import DraftRoom from "./pages/DraftRoom";
import Leaderboard from "./pages/Leaderboard";
import MyTeam from "./pages/MyTeam";
import CreateLeague from "./pages/CreateLeague";
import MyLeagues from "./pages/MyLeagues";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <Web3Provider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auctions" element={<LiveAuctions />} />
              <Route path="/leagues" element={<MyLeagues />} />
              <Route path="/create-league" element={<CreateLeague />} />
              <Route path="/team" element={<MyTeam />} />
              <Route path="/draft" element={<DraftRoom />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </Web3Provider>
);

export default App;
