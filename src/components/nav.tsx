"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { User } from "@supabase/supabase-js";

const ADMIN_USER_ID = "3cefdaf3-2f71-4c83-88c3-dfe2f080ebe1";

const publicLinks = [
  { href: "/courses", label: "Courses" },
  { href: "/pricing", label: "Pricing" },
];

const authLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
];

const adminLinks = [
  { href: "/admin", label: "Admin" },
];

export function Nav() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        fetch("/api/notifications/unread-count")
          .then((r) => r.ok ? r.json() : null)
          .then((d) => { if (d) setUnreadCount(d.count); })
          .catch(() => {});
      }
    });

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
          Tee Time Hawk
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 text-sm md:flex">
          {[...publicLinks, ...(user ? authLinks : []), ...(user?.id === ADMIN_USER_ID ? adminLinks : [])].map((link) => (
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
          {user && (
            <Link
              href="/notifications"
              className="relative hidden p-1.5 text-[var(--color-sand-muted)] transition-colors hover:text-[var(--color-sand)] md:block"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-terracotta)] px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}
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
                {[...publicLinks, ...(user ? [...authLinks, { href: "/notifications", label: "Notifications" }] : []), ...(user?.id === ADMIN_USER_ID ? adminLinks : [])].map((link) => (
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
