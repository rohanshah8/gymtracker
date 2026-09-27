-- ============================================
-- GymTracker — initial schema
-- Copied verbatim from GymTracker_System_Design.md §5.
-- Do not "improve" this file in isolation — if the schema needs to
-- change, add a new numbered migration instead of editing this one.
-- ============================================

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null default 'Lifter',
  weight_unit text not null default 'kg' check (weight_unit in ('kg','lb')),
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'Lifter'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- EXERCISE CATEGORIES (default + fully custom, per FitNotes model)
-- ============================================
create table public.exercise_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_custom boolean not null default false,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
-- Seed: Chest, Back, Legs, Shoulders, Arms, Core, Cardio, Full Body (is_custom = false)
-- see supabase/seed.sql

-- ============================================
-- EXERCISES (global curated + user custom)
-- ============================================
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.exercise_categories(id) not null,
  exercise_type text not null check (exercise_type in ('resistance','cardio')),
  equipment text check (equipment in ('barbell','dumbbell','machine','cable','bodyweight','other')),
  is_custom boolean not null default false,
  created_by uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index idx_exercises_category on public.exercises(category_id);

-- ============================================
-- ROUTINES (named templates, e.g. "Push Pull Legs")
-- ============================================
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.routine_days (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid references public.routines(id) on delete cascade not null,
  day_name text not null,          -- e.g. "Push Day A", "Monday"
  day_order int not null default 0
);

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_day_id uuid references public.routine_days(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) not null,
  exercise_order int not null default 0,
  target_sets int,
  target_reps int
);

-- ============================================
-- WORKOUTS (one calendar-day session)
-- ============================================
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Workout',
  workout_date date not null default current_date,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  source_routine_day_id uuid references public.routine_days(id),
  notes text,
  created_at timestamptz not null default now()
);

create index idx_workouts_user_date on public.workouts(user_id, workout_date desc);

-- ============================================
-- SETS (each logged set within a workout)
-- ============================================
create table public.sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid references public.workouts(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) not null,
  set_index int not null,
  reps int check (reps >= 0),               -- resistance exercises
  weight numeric(6,2) check (weight >= 0),  -- resistance exercises
  distance numeric(8,2),                    -- cardio exercises (km/mi)
  duration_seconds int,                     -- cardio exercises
  rpe numeric(3,1) check (rpe between 1 and 10),
  is_warmup boolean not null default false,
  comment text,
  created_at timestamptz not null default now()
);

create index idx_sets_workout on public.sets(workout_id);
create index idx_sets_exercise on public.sets(exercise_id);

-- ============================================
-- PERSONAL RECORDS (best weight at a given rep count)
-- ============================================
create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) not null,
  set_id uuid references public.sets(id) on delete cascade,
  weight numeric(6,2) not null,
  reps int not null,
  estimated_1rm numeric(6,2) not null,
  achieved_at timestamptz not null,
  unique(user_id, exercise_id, reps)
);

-- ============================================
-- TRIGGER: auto-detect PRs + estimated 1RM on every new resistance set
-- Epley formula: 1RM = weight * (1 + reps/30)
-- ============================================
create function public.check_and_record_pr()
returns trigger as $$
declare
  v_user_id uuid;
  v_1rm numeric(6,2);
  v_existing_best numeric(6,2);
begin
  if new.weight is null or new.reps is null then
    return new; -- cardio set, skip PR logic
  end if;

  select user_id into v_user_id from public.workouts where id = new.workout_id;
  v_1rm := new.weight * (1 + new.reps::numeric / 30);

  select weight into v_existing_best
    from public.personal_records
    where user_id = v_user_id and exercise_id = new.exercise_id and reps = new.reps;

  if v_existing_best is null or new.weight > v_existing_best then
    insert into public.personal_records (user_id, exercise_id, set_id, weight, reps, estimated_1rm, achieved_at)
    values (v_user_id, new.exercise_id, new.id, new.weight, new.reps, v_1rm, new.created_at)
    on conflict (user_id, exercise_id, reps)
    do update set weight = excluded.weight,
                  set_id = excluded.set_id,
                  estimated_1rm = excluded.estimated_1rm,
                  achieved_at = excluded.achieved_at;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_set_insert_check_pr
  after insert on public.sets
  for each row execute procedure public.check_and_record_pr();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.profiles enable row level security;
alter table public.exercise_categories enable row level security;
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.sets enable row level security;
alter table public.personal_records enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = id);

create policy "read global + own custom categories" on public.exercise_categories
  for select using (is_custom = false or created_by = auth.uid());
create policy "insert own custom categories" on public.exercise_categories
  for insert with check (created_by = auth.uid());

create policy "read global + own custom exercises" on public.exercises
  for select using (is_custom = false or created_by = auth.uid());
create policy "insert own custom exercises" on public.exercises
  for insert with check (created_by = auth.uid());

create policy "own routines" on public.routines for all using (auth.uid() = user_id);
create policy "routine days via own routine" on public.routine_days for all using (
  exists (select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid()));
create policy "routine exercises via own routine day" on public.routine_exercises for all using (
  exists (select 1 from public.routine_days rd join public.routines r on r.id = rd.routine_id
          where rd.id = routine_day_id and r.user_id = auth.uid()));

create policy "own workouts" on public.workouts for all using (auth.uid() = user_id);
create policy "sets via own workout" on public.sets for all using (
  exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));
create policy "own PRs" on public.personal_records for all using (auth.uid() = user_id);
