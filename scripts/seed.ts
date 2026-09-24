import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema.ts";
import { renderTemplate } from "../features/templates/render.ts";

// Local test data: one target, two templates, two outreach rows.
// Usage: pnpm db:seed you@example.com (must already have signed up).
// Safe to re-run: skips when the seed target already exists.

const SEED_TARGET = "Aarav Sharma";

async function main(): Promise<void> {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: pnpm db:seed you@example.com");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const db = drizzle(postgres(url), { schema });

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (!user) {
    console.error(`No user with email ${email} (sign up first)`);
    process.exit(1);
  }

  const [existing] = await db
    .select({ id: schema.targets.id })
    .from(schema.targets)
    .where(eq(schema.targets.fullName, SEED_TARGET))
    .limit(1);
  if (existing) {
    console.log("Seed data already present, nothing to do.");
    process.exit(0);
  }

  const [target] = await db
    .insert(schema.targets)
    .values({
      userId: user.id,
      fullName: SEED_TARGET,
      firstName: "Aarav",
      lastName: "Sharma",
      company: "FinEdge Technologies",
      roleTitle: "Senior Backend Engineer",
      primaryEmail: "aarav.sharma@example.com",
      profileUrl: "https://www.linkedin.com/in/example-aarav",
      sourceType: "linkedin",
      location: "Bengaluru",
      notes: "Met at the backend meetup; hiring for platform roles.",
    })
    .returning();
  if (!target) {
    throw new Error("Failed to insert seed target");
  }

  const [referral] = await db
    .insert(schema.templates)
    .values({
      userId: user.id,
      name: "Referral request – backend role",
      channel: "email",
      audienceType: "engineer",
      purpose: "referral_request",
      body: "Hi {{first_name}},\n\nI saw the {{job_title}} opening at {{company}} ({{job_link}}) and it matches my work closely. Would you be open to a quick chat or a referral?\n\nThanks!",
    })
    .returning();
  const [intro] = await db
    .insert(schema.templates)
    .values({
      userId: user.id,
      name: "Cold intro – recruiter",
      channel: "linkedin_dm",
      audienceType: "recruiter",
      purpose: "cold_intro",
      body: "Hi {{first_name}}, I am exploring {{job_title}} roles at {{company}}. Mind if I send over a short note about my background?",
    })
    .returning();
  if (!referral || !intro) {
    throw new Error("Failed to insert seed templates");
  }

  const jobLink = "https://example.com/jobs/backend-1";
  await db.insert(schema.outreaches).values({
    userId: user.id,
    targetId: target.id,
    templateId: referral.id,
    channel: "email",
    subject: "Referral for the backend opening?",
    bodyFinal: renderTemplate(referral.body, {
      first_name: target.firstName ?? undefined,
      company: target.company ?? undefined,
      job_title: "Senior Backend Engineer",
      job_link: jobLink,
    }),
    status: "draft",
    metadata: { job_title: "Senior Backend Engineer", job_link: jobLink },
  });
  await db.insert(schema.outreaches).values({
    userId: user.id,
    targetId: target.id,
    templateId: null,
    channel: "linkedin_dm",
    bodyFinal:
      "Hi Aarav, loved your talk on queue backpressure. Would love to stay in touch about platform work at FinEdge.",
    status: "sent",
    sentAt: new Date(),
  });

  console.log(`Seeded 1 target, 2 templates, 2 outreach rows for ${email}.`);
  process.exit(0);
}

await main();
