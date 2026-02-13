import { useState, useRef, useEffect } from 'react';
import { Send, Star, Bot, User, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStarred?: boolean;
}

interface AIBrowserProps {
  userId: string | null;
}

export function AIBrowser({ userId }: AIBrowserProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Fetch already starred items on mount
  useEffect(() => {
    if (userId) {
      fetchStarredItems();
    }
  }, [userId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const fetchStarredItems = async () => {
    try {
      const { data, error } = await supabase
        .from('starred_items')
        .select('metadata')
        .eq('item_type', 'ai_answer');

      if (error) throw error;

      const ids = new Set<string>();
      data?.forEach(item => {
        const metadata = item.metadata as { messageId?: string };
        if (metadata?.messageId) {
          ids.add(metadata.messageId);
        }
      });
      setStarredIds(ids);
    } catch (error) {
      console.error('Error fetching starred items:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create placeholder for assistant response
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      // Build conversation history (excluding the placeholder)
      const history = messages.map(m => ({ role: m.role, content: m.content }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat-solver`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            question: userMessage.content,
            messages: history,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = errorData.error || `Request failed: ${response.status}`;

        // Handle specific error cases for better user feedback
        if (errorMessage.includes('OpenRouter authentication failed')) {
          errorMessage = 'Service configuration error: API Key invalid or missing. Please contact administrator.';
        } else if (errorMessage.includes('Rate limit exceeded')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (errorMessage.includes('credits exhausted')) {
          errorMessage = 'Service temporarily unavailable (Quota exceeded).';
        }

        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        // Process line-by-line
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          } catch {
            // Incomplete JSON, put back and wait for more
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          } catch { /* ignore */ }
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);

      // Update the assistant message to show the error
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
              ...m,
              content: `⚠️ **Error:** ${error instanceof Error ? error.message : 'Failed to get response'}. \n\nPlease try again later.`
            }
            : m
        )
      );

      toast({
        title: 'Connection encountered an issue',
        description: error instanceof Error ? error.message : 'Failed to get AI response',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStar = async (message: Message) => {
    if (!userId) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to save answers.',
        variant: 'destructive',
      });
      return;
    }

    const isCurrentlyStarred = starredIds.has(message.id);

    try {
      if (isCurrentlyStarred) {
        // Remove from starred
        const { error } = await supabase
          .from('starred_items')
          .delete()
          .eq('user_id', userId)
          .eq('item_type', 'ai_answer')
          .contains('metadata', { messageId: message.id });

        if (error) throw error;

        setStarredIds(prev => {
          const next = new Set(prev);
          next.delete(message.id);
          return next;
        });
        toast({ title: 'Removed from starred' });
      } else {
        // Find the question for this answer
        const msgIndex = messages.findIndex(m => m.id === message.id);
        const questionMsg = msgIndex > 0 ? messages[msgIndex - 1] : null;
        const title = questionMsg?.content?.slice(0, 100) || 'AI Answer';

        const { error } = await supabase
          .from('starred_items')
          .insert({
            user_id: userId,
            item_type: 'ai_answer',
            title,
            content: message.content,
            topic: title,
            metadata: { messageId: message.id },
          });

        if (error) throw error;

        setStarredIds(prev => new Set(prev).add(message.id));
        toast({ title: 'Saved to starred items!' });
      }
    } catch (error) {
      console.error('Error toggling star:', error);
      toast({
        title: 'Error',
        description: 'Failed to update starred items',
        variant: 'destructive',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-h-[70vh]">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-2">
          <Bot className="h-4 w-4" />
          AI Exam Solver
        </div>
        <p className="text-sm text-muted-foreground">
          Ask any question, get exam-ready answers with proper structure
        </p>
      </div>

      {/* Messages Area */}
      <Card className="flex-1 mb-4 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ask your exam question</h3>
              <p className="text-muted-foreground max-w-md">
                I'll provide answers formatted for your exam answer sheet with definitions, key points, and diagrams.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {[
                  'What is process scheduling?',
                  'Explain normalization in DBMS',
                  'Define OSI model layers',
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}

                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground px-4 py-2'
                        : 'bg-muted/50 px-4 py-3'
                    )}
                  >
                    {message.role === 'user' ? (
                      <p>{message.content}</p>
                    ) : (
                      <div className="relative">
                        {message.content ? (
                          <>
                            <MarkdownRenderer content={message.content} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-0 right-0 h-8 w-8"
                              onClick={() => toggleStar(message)}
                            >
                              <Star
                                className={cn(
                                  'h-4 w-4',
                                  starredIds.has(message.id)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground'
                                )}
                              />
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Thinking...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Input Area */}
      <div className="flex gap-2">
        <Textarea
          ref={inputRef}
          placeholder="Ask your exam question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[60px] max-h-[120px] resize-none"
          disabled={isLoading}
        />
        <Button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className="h-auto"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {!userId && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          Sign in to save your favorite answers
        </div>
      )}
    </div>
  );
}
