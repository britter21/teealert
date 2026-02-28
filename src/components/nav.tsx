"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { User } from "@supabase/supabase-js";

const publicLinks = [
  { href: "/courses", label: "Courses" },
  { href: "/pricing", label: "Pricing" },
];

const authLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        scrolled
          ? "border-[var(--color-sand)]/10 bg-[var(--color-desert-night)]/95 backdrop-blur-lg"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
        <Link
          href="/"
          className="mr-8 flex items-center gap-2 font-[family-name:var(--font-display)] text-xl tracking-wide text-[var(--color-sand-bright)]"
        >
          TeeAlert
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 text-sm md:flex">
          {[...publicLinks, ...(user ? authLinks : [])].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative py-1 transition-colors duration-200 ${
                pathname.startsWith(link.href)
                  ? "text-[var(--color-sand-bright)]"
                  : "text-[var(--color-sand-muted)] hover:text-[var(--color-sand)]"
              }`}
            >
              {link.label}
              {pathname.startsWith(link.href) && (
                <span className="absolute -bottom-[1px] left-0 h-[2px] w-full bg-gradient-to-r from-[var(--color-terracotta)] to-[var(--color-sand)]" />
              )}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-[var(--color-sand-muted)] hover:text-[var(--color-sand)]"
            >
              Sign out
            </Button>
          ) : (
            <Button
              asChild
              size="sm"
              className="bg-[var(--color-terracotta)] text-white hover:bg-[var(--color-terracotta-glow)]"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          )}

          {/* Mobile nav */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--color-sand-muted)] md:hidden"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  className="h-[18px] w-[18px]"
                >
                  <path
                    d="M3 5h12M3 9h12M3 13h12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-72 border-l border-[var(--color-sand)]/10 bg-[var(--color-surface)]"
            >
              <div className="mt-10 flex flex-col gap-1">
                {[...publicLinks, ...(user ? authLinks : [])].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-lg px-4 py-3 text-sm transition-colors ${
                      pathname.startsWith(link.href)
                        ? "bg-[var(--color-surface-raised)] text-[var(--color-sand-bright)]"
                        : "text-[var(--color-sand-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-sand)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
