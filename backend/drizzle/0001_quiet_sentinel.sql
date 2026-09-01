CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenants_slug_unique` ON `tenants` (`slug`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
ALTER TABLE `users` ADD `tenant_id` text REFERENCES tenants(id);--> statement-breakpoint
ALTER TABLE `jobs` ADD `tenant_id` text REFERENCES tenants(id);--> statement-breakpoint
ALTER TABLE `users` ADD `is_platform_admin` integer DEFAULT false;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `users_tenant_idx` ON `users` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `jobs_tenant_idx` ON `jobs` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `jobs_tenant_created_by_idx` ON `jobs` (`tenant_id`,`created_by`);--> statement-breakpoint
CREATE INDEX `jobs_tenant_status_idx` ON `jobs` (`tenant_id`,`status`);