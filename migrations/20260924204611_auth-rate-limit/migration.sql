CREATE TABLE "auth_rate_limit" (
	"key" text PRIMARY KEY,
	"count" integer NOT NULL,
	"window_expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "auth_rate_limit_count_positive" CHECK ("count" >= 1)
);
--> statement-breakpoint
CREATE INDEX "auth_rate_limit_window_expires_at_idx" ON "auth_rate_limit" ("window_expires_at");