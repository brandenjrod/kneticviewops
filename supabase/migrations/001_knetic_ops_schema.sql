-- KNETIC View operational schema
-- Run this file first in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.asset_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  base_asset_prefix text not null unique,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.asset_categories is 'Stable lookup for PRS asset families used across the board and form ingestion.';

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  job_number text unique,
  job_name text,
  customer text,
  region text,
  location_name text,
  status text not null default 'active',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fleets (
  id uuid primary key default gen_random_uuid(),
  fleet_number text not null unique,
  customer text,
  fuel_type text,
  region text,
  prs_count integer,
  prs_type text,
  pressure text not null default 'Pending',
  jds_status text not null default 'Pending',
  grafana_status text not null default 'Pending',
  jotform_status text not null default 'Pending',
  notes text not null default 'Pending',
  move_status text not null default 'tbd' check (move_status in ('scheduled', 'tbd', 'permanent')),
  move_date date,
  is_archived boolean not null default false,
  job_id uuid references public.jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.fleets is 'Current fleet/job snapshot used by Fleet Ops and the rig move board.';

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_number text not null unique,
  short_code text not null unique,
  asset_category_id uuid not null references public.asset_categories(id) on delete restrict,
  display_name text not null,
  status text not null default 'standby' check (status in ('ready', 'testing', 'queue', 'oos', 'inuse', 'standby')),
  current_allocation text,
  current_row_id text,
  current_fleet_number integer references public.fleets(fleet_number) on delete set null,
  upgrade_progress numeric(5,4) check (upgrade_progress is null or (upgrade_progress >= 0 and upgrade_progress <= 1)),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.assets is 'Canonical asset registry. The UI board writes the current allocation snapshot back onto this table.';

create table if not exists public.board_rows (
  id text primary key,
  status text not null check (status in ('ready', 'testing', 'queue', 'oos', 'inuse')),
  allocation text not null,
  hp_asset_code text references public.assets(short_code) on delete set null,
  lp_asset_code text references public.assets(short_code) on delete set null,
  hr_asset_code text references public.assets(short_code) on delete set null,
  cc_asset_code text references public.assets(short_code) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.board_rows is 'Authoritative deployment/testing board rows rendered by the frontend.';

create table if not exists public.trucks (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null unique,
  vin text,
  license_plate text,
  make text,
  model text,
  vehicle_label text,
  truck_status text not null default 'Pending',
  assigned_group text,
  driver text,
  fleet_assignment text,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  form_key text not null unique,
  jotform_id text not null unique,
  form_name text not null,
  category text not null,
  primary_asset_type text,
  primary_business_process text,
  destination_table text,
  source_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  form_id uuid references public.forms(id) on delete set null,
  jotform_form_id text,
  jotform_submission_id text,
  secret_valid boolean not null default false,
  processing_status text not null default 'received' check (processing_status in ('received', 'processed', 'unmapped', 'rejected', 'failed')),
  headers jsonb not null default '{}'::jsonb,
  raw_payload jsonb,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  webhook_delivery_id uuid references public.webhook_deliveries(id) on delete set null,
  jotform_submission_id text not null unique,
  submitted_at timestamptz not null default now(),
  submitted_by_name text,
  submitted_by_email text,
  region text,
  fleet_number integer references public.fleets(fleet_number) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  customer text,
  asset_code text references public.assets(short_code) on delete set null,
  status text not null default 'processed',
  raw_payload jsonb not null,
  normalized_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  field_label text not null,
  file_url text not null,
  storage_path text,
  file_name text,
  mime_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.regulator_inspections (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.form_submissions(id) on delete cascade,
  inspection_type text not null,
  regulator_family text,
  regulator_position text,
  reason_for_inspection text,
  location_or_fleet text,
  asset_code text references public.assets(short_code) on delete set null,
  overall_condition text,
  parts_replaced text,
  workorder_number text,
  issue_summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.filter_inspections (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.form_submissions(id) on delete cascade,
  filter_type text not null,
  fleet_number integer references public.fleets(fleet_number) on delete set null,
  asset_code text references public.assets(short_code) on delete set null,
  customer text,
  region text,
  filters_replaced boolean,
  filters_replaced_detail text,
  workorder_number text,
  created_at timestamptz not null default now()
);

create table if not exists public.prs_daily_checklists (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.form_submissions(id) on delete cascade,
  fleet_number integer references public.fleets(fleet_number) on delete set null,
  control_cube_asset_code text references public.assets(short_code) on delete set null,
  hp_asset_code text references public.assets(short_code) on delete set null,
  lp_asset_code text references public.assets(short_code) on delete set null,
  hr_asset_code text references public.assets(short_code) on delete set null,
  top_rdh_status text,
  bottom_rdh_status text,
  top_ezh_status text,
  bottom_ezh_status text,
  pressure_upstream_rdh numeric,
  pressure_downstream_rdh numeric,
  pressure_upstream_ezh numeric,
  pressure_downstream_ezh numeric,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.rig_up_checklists (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.form_submissions(id) on delete cascade,
  fleet_number integer references public.fleets(fleet_number) on delete set null,
  lpcc_asset_code text references public.assets(short_code) on delete set null,
  hp_asset_code text references public.assets(short_code) on delete set null,
  lp_asset_code text references public.assets(short_code) on delete set null,
  hr_asset_code text references public.assets(short_code) on delete set null,
  region text,
  rig_up_completed_at timestamptz,
  projected_start_at timestamptz,
  requested_customer_pressure numeric,
  top_rdh_pressure numeric,
  bottom_rdh_pressure numeric,
  top_ezh_pressure numeric,
  bottom_ezh_pressure numeric,
  vg_efleet_or_dual_fuel text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.truck_transfers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.form_submissions(id) on delete cascade,
  transfer_type text not null check (transfer_type in ('pickup', 'dropoff')),
  truck_number text,
  license_plate text,
  vin_last4 text,
  employee_name text,
  department text,
  location text,
  transfer_date timestamptz,
  samsara_installed boolean,
  make text,
  model text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.prs_jds (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.form_submissions(id) on delete cascade,
  foreman_name text,
  sme_name text,
  region text,
  customer text,
  job_number text,
  fleet_number integer references public.fleets(fleet_number) on delete set null,
  rig_in_date timestamptz,
  fuel_type text,
  genset_type text,
  genset_count integer,
  job_type text,
  prs_count integer,
  expected_flow_rate_mscfd numeric,
  customer_delivery_pressure numeric,
  power_source text,
  contactors_needed integer,
  hp_hoses_needed integer,
  hp_hose_type text,
  lp_hoses_needed integer,
  lp_hose_size text,
  lp_hose_notes text,
  manifold_required boolean,
  manifold_build_notes text,
  heater_start_sp numeric,
  hp_heater_running_1_sp numeric,
  bypass_sp numeric,
  trailer_switch_sp numeric,
  rdh_block_sp numeric,
  rdh_open_sp numeric,
  hp_heater_running_2_sp numeric,
  trailer_empty_threshold numeric,
  interstage_blowdown numeric,
  trailer_switch_crossover_time numeric,
  lp_heater_start_sp numeric,
  lp_heater_running_sp numeric,
  lp_outlet_temp_lolo numeric,
  lp_outlet_pressure_hihi numeric,
  lp_outlet_temp_hihi numeric,
  lp_psv_in_use text,
  top_rdh_delivery_pressure numeric,
  bottom_rdh_delivery_pressure numeric,
  top_ezh_delivery_pressure numeric,
  bottom_ezh_delivery_pressure numeric,
  instrument_gas_pressure numeric,
  change_of_scope text,
  created_at timestamptz not null default now()
);

create table if not exists public.npt_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.form_submissions(id) on delete cascade,
  fleet_number text references public.fleets(fleet_number) on delete set null,
  customer text,
  region text,
  job_number text,
  event_started_at timestamptz,
  event_stopped_at timestamptz,
  total_hours numeric,
  issue_summary text,
  corrective_action text,
  created_at timestamptz not null default now()
);

create table if not exists public.entity_notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('asset', 'package', 'fleet')),
  entity_key text not null,
  note_text text not null,
  created_by text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('asset', 'package', 'fleet')),
  entity_key text not null,
  work_order_number text not null,
  order_text text not null,
  is_complete boolean not null default false,
  created_by text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text,
  entity_key text,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

--create index if not exists idx_fleets_move_date on public.fleets(move_date);
create index if not exists idx_assets_status on public.assets(status);
create index if not exists idx_assets_fleet on public.assets(current_fleet_number);
create index if not exists idx_board_rows_status on public.board_rows(status);
create index if not exists idx_form_submissions_form on public.form_submissions(form_id);
create index if not exists idx_form_submissions_submitted_at on public.form_submissions(submitted_at desc);
create index if not exists idx_form_submissions_fleet on public.form_submissions(fleet_number);
create index if not exists idx_entity_notes_target on public.entity_notes(entity_type, entity_key, sort_order);
create index if not exists idx_work_orders_target on public.work_orders(entity_type, entity_key, sort_order);
create index if not exists idx_webhook_deliveries_status on public.webhook_deliveries(processing_status, created_at desc);
create index if not exists idx_activity_events_occurred_at on public.activity_events(occurred_at desc);
create unique index if not exists uq_entity_notes_target on public.entity_notes(entity_type, entity_key, sort_order);
create unique index if not exists uq_work_orders_number on public.work_orders(entity_type, entity_key, work_order_number);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_jobs_updated_at on public.jobs;
create trigger trg_jobs_updated_at before update on public.jobs for each row execute procedure public.set_updated_at();

drop trigger if exists trg_fleets_updated_at on public.fleets;
create trigger trg_fleets_updated_at before update on public.fleets for each row execute procedure public.set_updated_at();

drop trigger if exists trg_assets_updated_at on public.assets;
create trigger trg_assets_updated_at before update on public.assets for each row execute procedure public.set_updated_at();

drop trigger if exists trg_board_rows_updated_at on public.board_rows;
create trigger trg_board_rows_updated_at before update on public.board_rows for each row execute procedure public.set_updated_at();

drop trigger if exists trg_trucks_updated_at on public.trucks;
create trigger trg_trucks_updated_at before update on public.trucks for each row execute procedure public.set_updated_at();

drop trigger if exists trg_form_submissions_updated_at on public.form_submissions;
create trigger trg_form_submissions_updated_at before update on public.form_submissions for each row execute procedure public.set_updated_at();

drop trigger if exists trg_work_orders_updated_at on public.work_orders;
create trigger trg_work_orders_updated_at before update on public.work_orders for each row execute procedure public.set_updated_at();

create or replace function public.sync_asset_snapshot_from_board()
returns void
language plpgsql
as $$
begin
  update public.assets
  set
    status = 'standby',
    current_allocation = 'Standby Pool',
    current_row_id = null,
    current_fleet_number = null,
    updated_at = now();

  with exploded as (
    select
      br.id as row_id,
      br.status,
      br.allocation,
      case
        when br.allocation ~* '^fleet\s*[0-9]+$'
          then regexp_replace(br.allocation, '\D', '', 'g')::integer
        else null
      end as fleet_number,
      unnest(array[br.hp_asset_code, br.lp_asset_code, br.hr_asset_code, br.cc_asset_code]) as asset_code
    from public.board_rows br
  )
  update public.assets asset
  set
    status = exploded.status,
    current_allocation = case when exploded.status = 'oos' then 'Maintenance Hold' else exploded.allocation end,
    current_row_id = exploded.row_id,
    current_fleet_number = exploded.fleet_number,
    updated_at = now()
  from exploded
  where exploded.asset_code is not null
    and exploded.asset_code = asset.short_code;
end;
$$;

create or replace view public.v_board_rows as
select
  id,
  status,
  allocation,
  hp_asset_code as hp,
  lp_asset_code as lp,
  hr_asset_code as hr,
  cc_asset_code as cc,
  sort_order,
  updated_at
from public.board_rows
order by sort_order, id;

alter table public.asset_categories enable row level security;
alter table public.jobs enable row level security;
alter table public.fleets enable row level security;
alter table public.assets enable row level security;
alter table public.board_rows enable row level security;
alter table public.trucks enable row level security;
alter table public.forms enable row level security;
alter table public.webhook_deliveries enable row level security;
alter table public.form_submissions enable row level security;
alter table public.form_submission_files enable row level security;
alter table public.regulator_inspections enable row level security;
alter table public.filter_inspections enable row level security;
alter table public.prs_daily_checklists enable row level security;
alter table public.rig_up_checklists enable row level security;
alter table public.truck_transfers enable row level security;
alter table public.prs_jds enable row level security;
alter table public.npt_events enable row level security;
alter table public.entity_notes enable row level security;
alter table public.work_orders enable row level security;
alter table public.activity_events enable row level security;
