-- Migration 003: Employee Schedules
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_schedules_employee ON schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_schedules_company ON schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(shift_date);

-- RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Owners can manage their company's schedules
CREATE POLICY "Owners manage schedules" ON schedules
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid() AND user_type = 'owner'
    )
  );

-- Employees can view their own schedules
CREATE POLICY "Employees view own schedules" ON schedules
  FOR SELECT USING (
    employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  );
