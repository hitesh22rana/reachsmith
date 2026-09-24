"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "FAQ", href: "#faq" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-6 z-40 mx-auto w-max max-w-[calc(100%-2rem)]">
      <nav
        aria-label="Primary"
        className="flex w-max max-w-full items-center gap-2 rounded-full border bg-background/80 py-2 pr-2 pl-5 shadow-sm backdrop-blur-xl"
      >
        <Link href="/" className="text-base font-semibold tracking-tight" aria-current="page">
          ReachSmith
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="hidden items-center gap-1 md:flex">
          <ModeToggle />
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "pressable")}>
            Log in
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: "sm" }), "pressable")}>
            Create account
          </Link>
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <ModeToggle />
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative flex size-9 items-center justify-center rounded-full transition-colors hover:bg-muted"
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute h-0.5 w-5 rounded-full bg-foreground transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                open ? "translate-y-0 rotate-45" : "-translate-y-1",
              )}
            />
            <span
              aria-hidden="true"
              className={cn(
                "absolute h-0.5 w-5 rounded-full bg-foreground transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                open ? "translate-y-0 -rotate-45" : "translate-y-1",
              )}
            />
          </button>
        </div>
      </nav>
      <div
        className={cn(
          "overflow-hidden transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden",
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <div className="mt-2 flex w-64 flex-col gap-1 rounded-2xl border bg-background/95 p-2 shadow-lg backdrop-blur-xl">
          {LINKS.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              style={{ transitionDelay: `${100 + index * 50}ms` }}
              className={cn(
                "rounded-xl px-3 py-2 text-sm font-medium transition-[transform,opacity,background-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted",
                open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-1 flex flex-col gap-1 border-t pt-2">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "ghost" }), "pressable justify-start")}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants(), "pressable justify-start")}
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-base font-semibold tracking-tight">ReachSmith</p>
          <p className="text-sm text-muted-foreground">
            Referral outreach without the spreadsheet.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-1">
          {[...LINKS, { label: "Log in", href: "/login" }, { label: "Create account", href: "/signup" }].map(
            (link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </footer>
  );
}
