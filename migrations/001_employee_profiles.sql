-- Migration 001: Employee Profile Fields
-- Run this in Supabase SQL Editor

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Location name for readable addresses (reverse geocoded)
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS location_name TEXT;

-- Pay schedule for companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS pay_schedule TEXT DEFAULT 'weekly';
