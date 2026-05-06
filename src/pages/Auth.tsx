import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, BookOpen, CheckCircle2, Loader2, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

const emailSchema = z.string().email('Please enter a valid email address');
const signInPasswordSchema = z.string().min(1, 'Please enter your password');
const signUpPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must include at least one letter')
  .regex(/\d/, 'Password must include at least one number');
const fullNameSchema = z.string().min(2, 'Please enter your full name');

type AuthMode = 'signin' | 'signup';

interface FormErrors {
  email?: string;
  password?: string;
  fullName?: string;
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M21.8 12.23c0-.76-.07-1.49-.2-2.18H12v4.13h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.94-1.78 3.05-4.4 3.05-7.59Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.08-.91 6.77-2.46l-3.3-2.56c-.92.62-2.09.99-3.47.99-2.67 0-4.93-1.8-5.74-4.21H2.85v2.64A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.26 13.76A5.99 5.99 0 0 1 5.94 12c0-.61.11-1.2.32-1.76V7.6H2.85A10 10 0 0 0 2 12c0 1.62.39 3.16 1.08 4.4l3.18-2.64Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.03c1.5 0 2.85.52 3.91 1.54l2.93-2.93C17.07 2.99 14.75 2 12 2A10 10 0 0 0 2.85 7.6l3.41 2.64C7.07 7.83 9.33 6.03 12 6.03Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function getAuthErrorMeta(error: { message?: string; status?: number; code?: string } | null, origin: string) {
  const message = error?.message || 'Authentication request failed.';
  const status = error?.status;
  const code = error?.code;

  if (message.includes('Unsupported provider') || code === 'validation_failed') {
    return {
      title: 'Google sign-in is not enabled',
      description: `Enable Google in Supabase Auth > Providers and add ${origin}/auth as an allowed redirect URL.`,
    };
  }

  if (status === 429 || /rate limit|too many requests/i.test(message)) {
    return {
      title: 'Too many attempts',
      description: 'Supabase is rate limiting this project right now. Wait a minute, then try again.',
    };
  }

  if (/invalid login credentials/i.test(message)) {
    return {
      title: 'Invalid credentials',
      description: 'That email and password combination did not match any active account.',
    };
  }

  if (/email not confirmed/i.test(message)) {
    return {
      title: 'Email confirmation required',
      description: 'Open the confirmation email first, then come back and sign in.',
    };
  }

  if (/email rate limit exceeded|over_email_send_rate_limit/i.test(message)) {
    return {
      title: 'Email sending is temporarily limited',
      description: 'Too many confirmation emails were requested. Wait a bit before trying to sign up again.',
    };
  }

  if (/redirect/i.test(message)) {
    return {
      title: 'Redirect URL mismatch',
      description: `Add ${origin}/auth to your Supabase redirect URLs and try again.`,
    };
  }

  return {
    title: 'Authentication failed',
    description: message,
  };
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, signInWithGoogle, user, session, isLoading } = useAuth();

