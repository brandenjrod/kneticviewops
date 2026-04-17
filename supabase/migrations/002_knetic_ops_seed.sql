-- KNETIC View starter data
-- Run this file after 001_knetic_ops_schema.sql.

insert into public.asset_categories (code, label, base_asset_prefix, display_order)
values
  ('HP', 'High Pressure', '06-02-001', 1),
  ('LP', 'Low Pressure', '06-03-001', 2),
  ('HR', 'Hose Reel', '06-04-001', 3),
  ('CC', 'Control Cube', '06-05-001', 4)
on conflict (code) do update
set
  label = excluded.label,
  base_asset_prefix = excluded.base_asset_prefix,
  display_order = excluded.display_order;

insert into public.assets (asset_number, short_code, asset_category_id, display_name)
select
  category.base_asset_prefix || '-' || lpad(series.value::text, 3, '0') as asset_number,
  category.code || lpad(series.value::text, 2, '0') as short_code,
  category.id,
  category.label || ' ' || lpad(series.value::text, 2, '0') as display_name
from public.asset_categories category
cross join generate_series(1, 60) as series(value)
on conflict (short_code) do update
set
  asset_number = excluded.asset_number,
  asset_category_id = excluded.asset_category_id,
  display_name = excluded.display_name;

update public.assets
set upgrade_progress = case short_code
  when 'CC01' then 1.0
  when 'CC02' then 0.2
  when 'CC03' then 0.4
  when 'CC05' then 0.6
  when 'CC06' then 0.8
  when 'CC08' then 1.0
  else null
end
where short_code like 'CC%';

insert into public.fleets (
  fleet_number,
  customer,
  fuel_type,
  region,
  prs_count,
  prs_type,
  move_status,
  move_date,
  is_archived
)
values
  (2, 'Conoco', 'CNG', 'Permian & Delaware', 1, 'PRS Retrofit', 'scheduled', '2026-03-23', false),
  (4, 'Aethon', 'FG', 'ETX', 1, 'LP Only', 'scheduled', '2026-05-05', false),
  (5, 'Civitas', 'CNG', 'Colorado', 1, 'PRS Retrofit', 'scheduled', '2026-03-28', false),
  (8, 'Diamondback', 'CNG / FG', 'Permian', 1, 'PRS Retrofit', 'tbd', null, false),
  (14, 'Diamondback', 'CNG / FG', 'Permian', 1, 'PRS Retrofit', 'tbd', null, false),
  (25, 'Exxon', 'CNG / FG', 'Permian', 1, 'LPCC Retrofit', 'tbd', null, false),
  (35, 'Ovintiv', 'CNG', 'Permian', 1, 'LPCC Retrofit', 'tbd', null, false),
  (38, 'Chevron', 'CNG?', 'Colorado', 2, 'PRS Retrofit', 'scheduled', '2026-03-21', false),
  (41, 'Exxon', 'CNG / FG', 'Permian & Delaware', 1, 'PRS Retrofit', 'scheduled', '2026-03-17', false),
  (50, 'OXY', 'CNG??', 'Delaware', 2, 'PRS Retrofit', 'scheduled', '2026-04-09', false),
  (51, 'Hess Corp', 'CNG??', 'North Dakota', 2, 'PRS Retrofit', 'scheduled', '2026-03-25', false),
  (57, 'Aethon', 'FG', 'ETX', 1, 'LP Only', 'tbd', null, false),
  (61, 'South32', 'CNG??', 'Arizona', 2, '1x PRS / 1x PRS Retrofit', 'permanent', null, false),
  (91, 'Diamondback', 'CNG / FG', 'Permian', 1, 'PRS Retrofit', 'scheduled', '2026-03-23', false),
  (93, 'Matador', 'CNG / FG??', 'Delaware', 2, 'PRS Retrofit', 'tbd', null, false),
  (101, 'Warren CAT', 'CNG', 'Permian', 1, 'PRS Retrofit', 'permanent', null, false),
  (120, 'OXY', 'CNG / FG??', 'Delaware', 1, 'PRS Retrofit', 'tbd', null, false),
  (135, 'Diamondback', 'CNG / FG', 'Permian', 1, 'PRS Retrofit', 'scheduled', '2026-03-23', false),
  (157, 'Oracle', 'FG', 'Data Center', 4, 'LP Only', 'permanent', null, false),
  (159, 'Oracle', 'CNG', 'Data Center', 2, 'LPCC Retrofit', 'scheduled', '2026-03-31', false),
  (175, 'QTS', 'CNG', 'Data Center', 2, 'LPCC Retrofit', 'permanent', null, false),
  (178, 'Vantage', 'CNG', 'Data Center', 3, 'LPCC Retrofit', 'permanent', null, false),
  (180, 'Chevron', 'CNG / FG', 'Permian', 1, 'PRS Retrofit', 'scheduled', '2026-03-26', false),
  (187, 'Chevron', 'CNG / FG??', 'Delaware', 1, 'LPCC Retrofit', 'scheduled', '2026-04-01', false)
