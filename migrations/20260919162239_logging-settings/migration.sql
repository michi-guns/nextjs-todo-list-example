CREATE TABLE "logging_settings" (
	"id" smallint PRIMARY KEY,
	"revision" bigint NOT NULL,
	"policy" jsonb NOT NULL,
	CONSTRAINT "logging_settings_singleton" CHECK ("id" = 1),
	CONSTRAINT "logging_settings_revision_range" CHECK ("revision" BETWEEN 1 AND 9007199254740991)
);
