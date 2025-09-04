import { ReactNode } from "react";
import { Minimize2, Maximize2, X } from "lucide-react";

interface TerminalWindowProps {
  title: string;
  children: ReactNode;
  className?: string;
}

const TerminalWindow = ({ title, children, className = "" }: TerminalWindowProps) => {
  return (
    <div className={`glass overflow-hidden ${className}`}>
      {/* Terminal header */}
      <div className="bg-muted/20 px-4 py-2 border-b border-glass-border flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1">
            <div className="w-3 h-3 rounded-full bg-destructive"></div>
            <div className="w-3 h-3 rounded-full bg-warning"></div>
            <div className="w-3 h-3 rounded-full bg-secondary"></div>
          </div>
          <span className="text-sm font-mono text-foreground">{title}</span>
        </div>
        <div className="flex items-center space-x-1 text-muted-foreground">
          <Minimize2 className="w-4 h-4 hover:text-foreground cursor-pointer" />
          <Maximize2 className="w-4 h-4 hover:text-foreground cursor-pointer" />
          <X className="w-4 h-4 hover:text-destructive cursor-pointer" />
        </div>
      </div>
      
      {/* Terminal content */}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

export default TerminalWindow;