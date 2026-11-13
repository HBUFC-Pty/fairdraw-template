-- DCMS Voluntary Code of Good Practice for Prize Draw Operators, clause 1.3 (Open Government Licence v3.0):
-- "Operators should not accept credit card payments in excess of £250 per month per player (“credit card limit”).
-- Operators should not accept any credit card payments whatsoever for any instant win prize draws."
-- The application enforces this (src/lib/checkout/credit-card-rule.ts). These triggers are the backstop: the database
-- refuses to capture a credit (or unknown) funded payment that would break either rule, whatever the code does.
-- Do not remove or weaken them: see AGENTS.md.

-- 1. Whether a competition is an instant win prize draw is fixed once it is published.
CREATE OR REPLACE FUNCTION fd_competitions_guard() RETURNS trigger LANGUAGE plpgsql AS $$
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
    OR NEW.is_instant_win IS DISTINCT FROM OLD.is_instant_win
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

-- 2. A credit or unknown funded order may only move to capture if it holds no instant win tickets and keeps the player
--    within £250 (25000 pence, the code's figure) of credit card payments in the calendar month in UK time.
CREATE FUNCTION fd_orders_credit_card_rule() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  month_start timestamptz;
  used integer;
BEGIN
  IF NEW.status = 'capturing' AND OLD.status IS DISTINCT FROM 'capturing'
     AND coalesce(NEW.payment_funding, 'unknown') IN ('credit', 'unknown') THEN
    IF EXISTS (
      SELECT 1 FROM tickets t JOIN competitions c ON c.id = t.competition_id
      WHERE t.order_id = NEW.id AND c.is_instant_win AND t.status IN ('reserved', 'active')) THEN
      RAISE EXCEPTION 'credit card payments are not accepted for instant win prize draws (DCMS code 1.3)' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.decided_at IS NULL THEN
      RAISE EXCEPTION 'a captured payment needs its decision time' USING ERRCODE = 'P0001';
    END IF;
    month_start := date_trunc('month', NEW.decided_at AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London';
    SELECT coalesce(sum(capture_pence), 0) INTO used FROM orders
      WHERE user_id = NEW.user_id AND id <> NEW.id
        AND coalesce(payment_funding, 'unknown') IN ('credit', 'unknown')
        AND status IN ('capturing', 'paid', 'partially_refunded', 'refunded')
        AND decided_at >= month_start AND decided_at < month_start + interval '1 month';
    IF used + coalesce(NEW.capture_pence, 0) > 25000 THEN
      RAISE EXCEPTION 'credit card payments would exceed £250 this month for this player (DCMS code 1.3)' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER orders_credit_card_rule BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION fd_orders_credit_card_rule();
