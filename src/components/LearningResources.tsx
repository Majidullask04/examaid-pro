import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Video, 
  FileText, 
  ExternalLink, 
  Lightbulb, 
  Search, 
  Loader2,
  Youtube,
  BookOpen,
  X
} from 'lucide-react';

// No helper function needed - using pure anchor tags with target="_blank"

interface ResourceItem {
  title: string;
  url: string;
  source: string;
  description?: string;
}

interface ResourceResult {
  videos: ResourceItem[];
  articles: ResourceItem[];
  learningPath: string;
  citations: string[];
}

interface LearningResourcesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: string;
  context?: string;
}

export function LearningResources({ open, onOpenChange, topic, context }: LearningResourcesProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [resources, setResources] = useState<ResourceResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!topic.trim()) {
      toast.error('No topic provided');
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('find-resources', {
        body: { topic, context }
      });

      if (error) {
        console.error('Error fetching resources:', error);
        toast.error('Failed to find resources. Please try again.');
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setResources(data);
      toast.success('Found learning resources!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to search for resources');
    } finally {
      setIsLoading(false);
    }
  };

  const getSourceIcon = (source: string) => {
    if (source.toLowerCase().includes('youtube')) {
      return <Youtube className="h-4 w-4 text-destructive" />;
    }
    return <FileText className="h-4 w-4 text-primary" />;
  };

  const getSourceBadgeClass = (source: string) => {
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes('youtube')) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (sourceLower.includes('geeksforgeeks')) return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (sourceLower.includes('tutorialspoint')) return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    if (sourceLower.includes('medium')) return 'bg-foreground/10 text-foreground border-border';
    return 'bg-primary/10 text-primary border-primary/20';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <div className="space-y-1.5 text-center sm:text-left">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Learning Resources
          </h2>
          <p className="text-sm text-muted-foreground">
            Find videos and articles for: <span className="font-medium text-foreground">{topic}</span>
          </p>
        </div>

        <div className="mt-6">
          {!hasSearched ? (
            <div className="text-center py-8 space-y-4">
              <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Ready to find resources?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Click below to search for YouTube videos and tutorial articles
                </p>
              </div>
              <Button onClick={handleSearch} className="gap-2">
                <Search className="h-4 w-4" />
                Search Learning Resources
              </Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching the web for the best resources...
              </div>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : resources ? (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-6 pr-4">
                {/* Video Resources */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Video className="h-5 w-5 text-destructive" />
                    <h3 className="font-semibold">📹 Video Resources</h3>
                    <Badge variant="outline" className="text-xs">
                      {resources.videos.length} found
                    </Badge>
                  </div>
                  
                  {resources.videos.length > 0 ? (
                    <div className="space-y-2">
                      {resources.videos.map((video, index) => (
                        <Card key={index} className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <a 
                                  href={video.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-sm hover:text-primary transition-colors line-clamp-2 text-left block"
                                >
                                  {video.title}
                                </a>
                                <div className="flex items-center gap-2 mt-1">
                                  {getSourceIcon(video.source)}
                                  <Badge variant="outline" className={`text-xs ${getSourceBadgeClass(video.source)}`}>
                                    {video.source}
                                  </Badge>
                                </div>
                                {video.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {video.description}
                                  </p>
                                )}
                              </div>
                              <a
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 p-2 hover:bg-muted rounded-md transition-colors"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No videos found</p>
                  )}
                </div>

                <Separator />

                {/* Article Resources */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">📄 Article Resources</h3>
                    <Badge variant="outline" className="text-xs">
                      {resources.articles.length} found
                    </Badge>
                  </div>
                  
                  {resources.articles.length > 0 ? (
                    <div className="space-y-2">
                      {resources.articles.map((article, index) => (
                        <Card key={index} className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <a 
                                  href={article.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-sm hover:text-primary transition-colors line-clamp-2 text-left block"
                                >
                                  {article.title}
                                </a>
                                <div className="flex items-center gap-2 mt-1">
                                  {getSourceIcon(article.source)}
                                  <Badge variant="outline" className={`text-xs ${getSourceBadgeClass(article.source)}`}>
                                    {article.source}
                                  </Badge>
                                </div>
                                {article.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {article.description}
                                  </p>
                                )}
                              </div>
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 p-2 hover:bg-muted rounded-md transition-colors"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No articles found</p>
                  )}
                </div>

                <Separator />

                {/* Learning Path */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    <h3 className="font-semibold">💡 Recommended Learning Path</h3>
                  </div>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm">
                          {resources.learningPath}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Search Again Button */}
                <div className="pt-4 pb-8">
                  <Button 
                    variant="outline" 
                    onClick={handleSearch} 
                    className="w-full gap-2"
                    disabled={isLoading}
                  >
                    <Search className="h-4 w-4" />
                    Search Again
                  </Button>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No resources found. Try again.</p>
              <Button variant="outline" onClick={handleSearch} className="mt-4 gap-2">
                <Search className="h-4 w-4" />
                Retry Search
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
