-- ============================================
-- GymTracker — default exercise library seed
-- 8 default categories + 80 default exercises, matching System Design §5.
-- Safe to run more than once: every insert is guarded by a NOT EXISTS
-- check against the *default* (is_custom = false) rows, so re-running
-- this after a user has added their own custom exercises/categories
-- will not duplicate the defaults or touch the user's custom rows.
-- ============================================

insert into public.exercise_categories (name, is_custom)
select cat, false
from unnest(array[
  'Chest','Back','Legs','Shoulders','Arms','Core','Cardio','Full Body'
]) as cat
where not exists (
  select 1 from public.exercise_categories c where c.name = cat and c.is_custom = false
);

insert into public.exercises (name, category_id, exercise_type, equipment, is_custom)
select e.name, c.id, e.exercise_type, e.equipment, false
from (
  values
    -- Chest
    ('Barbell Bench Press', 'Chest', 'resistance', 'barbell'),
    ('Incline Barbell Bench Press', 'Chest', 'resistance', 'barbell'),
    ('Decline Barbell Bench Press', 'Chest', 'resistance', 'barbell'),
    ('Dumbbell Bench Press', 'Chest', 'resistance', 'dumbbell'),
    ('Incline Dumbbell Press', 'Chest', 'resistance', 'dumbbell'),
    ('Dumbbell Fly', 'Chest', 'resistance', 'dumbbell'),
    ('Cable Fly', 'Chest', 'resistance', 'cable'),
    ('Push-up', 'Chest', 'resistance', 'bodyweight'),
    ('Chest Dip', 'Chest', 'resistance', 'bodyweight'),
    ('Machine Chest Press', 'Chest', 'resistance', 'machine'),
    ('Pec Deck Machine', 'Chest', 'resistance', 'machine'),

    -- Back
    ('Deadlift', 'Back', 'resistance', 'barbell'),
    ('Sumo Deadlift', 'Back', 'resistance', 'barbell'),
    ('Barbell Row', 'Back', 'resistance', 'barbell'),
    ('Pendlay Row', 'Back', 'resistance', 'barbell'),
    ('T-Bar Row', 'Back', 'resistance', 'other'),
    ('Seated Cable Row', 'Back', 'resistance', 'cable'),
    ('Lat Pulldown', 'Back', 'resistance', 'cable'),
    ('Straight-Arm Pulldown', 'Back', 'resistance', 'cable'),
    ('Pull-up', 'Back', 'resistance', 'bodyweight'),
    ('Chin-up', 'Back', 'resistance', 'bodyweight'),
    ('Single-Arm Dumbbell Row', 'Back', 'resistance', 'dumbbell'),
    ('Face Pull', 'Back', 'resistance', 'cable'),

    -- Legs
    ('Back Squat', 'Legs', 'resistance', 'barbell'),
    ('Front Squat', 'Legs', 'resistance', 'barbell'),
    ('Romanian Deadlift', 'Legs', 'resistance', 'barbell'),
    ('Leg Press', 'Legs', 'resistance', 'machine'),
    ('Leg Extension', 'Legs', 'resistance', 'machine'),
    ('Leg Curl', 'Legs', 'resistance', 'machine'),
    ('Walking Lunge', 'Legs', 'resistance', 'dumbbell'),
    ('Bulgarian Split Squat', 'Legs', 'resistance', 'dumbbell'),
    ('Hip Thrust', 'Legs', 'resistance', 'barbell'),
    ('Calf Raise', 'Legs', 'resistance', 'machine'),
    ('Goblet Squat', 'Legs', 'resistance', 'dumbbell'),
    ('Hack Squat', 'Legs', 'resistance', 'machine'),
    ('Step-up', 'Legs', 'resistance', 'dumbbell'),

    -- Shoulders
    ('Overhead Press', 'Shoulders', 'resistance', 'barbell'),
    ('Seated Dumbbell Shoulder Press', 'Shoulders', 'resistance', 'dumbbell'),
    ('Arnold Press', 'Shoulders', 'resistance', 'dumbbell'),
    ('Lateral Raise', 'Shoulders', 'resistance', 'dumbbell'),
    ('Front Raise', 'Shoulders', 'resistance', 'dumbbell'),
    ('Rear Delt Fly', 'Shoulders', 'resistance', 'dumbbell'),
    ('Upright Row', 'Shoulders', 'resistance', 'barbell'),
    ('Cable Lateral Raise', 'Shoulders', 'resistance', 'cable'),
    ('Cable Front Raise', 'Shoulders', 'resistance', 'cable'),

    -- Arms
    ('Barbell Bicep Curl', 'Arms', 'resistance', 'barbell'),
    ('Dumbbell Bicep Curl', 'Arms', 'resistance', 'dumbbell'),
    ('Hammer Curl', 'Arms', 'resistance', 'dumbbell'),
    ('Cable Curl', 'Arms', 'resistance', 'cable'),
    ('Preacher Curl', 'Arms', 'resistance', 'barbell'),
    ('Cable Hammer Curl', 'Arms', 'resistance', 'cable'),
    ('Tricep Pushdown', 'Arms', 'resistance', 'cable'),
    ('Skull Crusher', 'Arms', 'resistance', 'barbell'),
    ('Overhead Tricep Extension', 'Arms', 'resistance', 'dumbbell'),
    ('Close-Grip Bench Press', 'Arms', 'resistance', 'barbell'),
    ('Dip', 'Arms', 'resistance', 'bodyweight'),

    -- Core
    ('Plank', 'Core', 'resistance', 'bodyweight'),
    ('Side Plank', 'Core', 'resistance', 'bodyweight'),
    ('Hanging Leg Raise', 'Core', 'resistance', 'bodyweight'),
    ('Cable Crunch', 'Core', 'resistance', 'cable'),
    ('Ab Wheel Rollout', 'Core', 'resistance', 'other'),
    ('Russian Twist', 'Core', 'resistance', 'bodyweight'),
    ('Sit-up', 'Core', 'resistance', 'bodyweight'),
    ('Weighted Sit-up', 'Core', 'resistance', 'other'),

    -- Cardio
    ('Treadmill Run', 'Cardio', 'cardio', 'machine'),
    ('Outdoor Run', 'Cardio', 'cardio', 'bodyweight'),
    ('Rowing Machine', 'Cardio', 'cardio', 'machine'),
    ('Stationary Bike', 'Cardio', 'cardio', 'machine'),
    ('Elliptical', 'Cardio', 'cardio', 'machine'),
    ('Stair Climber', 'Cardio', 'cardio', 'machine'),
    ('Jump Rope', 'Cardio', 'cardio', 'other'),
    ('Swimming', 'Cardio', 'cardio', 'bodyweight'),
    ('Assault Bike', 'Cardio', 'cardio', 'machine'),

    -- Full Body
    ('Clean and Jerk', 'Full Body', 'resistance', 'barbell'),
    ('Snatch', 'Full Body', 'resistance', 'barbell'),
    ('Kettlebell Swing', 'Full Body', 'resistance', 'other'),
    ('Burpee', 'Full Body', 'resistance', 'bodyweight'),
    ('Thruster', 'Full Body', 'resistance', 'barbell'),
    ('Farmer''s Carry', 'Full Body', 'resistance', 'dumbbell'),
    ('Mountain Climbers', 'Full Body', 'resistance', 'bodyweight')
) as e(name, category, exercise_type, equipment)
join public.exercise_categories c on c.name = e.category and c.is_custom = false
where not exists (
  select 1 from public.exercises x where x.name = e.name and x.is_custom = false
);
