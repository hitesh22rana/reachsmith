CREATE TYPE "public"."outreach_status" AS ENUM('draft', 'sent', 'replied', 'rejected', 'no_response', 'success');--> statement-breakpoint
CREATE TABLE "outreaches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"target_id" text NOT NULL,
	"template_id" text,
	"channel" "channel" DEFAULT 'email' NOT NULL,
	"subject" text,
	"body_final" text NOT NULL,
	"status" "outreach_status" DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp,
	"last_status_change_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "outreaches" ADD CONSTRAINT "outreaches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreaches" ADD CONSTRAINT "outreaches_target_id_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."targets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreaches" ADD CONSTRAINT "outreaches_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outreaches_user_id_idx" ON "outreaches" USING btree ("user_id");