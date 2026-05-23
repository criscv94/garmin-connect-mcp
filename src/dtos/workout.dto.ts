import { z } from 'zod';
import { dateString } from '../constants';

export type StrengthExerciseDto = {
  exerciseCategory: string;
  exerciseName: string;
  sets: number;
  reps?: number;
  durationSeconds?: number;
  restSeconds?: number;
  weightKg?: number;
};

export type CreateStrengthWorkoutDto = {
  workoutName: string;
  exercises: StrengthExerciseDto[];
  defaultRestSeconds?: number;
  estimatedDurationInSecs?: number;
  description?: string;
};

export type WorkoutStepDto = {
  type: 'warmup' | 'interval' | 'recovery' | 'cooldown' | 'rest';
  endConditionType?: 'time' | 'distance' | 'open';
  endConditionValue?: number;
  targetType?: 'no.target' | 'speed' | 'heart.rate.zone';
  targetValueLow?: number;
  targetValueHigh?: number;
};

export type RepeatGroupDto = {
  type: 'repeat';
  iterations: number;
  steps: WorkoutStepDto[];
};

export type CreateWorkoutDto = {
  workoutName: string;
  steps: (WorkoutStepDto | RepeatGroupDto)[];
  estimatedDurationInSecs?: number;
  description?: string;
};

export type ScheduleWorkoutDto = {
  workoutId: number;
  date: string;
};

const workoutStepSchema = z.object({
  type: z.enum(['warmup', 'interval', 'recovery', 'cooldown', 'rest']).describe('Step type'),
  endConditionType: z
    .enum(['time', 'distance', 'open'])
    .default('time')
    .optional()
    .describe('How the step ends: time (seconds), distance (meters), or open (lap button). Defaults to time'),
  endConditionValue: z
    .number()
    .min(0)
    .optional()
    .describe('Duration in seconds (for time) or distance in meters (for distance). Not needed for open'),
  targetType: z
    .enum(['no.target', 'speed', 'heart.rate.zone'])
    .default('no.target')
    .optional()
    .describe('Target type for the step. Defaults to no.target'),
  targetValueLow: z
    .number()
    .optional()
    .describe('Lower bound: m/s for speed, zone number 1-5 for heart.rate.zone. For zone targets, this is the single zone (targetValueHigh is ignored).'),
  targetValueHigh: z
    .number()
    .optional()
    .describe('Upper bound: m/s for speed. Ignored for heart.rate.zone (single zone only — set targetValueLow).'),
});

const repeatGroupSchema = z.object({
  type: z.literal('repeat').describe('Must be "repeat" for interval groups'),
  iterations: z.number().min(1).max(99).describe('Number of times to repeat the group'),
  steps: z.array(workoutStepSchema).min(1).describe('Steps to repeat in each iteration'),
});

const workoutStepOrGroupSchema = z.discriminatedUnion('type', [
  workoutStepSchema.extend({ type: z.literal('warmup') }),
  workoutStepSchema.extend({ type: z.literal('interval') }),
  workoutStepSchema.extend({ type: z.literal('recovery') }),
  workoutStepSchema.extend({ type: z.literal('cooldown') }),
  workoutStepSchema.extend({ type: z.literal('rest') }),
  repeatGroupSchema,
]);

export const createWorkoutSchema = z.object({
  workoutName: z.string().min(1).max(100).describe('Name of the workout'),
  steps: z
    .array(workoutStepOrGroupSchema)
    .min(1)
    .describe(
      'Ordered list of workout steps and repeat groups. Example: [{type:"warmup",endConditionType:"time",endConditionValue:600},{type:"repeat",iterations:5,steps:[{type:"interval",endConditionType:"time",endConditionValue:120,targetType:"speed",targetValueLow:3.5,targetValueHigh:4.0},{type:"recovery",endConditionType:"time",endConditionValue:60}]},{type:"cooldown",endConditionType:"open"}]',
    ),
  estimatedDurationInSecs: z
    .number()
    .positive()
    .optional()
    .describe('Estimated total duration in seconds'),
  description: z.string().max(1000).optional().describe('Optional workout description'),
});

