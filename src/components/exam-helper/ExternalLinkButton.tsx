import { Youtube, ExternalLink } from "lucide-react";

interface ExternalLinkButtonProps {
  type: 'youtube' | 'article';
  url: string;
  title?: string;
  compact?: boolean;
}

export function ExternalLinkButton({ type, url, title, compact = false }: ExternalLinkButtonProps) {
  // Validate URL - ensure it's an actual video/article URL, not a search page
  const isValidUrl = (url: string): boolean => {
    if (type === 'youtube') {
      return url.includes('youtube.com/watch?v=') || url.includes('youtu.be/');
    }
    // For articles, accept any non-search URL
    return !url.includes('google.com/search') && !url.includes('youtube.com/results');
  };

  if (!isValidUrl(url)) {
    console.warn('Invalid URL for external link:', url);
  }

  if (type === 'youtube') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={compact ? "pill-youtube text-sm py-2" : "pill-youtube"}
      >
        <Youtube className={compact ? "h-4 w-4" : "h-5 w-5"} />
        <span>{title || "Watch on YouTube"}</span>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={compact ? "pill-article text-sm py-2" : "pill-article"}
    >
      <ExternalLink className={compact ? "h-4 w-4" : "h-5 w-5"} />
      <span>{title || "Open in Browser"}</span>
    </a>
  );
}