on conflict (fleet_number) do update
set
  customer = excluded.customer,
  fuel_type = excluded.fuel_type,
  region = excluded.region,
  prs_count = excluded.prs_count,
  prs_type = excluded.prs_type,
  move_status = excluded.move_status,
  move_date = excluded.move_date,
  is_archived = excluded.is_archived;

insert into public.board_rows (id, status, allocation, hp_asset_code, lp_asset_code, hr_asset_code, cc_asset_code, sort_order)
values
  ('ROW-001', 'ready', 'Standby', 'HP17', 'LP40', null, 'CC15', 1),
  ('ROW-002', 'ready', 'Standby', 'HP30', 'LP27', null, 'CC37', 2),
  ('ROW-003', 'ready', 'Standby', 'HP10', 'LP11', null, 'CC21', 3),
  ('ROW-004', 'ready', 'Standby', 'HP28', 'LP08', 'HR08', 'CC22', 4),
  ('ROW-005', 'testing', 'Testing', 'HP06', 'LP49', null, 'CC23', 5),
  ('ROW-006', 'testing', 'Testing', 'HP16', 'LP18', null, 'CC09', 6),
  ('ROW-007', 'queue', 'In Queue', 'HP18', 'LP03', 'HR09', 'CC17', 7),
  ('ROW-008', 'queue', 'In Queue', 'HP46', 'LP10', 'HR11', 'CC20', 8),
  ('ROW-009', 'oos', 'Standby', 'HP02', null, null, null, 9),
  ('ROW-010', 'oos', 'Standby', 'HP05', null, null, null, 10),
  ('ROW-011', 'oos', 'Standby', 'HP11', null, null, null, 11),
  ('ROW-012', 'oos', 'Standby', 'HP08', null, null, null, 12),
  ('ROW-013', 'oos', 'Standby', 'HP21', null, null, null, 13),
  ('ROW-014', 'oos', 'Standby', 'HP29', null, null, null, 14),
  ('ROW-015', 'oos', 'Standby', 'HP03', null, null, null, 15),
  ('ROW-016', 'oos', 'Standby', 'HP13', null, null, null, 16),
  ('ROW-017', 'oos', 'Standby', 'HP32', null, null, null, 17),
  ('ROW-018', 'oos', 'Standby', 'HP50', null, null, null, 18),
  ('ROW-019', 'oos', 'Standby', null, 'LP04', null, null, 19),
  ('ROW-020', 'inuse', 'Fleet 2', 'HP34', 'LP06', 'HR26', 'CC40', 20),
  ('ROW-021', 'inuse', 'Fleet 4', null, 'LP23', 'HR16', 'CC14', 21),
  ('ROW-022', 'inuse', 'Fleet 5', 'HP14', 'LP16', 'HR06', 'CC42', 22),
  ('ROW-023', 'inuse', 'Fleet 8', 'HP24', 'LP50', 'HR23', 'CC39', 23),
  ('ROW-024', 'inuse', 'Fleet 14', 'HP35', 'LP01', 'HR35', 'CC28', 24),
  ('ROW-025', 'inuse', 'Fleet 25', 'HP42', 'LP26', 'HR07', 'CC07', 25),
  ('ROW-026', 'inuse', 'Fleet 35', 'HP49', 'LP51', 'HR21', 'CC05', 26),
  ('ROW-027', 'inuse', 'Fleet 38', 'HP36', 'LP44', null, 'CC52', 27),
  ('ROW-028', 'inuse', 'Fleet 38', 'HP43', 'LP47', null, 'CC46', 28),
  ('ROW-029', 'inuse', 'Fleet 41', 'HP31', 'LP35', null, 'CC27', 29),
  ('ROW-030', 'inuse', 'Fleet 50', 'HP15', 'LP17', null, 'CC24', 30),
  ('ROW-031', 'inuse', 'Fleet 50', 'HP38', 'LP43', 'HR03', 'CC43', 31),
  ('ROW-032', 'inuse', 'Fleet 51', 'HP25', 'LP28', null, 'CC12', 32),
  ('ROW-033', 'inuse', 'Fleet 51', 'HP33', 'LP37', 'HR33', 'CC38', 33),
  ('ROW-034', 'inuse', 'Fleet 57', null, 'LP07', 'HR05', 'CC29', 34),
  ('ROW-035', 'inuse', 'Fleet 61', 'HP09', 'LP14', null, null, 35),
  ('ROW-036', 'inuse', 'Fleet 61', 'HP07', 'LP15', null, 'CC16', 36),
  ('ROW-037', 'inuse', 'Fleet 91', 'HP27', 'LP29', 'HR18', 'CC30', 37),
  ('ROW-038', 'inuse', 'Fleet 93', 'HP26', 'LP05', 'HR02', 'CC19', 38),
  ('ROW-039', 'inuse', 'Fleet 93', 'HP20', 'LP22', null, 'CC18', 39),
  ('ROW-040', 'inuse', 'Fleet 101', 'HP01', 'LP36', null, 'CC26', 40),
  ('ROW-041', 'inuse', 'Fleet 120', 'HP22', 'LP09', 'HR17', 'CC31', 41),
  ('ROW-042', 'inuse', 'Fleet 135', 'HP37', 'LP02', 'HR25', 'CC41', 42),
  ('ROW-043', 'inuse', 'Fleet 157', null, 'LP46', null, 'CC50', 43),
  ('ROW-044', 'inuse', 'Fleet 157', null, 'LP38', null, 'CC33', 44),
  ('ROW-045', 'inuse', 'Fleet 157', null, 'LP52', null, 'CC48', 45),
  ('ROW-046', 'inuse', 'Fleet 157', null, 'LP42', null, 'CC44', 46),
  ('ROW-047', 'inuse', 'Fleet 157', 'HP47', 'LP31', null, 'CC06', 47),
  ('ROW-048', 'inuse', 'Fleet 157', 'HP41', 'LP39', null, 'CC32', 48),
  ('ROW-049', 'inuse', 'Fleet 159', 'HP04', 'LP34', 'HR19', 'CC51', 49),
  ('ROW-050', 'inuse', 'Fleet 159', 'HP39', 'LP41', 'HR19', 'CC11', 50),
  ('ROW-051', 'inuse', 'Fleet 175', 'HP45', 'LP20', null, 'CC34', 51),
  ('ROW-052', 'inuse', 'Fleet 175', 'HP12', 'LP33', null, 'CC10', 52),
  ('ROW-053', 'inuse', 'Fleet 178', 'HP10', 'LP11', null, 'CC21', 53),
  ('ROW-054', 'inuse', 'Fleet 178', 'HP23', 'LP30', null, 'CC35', 54),
  ('ROW-055', 'inuse', 'Fleet 178', 'HP44', 'LP19', null, 'CC45', 55),
  ('ROW-056', 'inuse', 'Fleet 180', 'HP51', 'LP24', 'HR38', 'CC08', 56),
  ('ROW-057', 'inuse', 'Fleet 187', 'HP40', 'LP45', 'HR10', 'CC36', 57)
