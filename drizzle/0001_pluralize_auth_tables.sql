ALTER TABLE "user" RENAME TO "users";
--> statement-breakpoint
ALTER TABLE "session" RENAME TO "sessions";
--> statement-breakpoint
ALTER TABLE "account" RENAME TO "accounts";
--> statement-breakpoint
ALTER TABLE "verification" RENAME TO "verifications";
--> statement-breakpoint
ALTER INDEX "account_userId_idx" RENAME TO "accounts_user_id_idx";
--> statement-breakpoint
ALTER INDEX "session_userId_idx" RENAME TO "sessions_user_id_idx";
--> statement-breakpoint
ALTER INDEX "verification_identifier_idx" RENAME TO "verifications_identifier_idx";
--> statement-breakpoint
ALTER TABLE "sessions" RENAME CONSTRAINT "session_user_id_user_id_fk" TO "sessions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "accounts" RENAME CONSTRAINT "account_user_id_user_id_fk" TO "accounts_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "sessions" RENAME CONSTRAINT "session_token_unique" TO "sessions_token_unique";
--> statement-breakpoint
ALTER TABLE "users" RENAME CONSTRAINT "user_email_unique" TO "users_email_unique";
