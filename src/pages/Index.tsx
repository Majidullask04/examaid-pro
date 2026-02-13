import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Target, Atom, BookOpen, GraduationCap, ArrowRight, Sparkles } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col bg-background grid-bg selection:bg-primary/20 selection:text-primary">
      <Header />

      <main className="flex-1 container px-4 py-8 md:py-16 max-w-6xl mx-auto flex flex-col justify-center min-h-[80vh]">
        {/* Hero Header */}
        <div className="text-center mb-12 space-y-6 blur-in">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
              <Logo showText={false} iconClassName="h-20 w-20 p-4 bg-background/50 backdrop-blur-xl border border-white/10 shadow-2xl" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-white/5 backdrop-blur-sm text-sm font-medium text-muted-foreground mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            AI-Powered Exam Prep
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground text-glow max-w-4xl mx-auto">
            Study Smarter with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">ExamHelper</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
            Master your JNTUH R22 exams with AI-structured answers, high-probability questions, and curated resources.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 max-w-4xl mx-auto w-full px-2">
          <div className="card-modern p-6 md:p-8 flex flex-col items-center text-center group blur-in blur-in-delay-1">
            <div className="p-4 rounded-2xl bg-primary/10 mb-5 group-hover:scale-110 transition-transform duration-300">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">High-Probability Questions</h3>
            <p className="text-muted-foreground">Focus on what matters most with AI-predicted important questions.</p>
          </div>

          <div className="card-modern p-6 md:p-8 flex flex-col items-center text-center group blur-in blur-in-delay-2">
            <div className="p-4 rounded-2xl bg-accent/10 mb-5 group-hover:scale-110 transition-transform duration-300">
              <Atom className="h-8 w-8 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">AI-Structured Answers</h3>
            <p className="text-muted-foreground">Get perfectly formatted answers optimized for exam scoring.</p>
          </div>
        </div>

        {/* Center Action Button - Glow Effect */}
        <div className="mb-20 text-center blur-in blur-in-delay-3 px-4">
          <Link
            to="/jntuh"
            className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
          >
            <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity blur-md"></span>
            <Sparkles className="h-5 w-5" />
            <span>Start JNTUH R22 Analysis</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="mt-6 text-sm text-muted-foreground">
            Join thousands of students aceing their exams
          </p>
        </div>

        {/* Footer Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full blur-in blur-in-delay-4 px-2">
          <Link
            to="/subjects"
            className="glass-panel p-5 rounded-2xl flex items-center gap-4 hover:bg-card/50 transition-colors group"
          >
            <div className="p-3 rounded-xl bg-success/10 group-hover:bg-success/20 transition-colors">
              <BookOpen className="h-6 w-6 text-success" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Notes & Video</p>
              <p className="text-xs text-muted-foreground">Browse study materials</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
          </Link>

          <Link
            to="/subjects?tab=search"
            className="glass-panel p-5 rounded-2xl flex items-center gap-4 hover:bg-card/50 transition-colors group"
          >
            <div className="p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
              <GraduationCap className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Resource Finder</p>
              <p className="text-xs text-muted-foreground">Find videos & articles</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
