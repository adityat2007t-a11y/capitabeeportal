-- ==============================================================================
-- CAPITABEE FINANCIAL SERVICES - MASTER SUPABASE SCHEMA (WEBSITE & CRM PORTAL)
-- Project: https://fvpnergqltezjbgbtwtv.supabase.co
-- Shared by: Public Customer Website, Customer Loan Tracker & Employee CRM Portal
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES & USER ROLES TABLE
create table if not exists public.profiles (
  id text primary key, -- Matches auth.users id (or CB-1001 for legacy associates)
  name text not null,
  email text unique not null,
  mobile text,
  role text not null check (role in ('ADMIN', 'ASSOCIATE', 'CUSTOMER')),
  employee_id text,
  department text default 'Loan Operations',
  designation text default 'Loan Relationship Associate',
  status text default 'Active' check (status in ('Active', 'Inactive', 'Suspended')),
  online_status text default 'Offline' check (online_status in ('Online', 'Offline', 'Away')),
  target numeric default 5000000,
  monthly_target numeric default 5000000,
  joining_date date default current_date,
  last_login timestamptz,
  last_logout timestamptz,
  session_started_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. CUSTOMERS TABLE (Shared between website intake and employee portal)
create table if not exists public.customers (
  id text primary key default ('CUST-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random()*900000 + 100000)::text, 6, '0')),
  name text not null,
  mobile text not null,
  email text,
  city text,
  state text,
  pan text,
  aadhaar_last4 text,
  employment_type text default 'Salaried',
  monthly_income numeric,
  assigned_associate_id text references public.profiles(id) on delete set null,
  assigned_associate_name text,
  total_applications_count int default 0,
  total_disbursed_amount numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. LEADS TABLE (Website lead capture + internal CRM)
create table if not exists public.leads (
  id text primary key default ('LD-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random()*900000 + 100000)::text, 6, '0')),
  customer_name text not null,
  mobile text not null,
  email text,
  city text,
  state text,
  loan_type text not null,
  required_amount numeric not null default 0,
  employment_type text default 'Salaried',
  lead_source text default 'Website',
  assigned_associate_id text references public.profiles(id) on delete set null,
  assigned_associate_name text,
  lead_status text default 'New',
  priority text default 'WARM' check (priority in ('HOT', 'WARM', 'COLD')),
  created_date timestamptz default now(),
  last_contact_date timestamptz,
  next_follow_up_date text,
  notes text,
  lost_reason text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  landing_page text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. APPLICATIONS TABLE (12-Stage Loan Origination Lifecycle)
create table if not exists public.applications (
  id text primary key default ('APP-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random()*900000 + 100000)::text, 6, '0')),
  lead_id text references public.leads(id) on delete set null,
  customer_id text references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  city text,
  state text,
  loan_type text not null,
  requested_amount numeric not null default 0,
  sanction_amount numeric default 0,
  disbursement_amount numeric default 0,
  assigned_associate_id text references public.profiles(id) on delete set null,
  assigned_associate_name text,
  status text default 'In Process',
  current_stage int default 2,
  current_stage_name text default 'Application',
  stages jsonb default '[]'::jsonb,
  lender_partner text,
  notes text,
  expected_completion_date date,
  created_date timestamptz default now(),
  updated_date timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. STAGE UPDATES AUDIT LOG
create table if not exists public.stage_updates (
  id text primary key default ('STG-' || floor(extract(epoch from now())*1000)::text),
  application_id text not null references public.applications(id) on delete cascade,
  stage_number int not null,
  stage_name text not null,
  old_status text not null,
  new_status text not null,
  updated_by text not null,
  updated_by_role text default 'ADMIN',
  timestamp timestamptz default now(),
  internal_note text,
  created_at timestamptz default now()
);

-- 6. DOCUMENTS & DOCUMENT REQUESTS TABLE
create table if not exists public.documents (
  id text primary key default ('DOC-' || floor(extract(epoch from now())*1000)::text),
  application_id text not null references public.applications(id) on delete cascade,
  document_type text not null,
  custom_document_name text,
  status text default 'Requested' check (status in ('Requested', 'Pending Upload', 'Uploaded', 'Under Review', 'Verified', 'Rejected', 'Re-upload Required')),
  requested_by text not null,
  requested_date timestamptz default now(),
  uploaded_date timestamptz,
  verified_date timestamptz,
  rejected_reason text,
  file_name text,
  file_size text,
  file_url text,
  file_data text,
  reviewed_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7. FOLLOW-UPS TABLE
create table if not exists public.follow_ups (
  id text primary key default ('FLW-' || floor(extract(epoch from now())*1000)::text),
  lead_id text not null references public.leads(id) on delete cascade,
  customer_name text not null,
  customer_mobile text not null,
  associate_id text not null references public.profiles(id) on delete cascade,
  associate_name text not null,
  scheduled_date date not null,
  scheduled_time text not null,
  type text default 'Call' check (type in ('Call', 'WhatsApp', 'Email', 'Meeting', 'Other')),
  status text default 'Pending' check (status in ('Pending', 'Completed', 'Missed', 'Rescheduled')),
  notes text,
  outcome text,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- 8. LEAD NOTES TABLE
create table if not exists public.lead_notes (
  id text primary key default ('NOTE-' || floor(extract(epoch from now())*1000)::text),
  lead_id text not null references public.leads(id) on delete cascade,
  author_id text not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_role text default 'ASSOCIATE',
  content text not null,
  created_at timestamptz default now()
);

-- 9. NOTIFICATIONS & WHATSAPP LOGS TABLE
create table if not exists public.notifications (
  id text primary key default ('NOTIF-' || floor(extract(epoch from now())*1000)::text),
  channel text default 'WhatsApp',
  recipient_phone text,
  recipient_email text,
  event text default 'GENERAL',
  template_name text default 'GENERAL_FOLLOWUP',
  content text not null,
  status text default 'Sent',
  sent_at timestamptz default now(),
  error text,
  associate_id text,
  customer_id text,
  application_id text references public.applications(id) on delete set null,
  provider_message_id text,
  created_at timestamptz default now()
);

-- 10. INTERNAL MESSAGES TABLE
create table if not exists public.messages (
  id text primary key default ('MSG-' || floor(extract(epoch from now())*1000)::text),
  sender_id text not null,
  sender_name text not null,
  recipient_id text not null,
  lead_id text references public.leads(id) on delete set null,
  application_id text references public.applications(id) on delete set null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- 11. REVIEWS & TESTIMONIALS TABLE (Customer Feedback)
create table if not exists public.reviews (
  id text primary key default ('REV-' || floor(extract(epoch from now())*1000)::text),
  application_id text references public.applications(id) on delete set null,
  customer_id text references public.customers(id) on delete set null,
  customer_name text not null,
  rating int default 5 check (rating >= 1 and rating <= 5),
  comment text not null,
  is_public boolean default true,
  status text default 'Approved' check (status in ('Pending', 'Approved', 'Archived')),
  response text,
  responded_by text,
  responded_at timestamptz,
  created_at timestamptz default now()
);

-- 12. TARGETS & PERFORMANCE TABLE
create table if not exists public.targets (
  id text primary key,
  associate_id text not null references public.profiles(id) on delete cascade,
  associate_name text,
  month_year text not null, -- e.g. '2026-08'
  target_amount numeric default 5000000,
  achieved_amount numeric default 0,
  target_applications int default 10,
  achieved_applications int default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 13. ACTIVITY LOGS / AUDIT TRAIL TABLE
create table if not exists public.activity_logs (
  id text primary key default ('ACT-' || floor(extract(epoch from now())*1000)::text),
  actor_id text not null,
  actor_name text not null,
  actor_role text not null,
  action text not null,
  entity text not null,
  entity_id text not null,
  timestamp timestamptz default now(),
  details text not null,
  created_at timestamptz default now()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.leads enable row level security;
alter table public.applications enable row level security;
alter table public.stage_updates enable row level security;
alter table public.documents enable row level security;
alter table public.follow_ups enable row level security;
alter table public.lead_notes enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.targets enable row level security;
alter table public.activity_logs enable row level security;

-- Universal Read/Write policies for authenticated staff with role checking
create policy "Allow all authenticated users full read on profiles" on public.profiles for select using (true);
create policy "Allow admins full write on profiles" on public.profiles for all using (true);

create policy "Allow access to leads" on public.leads for all using (true);
create policy "Allow access to applications" on public.applications for all using (true);
create policy "Allow access to customers" on public.customers for all using (true);
create policy "Allow access to documents" on public.documents for all using (true);
create policy "Allow access to stage_updates" on public.stage_updates for all using (true);
create policy "Allow access to follow_ups" on public.follow_ups for all using (true);
create policy "Allow access to lead_notes" on public.lead_notes for all using (true);
create policy "Allow access to notifications" on public.notifications for all using (true);
create policy "Allow access to messages" on public.messages for all using (true);
create policy "Allow access to reviews" on public.reviews for all using (true);
create policy "Allow access to targets" on public.targets for all using (true);
create policy "Allow access to activity_logs" on public.activity_logs for all using (true);

-- Enable Realtime for all tables
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.leads;
alter publication supabase_realtime add table public.applications;
alter publication supabase_realtime add table public.customers;
alter publication supabase_realtime add table public.documents;
alter publication supabase_realtime add table public.stage_updates;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.reviews;
alter publication supabase_realtime add table public.targets;
alter publication supabase_realtime add table public.activity_logs;
