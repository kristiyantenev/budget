-- ADR-21, ADR-24: preserve identity links and sid-owned sessions; discard account copies.
UPDATE "betterauth"."account"
SET "access_token" = NULL,
    "refresh_token" = NULL,
    "id_token" = NULL,
    "access_token_expires_at" = NULL,
    "refresh_token_expires_at" = NULL,
    "scope" = NULL,
    "password" = NULL;
--> statement-breakpoint
ALTER TABLE "betterauth"."account" ADD CONSTRAINT "account_no_credentials" CHECK ("betterauth"."account"."access_token" IS NULL AND "betterauth"."account"."refresh_token" IS NULL AND "betterauth"."account"."id_token" IS NULL AND "betterauth"."account"."access_token_expires_at" IS NULL AND "betterauth"."account"."refresh_token_expires_at" IS NULL AND "betterauth"."account"."scope" IS NULL AND "betterauth"."account"."password" IS NULL);
