ALTER TABLE "competitions" ADD COLUMN "bundles" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "price_pence" integer;--> statement-breakpoint

-- Bundle prices are terms like the ticket price: fixed once a competition is published. A ticket's price is what the
-- player paid for it and never changes, so refunds and released tickets are always valued at what was paid.
CREATE FUNCTION fd_bundles_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'competitions' THEN
    IF OLD.status <> 'draft' AND NEW.bundles IS DISTINCT FROM OLD.bundles THEN
      RAISE EXCEPTION 'a published competition''s bundle prices never change' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.price_pence IS DISTINCT FROM OLD.price_pence THEN
    RAISE EXCEPTION 'a ticket''s price never changes' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER competitions_bundles_guard BEFORE UPDATE ON competitions FOR EACH ROW EXECUTE FUNCTION fd_bundles_guard();
--> statement-breakpoint
CREATE TRIGGER tickets_price_guard BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION fd_bundles_guard();