export type CyclingWorkoutStepDto = {
  type: 'warmup' | 'interval' | 'recovery' | 'cooldown' | 'rest';
  endConditionType?: 'time' | 'distance' | 'open';
  endConditionValue?: number;
  targetType?: 'no.target' | 'power.zone' | 'cadence' | 'heart.rate.zone' | 'speed';
  targetValueLow?: number;
  targetValueHigh?: number;
};

export type CreateCyclingWorkoutDto = {
  workoutName: string;
  bikeType: 'cycling' | 'indoor_cycling';
  steps: (CyclingWorkoutStepDto | RepeatGroupDto)[];
  estimatedDurationInSecs?: number;
  description?: string;
};

const cyclingWorkoutStepSchema = z.object({
  type: z.enum(['warmup', 'interval', 'recovery', 'cooldown', 'rest']).describe('Step type'),
  endConditionType: z
    .enum(['time', 'distance', 'open'])
    .default('time')
    .optional()
    .describe('How the step ends: time (seconds), distance (meters), or open (lap button). Defaults to time'),
  endConditionValue: z
    .number()
    .min(0)
    .optional()
    .describe('Duration in seconds (for time) or distance in meters (for distance). Not needed for open'),
  targetType: z
    .enum(['no.target', 'power.zone', 'cadence', 'heart.rate.zone', 'speed'])
    .default('no.target')
    .optional()
    .describe(
      'Target type for the step: power.zone (watts), cadence (RPM), heart.rate.zone (zone number), speed (m/s), or no.target. Defaults to no.target',
    ),
  targetValueLow: z
    .number()
    .optional()
    .describe('Lower bound: watts for power.zone, RPM for cadence, zone number 1-5 for heart.rate.zone/power.zone, m/s for speed. For zone targets, this is the single zone (targetValueHigh is ignored).'),
  targetValueHigh: z
    .number()
    .optional()
    .describe('Upper bound: same unit as targetValueLow. Ignored for heart.rate.zone and power.zone (single zone only — set targetValueLow).'),
});

const cyclingWorkoutStepOrGroupSchema = z.discriminatedUnion('type', [
  cyclingWorkoutStepSchema.extend({ type: z.literal('warmup') }),
  cyclingWorkoutStepSchema.extend({ type: z.literal('interval') }),
  cyclingWorkoutStepSchema.extend({ type: z.literal('recovery') }),
  cyclingWorkoutStepSchema.extend({ type: z.literal('cooldown') }),
  cyclingWorkoutStepSchema.extend({ type: z.literal('rest') }),
  repeatGroupSchema,
]);

export const createCyclingWorkoutSchema = z.object({
  workoutName: z.string().min(1).max(100).describe('Name of the workout'),
  bikeType: z
    .enum(['cycling', 'indoor_cycling'])
    .default('cycling')
    .optional()
    .describe('Sport type: cycling (outdoor road) or indoor_cycling (trainer/Zwift). Defaults to cycling'),
  steps: z
    .array(cyclingWorkoutStepOrGroupSchema)
    .min(1)
    .describe(
      'Ordered list of workout steps and repeat groups. Example: [{type:"warmup",endConditionType:"time",endConditionValue:600},{type:"repeat",iterations:5,steps:[{type:"interval",endConditionType:"time",endConditionValue:300,targetType:"power.zone",targetValueLow:250,targetValueHigh:280},{type:"recovery",endConditionType:"time",endConditionValue:120}]},{type:"cooldown",endConditionType:"open"}]',
    ),
  estimatedDurationInSecs: z
    .number()
    .positive()
    .optional()
    .describe('Estimated total duration in seconds'),
  description: z.string().max(1000).optional().describe('Optional workout description'),
});

export const scheduleWorkoutSchema = z.object({
  workoutId: z.number().positive().describe('The workout ID. Use get_workouts to find IDs'),
  date: dateString.describe('Date to schedule the workout in YYYY-MM-DD format'),
});

