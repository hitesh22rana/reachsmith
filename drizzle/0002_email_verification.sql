ALTER TABLE "targets" ADD COLUMN "email_check" jsonb;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "email_generation" jsonb;--> statement-breakpoint
ALTER TABLE "targets" ADD COLUMN "email_verifications" jsonb DEFAULT '{}'::jsonb NOT NULL;
