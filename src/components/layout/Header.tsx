import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, User, LogOut, Settings, GraduationCap, Menu, Target, Sparkles, Sun, Moon } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(() => document.documentElement.classList.contains('light'));

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('light')) {
      root.classList.remove('light');
      setIsLightMode(false);
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.add('light');
      setIsLightMode(true);
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-700 bg-slate-900/95 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-slate-900 border-slate-700">
              <SheetHeader>
                <SheetTitle className="text-left text-white">
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-2 mt-8">
                <Link
                  to="/subjects"
                  className="flex items-center gap-3 px-4 py-3 text-base font-bold text-blue-400 bg-blue-500/10 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Target className="h-5 w-5" />
                  Get Question Predictions
                  <Sparkles className="h-4 w-4 ml-auto text-yellow-500" />
                </Link>
                <Link
                  to="/jntuh"
                  className="flex items-center gap-3 px-4 py-3 text-base font-medium text-white hover:bg-slate-800 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <GraduationCap className="h-5 w-5" />
                  JNTUH R22 Workspace
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-3 px-4 py-3 text-base font-medium text-white hover:bg-slate-800 rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-5 w-5" />
                    Admin Panel
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Logo showText={true} className="hidden md:flex" />
            <Logo showText={false} className="flex md:hidden" />
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Button asChild size="sm" className="rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0">
            <Link to="/subjects" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Get Predictions
            </Link>
          </Button>
          <Link to="/jntuh" className="text-sm font-medium text-white hover:text-slate-200 transition-colors flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4" />
            JNTUH R22
          </Link>
          {isAdmin && (
            <Link to="/admin" className="text-sm font-medium text-white hover:text-slate-200 transition-colors">
              Admin Panel
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-10 w-10 rounded-full bg-secondary/50 hover:bg-secondary">
            {isLightMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-secondary/50 hover:bg-secondary">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2">
                <div className="flex items-center justify-start gap-2 p-2 mb-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.email?.split('@')[0]}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/subjects" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Browse Subjects
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/admin" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 text-destructive cursor-pointer focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button size="sm" asChild className="rounded-full px-6">
                <Link to="/auth?mode=signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
