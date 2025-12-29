import { ExternalLink, Youtube, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResourceButtonProps {
  href: string;
  type: 'video' | 'notes';
  label?: string;
  className?: string;
}

export function ResourceButton({ href, type, label, className }: ResourceButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "btn-resource inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-card min-h-[48px] transition-all hover:scale-[1.02]",
        "neumorphic-sm text-foreground font-medium",
        className
      )}
    >
      {type === 'video' ? (
        <>
          <div className="p-2 rounded-full bg-destructive/10">
            <Youtube className="h-5 w-5 text-destructive" />
          </div>
          <span className="flex-1">{label || 'Watch on YouTube'}</span>
        </>
      ) : (
        <>
          <div className="p-2 rounded-full bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <span className="flex-1">{label || 'Read Notes'}</span>
        </>
      )}
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}
