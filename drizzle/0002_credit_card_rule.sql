ALTER TABLE "competitions" ADD COLUMN "is_instant_win" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_funding" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_brand" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "authorised_pence" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "capture_pence" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "decision" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "settled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "settle_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "settle_error" text;--> statement-breakpoint
CREATE INDEX "orders_credit_idx" ON "orders" USING btree ("user_id","payment_funding","decided_at");