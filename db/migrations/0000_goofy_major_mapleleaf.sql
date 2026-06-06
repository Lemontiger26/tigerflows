CREATE TYPE "public"."step_type" AS ENUM('boolean', 'text', 'number', 'date', 'enum_single', 'enum_multi', 'agent');--> statement-breakpoint
CREATE TYPE "public"."executor_type" AS ENUM('human', 'agent');--> statement-breakpoint
CREATE TYPE "public"."flow_status" AS ENUM('active', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."execution_gate_kind" AS ENUM('human_approval', 'predicate', 'budget', 'time_window', 'dependency', 'rate_limit', 'custom');--> statement-breakpoint
CREATE TYPE "public"."gate_position" AS ENUM('pre', 'post', 'pre_branch', 'post_branch', 'pre_merge', 'post_merge', 'pre_loop', 'post_loop');--> statement-breakpoint
CREATE TYPE "public"."input_source_kind" AS ENUM('log_file', 'rest_health', 'systemctl_status', 'email', 'sql_query', 'http_get', 'rag_corpus', 'webhook', 'custom');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"user_id" char(21),
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"color" text DEFAULT 'primary' NOT NULL,
	"slug" text NOT NULL,
	"embeddings" vector(384) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enum_sets" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"user_id" char(21),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"embeddings" vector(384) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enum_values" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"enum_set_id" char(21) NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"color" text,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_steps" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"flow_id" char(21) NOT NULL,
	"template_step_id" char(21) NOT NULL,
	"order" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"step_type" "step_type" DEFAULT 'boolean' NOT NULL,
	"executor_type" "executor_type" DEFAULT 'human' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_critical" boolean DEFAULT false NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"value" jsonb,
	"checked_at" timestamp with time zone,
	"comment" text DEFAULT '' NOT NULL,
	"embeddings" vector(384)
);
--> statement-breakpoint
CREATE TABLE "flows" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"user_id" char(21),
	"category_id" char(21),
	"template_id" char(21) NOT NULL,
	"title" text NOT NULL,
	"status" "flow_status" DEFAULT 'active' NOT NULL,
	"slug" text NOT NULL,
	"embeddings" vector(384) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"user_id" char(21),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"embeddings" vector(384) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_steps" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"template_id" char(21) NOT NULL,
	"slug" text NOT NULL,
	"order" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"step_type" "step_type" DEFAULT 'boolean' NOT NULL,
	"executor_type" "executor_type" DEFAULT 'human' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_critical" boolean DEFAULT false NOT NULL,
	"embeddings" vector(384) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_tags" (
	"template_id" char(21) NOT NULL,
	"tag_id" char(21) NOT NULL,
	CONSTRAINT "template_tags_template_id_tag_id_pk" PRIMARY KEY("template_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"user_id" char(21),
	"category_id" char(21),
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"slug" text NOT NULL,
	"embeddings" vector(384) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"auth_id" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_id_unique" UNIQUE("auth_id")
);
--> statement-breakpoint
CREATE TABLE "execution_gate_templates" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"user_id" char(21),
	"kind" "execution_gate_kind" NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"config_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"defaults" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embeddings" vector(384) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_gates" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"template_step_id" char(21) NOT NULL,
	"gate_template_id" char(21) NOT NULL,
	"name" text NOT NULL,
	"position" "gate_position" DEFAULT 'pre' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flow_step_skills" (
	"flow_step_id" char(21) NOT NULL,
	"skill_id" char(21) NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"trace" jsonb,
	CONSTRAINT "flow_step_skills_flow_step_id_skill_id_pk" PRIMARY KEY("flow_step_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "flow_execution_gates" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"flow_step_id" char(21) NOT NULL,
	"execution_gate_id" char(21),
	"kind" "execution_gate_kind" NOT NULL,
	"position" "gate_position" DEFAULT 'pre' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"passed" boolean,
	"evaluated_at" timestamp with time zone,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "flow_input_sources" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"flow_step_id" char(21) NOT NULL,
	"input_source_id" char(21),
	"kind" "input_source_kind" NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb,
	"fetched_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "input_source_templates" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"user_id" char(21),
	"kind" "input_source_kind" NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"config_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"defaults" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embeddings" vector(384) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "input_sources" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"template_step_id" char(21) NOT NULL,
	"source_template_id" char(21) NOT NULL,
	"name" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" char(21) PRIMARY KEY NOT NULL,
	"user_id" char(21),
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tool_spec" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embeddings" vector(384) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_step_skills" (
	"template_step_id" char(21) NOT NULL,
	"skill_id" char(21) NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "template_step_skills_template_step_id_skill_id_pk" PRIMARY KEY("template_step_id","skill_id")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enum_sets" ADD CONSTRAINT "enum_sets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enum_values" ADD CONSTRAINT "enum_values_enum_set_id_enum_sets_id_fk" FOREIGN KEY ("enum_set_id") REFERENCES "public"."enum_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_steps" ADD CONSTRAINT "flow_steps_flow_id_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_steps" ADD CONSTRAINT "flow_steps_template_step_id_template_steps_id_fk" FOREIGN KEY ("template_step_id") REFERENCES "public"."template_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flows" ADD CONSTRAINT "flows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flows" ADD CONSTRAINT "flows_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flows" ADD CONSTRAINT "flows_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_steps" ADD CONSTRAINT "template_steps_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_tags" ADD CONSTRAINT "template_tags_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_tags" ADD CONSTRAINT "template_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_gate_templates" ADD CONSTRAINT "execution_gate_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_gates" ADD CONSTRAINT "execution_gates_template_step_id_template_steps_id_fk" FOREIGN KEY ("template_step_id") REFERENCES "public"."template_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_gates" ADD CONSTRAINT "execution_gates_gate_template_id_execution_gate_templates_id_fk" FOREIGN KEY ("gate_template_id") REFERENCES "public"."execution_gate_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_step_skills" ADD CONSTRAINT "flow_step_skills_flow_step_id_flow_steps_id_fk" FOREIGN KEY ("flow_step_id") REFERENCES "public"."flow_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_step_skills" ADD CONSTRAINT "flow_step_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_execution_gates" ADD CONSTRAINT "flow_execution_gates_flow_step_id_flow_steps_id_fk" FOREIGN KEY ("flow_step_id") REFERENCES "public"."flow_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_execution_gates" ADD CONSTRAINT "flow_execution_gates_execution_gate_id_execution_gates_id_fk" FOREIGN KEY ("execution_gate_id") REFERENCES "public"."execution_gates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_input_sources" ADD CONSTRAINT "flow_input_sources_flow_step_id_flow_steps_id_fk" FOREIGN KEY ("flow_step_id") REFERENCES "public"."flow_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flow_input_sources" ADD CONSTRAINT "flow_input_sources_input_source_id_input_sources_id_fk" FOREIGN KEY ("input_source_id") REFERENCES "public"."input_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "input_source_templates" ADD CONSTRAINT "input_source_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "input_sources" ADD CONSTRAINT "input_sources_template_step_id_template_steps_id_fk" FOREIGN KEY ("template_step_id") REFERENCES "public"."template_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "input_sources" ADD CONSTRAINT "input_sources_source_template_id_input_source_templates_id_fk" FOREIGN KEY ("source_template_id") REFERENCES "public"."input_source_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_step_skills" ADD CONSTRAINT "template_step_skills_template_step_fk" FOREIGN KEY ("template_step_id") REFERENCES "public"."template_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_step_skills" ADD CONSTRAINT "template_step_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_slug_idx" ON "categories" USING btree ("user_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_system_slug_idx" ON "categories" USING btree ("slug") WHERE "categories"."user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "enum_sets_user_slug_idx" ON "enum_sets" USING btree ("user_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "enum_sets_system_slug_idx" ON "enum_sets" USING btree ("slug") WHERE "enum_sets"."user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "enum_values_set_value_idx" ON "enum_values" USING btree ("enum_set_id","value");--> statement-breakpoint
CREATE UNIQUE INDEX "flows_user_slug_idx" ON "flows" USING btree ("user_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_slug_idx" ON "tags" USING btree ("user_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_system_slug_idx" ON "tags" USING btree ("slug") WHERE "tags"."user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "templates_user_slug_idx" ON "templates" USING btree ("user_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "templates_system_slug_idx" ON "templates" USING btree ("slug") WHERE "templates"."user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "gate_tmpl_user_slug_idx" ON "execution_gate_templates" USING btree ("user_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "gate_tmpl_system_slug_idx" ON "execution_gate_templates" USING btree ("slug") WHERE "execution_gate_templates"."user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "isrc_tmpl_user_slug_idx" ON "input_source_templates" USING btree ("user_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "isrc_tmpl_system_slug_idx" ON "input_source_templates" USING btree ("slug") WHERE "input_source_templates"."user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "skills_user_slug_idx" ON "skills" USING btree ("user_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "skills_system_slug_idx" ON "skills" USING btree ("slug") WHERE "skills"."user_id" IS NULL;
