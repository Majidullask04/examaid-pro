import { useState, useRef, useEffect } from "react";
import { Mic, ArrowRight, Loader2 } from "lucide-react";

// Speech Recognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: () => void;
  onend: () => void;
}

interface IWindow extends Window {
  SpeechRecognition: new () => SpeechRecognitionInstance;
  webkitSpeechRecognition: new () => SpeechRecognitionInstance;
}

interface AskModeProps {
  syllabusKeywords: string[];
  isLoading: boolean;
  onSubmit: (query: string) => void;
}

export function AskMode({ syllabusKeywords, isLoading, onSubmit }: AskModeProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as unknown as IWindow).SpeechRecognition || (window as unknown as IWindow).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Handle autocomplete suggestions
  useEffect(() => {
    if (query.length > 2 && syllabusKeywords.length > 0) {
      const filtered = syllabusKeywords
        .filter(kw => kw.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [query, syllabusKeywords]);

  // Toggle voice input
  const toggleVoice = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Handle form submit
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query.trim());
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] px-4">
      <div className="w-full max-w-2xl blur-in">
        {/* Title */}
        <div className="text-center mb-8 blur-in blur-in-delay-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            I need help with…
          </h1>
          <p className="text-muted-foreground">
            Type your subject, topic, or question
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="relative blur-in blur-in-delay-2">
          <div className={`relative rounded-2xl ${isLoading ? 'input-dark-pulse' : ''}`}>
            {/* Voice button */}
            <button
              type="button"
              onClick={toggleVoice}
              className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${isListening
                ? 'bg-destructive text-destructive-foreground animate-pulse'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              disabled={isLoading}
            >
              <Mic className="h-5 w-5" />
            </button>

            {/* Input field */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type or say your doubt..."
              className="w-full h-16 pl-14 pr-14 input-dark text-lg"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  handleSubmit();
                }
              }}
            />

            {/* Submit button */}
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
              disabled={!query.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Autocomplete suggestions */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl overflow-hidden z-10">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-muted transition-colors text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Hint */}
        <p className="text-center text-sm text-muted-foreground mt-4 blur-in blur-in-delay-3">
          ⏎ Press Enter or tap arrow to start
        </p>
      </div>
    </div>
  );
}
