CREATE TYPE "public"."audience_type" AS ENUM('hr', 'recruiter', 'engineer', 'founder', 'generic');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('email', 'linkedin_dm', 'other');--> statement-breakpoint
CREATE TABLE "templates" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"channel" "channel" DEFAULT 'email' NOT NULL,
	"audience_type" "audience_type" DEFAULT 'generic' NOT NULL,
	"purpose" text,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "templates_user_id_idx" ON "templates" USING btree ("user_id");