  const nextPath = searchParams.get('next') || '/jntuh';
  const searchMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState<AuthMode>(searchMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [activeAction, setActiveAction] = useState<'email' | 'google' | null>(null);

  useEffect(() => {
    setMode(searchMode);
  }, [searchMode]);

  useEffect(() => {
    if (user && !isLoading) {
      navigate(nextPath, { replace: true });
    }
  }, [user, isLoading, navigate, nextPath]);

  useEffect(() => {
    const authError = searchParams.get('error_description') || searchParams.get('error');
    if (authError) {
      toast({
        title: 'Authentication failed',
        description: decodeURIComponent(authError.replace(/\+/g, ' ')),
        variant: 'destructive',
      });
    }
  }, [searchParams, toast]);

  const isSignUp = mode === 'signup';
  const isSubmitting = activeAction !== null;

  const heroItems = useMemo(
    () => [
      'Continue with Google in one click through Supabase OAuth.',
      'Keep email and password login as a fallback for every account.',
      'Use one account across notes, starred answers, and saved resources.',
    ],
    []
  );

  const setModeAndUrl = (nextMode: AuthMode) => {
    const query = new URLSearchParams();
    if (nextMode === 'signup') {
      query.set('mode', 'signup');
    }
    if (nextPath && nextPath !== '/jntuh') {
      query.set('next', nextPath);
    }
    navigate(`/auth${query.toString() ? `?${query.toString()}` : ''}`, { replace: true });
  };

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      nextErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = (isSignUp ? signUpPasswordSchema : signInPasswordSchema).safeParse(password);
    if (!passwordResult.success) {
      nextErrors.password = passwordResult.error.errors[0].message;
    }

    if (isSignUp) {
      const fullNameResult = fullNameSchema.safeParse(fullName);
      if (!fullNameResult.success) {
        nextErrors.fullName = fullNameResult.error.errors[0].message;
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    setActiveAction('email');

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName);

        if (error) {
          const authError = getAuthErrorMeta(error, window.location.origin);
          toast({
            title: authError.title,
            description: error.message.includes('already registered')
              ? 'This email already has an account. Try signing in instead.'
              : authError.description,
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: session ? 'Account created' : 'Check your inbox',
          description: session
            ? 'Your account is ready and you are now signed in.'
            : 'We sent a confirmation link to your email. Open it to finish setting up your account.',
        });
      } else {
        const { error } = await signIn(email, password);

        if (error) {
          const authError = getAuthErrorMeta(error, window.location.origin);
          toast({
            title: authError.title,
            description: authError.description,
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Signed in',
          description: 'Welcome back. Your workspace is ready.',
        });
      }
    } finally {
      setActiveAction(null);
    }
  };

  const handleGoogleAuth = async () => {
    setActiveAction('google');
    const { error } = await signInWithGoogle();

    if (error) {
      setActiveAction(null);
      const authError = getAuthErrorMeta(error, window.location.origin);
      toast({
        title: authError.title,
        description: authError.description,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-16 h-64 w-64 rounded-full bg-primary/14 blur-3xl" />
        <div className="absolute right-[-10rem] top-20 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-72 w-72 rounded-full bg-emerald-400/8 blur-3xl" />
      </div>

      <div className="relative container mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-8">
          <Link to="/" className="inline-flex items-center gap-3 text-foreground transition-opacity hover:opacity-90">
            <Logo showText={false} iconClassName="h-12 w-12 p-2 rounded-2xl bg-card/70 border border-white/10" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">ExamHelper</p>
              <p className="text-sm text-muted-foreground">Professional exam prep workspace</p>
            </div>
          </Link>

          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="h-4 w-4" />
              Secure access
            </div>

            <h1 className="max-w-2xl text-4xl font-bold tracking-tight md:text-6xl">
              Sign in once and keep your
              {' '}
              <span className="bg-gradient-to-r from-primary via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                study workflow connected
              </span>
              .
            </h1>

            <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Access saved notes, starred answers, and personalized study tools through a cleaner sign-in flow built for direct Google access and reliable email fallback.
            </p>
          </div>

          <div className="grid gap-3">
            {heroItems.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-card/60 p-4 backdrop-blur-xl">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
                <p className="text-sm leading-6 text-foreground">{item}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
              <CardContent className="p-5">
                <div className="mb-3 inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold">Account security</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Supabase handles the authentication flow, session lifecycle, and provider callback flow in one place.
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
              <CardContent className="p-5">
                <div className="mb-3 inline-flex rounded-2xl bg-emerald-400/10 p-3 text-emerald-300">
                  <Mail className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold">Flexible access</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Use Google for direct access or keep email and password as a backup sign-in path for the same workspace.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <Card className="overflow-hidden rounded-[32px] border-white/10 bg-card/75 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                    {isSignUp ? 'Create account' : 'Welcome back'}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    {isSignUp ? 'Start with a stronger account setup' : 'Sign in to continue'}
                  </h2>
                </div>

                <div className="rounded-full border border-white/10 bg-background/60 p-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setModeAndUrl('signin')}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${!isSignUp ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => setModeAndUrl('signup')}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${isSignUp ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Sign up
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center gap-3 rounded-2xl border-white/10 bg-background/60 py-6 text-base font-semibold hover:bg-background"
                  onClick={handleGoogleAuth}
                  disabled={isSubmitting}
                >
                  {activeAction === 'google' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                  Continue with Google
                </Button>

                <div className="relative text-center">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                  <span className="relative bg-card px-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    or use email
                  </span>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Majid Ulla"
                        value={fullName}
                        onChange={(event) => {
                          setFullName(event.target.value);
                          setErrors((prev) => ({ ...prev, fullName: undefined }));
                        }}
                        className={errors.fullName ? 'border-destructive' : ''}
                      />
                      {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="At least 8 characters"
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      className={errors.password ? 'border-destructive' : ''}
                    />
                    {errors.password ? (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    ) : isSignUp ? (
                      <p className="text-xs text-muted-foreground">Use at least 8 characters with letters and numbers.</p>
                    ) : null}
                  </div>

                  <Button type="submit" className="w-full gap-2 py-6 text-base font-semibold" disabled={isSubmitting}>
                    {activeAction === 'email' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {isSignUp ? 'Create account' : 'Sign in'}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="rounded-2xl border border-white/10 bg-background/50 p-4 text-sm text-muted-foreground">
                  {isSignUp
                    ? 'By creating an account, you can save notes, star AI answers, and keep your revision flow synced across sessions.'
                    : 'Signing in restores your saved notes, starred resources, and personalized study workspace.'}
                </div>

                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-xs leading-6 text-muted-foreground">
                  Google sign-in requires the Google provider to be enabled in Supabase.
                  Add
                  {' '}
                  <span className="font-medium text-foreground">{`${window.location.origin}/auth`}</span>
                  {' '}
                  as an allowed redirect URL in your Supabase Auth settings.
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
