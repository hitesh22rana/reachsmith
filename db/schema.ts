import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  integer,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// Convention: table names and their consts are always plural.
// Better Auth models map to these tables explicitly in lib/auth.ts.
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const sourceTypeEnum = pgEnum("source_type", [
  "linkedin",
  "github",
  "website",
  "manual",
  "other",
]);

export const enrichmentStatusEnum = pgEnum("enrichment_status", [
  "not_started",
  "pending",
  "success",
  "failed",
]);

export const targets = pgTable(
  "targets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Three name columns, one fact. full_name is the name and the only one
    // the UI asks for; first_name/last_name are an optional override for
    // names that do not split naively (Bae Suzy, van der Berg, Cher, J.
    // Smith), null on most rows, and never kept in sync with full_name.
    // Both consumers resolve them through lib/target-name.ts.
    fullName: text("full_name").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    company: text("company"),
    roleTitle: text("role_title"),
    primaryEmail: text("primary_email"),
    sourceType: sourceTypeEnum("source_type").notNull().default("manual"),
    enrichmentStatus: enrichmentStatusEnum("enrichment_status")
      .notNull()
      .default("not_started"),
    notes: text("notes"),
    location: text("location"),
    companyWebsite: text("company_website"),
    domain: text("domain"),
    socialUrls: text("social_urls").array(),
    extraEnrichment: jsonb("extra_enrichment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  // Leads with user_id so it still serves every user_id-only lookup, then
  // (created_at, id) so a keyset cursor scan needs no sort. Ascending:
  // Postgres reads an index backwards for ORDER BY ... DESC anyway.
  (table) => [index("targets_user_id_created_at_id_idx").on(table.userId, table.createdAt, table.id)],
);

export type Target = typeof targets.$inferSelect;
export type NewTarget = typeof targets.$inferInsert;

export const channelEnum = pgEnum("channel", ["email", "linkedin_dm", "other"]);

// Free-text audience tags the caller can reuse across templates. The old
// audience_type enum was wrong the moment someone was a designer, so the
// set is open and these rows are the presets. Names are unique per user,
// case-insensitively, which also makes resolve-or-create a single
// ON CONFLICT DO NOTHING away.
export const audiences = pgTable(
  "audiences",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audiences_user_id_idx").on(table.userId),
    uniqueIndex("audiences_user_id_name_key").on(table.userId, sql`lower(${table.name})`),
  ],
);

export type Audience = typeof audiences.$inferSelect;

// One entry per {{placeholder}} found in a template body, stored so the
// compose form does not re-parse the body to know what to ask for. Written
// server-side from the body on every save; never read from the client.
export interface Placeholder {
  name: string;
  label: string;
  source: "target" | "input";
}

export const templates = pgTable(
  "templates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    channel: channelEnum("channel").notNull().default("email"),
    // set null, not restrict: deleting a preset should unlink the templates
    // that used it, never block the delete.
    audienceId: text("audience_id").references(() => audiences.id, {
      onDelete: "set null",
    }),
    purpose: text("purpose"),
    body: text("body").notNull(),
    placeholders: jsonb("placeholders").$type<Placeholder[]>().notNull().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("templates_user_id_idx").on(table.userId)],
);

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;

export const outreachStatusEnum = pgEnum("outreach_status", [
  "draft",
  "sent",
  "replied",
  "rejected",
  "no_response",
  "success",
]);

export const outreaches = pgTable(
  "outreaches",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => targets.id, { onDelete: "cascade" }),
    templateId: text("template_id").references(() => templates.id, {
      onDelete: "set null",
    }),
    channel: channelEnum("channel").notNull().default("email"),
    subject: text("subject"),
    bodyFinal: text("body_final").notNull(),
    status: outreachStatusEnum("status").notNull().default("draft"),
    sentAt: timestamp("sent_at"),
    lastStatusChangeAt: timestamp("last_status_change_at").defaultNow().notNull(),
    // Filled values for whatever placeholders the chosen template declared,
    // e.g. { job_title: "…", job_link: "…" }. Null for a custom message.
    metadata: jsonb("metadata").$type<Record<string, string> | null>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  // Keyset index; see targets. No (user_id, status, ...): the status filter
  // is a cheap post-filter over the user_id prefix at this volume.
  (table) => [index("outreaches_user_id_created_at_id_idx").on(table.userId, table.createdAt, table.id)],
);

export type Outreach = typeof outreaches.$inferSelect;
export type NewOutreach = typeof outreaches.$inferInsert;

export const emailGuesses = pgTable(
  "email_guesses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => targets.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    patternUsed: text("pattern_used").notNull(),
    source: text("source").notNull().default("pattern"),
    score: integer("score").notNull().default(0),
    context: text("context"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("email_guesses_target_id_idx").on(table.targetId),
    index("email_guesses_user_id_idx").on(table.userId),
  ],
);

export type EmailGuess = typeof emailGuesses.$inferSelect;
