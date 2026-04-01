CREATE TABLE `landing_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`saved_qr_code_id` text,
	`slug` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`company_name` text,
	`website_url` text,
	`cta_button_text` text,
	`cover_image_url` text,
	`pdf_url` text,
	`app_store_url` text,
	`google_play_url` text,
	`app_icon_url` text,
	`screenshot_url` text,
	`social_links` text,
	`is_paused` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`saved_qr_code_id`) REFERENCES `saved_qr_codes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `landing_pages_slug_unique` ON `landing_pages` (`slug`);--> statement-breakpoint
CREATE INDEX `landing_pages_user_id_idx` ON `landing_pages` (`user_id`);--> statement-breakpoint
CREATE INDEX `landing_pages_saved_qr_id_idx` ON `landing_pages` (`saved_qr_code_id`);