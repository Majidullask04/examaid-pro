import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Target, Atom, BookOpen, GraduationCap, ArrowRight, Sparkles, Bot, Clock3, Layers3 } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 selection:bg-primary/20 selection:text-primary overflow-hidden">
      <Header />

      <main className="relative flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[-8rem] top-20 h-64 w-64 rounded-full bg-primary/12 blur-3xl" />
          <div className="absolute right-[-6rem] top-32 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-400/8 blur-3xl" />
        </div>

        <div className="container relative max-w-6xl mx-auto px-4 py-8 md:py-16">
          <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] min-h-[78vh]">
            <div className="space-y-6 blur-in">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/20 px-4 py-2 text-sm font-medium text-white">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                One workspace for study plans, AI help, and revision resources
              </div>

              <div className="space-y-4">
                <div className="inline-flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
                    <Logo showText={false} iconClassName="h-16 w-16 p-3 bg-background/60 backdrop-blur-xl border border-white/10 shadow-2xl" />
                  </div>
                </div>

                <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-white md:text-6xl xl:text-7xl">
                  Build a
                  {' '}
                  <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                    smarter exam strategy
                  </span>
                  {' '}
                  for JNTUH.
                </h1>

                <p className="max-w-2xl text-lg leading-relaxed text-slate-300 md:text-xl">
                  AI-powered question prediction from 5+ years of previous papers. 
                  Get high-confidence predictions for your JNTUH exams.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Prediction Accuracy', value: '85%+' },
                  { label: 'Previous Papers', value: '5+ Years' },
                  { label: 'AI Analysis', value: '24/7 Available' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-card/60 px-4 py-4 backdrop-blur-xl">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/subjects"
                  className="group inline-flex items-center justify-center gap-3 rounded-full bg-primary px-7 py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-primary/40"
                >
                  <Target className="h-5 w-5" />
                  Get Question Predictions
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/jntuh"
                  className="inline-flex items-center justify-center gap-3 rounded-full border border-white/10 bg-card/70 px-7 py-4 text-base font-semibold text-foreground backdrop-blur-xl transition-colors hover:bg-card"
                >
                  <GraduationCap className="h-5 w-5 text-primary" />
                  JNTUH Workspace
                </Link>
              </div>

              <p className="text-sm text-muted-foreground">
                Focus faster, revise cleaner, and keep everything in one place.
              </p>
            </div>
            <div className="blur-in blur-in-delay-2">
              <div className="card-modern overflow-hidden rounded-[32px] border border-white/10 p-6 md:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Control Center</p>
                    <h2 className="mt-2 text-2xl font-bold text-foreground">What the app helps you do</h2>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-background/60 p-3">
                    <Logo showText={false} iconClassName="h-10 w-10 p-2" />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-background/60 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-primary/10 p-2 text-primary">
                        <Target className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Exam planning</p>
                        <p className="text-xs text-muted-foreground">Turn subject codes into a usable study plan.</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-background/60 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-emerald-400/10 p-2 text-emerald-300">
                        <Clock3 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Fast revision</p>
                        <p className="text-xs text-muted-foreground">Use pass mode when time is tight.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    { icon: Layers3, title: 'Pipeline-backed study plans', copy: 'Get live subject analysis, plan summaries, and PDF export in one flow.' },
                    { icon: Bot, title: 'Ask for explanations instantly', copy: 'Use the AI workspace for short answers, deep explanations, and revision summaries.' },
                    { icon: BookOpen, title: 'Jump to resource discovery', copy: 'Find structured learning paths, video links, and article shortcuts for any topic.' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-4 rounded-2xl border border-white/8 bg-background/50 p-4">
                      <div className="rounded-xl bg-white/5 p-2">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              {
                to: '/jntuh',
                icon: GraduationCap,
                title: 'JNTUH Workspace',
                copy: 'Choose a branch, pull the subject list, and generate a live study plan.',
              },
              {
                to: '/subjects',
                icon: Atom,
                title: 'AI Solver',
                copy: 'Ask targeted questions and save useful responses into your notes.',
              },
              {
                to: '/subjects?tab=search',
                icon: BookOpen,
                title: 'Resource Finder',
                copy: 'Search for videos, articles, and a guided learning path for tough topics.',
              },
            ].map((item) => (
              <Link
                key={item.title}
                to={item.to}
                className="group card-modern rounded-[28px] p-6 transition-transform hover:-translate-y-1"
              >
                <div className="mb-5 inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.copy}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary">
                  Open
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
