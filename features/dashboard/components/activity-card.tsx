import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BlobatarAvatar } from "@/components/blobatar-avatar";
import { cn } from "@/lib/utils";

export interface ActivityItem {
  key: string;
  at: Date;
  title: string;
  detail: string;
  href: string;
  face: string | null;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function ActivityCard({ activity }: { activity: ActivityItem[] }) {
  return (
    <Card className="animate-enter lg:col-span-3" style={{ animationDelay: "280ms" }}>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Targets, templates, and outreach, newest first.</CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-xl bg-muted/50 px-4 py-6">
            <p className="text-sm text-muted-foreground">
              Nothing yet. Add a target to start your first thread of activity.
            </p>
            <Link href="/targets" className={cn(buttonVariants({ size: "sm" }), "pressable")}>
              Add target
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <ul className="-mx-2 flex flex-col">
            {activity.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors duration-150 ease-out hover:bg-muted/60"
                >
                  {item.face ? (
                    <BlobatarAvatar name={item.face} size={34} />
                  ) : (
                    <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-muted">
                      <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {item.title}
                      </span>
                      <time
                        dateTime={item.at.toISOString()}
                        className="shrink-0 text-xs whitespace-nowrap text-muted-foreground"
                      >
                        {timeAgo(item.at)}
                      </time>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.detail}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
