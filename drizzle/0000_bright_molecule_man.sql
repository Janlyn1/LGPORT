CREATE TABLE `creator_activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creator_id` text NOT NULL,
	`action` text NOT NULL,
	`actor_name` text DEFAULT '' NOT NULL,
	`actor_email` text DEFAULT '' NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_creator_activity_creator_id` ON `creator_activity` (`creator_id`);--> statement-breakpoint
CREATE INDEX `idx_creator_activity_created_at` ON `creator_activity` (`created_at`);--> statement-breakpoint
CREATE TABLE `creators` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`profile_link` text NOT NULL,
	`follower_count` integer DEFAULT 0 NOT NULL,
	`following_count` integer DEFAULT 0 NOT NULL,
	`total_likes` integer DEFAULT 0 NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`niche` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`profile_image` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'For Approval' NOT NULL,
	`assigned_to` text DEFAULT '' NOT NULL,
	`saved_by_name` text DEFAULT '' NOT NULL,
	`saved_by_email` text DEFAULT '' NOT NULL,
	`contact_date` text DEFAULT '' NOT NULL,
	`response_status` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`saved_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_creators_username_unique` ON `creators` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_creators_profile_link_unique` ON `creators` (`profile_link`);--> statement-breakpoint
CREATE INDEX `idx_creators_status` ON `creators` (`status`);--> statement-breakpoint
CREATE INDEX `idx_creators_updated_at` ON `creators` (`updated_at`);