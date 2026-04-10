CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'abstractor' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_by` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`property_address` text NOT NULL,
	`borrower_names` text,
	`county` text,
	`order_date` text,
	`fields_json` text,
	`ai_flags_json` text,
	`template_version` text DEFAULT 'v1',
	`email_sent` integer DEFAULT false,
	`notes` text,
	`processing_time_ms` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `user_idx` ON `jobs` (`created_by`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `jobs` (`status`);