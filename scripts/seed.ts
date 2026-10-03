import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema.ts";
// render.ts is imported relatively and by extension because this script
// runs under node --experimental-strip-types, which has no path aliases.
import { parsePlaceholders, renderTemplate } from "../features/templates/render.ts";
import { targetVariables } from "../features/outreach/server.ts";
import { resolveAudienceId } from "../features/audiences/server.ts";
import { asUser } from "../workers/db.ts";
import { processGuessJob } from "../workers/email-guess.ts";

// Local demo data, including the complete current email suggestions.
// Usage: pnpm db:seed you@example.com (must already have signed up).
// Safe to re-run: preserves existing records and refreshes their suggestions.

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
  const owner = postgres(url);
  const setup = drizzle(owner, { schema });
  try {
    const [user] = await setup
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    if (!user) {
      throw new Error(`No user with email ${email} (sign up first)`);
    }

    const targetId = await asUser(user.id, async (db) => {
      const [existing] = await db
        .select({ id: schema.targets.id })
        .from(schema.targets)
        .where(and(eq(schema.targets.fullName, SEED_TARGET), eq(schema.targets.userId, user.id)))
        .limit(1);
      if (existing) return existing.id;

      const [target] = await db
        .insert(schema.targets)
        .values({
          userId: user.id,
          fullName: SEED_TARGET,
          // Split left null on purpose: it is an override, and "Aarav Sharma"
          // splits correctly. Seeding it would hide the default path.
          company: "FinEdge Technologies",
          roleTitle: "Senior Backend Engineer",
          primaryEmail: "aarav.sharma@example.com",
          sourceType: "linkedin",
          location: "Bengaluru",
          domain: "example.com",
          socialUrls: ["https://www.linkedin.com/in/example-aarav"],
          notes: "Met at the backend meetup; hiring for platform roles.",
        })
        .returning();
      if (!target) {
        throw new Error("Failed to insert seed target");
      }

      const founderId = await resolveAudienceId(db, user.id, "Founder");
      const recruiterId = await resolveAudienceId(db, user.id, "Recruiter");

      const referralBody =
        "Hi {{first_name}},\n\nI saw the {{job_title}} opening at {{company}} ({{job_link}}) and it matches my work closely. Would you be open to a quick chat or a referral?\n\nMy resume is here: {{resume_link}}\n\nThanks!";
      const introBody =
        "Hi {{first_name}}, I am exploring {{job_title}} roles at {{company}}. Mind if I send over a short note about my background?";
      const [referral] = await db
        .insert(schema.templates)
        .values({
          userId: user.id,
          name: "Referral request, backend role",
          channel: "email",
          audienceId: founderId,
          purpose: "referral_request",
          body: referralBody,
          placeholders: parsePlaceholders(referralBody).placeholders,
        })
        .returning();
      const [intro] = await db
        .insert(schema.templates)
        .values({
          userId: user.id,
          name: "Cold intro, recruiter",
          channel: "linkedin_dm",
          audienceId: recruiterId,
          purpose: "cold_intro",
          body: introBody,
          placeholders: parsePlaceholders(introBody).placeholders,
        })
        .returning();
      if (!referral || !intro) {
        throw new Error("Failed to insert seed templates");
      }

      const variables = {
        job_title: "Senior Backend Engineer",
        job_link: "https://example.com/jobs/backend-1",
        resume_link: "https://example.com/aarav/resume.pdf",
      };
      await db.insert(schema.outreaches).values({
        userId: user.id,
        targetId: target.id,
        templateId: referral.id,
        channel: "email",
        subject: "Referral for the backend opening?",
        bodyFinal: renderTemplate(referral.body, {
          // Same call the compose flow makes, and reading target.firstName here
          // left {{first_name}} unsubstituted, since the split is usually null.
          ...targetVariables(target),
          ...variables,
        }),
        status: "draft",
        metadata: variables,
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

      return target.id;
    });
    // Use the real persistence path without requiring Redis or a running worker.
    const generation = crypto.randomUUID();
    await asUser(user.id, (db) => db.update(schema.targets).set({ emailGeneration: { id: generation, status: "pending" } })
      .where(and(eq(schema.targets.id, targetId), eq(schema.targets.userId, user.id))));
    await processGuessJob({ data: { targetId, userId: user.id, generation } });
    console.log(`Demo data ready for ${email}; email suggestions refreshed.`);
  } finally {
    await owner.end();
  }
}

main().then(() => process.exit(0), (error: unknown) => {
  console.error(error);
  process.exit(1);
});
