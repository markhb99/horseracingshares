'use client';

/**
 * Global Header — sticky, 56-64px tall.
 * Split into a server-readable auth wrapper and this client shell
 * so the hamburger Sheet can use useState without poisoning the tree.
 *
 * Auth prop is resolved in the RSC wrapper (HeaderWrapper) in layout.tsx
 * and passed down as a plain boolean.
 */

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { signOut } from '@/lib/auth/actions';

// ─── Nav links ────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Browse', href: '/browse' },
  { label: 'The Handbook', href: '/handbook' },
  { label: 'Sell a Horse', href: '/sell' },
] as const;

// ─── WordMark ─────────────────────────────────────────────────────

function WordMark() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
      aria-label="Horse Racing Shares — home"
    >
      <Image
        src="/logo.png"
        alt="Horse Racing Shares"
        width={44}
        height={44}
        className="shrink-0 object-contain"
        priority
      />
      <span className="font-serif font-semibold text-midnight text-[1.0625rem] leading-none tracking-tight hidden sm:inline">
        Horse Racing Shares
      </span>
    </Link>
  );
}

// ─── DesktopNav ───────────────────────────────────────────────────

function DesktopNav() {
  return (
    <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
      {NAV_LINKS.map(({ label, href }) => (
        <Link
          key={href}
          href={href}
          className="text-small-type font-medium text-charcoal-soft hover:text-midnight transition-colors duration-[120ms]"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

// ─── AuthActions ──────────────────────────────────────────────────

function AuthActions({
  isLoggedIn,
  userInitials,
  userRole,
}: {
  isLoggedIn: boolean;
  userInitials?: string;
  userRole?: string;
}) {
  if (isLoggedIn) {
    return (
      <div className="hidden md:flex items-center gap-3">
        <Link
          href="/account"
          className="flex items-center gap-2 text-small-type font-medium text-charcoal-soft hover:text-midnight transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <span className="hidden sm:inline">My Account</span>
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-midnight text-paper text-caption-type font-semibold uppercase"
          >
            {userInitials ?? 'U'}
          </span>
        </Link>
        {(userRole === 'syndicator' || userRole === 'operator') && (
          <Link
            href="/syndicator/dashboard"
            className="text-small-type font-medium text-charcoal-soft hover:text-midnight transition-colors duration-[120ms]"
          >
            Dashboard
          </Link>
        )}
        {userRole === 'operator' && (
          <Link
            href="/admin"
            className="text-small-type font-medium text-charcoal-soft hover:text-midnight transition-colors duration-[120ms]"
          >
            Admin
          </Link>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="text-small-type font-medium text-charcoal-soft hover:text-midnight transition-colors duration-[120ms]"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="hidden md:flex items-center gap-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/login" className="text-midnight">
          Sign in
        </Link>
      </Button>
      <Button
        size="sm"
        className="rounded-full bg-midnight text-paper hover:bg-midnight-light px-4"
        asChild
      >
        <Link href="/sell">List a horse</Link>
      </Button>
    </div>
  );
}

// ─── MobileMenu ───────────────────────────────────────────────────

function MobileMenu({
  isLoggedIn,
  userRole,
}: {
  isLoggedIn: boolean;
  userRole?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-midnight"
          aria-label="Open navigation menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" showCloseButton={false} className="w-72 pt-14">
        <nav
          aria-label="Mobile navigation"
          className="flex flex-col gap-1 px-2"
        >
          {NAV_LINKS.map(({ label, href }) => (
            <SheetClose key={href} asChild>
              <Link
                href={href}
                className="rounded-md px-3 py-2.5 text-body-type font-medium text-charcoal hover:bg-fog transition-colors"
              >
                {label}
              </Link>
            </SheetClose>
          ))}

          <div className="mt-4 border-t border-fog pt-4 flex flex-col gap-2">
            {isLoggedIn ? (
              <>
                <SheetClose asChild>
                  <Link
                    href="/account"
                    className="rounded-md px-3 py-2.5 text-body-type font-medium text-charcoal hover:bg-fog transition-colors"
                  >
                    My Account
                  </Link>
                </SheetClose>
                {(userRole === 'syndicator' || userRole === 'operator') && (
                  <SheetClose asChild>
                    <Link
                      href="/syndicator/dashboard"
                      className="rounded-md px-3 py-2.5 text-body-type font-medium text-charcoal hover:bg-fog transition-colors"
                    >
                      Dashboard
                    </Link>
                  </SheetClose>
                )}
                {userRole === 'operator' && (
                  <SheetClose asChild>
                    <Link
                      href="/admin"
                      className="rounded-md px-3 py-2.5 text-body-type font-medium text-charcoal hover:bg-fog transition-colors"
                    >
                      Admin
                    </Link>
                  </SheetClose>
                )}
                <form action={signOut}>
                  <button
                    type="submit"
                    className="w-full text-left rounded-md px-3 py-2.5 text-body-type font-medium text-charcoal hover:bg-fog transition-colors"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <SheetClose asChild>
                  <Link
                    href="/login"
                    className="rounded-md px-3 py-2.5 text-body-type font-medium text-charcoal hover:bg-fog transition-colors"
                  >
                    Sign in
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/sell"
                    className="rounded-full bg-midnight text-center px-4 py-2.5 text-small-type font-medium text-paper hover:bg-midnight-light transition-colors"
                  >
                    List a horse
                  </Link>
                </SheetClose>
              </>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

// ─── Header ───────────────────────────────────────────────────────

export interface HeaderProps {
  isLoggedIn: boolean;
  userInitials?: string;
  userRole?: string;
}

export function Header({ isLoggedIn, userInitials, userRole }: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-[var(--z-sticky)]',
        'flex items-center justify-between h-[60px] px-[var(--container-pad)]',
        'bg-paper border-b border-fog shadow-sm',
      )}
    >
      <WordMark />
      <DesktopNav />
      <div className="flex items-center gap-2">
        <AuthActions isLoggedIn={isLoggedIn} userInitials={userInitials} userRole={userRole} />
        <MobileMenu isLoggedIn={isLoggedIn} userRole={userRole} />
      </div>
    </header>
  );
}
