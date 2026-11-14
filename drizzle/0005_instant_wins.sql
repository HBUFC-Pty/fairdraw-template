CREATE TABLE "instant_wins" (
	"competition_id" uuid NOT NULL,
	"ticket_number" integer NOT NULL,
	"tier" integer NOT NULL,
	"title" text NOT NULL,
	"value_pence" integer NOT NULL,
	"won_ticket_id" bigint,
	"won_at" timestamp with time zone,
	CONSTRAINT "instant_wins_competition_id_ticket_number_pk" PRIMARY KEY("competition_id","ticket_number")
);
--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "instant_prizes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "instant_reveal" text DEFAULT 'scratch' NOT NULL;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "instant_commit" text;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "instant_salt" text;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "instant_committed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "instant_wins" ADD CONSTRAINT "instant_wins_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instant_wins" ADD CONSTRAINT "instant_wins_won_ticket_id_tickets_id_fk" FOREIGN KEY ("won_ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "instant_wins_ticket_idx" ON "instant_wins" USING btree ("won_ticket_id");--> statement-breakpoint

-- Instant wins (src/lib/competitions/instant.ts). The winning numbers are chosen at random and committed when the
-- competition is published: instant_commit = SHA-256 of 'fairdraw-instant-v1', the salt and the "number:tier" lines
-- in number order. The salt and full list are published at the close, so anyone can check that no prize was moved,
-- added or held back. These triggers keep the database to that.

-- 1. The list is written once, while publishing, and a prize is won once.
CREATE FUNCTION fd_instant_wins_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  st text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'instant prizes are never deleted' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT status INTO st FROM competitions WHERE id = NEW.competition_id;
    IF st IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION 'instant prizes are fixed when a competition is published' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.won_ticket_id IS NOT NULL OR NEW.won_at IS NOT NULL THEN
      RAISE EXCEPTION 'an instant prize starts unwon' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.competition_id IS DISTINCT FROM OLD.competition_id OR NEW.ticket_number IS DISTINCT FROM OLD.ticket_number
     OR NEW.tier IS DISTINCT FROM OLD.tier OR NEW.title IS DISTINCT FROM OLD.title OR NEW.value_pence IS DISTINCT FROM OLD.value_pence THEN
    RAISE EXCEPTION 'an instant prize''s number, tier and value never change' USING ERRCODE = 'P0001';
  END IF;
  IF OLD.won_ticket_id IS NOT NULL AND (NEW.won_ticket_id IS DISTINCT FROM OLD.won_ticket_id OR NEW.won_at IS DISTINCT FROM OLD.won_at) THEN
    RAISE EXCEPTION 'an instant prize is won once and its winner never changes' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER instant_wins_guard BEFORE INSERT OR UPDATE OR DELETE ON instant_wins FOR EACH ROW EXECUTE FUNCTION fd_instant_wins_guard();
--> statement-breakpoint

-- 2. Publishing commits to the list (the hash must match it), and from then on the instant terms never change.
CREATE FUNCTION fd_competitions_instant_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  wanted integer;
  have integer;
  digest text;
BEGIN
  IF OLD.status <> 'draft' THEN
    IF NEW.instant_prizes IS DISTINCT FROM OLD.instant_prizes OR NEW.instant_reveal IS DISTINCT FROM OLD.instant_reveal
       OR NEW.instant_commit IS DISTINCT FROM OLD.instant_commit OR NEW.instant_salt IS DISTINCT FROM OLD.instant_salt
       OR NEW.instant_committed_at IS DISTINCT FROM OLD.instant_committed_at THEN
      RAISE EXCEPTION 'a published competition''s instant prizes never change' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status = 'live' AND jsonb_array_length(NEW.instant_prizes) > 0 THEN
    SELECT coalesce(sum((t->>'count')::integer), 0) INTO wanted FROM jsonb_array_elements(NEW.instant_prizes) t;
    SELECT count(*) INTO have FROM instant_wins WHERE competition_id = NEW.id;
    IF have <> wanted THEN
      RAISE EXCEPTION 'publishing needs one instant-win number per instant prize (% chosen, % prizes)', have, wanted USING ERRCODE = 'P0001';
    END IF;
    IF NOT NEW.is_instant_win THEN
      RAISE EXCEPTION 'a competition with instant prizes is an instant win prize draw (no credit cards)' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.instant_salt IS NULL OR NEW.instant_salt !~ '^[0-9a-f]{64}$' OR NEW.instant_committed_at IS NULL THEN
      RAISE EXCEPTION 'publishing instant prizes needs a salt and a commitment time' USING ERRCODE = 'P0001';
    END IF;
    SELECT encode(sha256(convert_to('fairdraw-instant-v1' || E'\n' || NEW.instant_salt || E'\n'
             || coalesce(string_agg(ticket_number::text || ':' || tier::text, E'\n' ORDER BY ticket_number), ''), 'UTF8')), 'hex')
      INTO digest FROM instant_wins WHERE competition_id = NEW.id;
    IF NEW.instant_commit IS DISTINCT FROM digest THEN
      RAISE EXCEPTION 'the instant-win commitment does not match the chosen numbers' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER competitions_instant_guard BEFORE UPDATE ON competitions FOR EACH ROW EXECUTE FUNCTION fd_competitions_instant_guard();
--> statement-breakpoint

-- 3. Tickets: never a chosen number where there are instant prizes (the operator knows the winning numbers), and a
--    ticket that won an instant prize is never released.
CREATE FUNCTION fd_tickets_instant_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.allocation = 'chosen' AND EXISTS (SELECT 1 FROM competitions WHERE id = NEW.competition_id AND jsonb_array_length(instant_prizes) > 0) THEN
      RAISE EXCEPTION 'ticket numbers cannot be chosen in a competition with instant prizes' USING ERRCODE = 'P0001';
    END IF;
  ELSIF OLD.status = 'active' AND NEW.status <> 'active' AND EXISTS (SELECT 1 FROM instant_wins WHERE won_ticket_id = OLD.id) THEN
    RAISE EXCEPTION 'a ticket that won an instant prize cannot be released' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER tickets_instant_guard BEFORE INSERT OR UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION fd_tickets_instant_guard();
--> statement-breakpoint

-- 4. The database awards the prize the moment a ticket with a winning number is entered with a correct answer (paid
--    or by post), so no code path can skip, delay or redirect it.
CREATE FUNCTION fd_tickets_instant_award() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') AND NEW.answer_correct IS NOT FALSE THEN
    UPDATE instant_wins SET won_ticket_id = NEW.id, won_at = now()
      WHERE competition_id = NEW.competition_id AND ticket_number = NEW.number AND won_ticket_id IS NULL;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER tickets_instant_award AFTER INSERT OR UPDATE OF status ON tickets FOR EACH ROW EXECUTE FUNCTION fd_tickets_instant_award();
