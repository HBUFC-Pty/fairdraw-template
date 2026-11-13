CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"at" text NOT NULL,
	"actor_id" uuid,
	"actor_role" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"prev_hash" text NOT NULL,
	"hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "basket_items" (
	"user_id" uuid NOT NULL,
	"competition_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"chosen_numbers" integer[],
	"answer_index" integer,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "basket_items_user_id_competition_id_pk" PRIMARY KEY("user_id","competition_id"),
	CONSTRAINT "basket_quantity_positive" CHECK ("basket_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"prize_description" text NOT NULL,
	"prize_value_pence" integer NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ticket_price_pence" integer NOT NULL,
	"max_tickets" integer NOT NULL,
	"per_person_cap" integer NOT NULL,
	"winner_count" integer DEFAULT 1 NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"draw_at" timestamp with time zone NOT NULL,
	"skill_question" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"closed_at" timestamp with time zone,
	"drawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "competition_price_positive" CHECK ("competitions"."ticket_price_pence" > 0),
	CONSTRAINT "competition_max_positive" CHECK ("competitions"."max_tickets" > 0 AND "competitions"."max_tickets" <= 10000000),
	CONSTRAINT "competition_cap_range" CHECK ("competitions"."per_person_cap" >= 1 AND "competitions"."per_person_cap" <= "competitions"."max_tickets"),
	CONSTRAINT "competition_winners_range" CHECK ("competitions"."winner_count" >= 1 AND "competitions"."winner_count" <= "competitions"."max_tickets"),
	CONSTRAINT "competition_times_order" CHECK ("competitions"."opens_at" < "competitions"."closes_at" AND "competitions"."closes_at" <= "competitions"."draw_at")
);
--> statement-breakpoint
CREATE TABLE "draws" (
	"competition_id" uuid PRIMARY KEY NOT NULL,
	"closed_at_text" text NOT NULL,
	"close_unix" bigint NOT NULL,
	"tickets_sold" integer NOT NULL,
	"max_tickets" integer NOT NULL,
	"entries_hash" text NOT NULL,
	"drand_chain" text NOT NULL,
	"drand_round" bigint NOT NULL,
	"ticket_list" integer[] NOT NULL,
	"committed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scheduled_draw_at" timestamp with time zone NOT NULL,
	"randomness" text,
	"signature" text,
	"winning_tickets" integer[],
	"relays" text[],
	"drawn_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "exclusions" (
	"email_hash" text PRIMARY KEY NOT NULL,
	"until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"job" text PRIMARY KEY NOT NULL,
	"last_run_at" timestamp with time zone NOT NULL,
	"last_ok" boolean NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_pence" integer NOT NULL,
	"provider" text NOT NULL,
	"provider_ref" text,
	"payment_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "order_total_non_negative" CHECK ("orders"."total_pence" >= 0)
);
--> statement-breakpoint
CREATE TABLE "postal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"full_name" text,
	"email" text,
	"postal_address" text,
	"answer_index" integer,
	"received_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"rejection_reason" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"anonymised_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"amount_pence" integer NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider_ref" text,
	"requested_by" uuid,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mfa_verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "spend_limits" (
	"user_id" uuid NOT NULL,
	"period" text NOT NULL,
	"limit_pence" integer,
	"pending_limit_pence" integer,
	"pending_removal" boolean DEFAULT false NOT NULL,
	"pending_effective_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spend_limits_user_id_period_pk" PRIMARY KEY("user_id","period"),
	CONSTRAINT "spend_limit_non_negative" CHECK ("spend_limits"."limit_pence" IS NULL OR "spend_limits"."limit_pence" >= 0)
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"competition_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"user_id" uuid,
	"order_id" uuid,
	"postal_entry_id" uuid,
	"source" text NOT NULL,
	"allocation" text NOT NULL,
	"status" text NOT NULL,
	"answer_correct" boolean,
	"reserved_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_number_positive" CHECK ("tickets"."number" >= 1),
	CONSTRAINT "ticket_owner" CHECK (("tickets"."source" = 'paid' AND "tickets"."order_id" IS NOT NULL) OR ("tickets"."source" = 'postal' AND "tickets"."postal_entry_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"first_name" text,
	"last_name" text,
	"date_of_birth" date,
	"age_check_method" text DEFAULT 'self_declared' NOT NULL,
	"age_checked_at" timestamp with time zone,
	"email_verified_at" timestamp with time zone,
	"role" text DEFAULT 'player' NOT NULL,
	"totp_secret_enc" text,
	"totp_enabled_at" timestamp with time zone,
	"totp_last_step" bigint,
	"break_until" timestamp with time zone,
	"self_excluded_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_provider_event_id_pk" PRIMARY KEY("provider","event_id")
);
--> statement-breakpoint
CREATE TABLE "winners" (
	"competition_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"ticket_number" integer NOT NULL,
	"user_id" uuid,
	"postal_entry_id" uuid,
	"public_consent" boolean DEFAULT false NOT NULL,
	"display_name" text,
	"consent_at" timestamp with time zone,
	CONSTRAINT "winners_competition_id_position_pk" PRIMARY KEY("competition_id","position")
);
--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "basket_items" ADD CONSTRAINT "basket_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "basket_items" ADD CONSTRAINT "basket_items_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draws" ADD CONSTRAINT "draws_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postal_entries" ADD CONSTRAINT "postal_entries_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "postal_entries" ADD CONSTRAINT "postal_entries_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spend_limits" ADD CONSTRAINT "spend_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_postal_entry_id_postal_entries_id_fk" FOREIGN KEY ("postal_entry_id") REFERENCES "public"."postal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "winners" ADD CONSTRAINT "winners_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "winners" ADD CONSTRAINT "winners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "winners" ADD CONSTRAINT "winners_postal_entry_id_postal_entries_id_fk" FOREIGN KEY ("postal_entry_id") REFERENCES "public"."postal_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "competitions_slug_key" ON "competitions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "postal_competition_idx" ON "postal_entries" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_live_number_key" ON "tickets" USING btree ("competition_id","number") WHERE "tickets"."status" IN ('reserved', 'active');--> statement-breakpoint
CREATE INDEX "tickets_user_idx" ON "tickets" USING btree ("user_id","competition_id");--> statement-breakpoint
CREATE INDEX "tickets_order_idx" ON "tickets" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");