"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SENTENCE =
  "Every conversation tracked, every follow up kept, nothing lost to a messy spreadsheet.";

const WORDS: { id: string; text: string }[] = (() => {
  const seen = new Map<string, number>();
  return SENTENCE.split(" ").map((text) => {
    const count = seen.get(text) ?? 0;
    seen.set(text, count + 1);
    return { id: `${text}-${count}`, text };
  });
})();

function Word({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  // Always start muted so server and client render identical HTML.
  const [active, setActive] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-40% 0px -40% 0px" },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <span
      ref={ref}
      className={cn(
        "transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        active ? "text-foreground" : "text-foreground/30",
      )}
    >
      {children}{" "}
    </span>
  );
}

export function Tagline() {
  return (
    <section aria-label="Why ReachSmith" className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
      <p className="mx-auto max-w-[680px] text-center text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {WORDS.map((word) => (
          <Word key={word.id}>{word.text}</Word>
        ))}
      </p>
    </section>
  );
}
