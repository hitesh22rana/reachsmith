CREATE TYPE "public"."email_guess_status" AS ENUM('pending', 'verifying', 'valid', 'invalid', 'unknown', 'accept_all');--> statement-breakpoint
CREATE TABLE "email_guesses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"target_id" text NOT NULL,
	"email" text NOT NULL,
	"pattern_used" text NOT NULL,
	"status" "email_guess_status" DEFAULT 'pending' NOT NULL,
	"verification_meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_guesses" ADD CONSTRAINT "email_guesses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_guesses" ADD CONSTRAINT "email_guesses_target_id_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."targets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_guesses_target_id_idx" ON "email_guesses" USING btree ("target_id");