import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, User, LogOut, Settings, GraduationCap, Menu } from 'lucide-react';
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  ExamHelper
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-6">
                <Link 
                  to="/subjects" 
                  className="flex items-center gap-3 text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <BookOpen className="h-5 w-5" />
                  Subjects
                </Link>
                <Link 
                  to="/jntuh" 
                  className="flex items-center gap-3 text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <GraduationCap className="h-5 w-5" />
                  JNTUH R22
                </Link>
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className="flex items-center gap-3 text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-5 w-5" />
                    Admin Panel
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2 font-semibold text-xl">
            <BookOpen className="h-6 w-6 text-primary" />
            <span>ExamHelper</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/subjects" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Subjects
          </Link>
          <Link to="/jntuh" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            JNTUH R22
          </Link>
          {isAdmin && (
            <Link to="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Admin Panel
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.email?.split('@')[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/subjects" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Browse Subjects
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 text-destructive">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth?mode=signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
