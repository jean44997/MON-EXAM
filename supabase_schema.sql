-- SQL Schema for Supabase Backend (Mon Exam V2)
-- Paste this script into the Supabase SQL Editor (https://supabase.com) and run it.

-- Enable pgcrypto extension for SHA256 hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing functions/tables if they exist (clean setup)
DROP FUNCTION IF EXISTS init_session(text, text);
DROP FUNCTION IF EXISTS create_order(text, text, jsonb, text, text, text, text);
DROP FUNCTION IF EXISTS simulate_payment(text, text, text, text);
DROP FUNCTION IF EXISTS get_user_order(text, text);
DROP FUNCTION IF EXISTS get_user_purchases(text);
DROP FUNCTION IF EXISTS get_user_notifications(text);
DROP FUNCTION IF EXISTS delete_user_order(text, text);
DROP FUNCTION IF EXISTS admin_get_orders(text);
DROP FUNCTION IF EXISTS admin_action(text, text, text);

DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS sessions;

-- Create Sessions Table
CREATE TABLE sessions (
  user_id text PRIMARY KEY,
  country_code text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Orders Table
CREATE TABLE orders (
  order_id text PRIMARY KEY,
  user_id text NOT NULL,
  phone text NOT NULL,
  items jsonb NOT NULL,
  service text NOT NULL,
  pack text NOT NULL,
  country_code text NOT NULL,
  amount integer NOT NULL,
  currency text DEFAULT 'XOF' NOT NULL,
  payment_method text NOT NULL,
  payment_number text NOT NULL,
  activation_code text NOT NULL,
  internal_token text NOT NULL,
  code_salt text NOT NULL,
  code_hash text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  submitted_at timestamp with time zone,
  validated_at timestamp with time zone,
  refused_at timestamp with time zone,
  txn_ref text,
  used boolean DEFAULT false NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Enable Row Level Security (RLS) as defense in depth
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Since we use secure SECURITY DEFINER RPC functions for database queries/mutations,
-- we do not need to allow direct public REST access to the tables.
-- The RPC functions will securely bypass RLS to run validations and return authorized data.


-- -------------------------------------------------------------
-- 1. Initialize Session
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION init_session(
  p_user_id text,
  p_country_code text
) RETURNS json AS $$
BEGIN
  INSERT INTO sessions (user_id, country_code, created_at)
  VALUES (p_user_id, p_country_code, now())
  ON CONFLICT (user_id) DO UPDATE SET country_code = p_country_code;

  RETURN json_build_object(
    'user_id', p_user_id,
    'country_code', p_country_code,
    'created_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -------------------------------------------------------------
-- 2. Create Order (Checkout)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_order(
  p_user_id text,
  p_phone text,
  p_items jsonb,
  p_service text,
  p_pack text,
  p_country_code text,
  p_payment_method text
) RETURNS json AS $$
DECLARE
  v_amount integer;
  v_price_single integer := 8000;
  v_price_pack5 integer := 35000;
  v_price_exam integer := 13000;
  v_price_pack6 integer := 50000;
  v_order_id text;
  v_activation_code text;
  v_internal_token text;
  v_salt text;
  v_code_hash text;
  v_created_at timestamp with time zone;
  v_expires_at timestamp with time zone;
  v_payment_number text;
  v_wave_number text := '+225 05 45 01 94 93';
  v_orange_number text := '+225 07 48 11 10 50';
  v_item_count integer;
  v_result json;
BEGIN
  -- Verify session
  IF NOT EXISTS (SELECT 1 FROM sessions WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Session invalide';
  END IF;

  -- Verify items
  v_item_count := jsonb_array_length(p_items);
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Panier vide';
  END IF;

  -- Compute amount
  IF p_pack = 'single' THEN
    v_amount := v_price_single * v_item_count;
  ELSIF p_pack = 'exam' THEN
    v_amount := v_price_exam * v_item_count;
  ELSIF p_pack = 'pack5' THEN
    v_amount := v_price_pack5;
  ELSIF p_pack = 'pack6' THEN
    v_amount := v_price_pack6;
  ELSE
    v_amount := v_price_single * v_item_count;
  END IF;

  -- Generate order_id (ORD-XXXXXX)
  v_order_id := 'ORD-' || upper(substring(md5(random()::text) from 1 for 8));
  
  -- Generate activation_code (8 random characters)
  v_activation_code := upper(substring(md5(random()::text) from 1 for 8));
  
  -- Generate internal_token (32 hex)
  v_internal_token := md5(random()::text);

  -- Salt
  v_salt := substring(md5(random()::text) from 1 for 16);
  
  -- Hash code: sha256(activation_code | user_id | salt)
  v_code_hash := encode(sha256((v_activation_code || '|' || p_user_id || '|' || v_salt)::bytea), 'hex');

  v_created_at := now();
  v_expires_at := v_created_at + interval '5 minutes';

  IF p_payment_method = 'wave' THEN
    v_payment_number := v_wave_number;
  ELSE
    v_payment_number := v_orange_number;
  END IF;

  -- Insert order
  INSERT INTO orders (
    order_id, user_id, phone, items, service, pack, country_code, amount, currency,
    payment_method, payment_number, activation_code, internal_token, code_salt, code_hash,
    status, created_at, expires_at, used
  ) VALUES (
    v_order_id, p_user_id, p_phone, p_items, p_service, p_pack, p_country_code, v_amount, 'XOF',
    p_payment_method, v_payment_number, v_activation_code, v_internal_token, v_salt, v_code_hash,
    'pending', v_created_at, v_expires_at, false
  );

  v_result := json_build_object(
    'order_id', v_order_id,
    'activation_code', v_activation_code,
    'amount', v_amount,
    'currency', 'XOF',
    'expires_at', to_char(v_expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'status', 'pending',
    'payment_method', p_payment_method,
    'payment_number', v_payment_number,
    'items', p_items,
    'service', p_service,
    'pack', p_pack,
    'created_at', to_char(v_created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'seconds_remaining', 300
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -------------------------------------------------------------
-- 3. Simulate Payment
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION simulate_payment(
  p_order_id text,
  p_user_id text,
  p_txn_ref text,
  p_activation_code text
) RETURNS json AS $$
DECLARE
  v_order record;
  v_expected_hash text;
BEGIN
  -- Find order
  SELECT * INTO v_order FROM orders WHERE order_id = p_order_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  -- Verify activation code hash
  v_expected_hash := encode(sha256((upper(p_activation_code) || '|' || p_user_id || '|' || v_order.code_salt)::bytea), 'hex');
  IF v_expected_hash != v_order.code_hash THEN
    RAISE EXCEPTION 'Code d''activation incorrect';
  END IF;

  -- Check if used
  IF v_order.used THEN
    RAISE EXCEPTION 'Code déjà utilisé';
  END IF;

  -- Check if expired
  IF now() > v_order.expires_at THEN
    UPDATE orders SET status = 'expired' WHERE order_id = p_order_id;
    RAISE EXCEPTION 'Délai expiré, recommencez';
  END IF;

  -- Update order
  UPDATE orders SET
    status = 'awaiting_validation',
    txn_ref = p_txn_ref,
    submitted_at = now()
  WHERE order_id = p_order_id;

  RETURN json_build_object(
    'ok', true,
    'status', 'awaiting_validation',
    'message', 'Paiement soumis. En attente de validation par notre équipe.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -------------------------------------------------------------
-- 4. Get User Order Details
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_order(
  p_order_id text,
  p_user_id text
) RETURNS json AS $$
DECLARE
  v_order record;
  v_remaining integer;
BEGIN
  SELECT * INTO v_order FROM orders WHERE order_id = p_order_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  -- Expiry check
  IF v_order.status = 'pending' AND now() > v_order.expires_at THEN
    UPDATE orders SET status = 'expired' WHERE order_id = p_order_id;
    v_order.status := 'expired';
  END IF;

  v_remaining := EXTRACT(EPOCH FROM (v_order.expires_at - now()))::integer;
  IF v_remaining < 0 THEN
    v_remaining := 0;
  END IF;

  RETURN json_build_object(
    'order_id', v_order.order_id,
    'user_id', v_order.user_id,
    'phone', v_order.phone,
    'amount', v_order.amount,
    'currency', v_order.currency,
    'status', v_order.status,
    'payment_method', v_order.payment_method,
    'payment_number', v_order.payment_number,
    'activation_code', v_order.activation_code,
    'txn_ref', v_order.txn_ref,
    'items', v_order.items,
    'service', v_order.service,
    'pack', v_order.pack,
    'created_at', to_char(v_order.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'expires_at', to_char(v_order.expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'seconds_remaining', v_remaining
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -------------------------------------------------------------
-- 5. Get User Purchases
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_purchases(
  p_user_id text
) RETURNS json AS $$
DECLARE
  v_purchases json;
BEGIN
  -- Passive cleanup of expired orders for this user
  UPDATE orders SET status = 'expired' WHERE status = 'pending' AND expires_at < now() AND user_id = p_user_id;

  SELECT json_agg(t) INTO v_purchases FROM (
    SELECT order_id, user_id, phone, amount, status, payment_method, payment_number, activation_code, txn_ref, items, service, pack, created_at, expires_at, submitted_at, validated_at, refused_at
    FROM orders
    WHERE user_id = p_user_id AND status IN ('paid', 'awaiting_validation', 'refused')
    ORDER BY created_at DESC
  ) t;

  RETURN json_build_object(
    'purchases', COALESCE(v_purchases, '[]'::json),
    'count', COALESCE(json_array_length(v_purchases), 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -------------------------------------------------------------
-- 6. Get User Notifications
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_user_id text
) RETURNS json AS $$
DECLARE
  v_notifications json;
BEGIN
  SELECT json_agg(t) INTO v_notifications FROM (
    SELECT order_id, status, validated_at, refused_at, submitted_at, amount, service
    FROM orders
    WHERE user_id = p_user_id AND status IN ('paid', 'refused', 'awaiting_validation')
    ORDER BY created_at DESC
    LIMIT 10
  ) t;

  RETURN json_build_object(
    'notifications', COALESCE(v_notifications, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -------------------------------------------------------------
-- 7. Delete User Order
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_user_order(
  p_order_id text,
  p_user_id text
) RETURNS json AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM orders WHERE order_id = p_order_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable';
  END IF;

  IF v_status = 'paid' THEN
    RAISE EXCEPTION 'Impossible de supprimer une commande payée';
  END IF;

  DELETE FROM orders WHERE order_id = p_order_id AND user_id = p_user_id;

  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -------------------------------------------------------------
-- 8. Admin: Get Orders and Counts
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_get_orders(
  p_admin_code text
) RETURNS json AS $$
DECLARE
  v_orders json;
  v_counts json;
BEGIN
  -- Security check
  IF p_admin_code != 'MESSI10@@.COM' THEN
    RAISE EXCEPTION 'Code admin incorrect';
  END IF;

  -- Passive cleanup of all expired orders
  UPDATE orders SET status = 'expired' WHERE status = 'pending' AND expires_at < now();

  -- Get counts
  SELECT json_build_object(
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'awaiting_validation', COUNT(*) FILTER (WHERE status = 'awaiting_validation'),
    'paid', COUNT(*) FILTER (WHERE status = 'paid'),
    'refused', COUNT(*) FILTER (WHERE status = 'refused'),
    'expired', COUNT(*) FILTER (WHERE status = 'expired')
  ) INTO v_counts FROM orders;

  -- Get orders (limit 200)
  SELECT json_agg(t) INTO v_orders FROM (
    SELECT order_id, user_id, phone, amount, status, payment_method, payment_number, activation_code, txn_ref, items, service, pack, 
           to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
           to_char(expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as expires_at,
           to_char(submitted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as submitted_at,
           to_char(validated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as validated_at,
           to_char(refused_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as refused_at
    FROM orders
    ORDER BY created_at DESC
    LIMIT 200
  ) t;

  RETURN json_build_object(
    'orders', COALESCE(v_orders, '[]'::json),
    'counts', v_counts
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -------------------------------------------------------------
-- 9. Admin: Perform Action on Order
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_action(
  p_admin_code text,
  p_order_id text,
  p_action text
) RETURNS json AS $$
BEGIN
  -- Security check
  IF p_admin_code != 'MESSI10@@.COM' THEN
    RAISE EXCEPTION 'Code admin incorrect';
  END IF;

  IF p_action = 'accept' THEN
    UPDATE orders SET
      status = 'paid',
      used = true,
      validated_at = now()
    WHERE order_id = p_order_id;
  ELSIF p_action = 'refuse' THEN
    UPDATE orders SET
      status = 'refused',
      refused_at = now()
    WHERE order_id = p_order_id;
  ELSIF p_action = 'delete' THEN
    DELETE FROM orders WHERE order_id = p_order_id;
  ELSE
    RAISE EXCEPTION 'Action invalide';
  END IF;

  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
