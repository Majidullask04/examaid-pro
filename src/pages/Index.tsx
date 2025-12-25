import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BookOpen, Brain, Target, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';

const features = [
  {
    icon: Target,
    title: 'High-Probability Questions',
    description: 'Focus on questions most likely to appear in your exams, prioritized by importance.',
  },
  {
    icon: Brain,
    title: 'AI-Powered Explanations',
    description: 'Get instant, clear explanations for any question using advanced AI technology.',
  },
  {
    icon: Sparkles,
    title: 'Smart Revision Summaries',
    description: 'Generate concise unit summaries to optimize your study time.',
  },
];

const benefits = [
  'Organized by subjects and units',
  'Questions ranked by exam probability',
  'Instant AI explanations',
  'Deep concept breakdowns',
  'Mobile-friendly interface',
  'Regular content updates',
];

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="container relative">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                AI-Powered Exam Preparation
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                Study Smarter with{' '}
                <span className="text-primary">ExamHelper</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Access high-probability exam questions, get AI-powered explanations, 
                and generate smart revision summaries. Your ultimate companion for exam success.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button size="lg" asChild className="gap-2 w-full sm:w-auto">
                  <Link to="/subjects">
                    Start Learning
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                  <Link to="/auth">Create Account</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-card">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything You Need to Excel
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Powerful tools designed to help you study more effectively and ace your exams.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="relative p-6 rounded-xl border border-border bg-background hover:shadow-lg transition-all duration-300"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-24">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Why Choose ExamHelper?
                </h2>
                <p className="text-muted-foreground mb-8">
                  We've built the ultimate exam preparation platform with features that 
                  actually help you learn and retain information effectively.
                </p>
                <ul className="space-y-4">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="relative">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 p-8 flex items-center justify-center">
                  <BookOpen className="h-32 w-32 text-primary/40" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Ace Your Exams?
            </h2>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">
              Join thousands of students who are already using ExamHelper to prepare smarter.
            </p>
            <Button size="lg" variant="secondary" asChild className="gap-2">
              <Link to="/subjects">
                Browse Subjects
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
