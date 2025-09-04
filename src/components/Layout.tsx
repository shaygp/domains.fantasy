import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ConnectKitButton } from "connectkit";
import { useAccount, useBalance } from "wagmi";
import { 
  Terminal, 
  Gavel, 
  BarChart3, 
  Users, 
  Search,
  Database,
  Zap,
  Trophy,
  Plus
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });

  const navigation = [
    { name: "Live Auctions", href: "/auctions", icon: Gavel },
    { name: "My Leagues", href: "/leagues", icon: Trophy },
    { name: "My Team", href: "/team", icon: Users },
    { name: "Scout", href: "/draft", icon: Search },
    { name: "Leaderboard", href: "/leaderboard", icon: BarChart3 },
  ];

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  // Hide navigation on landing page
  const isLandingPage = location.pathname === "/";

  return (
    <div className="min-h-screen bg-background">
      {/* Matrix rain background effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-5">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="matrix-char absolute text-terminal-glow text-xs"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          >
            {Math.random() > 0.5 ? "1" : "0"}
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="glass border-b border-glass-border relative z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3 group">
              <div>
                <h1 className="text-xl font-bold text-primary">Fantasy Domains</h1>
                <p className="text-xs text-muted-foreground">Live Domain Auction Fantasy League</p>
              </div>
            </Link>

            
            {!isLandingPage && (
              <nav className="flex items-center space-x-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.name}
                      asChild
                      variant={isActive(item.href) ? "default" : "ghost"}
                      size="sm"
                      className={isActive(item.href) ? "bg-primary text-primary-foreground shadow-blue-glow" : ""}
                    >
                      <Link to={item.href} className="flex items-center space-x-2">
                        {item.icon && <item.icon className="w-4 h-4" />}
                        <span>{item.name}</span>
                      </Link>
                    </Button>
                  );
                })}
              </nav>
            )}

            <div className="flex items-center space-x-4">
              {!isLandingPage && isConnected && (
                <div className="glass px-3 py-1">
                  <span className="text-xs text-muted-foreground">Balance:</span>
                  <span className="ml-1 text-terminal-glow font-bold">
                    {balance ? `${parseFloat(balance.formatted).toFixed(3)} ${balance.symbol}` : '0.000 ETH'}
                  </span>
                </div>
              )}
              {!isLandingPage && (
                <Button asChild variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  <Link to="/create-league">
                    <Plus className="w-4 h-4 mr-1" />
                    Create League
                  </Link>
                </Button>
              )}
              <ConnectKitButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10">
        {children}
      </main>

      {/* Terminal scanline effect */}
      <div className="fixed top-0 left-0 w-full h-px bg-terminal-glow opacity-30 scanline pointer-events-none"></div>
    </div>
  );
};

export default Layout;