-- Profitability recalculation on jobs
CREATE OR REPLACE FUNCTION recalculate_job_profitability()
RETURNS TRIGGER AS $$
DECLARE
  v_job_id uuid;
  v_total_line_item_cost numeric;
  v_total_labor_cost numeric;
  v_total_expenses numeric;
  v_total_price numeric;
  v_profit numeric;
  v_margin numeric;
BEGIN
  -- Determine which job to update
  IF TG_TABLE_NAME = 'job_line_items' THEN
    v_job_id := COALESCE(NEW.job_id, OLD.job_id);
  ELSIF TG_TABLE_NAME = 'labor_entries' THEN
    v_job_id := COALESCE(NEW.job_id, OLD.job_id);
  ELSIF TG_TABLE_NAME = 'expenses' THEN
    v_job_id := COALESCE(NEW.job_id, OLD.job_id);
  END IF;

  SELECT
    COALESCE(SUM(unit_cost * quantity), 0),
    COALESCE(SUM(unit_price * quantity), 0)
  INTO v_total_line_item_cost, v_total_price
  FROM job_line_items WHERE job_id = v_job_id;

  SELECT COALESCE(SUM(total_cost), 0) INTO v_total_labor_cost
  FROM labor_entries WHERE job_id = v_job_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
  FROM expenses WHERE job_id = v_job_id;

  v_profit := v_total_price - v_total_line_item_cost - v_total_labor_cost - v_total_expenses;
  v_margin := CASE WHEN v_total_price > 0 THEN (v_profit / v_total_price) * 100 ELSE 0 END;

  UPDATE jobs SET
    total_price = v_total_price,
    total_cost = v_total_line_item_cost + v_total_labor_cost + v_total_expenses,
    profit = v_profit,
    profit_margin = v_margin
  WHERE id = v_job_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER recalc_profit_on_line_items
  AFTER INSERT OR UPDATE OR DELETE ON job_line_items
  FOR EACH ROW EXECUTE FUNCTION recalculate_job_profitability();

CREATE TRIGGER recalc_profit_on_labor
  AFTER INSERT OR UPDATE OR DELETE ON labor_entries
  FOR EACH ROW EXECUTE FUNCTION recalculate_job_profitability();

CREATE TRIGGER recalc_profit_on_expenses
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION recalculate_job_profitability();

-- Client balance cache: update clients.balance when invoices or payments change
CREATE OR REPLACE FUNCTION update_client_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_client_id uuid;
  v_balance numeric;
BEGIN
  v_client_id := COALESCE(NEW.client_id, OLD.client_id);

  SELECT COALESCE(SUM(balance), 0) INTO v_balance
  FROM invoices
  WHERE client_id = v_client_id AND status NOT IN ('void', 'paid');

  UPDATE clients SET balance = v_balance WHERE id = v_client_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_balance_on_invoice_change
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_client_balance();

CREATE TRIGGER update_balance_on_payment
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_client_balance();

-- Auto-update invoice balance when amount_paid changes
CREATE OR REPLACE FUNCTION sync_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
  NEW.balance := NEW.total - NEW.amount_paid;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_invoice_balance_trigger
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_balance();

-- Auto-update invoice amount_paid and status when a payment is recorded
CREATE OR REPLACE FUNCTION apply_payment_to_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid numeric;
  v_invoice_total numeric;
BEGIN
  IF NEW.status = 'succeeded' THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM payments WHERE invoice_id = NEW.invoice_id AND status = 'succeeded';

    SELECT total INTO v_invoice_total FROM invoices WHERE id = NEW.invoice_id;

    UPDATE invoices SET
      amount_paid = v_total_paid,
      status = CASE WHEN v_total_paid >= v_invoice_total THEN 'paid' ELSE status END,
      paid_at = CASE WHEN v_total_paid >= v_invoice_total THEN now() ELSE paid_at END
    WHERE id = NEW.invoice_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER apply_payment_trigger
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION apply_payment_to_invoice();