const strengthExerciseSchema = z.object({
  exerciseCategory: z
    .string()
    .describe(
      'Garmin exercise category. Examples: BENCH_PRESS, SHOULDER_PRESS, LATERAL_RAISE, TRICEPS_EXTENSION, FLY, PULL_UP, LAT_PULL_DOWN, ROW, CURL, SQUAT, DEADLIFT, LUNGE, CALF_RAISE, LEG_PRESS, LEG_CURL, LEG_EXTENSION, PLANK, CRUNCH, LEG_RAISE, CORE, HIP_RAISE, SHRUG',
    ),
  exerciseName: z
    .string()
    .describe(
      'Garmin exercise name within the category. Examples: BARBELL_BENCH_PRESS, DUMBBELL_BENCH_PRESS, INCLINE_DUMBBELL_BENCH_PRESS, DUMBBELL_SHOULDER_PRESS, BARBELL_SHOULDER_PRESS, DUMBBELL_LATERAL_RAISE, CABLE_LATERAL_RAISE, TRICEPS_PUSHDOWN, CABLE_OVERHEAD_TRICEPS_EXTENSION, DUMBBELL_FLY, CABLE_CROSSOVER, PULL_UP, CHIN_UP, CABLE_LAT_PULLDOWN, WIDE_GRIP_LAT_PULLDOWN, DUMBBELL_ROW, SEATED_CABLE_ROW, BARBELL_ROW, DUMBBELL_BICEPS_CURL, BARBELL_BICEPS_CURL, HAMMER_CURL, BARBELL_BACK_SQUAT, SQUAT, GOBLET_SQUAT, ROMANIAN_DEADLIFT, DEADLIFT, DUMBBELL_SPLIT_SQUAT, BULGARIAN_SPLIT_SQUAT, LUNGE, CALF_RAISE, PLANK, SIDE_PLANK, CRUNCH, CABLE_CRUNCH, HANGING_KNEE_RAISE, HANGING_LEG_RAISE, DEAD_BUG, AB_WHEEL_ROLLOUT, CABLE_FACE_PULL',
    ),
  sets: z.number().min(1).max(20).describe('Number of sets'),
  reps: z.number().min(1).max(200).optional().describe('Reps per set. Use for rep-based exercises. Omit if using durationSeconds'),
  durationSeconds: z.number().min(1).optional().describe('Duration per set in seconds. Use for time-based exercises like plank. Omit if using reps'),
  restSeconds: z.number().min(0).optional().describe('Rest in seconds after each set. Overrides defaultRestSeconds for this exercise'),
  weightKg: z.number().min(0).optional().describe('Weight in kg. Omit if bodyweight or unspecified'),
});

export const createStrengthWorkoutSchema = z.object({
  workoutName: z.string().min(1).max(100).describe('Name of the workout'),
  exercises: z
    .array(strengthExerciseSchema)
    .min(1)
    .describe(
      'List of exercises in order. Each exercise generates one step per set with rest steps between sets. Example: [{exerciseCategory:"BENCH_PRESS",exerciseName:"BARBELL_BENCH_PRESS",sets:3,reps:8,restSeconds:90},{exerciseCategory:"PLANK",exerciseName:"PLANK",sets:3,durationSeconds:45,restSeconds:30}]',
    ),
  defaultRestSeconds: z
    .number()
    .min(0)
    .default(90)
    .optional()
    .describe('Default rest in seconds between sets, used when exercise does not specify its own restSeconds. Defaults to 90'),
  estimatedDurationInSecs: z.number().positive().optional().describe('Estimated total workout duration in seconds'),
  description: z.string().max(1000).optional().describe('Optional workout description'),
});

export type UpdateWorkoutDto = CreateWorkoutDto & { workoutId: number };
export type UpdateStrengthWorkoutDto = CreateStrengthWorkoutDto & { workoutId: number };
export type UpdateCyclingWorkoutDto = CreateCyclingWorkoutDto & { workoutId: number };
export type DeleteWorkoutDto = { workoutId: number };

export const updateWorkoutSchema = createWorkoutSchema.extend({
  workoutId: z.number().positive().describe('ID of the workout to update. Use get_workouts to find IDs'),
});

export const updateStrengthWorkoutSchema = createStrengthWorkoutSchema.extend({
  workoutId: z.number().positive().describe('ID of the workout to update. Use get_workouts to find IDs'),
});

export const updateCyclingWorkoutSchema = createCyclingWorkoutSchema.extend({
  workoutId: z.number().positive().describe('ID of the workout to update. Use get_workouts to find IDs'),
});

export const deleteWorkoutSchema = z.object({
  workoutId: z.number().positive().describe('ID of the workout to delete permanently. This action cannot be undone'),
});