on conflict (id) do update
set
  status = excluded.status,
  allocation = excluded.allocation,
  hp_asset_code = excluded.hp_asset_code,
  lp_asset_code = excluded.lp_asset_code,
  hr_asset_code = excluded.hr_asset_code,
  cc_asset_code = excluded.cc_asset_code,
  sort_order = excluded.sort_order;

insert into public.trucks (
  asset_id,
  vin,
  license_plate,
  make,
  model,
  vehicle_label,
  truck_status,
  assigned_group,
  driver,
  fleet_assignment,
  notes
)
values
  ('01-02-001-017', '1FTFW1E53NKD05586', 'RNM0681', 'Ford', 'F-150', 'Ford F-150', 'In Use', 'Gas Pool', 'Brenden', 'Pending', 'Pending'),
  ('01-02-001-044', '1FTFW1E5XNKE64525', 'SNG5300', 'Ford', 'F-150', 'Ford F-150', 'In Shop', 'Gas Pool', 'Pending', 'Delaware', 'Pending'),
  ('01-04-001-064', 'PG107207', 'STN0949', 'GMC', 'Sierra', 'GMC Sierra', 'In Shop', 'Gas Pool', 'Pending', 'Delaware', 'AC out'),
  ('01-04-001-066', 'PG107204', 'TPN1462', 'GMC', 'Sierra', 'GMC Sierra', 'In Use', 'Gas Pool', 'Jon Carmiachel', 'Pending', 'New sticker and paperwork on dashboard'),
  ('01-02-001-074', '1FTFW1E56PKD05259', 'XDB3939', 'Ford', 'F-150', 'Ford F-150', 'In Use', 'Gas Pool', 'Paul Wilson', 'Pending', 'No front tag / oil change due'),
  ('01-02-001-075', '1FTFW1E56PKE09914', 'SXB6214', 'Ford', 'F-150', 'Ford F-150', 'PM Due / In Use', 'Gas Pool', 'Rene', 'Pending', 'AC out'),
  ('01-02-001-079', '1FTFW1E5XPKE09575', 'SXB6279', 'Ford', 'F-150', 'Ford F-150', 'In Use', 'Gas Pool', 'Ivan', 'Fleet 41', 'Pending'),
  ('01-02-001-084', '1FTFW1E55PFB48560', 'WXG3892', 'Ford', 'F-150', 'Ford F-150', 'In Use', 'Gas Pool', 'Isaac Becera', 'Fleet 41', 'Pending'),
  ('01-03-001-126', '1FT8W2BM4PEC11325', 'TKG7872', 'Ford', 'F-150', 'Ford F-150', 'Needs Repair', 'Gas Pool', 'Pending', 'Pending', 'Windshield leak and driver-side tire replacement needed')
