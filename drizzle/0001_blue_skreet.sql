ALTER TABLE "targets" ADD COLUMN "primary_email_source" text;--> statement-breakpoint
CREATE INDEX "email_guesses_user_id_idx" ON "email_guesses" USING btree ("user_id");