CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`from_tenant_id` text,
	`to_tenant_id` text,
	`details` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `audit_log` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `audit_target_idx` ON `audit_log` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `audit_from_tenant_idx` ON `audit_log` (`from_tenant_id`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
ALTER TABLE `tenants` ADD `logo_blob` text;--> statement-breakpoint
ALTER TABLE `tenants` ADD `logo_mime` text;