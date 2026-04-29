import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

export const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-primary/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        <div className="flex items-center gap-6 lg:gap-12">
          <Link to="/" className="font-display font-black text-2xl sm:text-3xl text-primary leading-none tracking-tight">
            MyKissan
          </Link>
          <div className="hidden md:flex gap-8">
            <a href="#services" className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors">Services</a>
            <a href="#how" className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors">How it works</a>
            <a href="#about" className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors">About</a>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="press bg-secondary text-secondary-foreground px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold hover:bg-primary transition-colors">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              to="/dashboard"
              className="text-xs sm:text-sm font-semibold text-foreground/70 hover:text-primary transition-colors"
            >
              Dashboard
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
};
