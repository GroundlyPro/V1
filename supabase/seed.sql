-- =============================================================
-- Groundly PRO Demo Seed Data — Plum Landscaping
-- Run AFTER all migrations have been applied.
-- Requires: a real Supabase Auth user to exist first.
-- Update the UUIDs below to match your actual auth user.
-- =============================================================

-- Step 1: Create the demo business
-- Replace 'YOUR_AUTH_USER_ID' with the UUID from auth.users
-- after signing up via the app.

DO $$
DECLARE
  v_auth_user_id uuid;
  v_business_id uuid := '00000000-0000-0000-0000-000000000001';
  v_owner_id uuid := '00000000-0000-0000-0000-000000000002';
  v_ben_id uuid := '00000000-0000-0000-0000-000000000010';
  v_robin_id uuid := '00000000-0000-0000-0000-000000000011';
  v_kale_id uuid := '00000000-0000-0000-0000-000000000012';
  v_vera_id uuid := '00000000-0000-0000-0000-000000000013';
  v_bob_id uuid := '00000000-0000-0000-0000-000000000014';
  v_job1_id uuid := '00000000-0000-0000-0000-000000000020';
  v_job2_id uuid := '00000000-0000-0000-0000-000000000021';
  v_job3_id uuid := '00000000-0000-0000-0000-000000000022';
  v_svc1_id uuid := '00000000-0000-0000-0000-000000000030';
  v_svc2_id uuid := '00000000-0000-0000-0000-000000000031';
  v_svc3_id uuid := '00000000-0000-0000-0000-000000000032';
  v_req1_id uuid := '00000000-0000-0000-0000-000000000040';
  v_req2_id uuid := '00000000-0000-0000-0000-000000000041';
