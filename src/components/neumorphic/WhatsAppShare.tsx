import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface WhatsAppShareProps {
  subject: string;
  summary: string;
  className?: string;
}

export function WhatsAppShare({ subject, summary, className }: WhatsAppShareProps) {
  const handleShare = () => {
    // Create a shareable message
    const message = `📚 JNTUH Exam Cheat Sheet - ${subject}\n\n${summary.slice(0, 500)}${summary.length > 500 ? '...' : ''}\n\n✨ Created with ExamHelper`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    toast.success("Opening WhatsApp to share!");
  };

  return (
    <button
      onClick={handleShare}
      className={cn(
        "fab-neumorphic bg-success text-success-foreground hover:scale-110 transition-transform",
        className
      )}
      aria-label="Share on WhatsApp"
    >
      <Share2 className="h-6 w-6" />
    </button>
  );
}
