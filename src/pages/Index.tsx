import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Target, Atom, BookOpen, FileText, ArrowRight, Sparkles } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container px-4 py-8 max-w-lg mx-auto">
        {/* Hero Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Study Smarter with ExamHelper
          </h1>
          <p className="text-muted-foreground">
            AI-powered exam preparation
          </p>
        </div>

        {/* 2x2 Feature Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="neumorphic p-5 rounded-2xl flex flex-col items-center text-center">
            <div className="p-3 rounded-full bg-primary/10 mb-3">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <p className="font-semibold text-sm text-foreground">High-Probability Questions</p>
          </div>
          
          <div className="neumorphic p-5 rounded-2xl flex flex-col items-center text-center">
            <div className="p-3 rounded-full bg-accent/10 mb-3">
              <Atom className="h-6 w-6 text-accent-foreground" />
            </div>
            <p className="font-semibold text-sm text-foreground">AI-Structured Answers</p>
          </div>
        </div>

        {/* Center Action Button - Glossy Blue Pill */}
        <div className="mb-8">
          <Link 
            to="/jntuh"
            className="block w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-5 px-6 rounded-full text-center font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5" />
              <span>Start JNTUH R22 Analysis</span>
              <ArrowRight className="h-5 w-5" />
            </div>
            <span className="text-xs opacity-80 mt-1 block">Learning Hub</span>
          </Link>
        </div>

        {/* Footer Vertical Cards */}
        <div className="space-y-4">
          <Link 
            to="/subjects"
            className="neumorphic p-5 rounded-2xl flex items-center gap-4 hover:scale-[1.01] transition-transform"
          >
            <div className="p-3 rounded-full bg-success/10">
              <BookOpen className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Notes & Video</p>
              <p className="text-sm text-muted-foreground">Browse study materials</p>
            </div>
          </Link>
          
          <Link 
            to="/subjects"
            className="neumorphic p-5 rounded-2xl flex items-center gap-4 hover:scale-[1.01] transition-transform"
          >
            <div className="p-3 rounded-full bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Resources</p>
              <p className="text-sm text-muted-foreground">Access all learning resources</p>
            </div>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
