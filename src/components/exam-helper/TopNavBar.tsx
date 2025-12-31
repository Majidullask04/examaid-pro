import { ArrowLeft, History, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopNavBarProps {
  canGoBack: boolean;
  onBack: () => void;
  history: string[];
  onHistorySelect: (item: string) => void;
}

export function TopNavBar({ canGoBack, onBack, history, onHistorySelect }: TopNavBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 h-14 z-50 nav-glass">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-2">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={!canGoBack}
            className="h-9 px-3 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          {/* History dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-muted-foreground hover:text-foreground"
                disabled={history.length === 0}
              >
                <History className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">History</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 bg-card border-border">
              {history.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No recent questions
                </div>
              ) : (
                history.map((item, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={() => onHistorySelect(item)}
                    className="cursor-pointer truncate"
                  >
                    {item.length > 50 ? `${item.slice(0, 50)}...` : item}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center - Logo */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-foreground">ExamHelper</span>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <User className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
