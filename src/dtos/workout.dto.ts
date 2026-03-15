import { z } from 'zod';
import { dateString } from '../constants';

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
    .describe('Lower bound: m/s for speed, zone number for heart.rate.zone'),
  targetValueHigh: z
    .number()
    .optional()
    .describe('Upper bound: m/s for speed, zone number for heart.rate.zone'),
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

export const scheduleWorkoutSchema = z.object({
  workoutId: z.number().positive().describe('The workout ID. Use get_workouts to find IDs'),
  date: dateString.describe('Date to schedule the workout in YYYY-MM-DD format'),
});
