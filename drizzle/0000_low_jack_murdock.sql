CREATE TABLE `dynamic_qr_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`saved_qr_code_id` text NOT NULL,
	`user_id` text NOT NULL,
	`slug` text NOT NULL,
	`destination_url` text NOT NULL,
	`is_paused` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`saved_qr_code_id`) REFERENCES `saved_qr_codes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dynamic_qr_codes_slug_unique` ON `dynamic_qr_codes` (`slug`);--> statement-breakpoint
CREATE INDEX `dynamic_qr_codes_user_id_idx` ON `dynamic_qr_codes` (`user_id`);--> statement-breakpoint
CREATE TABLE `saved_qr_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`content_type` text NOT NULL,
	`content_data` text NOT NULL,
	`style_data` text NOT NULL,
	`logo_data` text,
	`thumbnail_data` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scan_events` (
	`id` text PRIMARY KEY NOT NULL,
	`dynamic_qr_code_id` text NOT NULL,
	`scanned_at` integer NOT NULL,
	`user_agent` text,
	`country` text,
	`device` text,
	FOREIGN KEY (`dynamic_qr_code_id`) REFERENCES `dynamic_qr_codes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `scan_events_qr_id_scanned_at_idx` ON `scan_events` (`dynamic_qr_code_id`,`scanned_at`);--> statement-breakpoint
CREATE TABLE `stripe_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`processed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`stripe_price_id` text,
	`tier` text DEFAULT 'free' NOT NULL,
	`status` text DEFAULT 'inactive' NOT NULL,
	`current_period_end` integer,
	`cancel_at_period_end` integer DEFAULT false,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_user_id_unique` ON `subscriptions` (`user_id`);