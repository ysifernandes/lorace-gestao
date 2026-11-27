-- 0002: dispositivos, regras parentais, comandos remotos (estados reais), sessões.
create type app.platform_t as enum ('android','ios');
create type app.command_type_t as enum ('block_app','unblock_app','grant_time','revoke_time','set_rules');
create type app.command_status_t as enum ('pending','received','block_applied','unblock_applied','device_offline','permission_unavailable','sync_failed','expired');

create table app.devices (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references app.families(id) on delete cascade,
  student_id uuid not null references app.students(id) on delete cascade,
  platform app.platform_t not null,
  push_token text,
  usage_access boolean, enforcement boolean,
  last_heartbeat_at timestamptz,
  paired_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index on app.devices(family_id);

create table app.device_pairings (
  code_hash bytea primary key,           -- SHA-256 do código; código nunca é guardado em claro
  family_id uuid not null references app.families(id) on delete cascade,
  student_id uuid not null references app.students(id) on delete cascade,
  expires_at timestamptz not null, used_at timestamptz
);

create table app.managed_apps (
  device_id uuid not null references app.devices(id) on delete cascade,
  app_id text not null check (char_length(app_id) between 1 and 256), -- pacote (Android) ou token opaco (iOS)
  label text, always_allowed boolean not null default false,
  primary key (device_id, app_id)
);

create table app.parental_rules (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references app.students(id) on delete cascade,
  device_id uuid references app.devices(id) on delete cascade,
  kind text not null check (kind in ('block','limit','window','reward','pause')),
  config jsonb not null,
  mode text check (mode in ('study','school','rest','vacation','entertainment','custom')),
  enabled boolean not null default true,
  created_by uuid not null references app.profiles(id), created_at timestamptz not null default now()
);

create table app.remote_commands (
  id uuid primary key,
  device_id uuid not null references app.devices(id) on delete cascade,
  issued_by uuid not null references app.profiles(id),
  type app.command_type_t not null,
  payload jsonb not null,
  nonce text not null unique,                 -- anti-replay
  signature text not null,
  status app.command_status_t not null default 'pending',
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status_updated_at timestamptz not null default now(),
  check (expires_at > issued_at)
);
create index on app.remote_commands(device_id, status);

create table app.command_events (
  id bigint generated always as identity primary key,
  command_id uuid not null references app.remote_commands(id) on delete cascade,
  status app.command_status_t not null, detail text, at timestamptz not null default now()
);

-- Transições válidas (espelha packages/parental-control)
create function app.check_command_transition() returns trigger language plpgsql as $$
begin
  if old.status = new.status then return new; end if;
  if not (
    (old.status = 'pending'        and new.status in ('received','device_offline','expired','sync_failed')) or
    (old.status = 'device_offline' and new.status in ('received','expired','pending')) or
    (old.status = 'received'       and new.status in ('block_applied','unblock_applied','permission_unavailable','sync_failed')) or
    (old.status = 'sync_failed'    and new.status in ('pending','expired'))
  ) then raise exception 'invalid command transition % -> %', old.status, new.status; end if;
  new.status_updated_at := now();
  insert into app.command_events(command_id, status) values (new.id, new.status);
  return new;
end $$;
create trigger remote_commands_transition before update of status on app.remote_commands
  for each row execute function app.check_command_transition();

create table app.sync_history (
  id bigint generated always as identity primary key,
  device_id uuid not null references app.devices(id) on delete cascade,
  at timestamptz not null default now(), ok boolean not null, detail text
);
create table app.usage_sessions (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references app.devices(id) on delete cascade,
  app_id text not null, started_at timestamptz not null, ended_at timestamptz,
  check (ended_at is null or ended_at >= started_at)
);
