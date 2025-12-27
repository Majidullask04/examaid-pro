import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ExternalLink, Youtube, FileText } from "lucide-react";
import { toast } from "sonner";

interface QuickResourceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: string;
}

export function QuickResourceSheet({ open, onOpenChange, topic }: QuickResourceSheetProps) {
  const encodedTopic = encodeURIComponent(`${topic} JNTUH tutorial`);
  
  const handleOpenLink = (url: string, type: string) => {
    // Force open in external browser
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer,menubar=yes,toolbar=yes,location=yes');
    
    if (newWindow) {
      newWindow.focus();
      onOpenChange(false);
    } else {
      // Fallback: Copy to clipboard if popup was blocked
      navigator.clipboard.writeText(url).then(() => {
        toast.success(`${type} link copied! Paste in your browser.`, { duration: 5000 });
      }).catch(() => {
        toast.info(`Open: ${url}`, { duration: 10000 });
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[20px] pb-safe">
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg">Learn: {topic}</SheetTitle>
        </SheetHeader>
        
        <div className="grid grid-cols-1 gap-4 mt-6 pb-4">
          {/* YouTube Button */}
          <button
            onClick={() => handleOpenLink(`https://www.youtube.com/results?search_query=${encodedTopic}`, "YouTube")}
            className="neumorphic flex items-center justify-between p-5 hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <Youtube className="h-6 w-6 text-destructive" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Watch Video</p>
                <p className="text-sm text-muted-foreground">Open YouTube tutorials</p>
              </div>
            </div>
            <ExternalLink className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Web Notes Button */}
          <button
            onClick={() => handleOpenLink(`https://www.google.com/search?q=${encodedTopic}+notes+geeksforgeeks`, "Notes")}
            className="neumorphic flex items-center justify-between p-5 hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Read Notes</p>
                <p className="text-sm text-muted-foreground">Open web articles & notes</p>
              </div>
            </div>
            <ExternalLink className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
