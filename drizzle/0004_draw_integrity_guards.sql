-- Draw integrity guards added after the red team of November 2026. 0001_fairness_guards.sql is never edited; these
-- triggers add to it. They close gaps where the result could be steered without breaking the 0001 rules:
--   1. committing to a drand round that was already published (so its randomness was known), or to any round other
--      than the one the rules give for the close;
--   2. moving a ticket to another owner, or changing a winner's owner, after the fact;
--   3. adding, entering or removing tickets after the advertised close, before the commitment is made;
--   4. rewriting the prize description, summary, images or title once a competition has closed.
--
-- fd_clock() is the time these guards use. It is always now(). The test suite replaces it (tests/helpers/db.ts) so
-- that tests can simulate closes in the past; replacing it needs ownership of the schema, which the web app's own
-- database role should not have.
CREATE FUNCTION fd_clock() RETURNS timestamptz LANGUAGE sql STABLE AS $$ SELECT now() $$;
--> statement-breakpoint
-- When drand quicknet published a round, in Unix seconds (genesis 1692803367, a round every 3 seconds).
CREATE FUNCTION fd_round_time(round bigint) RETURNS bigint LANGUAGE sql IMMUTABLE AS $$ SELECT 1692803367 + (round - 1) * 3 $$;
--> statement-breakpoint

-- 1. The commitment's round: the one the rules give, and still in the future.
CREATE FUNCTION fd_draws_round_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  c record;
  draw_unix bigint;
  expected bigint;
BEGIN
  SELECT * INTO c FROM competitions WHERE id = NEW.competition_id;
  IF NEW.drand_chain IS DISTINCT FROM '52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971' THEN
    RAISE EXCEPTION 'a commitment must use the drand quicknet chain' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.closed_at_text::timestamptz IS DISTINCT FROM to_timestamp(NEW.close_unix) THEN
    RAISE EXCEPTION 'the stated close time and close_unix differ' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.close_unix < floor(extract(epoch FROM c.closes_at)) AND NEW.tickets_sold < c.max_tickets THEN
    RAISE EXCEPTION 'a commitment cannot state a close before the advertised close unless the competition sold out' USING ERRCODE = 'P0001';
  END IF;
  -- Same rule as fairdrawRoundAfter() with wait = max(30 seconds, advertised draw time minus the close).
  draw_unix := ceil(extract(epoch FROM c.draw_at))::bigint;
  expected := (NEW.close_unix + greatest(30, draw_unix - NEW.close_unix) - 1692803367) / 3 + 2;
  IF NEW.drand_round IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'the committed drand round must be % for this close and draw time', expected USING ERRCODE = 'P0001';
  END IF;
  IF fd_round_time(NEW.drand_round) <= extract(epoch FROM fd_clock()) + 5 THEN
    RAISE EXCEPTION 'drand round % has already been published: a commitment must be made before its randomness exists', NEW.drand_round
      USING ERRCODE = 'P0001';
  END IF;
  NEW.committed_at := now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER draws_round_guard BEFORE INSERT ON draws FOR EACH ROW EXECUTE FUNCTION fd_draws_round_guard();
--> statement-breakpoint

-- 2 and 3. Tickets: owners never change; the set of active tickets is fixed at the advertised close (wrong answers
-- to the question may still become ineligible as the competition closes) and once the commitment exists.
CREATE FUNCTION fd_tickets_integrity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  closes timestamptz;
  committed boolean;
BEGIN
  SELECT closes_at INTO closes FROM competitions WHERE id = NEW.competition_id;
  committed := EXISTS (SELECT 1 FROM draws WHERE competition_id = NEW.competition_id);
  IF TG_OP = 'INSERT' THEN
    IF fd_clock() >= closes THEN
      RAISE EXCEPTION 'tickets cannot be added after the advertised close' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.postal_entry_id IS DISTINCT FROM OLD.postal_entry_id OR NEW.answer_correct IS DISTINCT FROM OLD.answer_correct THEN
    RAISE EXCEPTION 'a ticket''s owner, order, postal entry and answer never change' USING ERRCODE = 'P0001';
  END IF;
  IF (OLD.status = 'active') IS DISTINCT FROM (NEW.status = 'active') THEN
    IF committed THEN
      RAISE EXCEPTION 'the tickets in a committed draw cannot change' USING ERRCODE = 'P0001';
    END IF;
    IF fd_clock() >= closes AND NOT (OLD.status = 'active' AND NEW.status = 'ineligible') THEN
      RAISE EXCEPTION 'the entries cannot change after the advertised close' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER tickets_integrity_guard BEFORE INSERT OR UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION fd_tickets_integrity_guard();
--> statement-breakpoint

-- 2. A winner's owner never changes (only consent and the display name can).
CREATE FUNCTION fd_winners_owner_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.postal_entry_id IS DISTINCT FROM OLD.postal_entry_id THEN
    RAISE EXCEPTION 'a winner''s owner never changes' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER winners_owner_guard BEFORE UPDATE ON winners FOR EACH ROW EXECUTE FUNCTION fd_winners_owner_guard();
--> statement-breakpoint

-- 4. The title never changes once published; the summary, prize description and images are fixed from the close.
CREATE FUNCTION fd_competitions_text_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'draft' AND NEW.title IS DISTINCT FROM OLD.title THEN
    RAISE EXCEPTION 'a published competition''s title never changes' USING ERRCODE = 'P0001';
  END IF;
  IF (OLD.status IN ('closed', 'drawn', 'cancelled') OR (OLD.status = 'live' AND fd_clock() >= OLD.closes_at))
     AND (NEW.summary IS DISTINCT FROM OLD.summary OR NEW.prize_description IS DISTINCT FROM OLD.prize_description
          OR NEW.images IS DISTINCT FROM OLD.images) THEN
    RAISE EXCEPTION 'the prize description, summary and images cannot change after the close' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER competitions_text_guard BEFORE UPDATE ON competitions FOR EACH ROW EXECUTE FUNCTION fd_competitions_text_guard();
