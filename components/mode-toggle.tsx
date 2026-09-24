"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

function subscribe() {
  return () => {};
}

// True on the client, false during SSR, without setState-in-effect.
function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

// Single-button light/dark toggle. Renders a sized placeholder until
// mounted so server and client HTML match (theme is client-only state).
export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return <Button variant="ghost" size="icon" disabled aria-label="Toggle theme" />;
  }

  const isDark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="pressable"
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
