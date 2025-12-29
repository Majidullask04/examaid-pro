import { useState, useCallback } from 'react';
import { ExternalLink, Youtube, FileText, Lightbulb, BookmarkPlus, Loader2, Star, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ResourceItem {
  title: string;
  url: string;
  source: string;
  description?: string;
}

interface ResourceResultsProps {
  topic: string;
  videos: ResourceItem[];
  articles: ResourceItem[];
  learningPath: string;
  onSaveToNotes?: () => void;
  isSaving?: boolean;
  userId?: string | null;
}

export function ResourceResults({ 
  topic, 
  videos, 
  articles, 
  learningPath, 
  onSaveToNotes,
  isSaving,
  userId
}: ResourceResultsProps) {
  const [starredResources, setStarredResources] = useState<Set<string>>(new Set());
  const [starringId, setStarringId] = useState<string | null>(null);
  const { toast } = useToast();

  const copyLink = useCallback((url: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied!' });
  }, [toast]);

  const getSourceIcon = (source: string) => {
    if (source.toLowerCase().includes('youtube')) {
      return <Youtube className="h-4 w-4 text-destructive" />;
    }
    return <FileText className="h-4 w-4 text-primary" />;
  };

  const getSourceBadgeVariant = (source: string): "default" | "secondary" | "destructive" | "outline" => {
    if (source.toLowerCase().includes('youtube')) return 'destructive';
    if (source.toLowerCase().includes('geeksforgeeks')) return 'default';
    return 'secondary';
  };

  const toggleStarResource = async (resource: ResourceItem, type: 'video' | 'article', e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!userId) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to save resources.',
        variant: 'destructive',
      });
      return;
    }

    const resourceId = `${type}-${resource.url}`;
    const isStarred = starredResources.has(resourceId);
    setStarringId(resourceId);

    try {
      if (isStarred) {
        const { error } = await supabase
          .from('starred_items')
          .delete()
          .eq('user_id', userId)
          .eq('item_type', 'resource')
          .contains('metadata', { url: resource.url });

        if (error) throw error;

        setStarredResources(prev => {
          const next = new Set(prev);
          next.delete(resourceId);
          return next;
        });
        toast({ title: 'Removed from starred' });
      } else {
        const { error } = await supabase
          .from('starred_items')
          .insert({
            user_id: userId,
            item_type: 'resource',
            title: resource.title,
            content: resource.description || resource.title,
            topic: topic,
            metadata: { 
              url: resource.url, 
              source: resource.source,
              type: type 
            },
          });

        if (error) throw error;

        setStarredResources(prev => new Set(prev).add(resourceId));
        toast({ title: 'Saved to starred items!' });
      }
    } catch (error) {
      console.error('Error toggling star:', error);
      toast({
        title: 'Error',
        description: 'Failed to update starred items',
        variant: 'destructive',
      });
    } finally {
      setStarringId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Resources for: "{topic}"</h2>
          <p className="text-sm text-muted-foreground">
            Found {videos.length} videos, {articles.length} articles
          </p>
        </div>
        {onSaveToNotes && (
          <Button onClick={onSaveToNotes} disabled={isSaving} variant="outline">
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <BookmarkPlus className="h-4 w-4 mr-2" />
            )}
            Save to Notes
          </Button>
        )}
      </div>

      <Separator />

      {/* Video Resources - Horizontal Carousel */}
      {videos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold">Video Resources</h3>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {videos.map((video, index) => {
                const resourceId = `video-${video.url}`;
                const isStarred = starredResources.has(resourceId);
                
                return (
                  <Card 
                    key={index} 
                    className="w-[280px] flex-shrink-0 hover:shadow-md transition-shadow group"
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant={getSourceBadgeVariant(video.source)} className="text-xs">
                          {video.source}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => toggleStarResource(video, 'video', e)}
                            disabled={starringId === resourceId}
                          >
                            {starringId === resourceId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Star 
                                className={cn(
                                  'h-3 w-3',
                                  isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                                )} 
                              />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => copyLink(video.url, e)}
                            title="Copy link"
                          >
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                      <h4 className="font-medium text-sm line-clamp-2 whitespace-normal">
                        {video.title}
                      </h4>
                      {video.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 whitespace-normal">
                          {video.description}
                        </p>
                      )}
                      {/* Pure anchor tag - opens in external browser */}
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-resource inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open on YouTube
                      </a>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Article Resources - List */}
      {articles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Article Resources</h3>
          </div>
          <div className="grid gap-3">
            {articles.map((article, index) => {
              const resourceId = `article-${article.url}`;
              const isStarred = starredResources.has(resourceId);
              
              return (
                <Card 
                  key={index} 
                  className="hover:shadow-md transition-shadow group"
                >
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex-shrink-0 mt-0.5">
                        {getSourceIcon(article.source)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm line-clamp-2">{article.title}</h4>
                        {article.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {article.description}
                          </p>
                        )}
                        {/* Pure anchor tag - opens in external browser */}
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-resource inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open article
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => toggleStarResource(article, 'article', e)}
                        disabled={starringId === resourceId}
                      >
                        {starringId === resourceId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Star 
                            className={cn(
                              'h-4 w-4',
                              isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                            )} 
                          />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => copyLink(article.url, e)}
                        title="Copy link"
                      >
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Badge variant={getSourceBadgeVariant(article.source)} className="text-xs">
                        {article.source}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Learning Path */}
      {learningPath && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Recommended Learning Path
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {learningPath}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
