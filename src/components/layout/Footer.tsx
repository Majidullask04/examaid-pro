import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              <span>ExamHelper</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Your AI-powered companion for exam preparation. Study smarter, not harder.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/subjects" className="hover:text-foreground transition-colors">Browse Subjects</Link></li>
              <li><Link to="/auth" className="hover:text-foreground transition-colors">Sign In</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Features</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>High-Probability Questions</li>
              <li>AI Explanations</li>
              <li>Unit Summaries</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Help Center</li>
              <li>Contact Us</li>
              <li>Privacy Policy</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ExamHelper. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