BEGIN
  -- Get the first auth user (the one who signed up)
  SELECT id INTO v_auth_user_id FROM auth.users ORDER BY created_at LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    RAISE NOTICE 'No auth user found. Sign up first, then run seed.';
    RETURN;
  END IF;

  -- Business
  INSERT INTO businesses (id, name, owner_id, email, phone, city, state, zip, country, timezone, plan, plan_status)
  VALUES (
    v_business_id,
    'Plum Landscaping',
    v_auth_user_id,
    'hello@plumlandscaping.com',
    '(555) 234-5678',
    'Austin',
    'TX',
    '78701',
    'US',
    'America/Chicago',
    'pro',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Owner user record
  INSERT INTO users (id, business_id, auth_user_id, first_name, last_name, email, phone, role)
  VALUES (
    v_owner_id,
    v_business_id,
    v_auth_user_id,
    'Nathaniel',
    'P',
    'nathaniel@plumlandscaping.com',
    '(555) 234-5678',
    'owner'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Services
  INSERT INTO services (id, business_id, name, description, unit_price, unit_cost, unit, category)
  VALUES
    (v_svc1_id, v_business_id, 'Mulch Bed Maintenance', 'Clean, edge, and refresh mulch beds', 350.00, 80.00, 'flat', 'landscaping'),
    (v_svc2_id, v_business_id, 'General Maintenance', 'Mow, trim, blow, and edge full property', 185.00, 40.00, 'flat', 'landscaping'),
    (v_svc3_id, v_business_id, 'Red Mulch Install', 'Supply and install red hardwood mulch (per yard)', 75.00, 35.00, 'unit', 'landscaping')
  ON CONFLICT (id) DO NOTHING;

  -- Clients
  INSERT INTO clients (id, business_id, first_name, last_name, email, phone, type, status, lead_source)
  VALUES
    (v_ben_id, v_business_id, 'Ben', 'Cook', 'ben.cook@email.com', '(555) 111-2222', 'residential', 'active', 'referral'),
    (v_robin_id, v_business_id, 'Robin', 'Schneider', 'robin.s@email.com', '(555) 333-4444', 'residential', 'active', 'google'),
    (v_kale_id, v_business_id, 'Kale', 'Salad Express', 'info@kalesaladexpress.com', '(555) 555-6666', 'commercial', 'active', 'referral'),
    (v_vera_id, v_business_id, 'Vera', 'Lee', 'vera.lee@email.com', '(555) 777-8888', 'residential', 'active', 'website'),
    (v_bob_id, v_business_id, 'Bob', 'McInnis', 'bob.mc@email.com', '(555) 999-0000', 'residential', 'lead', 'google')
  ON CONFLICT (id) DO NOTHING;

  -- Client addresses
  INSERT INTO client_addresses (client_id, business_id, street1, city, state, zip, country, is_primary)
  VALUES
    (v_ben_id, v_business_id, '412 Maple Dr', 'Austin', 'TX', '78702', 'US', true),
    (v_robin_id, v_business_id, '88 Sunflower Ln', 'Austin', 'TX', '78704', 'US', true),
    (v_kale_id, v_business_id, '1200 Commerce Blvd', 'Austin', 'TX', '78741', 'US', true),
    (v_vera_id, v_business_id, '34 Elmwood Circle', 'Austin', 'TX', '78731', 'US', true),
    (v_bob_id, v_business_id, '609 Oak Ridge Rd', 'Austin', 'TX', '78758', 'US', true)
  ON CONFLICT DO NOTHING;

  -- Jobs
  INSERT INTO jobs (id, business_id, client_id, job_number, title, type, status, start_date, total_price)
  VALUES
    (v_job1_id, v_business_id, v_ben_id, 'JOB-1001', 'Mulch Bed Maintenance', 'one_off', 'active', CURRENT_DATE, 945.00),
    (v_job2_id, v_business_id, v_kale_id, 'JOB-1002', 'General Maintenance', 'recurring', 'active', CURRENT_DATE - 30, 7500.00),
    (v_job3_id, v_business_id, v_robin_id, 'JOB-1003', 'Red Mulch Install', 'one_off', 'completed', CURRENT_DATE - 14, 1083.00)
  ON CONFLICT (id) DO NOTHING;

  -- Job line items
  INSERT INTO job_line_items (job_id, business_id, service_id, name, quantity, unit_price, total)
  VALUES
    (v_job1_id, v_business_id, v_svc1_id, 'Mulch Bed Maintenance', 1, 945.00, 945.00),
    (v_job2_id, v_business_id, v_svc2_id, 'General Maintenance (monthly)', 1, 7500.00, 7500.00),
    (v_job3_id, v_business_id, v_svc3_id, 'Red Mulch Install (14.4 yards)', 14.4, 75.00, 1080.00),
    (v_job3_id, v_business_id, NULL, 'Delivery fee', 1, 3.00, 3.00)
  ON CONFLICT DO NOTHING;

  -- Job visits
  INSERT INTO job_visits (job_id, business_id, title, scheduled_date, status)
  VALUES
    (v_job1_id, v_business_id, 'Visit 1', CURRENT_DATE + 2, 'scheduled'),
    (v_job2_id, v_business_id, 'April Maintenance', CURRENT_DATE + 5, 'scheduled'),
    (v_job2_id, v_business_id, 'May Maintenance', CURRENT_DATE + 35, 'scheduled'),
    (v_job3_id, v_business_id, 'Install Day', CURRENT_DATE - 14, 'completed')
  ON CONFLICT DO NOTHING;

  -- Invoices: #1191 ($945), #1188 ($7500), #1185 ($1083)
  INSERT INTO invoices (business_id, client_id, job_id, invoice_number, status, issue_date, due_date, subtotal, total, balance)
  VALUES
    (v_business_id, v_ben_id, v_job1_id, 'INV-1191', 'sent', CURRENT_DATE - 3, CURRENT_DATE + 27, 945.00, 945.00, 945.00),
    (v_business_id, v_kale_id, v_job2_id, 'INV-1188', 'past_due', CURRENT_DATE - 45, CURRENT_DATE - 15, 7500.00, 7500.00, 7500.00),
    (v_business_id, v_robin_id, v_job3_id, 'INV-1185', 'paid', CURRENT_DATE - 10, CURRENT_DATE - 10, 1083.00, 1083.00, 0.00)
  ON CONFLICT DO NOTHING;

  -- Requests
  INSERT INTO requests (id, business_id, first_name, last_name, email, phone, address, service_type, message, source, status)
  VALUES
    (v_req1_id, v_business_id, 'Maya', 'Patel', 'maya.patel@email.com', '(555) 222-3333', '711 Cedar Park Dr, Austin, TX 78726', 'Seasonal cleanup', 'Front beds need cleanup before the first weekend of May.', 'booking_widget', 'new'),
    (v_req2_id, v_business_id, 'Jon', 'Rivera', 'jon.rivera@email.com', '(555) 444-1212', '89 Vista Ridge Ct, Austin, TX 78735', 'Irrigation repair', 'Sprinkler zone near the driveway is leaking.', 'phone', 'in_review')
  ON CONFLICT (id) DO NOTHING;

END $$;
