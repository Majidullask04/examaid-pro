import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { History, Trash2, Clock, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface HistoryItem {
  id: string;
  department: string;
  subject: string;
  result: string;
  created_at: string;
}

interface AnalysisHistoryProps {
  sessionId: string;
  onLoadHistory: (item: HistoryItem) => void;
}

export function AnalysisHistory({ sessionId, onLoadHistory }: AnalysisHistoryProps) {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch by user_id if logged in, otherwise by session_id
      let query = supabase
        .from('jntuh_analysis_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (user?.id) {
        query = query.eq('user_id', user.id);
      } else {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      // Fallback to localStorage
      const localHistory = localStorage.getItem('jntuh_history');
      if (localHistory) {
        setHistory(JSON.parse(localHistory));
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, sessionId]);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, fetchHistory]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('jntuh_analysis_history')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setHistory(prev => prev.filter(item => item.id !== id));
      toast.success('Analysis deleted');
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Failed to delete');
    }
  };

  const handleLoad = (item: HistoryItem) => {
    onLoadHistory(item);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          History
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Analysis History
          </SheetTitle>
          <SheetDescription>
            View and load your previous JNTUH exam analyses
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mb-2 opacity-50" />
              <p>No analysis history yet</p>
              <p className="text-sm">Your analyses will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
                  onClick={() => handleLoad(item)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {item.department}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="font-medium text-sm truncate">{item.subject}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {item.result.substring(0, 100)}...
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
