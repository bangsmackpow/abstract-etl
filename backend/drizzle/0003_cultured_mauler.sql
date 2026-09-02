CREATE TABLE `tenant_settings` (
	`tenant_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tenant_settings_tenant_key_idx` ON `tenant_settings` (`tenant_id`,`key`);--> statement-breakpoint
CREATE INDEX `tenant_settings_tenant_idx` ON `tenant_settings` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pw_reset_user_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `pw_reset_token_hash_idx` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
ALTER TABLE `tenants` ADD `plan` text DEFAULT 'trial' NOT NULL;--> statement-breakpoint
ALTER TABLE `tenants` ADD `stripe_customer_id` text;--> statement-breakpoint
ALTER TABLE `tenants` ADD `stripe_subscription_id` text;--> statement-breakpoint
ALTER TABLE `tenants` ADD `subscription_status` text DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `tenants` ADD `trial_ends_at` integer;--> statement-breakpoint
ALTER TABLE `tenants` ADD `subscription_ends_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `mfa_enabled` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `otp_code_hash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `otp_expires_at` integer;