on conflict (asset_id) do update
set
  vin = excluded.vin,
  license_plate = excluded.license_plate,
  make = excluded.make,
  model = excluded.model,
  vehicle_label = excluded.vehicle_label,
  truck_status = excluded.truck_status,
  assigned_group = excluded.assigned_group,
  driver = excluded.driver,
  fleet_assignment = excluded.fleet_assignment,
  notes = excluded.notes;

insert into public.forms (
  form_key,
  jotform_id,
  form_name,
  category,
  primary_asset_type,
  primary_business_process,
  destination_table,
  source_url
)
values
  ('ezh_inspection', '232914154127149', 'EZH Inspection Form', 'inspection', 'LP / EZH', 'regulator rebuild / inspection', 'regulator_inspections', 'https://voltagrid.jotform.com/232914154127149'),
  ('rdh20_inspection', '232446919745063', 'RDH 20 Inspection Form', 'inspection', 'HP / RDH 20', 'regulator rebuild / inspection', 'regulator_inspections', 'https://voltagrid.jotform.com/232446919745063'),
  ('prs_daily_checklist', '260615629931865', 'PRS Daily Checklist', 'daily_ops', 'PRS', 'daily operational inspection', 'prs_daily_checklists', 'https://voltagrid.jotform.com/260615629931865'),
  ('truck_pickup', '251375704148862', 'Truck Pick Up', 'trucking', 'Truck', 'truck transfer', 'truck_transfers', 'https://voltagrid.jotform.com/251375704148862'),
  ('truck_dropoff', '240454374170048', 'Truck Drop Off', 'trucking', 'Truck', 'truck transfer', 'truck_transfers', 'https://voltagrid.jotform.com/240454374170048'),
  ('lp_filter_inspection', '240453643283859', 'LP Filter Inspection', 'maintenance', 'LP Filter', 'filter replacement', 'filter_inspections', 'https://voltagrid.jotform.com/240453643283859'),
  ('prs_jds', '242333610521039', 'PRS-JDS', 'job_setup', 'PRS', 'job descriptive sheet', 'prs_jds', 'https://voltagrid.jotform.com/242333610521039'),
  ('rdh_alt_form', '240352458538056', 'RDH Alt Form', 'inspection', 'HP / RDH', 'regulator inspection', 'regulator_inspections', 'https://voltagrid.jotform.com/240352458538056'),
  ('rig_up_checklist', '260735200932854', 'Rig Up Checklist', 'deployment', 'PRS', 'rig up / commissioning', 'rig_up_checklists', 'https://voltagrid.jotform.com/260735200932854'),
  ('hp_filter_inspection', '252976172703866', 'HP Filter Inspection', 'maintenance', 'HP Filter', 'filter replacement', 'filter_inspections', 'https://voltagrid.jotform.com/252976172703866')
on conflict (jotform_id) do update
set
  form_key = excluded.form_key,
  form_name = excluded.form_name,
  category = excluded.category,
  primary_asset_type = excluded.primary_asset_type,
  primary_business_process = excluded.primary_business_process,
  destination_table = excluded.destination_table,
  source_url = excluded.source_url,
  is_active = true;

insert into public.entity_notes (entity_type, entity_key, note_text, created_by, sort_order)
values
  ('asset', 'HP01', 'Field assignment synced to the current roster update for Fleet 101.', 'seed', 0),
  ('package', 'FLT101-A', 'Package roster updated to match the latest fleet allocation sheet.', 'seed', 0)
on conflict do nothing;

insert into public.work_orders (entity_type, entity_key, work_order_number, order_text, is_complete, created_by, sort_order)
values
  ('asset', 'HP01', 'WO-1111', 'Confirm pressure package turnover notes', false, 'seed', 0),
  ('package', 'FLT101-A', 'WO-2202', 'Validate field package paperwork', false, 'seed', 0)
on conflict do nothing;

select public.sync_asset_snapshot_from_board();
