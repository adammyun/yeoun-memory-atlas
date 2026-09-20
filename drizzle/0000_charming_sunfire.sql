CREATE TABLE `memories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`location_name` text NOT NULL,
	`memory_date` text,
	`emotion` text NOT NULL,
	`visibility` text NOT NULL,
	`is_anonymous` integer NOT NULL,
	`location_precision` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`public_latitude` real NOT NULL,
	`public_longitude` real NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `memories_user_date_idx` ON `memories` (`user_id`,`memory_date`);--> statement-breakpoint
CREATE INDEX `memories_public_bounds_idx` ON `memories` (`visibility`,`public_longitude`,`public_latitude`);--> statement-breakpoint
CREATE TABLE `memory_media` (
	`id` text PRIMARY KEY NOT NULL,
	`memory_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`media_type` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`memory_id`) REFERENCES `memories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memory_media_storage_key_unique` ON `memory_media` (`storage_key`);--> statement-breakpoint
CREATE INDEX `memory_media_memory_sort_idx` ON `memory_media` (`memory_id`,`sort_order`);