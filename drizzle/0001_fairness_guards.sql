-- Fairness guards enforced by the database itself, so neither a bug nor an edited admin screen can get round them.
-- Do not remove or weaken these triggers: see AGENTS.md. tests/db-guards.test.ts checks every one of them.

-- 1. The audit log is append-only.
CREATE FUNCTION fd_audit_log_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only' USING ERRCODE = 'P0001';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION fd_audit_log_append_only();
--> statement-breakpoint
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON audit_log FOR EACH STATEMENT EXECUTE FUNCTION fd_audit_log_append_only();
--> statement-breakpoint

-- 2. A commitment can only be made for a live competition that has reached its close time or sold out, and must list
--    exactly the active tickets at that moment, with the advertised draw time.
CREATE FUNCTION fd_draws_before_insert() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  c record;
  active_list integer[];
BEGIN
  SELECT * INTO c FROM competitions WHERE id = NEW.competition_id FOR UPDATE;
  IF c.status <> 'live' THEN
    RAISE EXCEPTION 'a commitment needs a live competition (status is %)', c.status USING ERRCODE = 'P0001';
  END IF;
  SELECT coalesce(array_agg(number ORDER BY number), '{}') INTO active_list
    FROM tickets WHERE competition_id = NEW.competition_id AND status = 'active';
  IF now() < c.closes_at AND cardinality(active_list) < c.max_tickets THEN
    RAISE EXCEPTION 'competition has not reached its close time and has not sold out' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.ticket_list IS DISTINCT FROM active_list THEN
    RAISE EXCEPTION 'committed ticket list must equal the active tickets' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.tickets_sold <> cardinality(NEW.ticket_list) OR NEW.max_tickets <> c.max_tickets THEN
    RAISE EXCEPTION 'committed counts do not match the competition' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.scheduled_draw_at <> c.draw_at THEN
    RAISE EXCEPTION 'committed draw time must be the advertised draw time' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.randomness IS NOT NULL OR NEW.winning_tickets IS NOT NULL OR NEW.drawn_at IS NOT NULL THEN
    RAISE EXCEPTION 'a commitment cannot include a result' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER draws_before_insert BEFORE INSERT ON draws FOR EACH ROW EXECUTE FUNCTION fd_draws_before_insert();
--> statement-breakpoint

-- 3. A commitment never changes. The result is written exactly once, only after the committed drand round's time.
CREATE FUNCTION fd_draws_before_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.randomness IS NOT NULL THEN
    RAISE EXCEPTION 'this draw has already been made and cannot be changed or redone' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.competition_id IS DISTINCT FROM OLD.competition_id
     OR NEW.closed_at_text IS DISTINCT FROM OLD.closed_at_text
     OR NEW.close_unix IS DISTINCT FROM OLD.close_unix
     OR NEW.tickets_sold IS DISTINCT FROM OLD.tickets_sold
     OR NEW.max_tickets IS DISTINCT FROM OLD.max_tickets
     OR NEW.entries_hash IS DISTINCT FROM OLD.entries_hash
     OR NEW.drand_chain IS DISTINCT FROM OLD.drand_chain
     OR NEW.drand_round IS DISTINCT FROM OLD.drand_round
     OR NEW.ticket_list IS DISTINCT FROM OLD.ticket_list
     OR NEW.committed_at IS DISTINCT FROM OLD.committed_at
     OR NEW.scheduled_draw_at IS DISTINCT FROM OLD.scheduled_draw_at THEN
    RAISE EXCEPTION 'a committed draw cannot be altered' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.randomness IS NULL OR NEW.winning_tickets IS NULL OR NEW.drawn_at IS NULL THEN
    RAISE EXCEPTION 'a draw result needs randomness, winning tickets and the draw time' USING ERRCODE = 'P0001';
  END IF;
  IF now() < to_timestamp(1692803367 + (OLD.drand_round - 1) * 3) THEN
    RAISE EXCEPTION 'the committed drand round does not exist yet' USING ERRCODE = 'P0001';
  END IF;
  IF NOT (NEW.winning_tickets <@ OLD.ticket_list) THEN
    RAISE EXCEPTION 'every winning ticket must be in the committed list' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER draws_before_update BEFORE UPDATE ON draws FOR EACH ROW EXECUTE FUNCTION fd_draws_before_update();
--> statement-breakpoint
CREATE FUNCTION fd_no_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% rows are never deleted', TG_TABLE_NAME USING ERRCODE = 'P0001';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER draws_no_delete BEFORE DELETE ON draws FOR EACH ROW EXECUTE FUNCTION fd_no_delete();
--> statement-breakpoint
CREATE TRIGGER winners_no_delete BEFORE DELETE ON winners FOR EACH ROW EXECUTE FUNCTION fd_no_delete();
--> statement-breakpoint

