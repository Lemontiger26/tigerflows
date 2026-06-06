CREATE TABLE `categories` (
	`id` text(21) PRIMARY KEY NOT NULL,
	`user_id` text(21) NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`color` text DEFAULT 'primary' NOT NULL,
	`slug` text NOT NULL,
	`embeddings` blob,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_user_slug_idx` ON `categories` (`user_id`,`slug`);--> statement-breakpoint
CREATE TABLE `enum_sets` (
	`id` text(21) PRIMARY KEY NOT NULL,
	`user_id` text(21) NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`embeddings` blob,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enum_sets_user_slug_idx` ON `enum_sets` (`user_id`,`slug`);--> statement-breakpoint
CREATE TABLE `enum_values` (
	`id` text(21) PRIMARY KEY NOT NULL,
	`enum_set_id` text(21) NOT NULL,
	`value` text NOT NULL,
	`label` text NOT NULL,
	`color` text,
	`order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`enum_set_id`) REFERENCES `enum_sets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enum_values_set_value_idx` ON `enum_values` (`enum_set_id`,`value`);--> statement-breakpoint
CREATE TABLE `flow_steps` (
	`id` text(21) PRIMARY KEY NOT NULL,
	`flow_id` text(21) NOT NULL,
	`template_step_id` text(21) NOT NULL,
	`order` integer NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`step_type` text DEFAULT 'boolean' NOT NULL,
	`executor_type` text DEFAULT 'human' NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`is_critical` integer DEFAULT false NOT NULL,
	`checked` integer DEFAULT false NOT NULL,
	`value` text,
	`checked_at` text,
	`comment` text DEFAULT '' NOT NULL,
	`embeddings` blob,
	FOREIGN KEY (`flow_id`) REFERENCES `flows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_step_id`) REFERENCES `template_steps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `flows` (
	`id` text(21) PRIMARY KEY NOT NULL,
	`user_id` text(21) NOT NULL,
	`category_id` text(21),
	`template_id` text(21) NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`slug` text NOT NULL,
	`embeddings` blob,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `flows_user_slug_idx` ON `flows` (`user_id`,`slug`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text(21) PRIMARY KEY NOT NULL,
	`user_id` text(21) NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`embeddings` blob,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_user_slug_idx` ON `tags` (`user_id`,`slug`);--> statement-breakpoint
CREATE TABLE `template_steps` (
	`id` text(21) PRIMARY KEY NOT NULL,
	`template_id` text(21) NOT NULL,
	`slug` text NOT NULL,
	`order` integer NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`step_type` text DEFAULT 'boolean' NOT NULL,
	`executor_type` text DEFAULT 'human' NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`is_critical` integer DEFAULT false NOT NULL,
	`embeddings` blob,
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `template_tags` (
	`template_id` text(21) NOT NULL,
	`tag_id` text(21) NOT NULL,
	PRIMARY KEY(`template_id`, `tag_id`),
	FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text(21) PRIMARY KEY NOT NULL,
	`user_id` text(21) NOT NULL,
	`category_id` text(21),
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`slug` text NOT NULL,
	`embeddings` blob,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `templates_user_slug_idx` ON `templates` (`user_id`,`slug`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text(21) PRIMARY KEY NOT NULL,
	`auth_id` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_auth_id_unique` ON `users` (`auth_id`);--> statement-breakpoint
CREATE TABLE `execution_gate_templates` (
	`id` text(21) PRIMARY KEY NOT NULL,
	`user_id` text(21) NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`config_schema` text DEFAULT '{}' NOT NULL,
	`defaults` text DEFAULT '{}' NOT NULL,
	`embeddings` blob,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gate_tmpl_user_slug_idx` ON `execution_gate_templates` (`user_id`,`slug`);--> statement-breakpoint
CREATE TABLE `execution_gates` (
	`id` text(21) PRIMARY KEY NOT NULL,
	`template_step_id` text(21) NOT NULL,
	`gate_template_id` text(21) NOT NULL,
	`name` text NOT NULL,
	`position` text DEFAULT 'pre' NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`template_step_id`) REFERENCES `template_steps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gate_template_id`) REFERENCES `execution_gate_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `flow_execution_gates` (
	`id` text(21) PRIMARY KEY NOT NULL,
	`flow_step_id` text(21) NOT NULL,
	`execution_gate_id` text(21),
	`kind` text NOT NULL,
	`position` text DEFAULT 'pre' NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`passed` integer,
	`evaluated_at` text,
	`reason` text,
	FOREIGN KEY (`flow_step_id`) REFERENCES `flow_steps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`execution_gate_id`) REFERENCES `execution_gates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `flow_input_sources` (
	`id` text(21) PRIMARY KEY NOT NULL,
	`flow_step_id` text(21) NOT NULL,
	`input_source_id` text(21),
	`kind` text NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`result` text,
	`fetched_at` text,
	FOREIGN KEY (`flow_step_id`) REFERENCES `flow_steps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`input_source_id`) REFERENCES `input_sources`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `flow_step_skills` (
	`flow_step_id` text(21) NOT NULL,
	`skill_id` text(21) NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`trace` text,
	PRIMARY KEY(`flow_step_id`, `skill_id`),
	FOREIGN KEY (`flow_step_id`) REFERENCES `flow_steps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `input_source_templates` (
	`id` text(21) PRIMARY KEY NOT NULL,
	`user_id` text(21) NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`config_schema` text DEFAULT '{}' NOT NULL,
	`defaults` text DEFAULT '{}' NOT NULL,
	`embeddings` blob,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `isrc_tmpl_user_slug_idx` ON `input_source_templates` (`user_id`,`slug`);--> statement-breakpoint
CREATE TABLE `input_sources` (
	`id` text(21) PRIMARY KEY NOT NULL,
	`template_step_id` text(21) NOT NULL,
	`source_template_id` text(21) NOT NULL,
	`name` text NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`template_step_id`) REFERENCES `template_steps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_template_id`) REFERENCES `input_source_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` text(21) PRIMARY KEY NOT NULL,
	`user_id` text(21) NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`tool_spec` text DEFAULT '{}' NOT NULL,
	`embeddings` blob,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `skills_user_slug_idx` ON `skills` (`user_id`,`slug`);--> statement-breakpoint
CREATE TABLE `template_step_skills` (
	`template_step_id` text(21) NOT NULL,
	`skill_id` text(21) NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`template_step_id`, `skill_id`),
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_step_id`) REFERENCES `template_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
