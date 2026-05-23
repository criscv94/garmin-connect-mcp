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
  targetType?: 'no.target' | 'speed' | 'heart.rate.zone' | 'heart.rate';
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
    .enum(['no.target', 'speed', 'heart.rate.zone', 'heart.rate'])
    .default('no.target')
    .optional()
    .describe('Target type for the step: speed (m/s range), heart.rate.zone (zone number 1-5), heart.rate (raw BPM range), or no.target. Defaults to no.target'),
  targetValueLow: z
    .number()
    .optional()
    .describe('Lower bound: m/s for speed, BPM for heart.rate (raw range), zone number 1-5 for heart.rate.zone. For zone targets, set low only — targetValueHigh is ignored.'),
  targetValueHigh: z
    .number()
    .optional()
    .describe('Upper bound: m/s for speed, BPM for heart.rate. Ignored for heart.rate.zone (single-zone — set targetValueLow only).'),
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
  targetType?: 'no.target' | 'power.zone' | 'power.3s' | 'cadence' | 'heart.rate.zone' | 'heart.rate' | 'speed';
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
    .enum(['no.target', 'power.zone', 'power.3s', 'cadence', 'heart.rate.zone', 'heart.rate', 'speed'])
    .default('no.target')
    .optional()
    .describe(
      'Target type for the step: power.zone (zone number), power.3s (raw 3-sec smoothed watts range — TrainingPeaks default), cadence (RPM), heart.rate.zone (zone number), heart.rate (raw BPM range), speed (m/s), or no.target. Defaults to no.target',
    ),
  targetValueLow: z
    .number()
    .optional()
    .describe('Lower bound: zone number 1-5 for heart.rate.zone/power.zone, watts for power.3s (raw range), RPM for cadence, BPM for heart.rate (raw range), m/s for speed. For zone targets, set low only — targetValueHigh is ignored.'),
  targetValueHigh: z
    .number()
    .optional()
    .describe('Upper bound: same unit as targetValueLow. Ignored for heart.rate.zone and power.zone (single-zone — set targetValueLow only).'),
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
      'Garmin exercise category. Must be one of the 33 valid categories: BENCH_PRESS, CALF_RAISE, CARDIO, CARRY, CHOP, CORE, CRUNCH, CURL, DEADLIFT, FLYE, HIP_RAISE, HIP_STABILITY, HIP_SWING, HYPEREXTENSION, LATERAL_RAISE, LEG_CURL, LEG_RAISE, LUNGE, OLYMPIC_LIFT, PLANK, PLYO, PULL_UP, PUSH_UP, ROW, RUN, SHOULDER_PRESS, SHOULDER_STABILITY, SHRUG, SIT_UP, SQUAT, TOTAL_BODY, TRICEPS_EXTENSION, WARM_UP. Use list_strength_exercises to discover valid names within a category.',
    ),
  exerciseName: z
    .string()
    .describe(
      'Garmin exercise name within the category. Must exist in the bundled catalog (1207 exercises). Use list_strength_exercises to browse valid names. Examples: SQUAT/GOBLET_SQUAT, PUSH_UP/PUSH_UP, DEADLIFT/DUMBBELL_DEADLIFT, PLANK/SIDE_PLANK, ROW/SINGLE_ARM_DUMBBELL_ROW. Invalid pairs are rejected with did-you-mean suggestions.',
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

export const listStrengthExercisesSchema = z.object({
  category: z
    .string()
    .optional()
    .describe('Filter by exercise category (e.g. SQUAT, PUSH_UP). Omit to list all categories at the top level. Use this to discover valid (category, exerciseName) pairs for create_strength_workout.'),
  equipment: z
    .string()
    .optional()
    .describe('Filter by required equipment key: bodyweight, bench, barbell, dumbbells, kettlebells, sliding_discs, box, dip_device, squat_rack, jump_rope, mat, ab_wheel, weight_plates, swiss_ball, cable_machine, cable_attachment, pull_up_bar'),
  limit: z
    .number()
    .min(1)
    .max(200)
    .default(50)
    .optional()
    .describe('Max number of exercises to return (default 50). Reduce to keep responses small.'),
});