-- 4. Tickets: new tickets only while the competition is live and not yet committed; a ticket's number and
--    competition never change.
CREATE FUNCTION fd_tickets_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  st text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT status INTO st FROM competitions WHERE id = NEW.competition_id;
    IF st IS DISTINCT FROM 'live' OR EXISTS (SELECT 1 FROM draws WHERE competition_id = NEW.competition_id) THEN
      RAISE EXCEPTION 'tickets can only be added to a live competition before its close' USING ERRCODE = 'P0001';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.number IS DISTINCT FROM OLD.number OR NEW.competition_id IS DISTINCT FROM OLD.competition_id
       OR NEW.source IS DISTINCT FROM OLD.source OR NEW.allocation IS DISTINCT FROM OLD.allocation THEN
      RAISE EXCEPTION 'a ticket''s number, competition, source and allocation never change' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.status = 'active' AND OLD.status <> 'active'
       AND EXISTS (SELECT 1 FROM draws WHERE competition_id = NEW.competition_id) THEN
      RAISE EXCEPTION 'a ticket cannot join a committed draw' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    RAISE EXCEPTION 'tickets are never deleted' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER tickets_guard BEFORE INSERT OR UPDATE OR DELETE ON tickets FOR EACH ROW EXECUTE FUNCTION fd_tickets_guard();
--> statement-breakpoint

-- 5. Competitions: once live, the price, size, cap, number of winners, skill question and times are fixed (no
--    extensions, no rollovers). Status only moves forward. Only drafts can be cancelled or deleted.
CREATE FUNCTION fd_competitions_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'only draft competitions can be deleted; finished competitions stay online' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status <> 'draft' AND (
       NEW.ticket_price_pence IS DISTINCT FROM OLD.ticket_price_pence
    OR NEW.max_tickets IS DISTINCT FROM OLD.max_tickets
    OR NEW.per_person_cap IS DISTINCT FROM OLD.per_person_cap
    OR NEW.winner_count IS DISTINCT FROM OLD.winner_count
    OR NEW.opens_at IS DISTINCT FROM OLD.opens_at
    OR NEW.closes_at IS DISTINCT FROM OLD.closes_at
    OR NEW.draw_at IS DISTINCT FROM OLD.draw_at
    OR NEW.skill_question IS DISTINCT FROM OLD.skill_question
    OR NEW.prize_value_pence IS DISTINCT FROM OLD.prize_value_pence
    OR NEW.slug IS DISTINCT FROM OLD.slug) THEN
    RAISE EXCEPTION 'a published competition''s terms, prize value and times cannot change' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
       (OLD.status = 'draft' AND NEW.status IN ('live', 'cancelled'))
    OR (OLD.status = 'live' AND NEW.status = 'closed')
    OR (OLD.status = 'closed' AND NEW.status = 'drawn')) THEN
    RAISE EXCEPTION 'competition status cannot move from % to %', OLD.status, NEW.status USING ERRCODE = 'P0001';
  END IF;
  IF NEW.status = 'closed' AND OLD.status = 'live'
     AND NOT EXISTS (SELECT 1 FROM draws WHERE competition_id = NEW.id) THEN
    RAISE EXCEPTION 'a competition closes only with a published commitment' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.status = 'drawn' AND OLD.status = 'closed'
     AND NOT EXISTS (SELECT 1 FROM draws WHERE competition_id = NEW.id AND randomness IS NOT NULL) THEN
    RAISE EXCEPTION 'a competition is drawn only with a published draw record' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER competitions_guard BEFORE UPDATE OR DELETE ON competitions FOR EACH ROW EXECUTE FUNCTION fd_competitions_guard();
--> statement-breakpoint

-- 6. Winners match the draw record; only the consent and display name can change afterwards.
CREATE FUNCTION fd_winners_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  wt integer[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT winning_tickets INTO wt FROM draws WHERE competition_id = NEW.competition_id;
    IF wt IS NULL OR NEW.position < 1 OR NEW.position > cardinality(wt) OR wt[NEW.position] <> NEW.ticket_number THEN
      RAISE EXCEPTION 'a winner must match the published draw record' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.competition_id IS DISTINCT FROM OLD.competition_id OR NEW.position IS DISTINCT FROM OLD.position
     OR NEW.ticket_number IS DISTINCT FROM OLD.ticket_number THEN
    RAISE EXCEPTION 'a winner''s ticket cannot be changed' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER winners_guard BEFORE INSERT OR UPDATE ON winners FOR EACH ROW EXECUTE FUNCTION fd_winners_guard();
