CREATE TYPE "public"."enrichment_status" AS ENUM('not_started', 'pending', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('linkedin', 'github', 'website', 'manual', 'other');--> statement-breakpoint
CREATE TABLE "targets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"full_name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"company" text,
	"role_title" text,
	"primary_email" text,
	"profile_url" text,
	"source_type" "source_type" DEFAULT 'manual' NOT NULL,
	"enrichment_status" "enrichment_status" DEFAULT 'not_started' NOT NULL,
	"notes" text,
	"location" text,
	"company_website" text,
	"github_url" text,
	"linkedin_url" text,
	"extra_enrichment" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "targets_user_id_idx" ON "targets" USING btree ("user_id");