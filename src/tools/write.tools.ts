import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GarminClient, buildWorkoutPayload, buildStrengthWorkoutPayload, buildCyclingWorkoutPayload } from '../client';
import {
  setActivityNameSchema,
  createManualActivitySchema,
  deleteActivitySchema,
  addWeighInSchema,
  setHydrationSchema,
  setBloodPressureSchema,
  gearActivitySchema,
  createWorkoutSchema,
  createStrengthWorkoutSchema,
  createCyclingWorkoutSchema,
  scheduleWorkoutSchema,
  updateWorkoutSchema,
  updateStrengthWorkoutSchema,
  updateCyclingWorkoutSchema,
  deleteWorkoutSchema,
} from '../dtos';
import type {
  CreateWorkoutDto,
  CreateStrengthWorkoutDto,
  StrengthExerciseDto,
  CreateCyclingWorkoutDto,
  UpdateWorkoutDto,
  UpdateStrengthWorkoutDto,
  UpdateCyclingWorkoutDto,
  DeleteWorkoutDto,
} from '../dtos';

export function registerWriteTools(server: McpServer, client: GarminClient): void {
  server.registerTool(
    'set_activity_name',
    {
      description: 'Rename an activity',
      inputSchema: setActivityNameSchema.shape,
    },
    async ({ activityId, name }) => {
      const data = await client.setActivityName(activityId, name);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    'create_manual_activity',
    {
      description:
        'Create a manual activity entry. Use get_activity_types to find valid activityTypeKey values',
      inputSchema: createManualActivitySchema.shape,
    },
    async ({ activityName, activityTypeKey, startTimeInGMT, elapsedDurationInSecs, distanceInMeters }) => {
      const data = await client.createManualActivity({
        activityName,
        activityTypeKey,
        startTimeInGMT,
        elapsedDurationInSecs,
        distanceInMeters,
      });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    'delete_activity',
    {
      description: 'Delete an activity permanently. This action cannot be undone',
      inputSchema: deleteActivitySchema.shape,
    },
    async ({ activityId }) => {
      const data = await client.deleteActivity(activityId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data ?? 'Activity deleted', null, 2) }],
      };
    },
  );

  server.registerTool(
    'add_weigh_in',
    {
      description: 'Record a weight measurement',
      inputSchema: addWeighInSchema.shape,
    },
    async ({ weight, unitKey, date }) => {
      const data = await client.addWeighIn(weight, unitKey ?? 'kg', date);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    'set_hydration',
    {
      description: 'Set daily hydration intake in milliliters',
      inputSchema: setHydrationSchema.shape,
    },
    async ({ valueMl, date }) => {
      const data = await client.setHydration(valueMl, date);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    'set_blood_pressure',
    {
      description: 'Record a blood pressure measurement with systolic, diastolic, and pulse',
      inputSchema: setBloodPressureSchema.shape,
    },
    async ({ systolic, diastolic, pulse, timestamp, notes }) => {
      const data = await client.setBloodPressure(systolic, diastolic, pulse, timestamp, notes);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    'add_gear_to_activity',
    {
      description: 'Link a gear item (shoes, bike) to an activity',
      inputSchema: gearActivitySchema.shape,
    },
    async ({ gearUuid, activityId }) => {
      const data = await client.addGearToActivity(gearUuid, activityId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data ?? 'Gear linked', null, 2) }],
      };
    },
  );

  server.registerTool(
    'remove_gear_from_activity',
    {
      description: 'Unlink a gear item from an activity',
      inputSchema: gearActivitySchema.shape,
    },
    async ({ gearUuid, activityId }) => {
      const data = await client.removeGearFromActivity(gearUuid, activityId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data ?? 'Gear unlinked', null, 2) }],
      };
    },
  );

  server.registerTool(
    'create_workout',
    {
      description:
        'Create a structured running workout with warmup, intervals, repeats, and cooldown. Steps support time/distance end conditions and pace/heart rate targets',
      inputSchema: createWorkoutSchema.shape,
    },
    async ({ workoutName, steps, estimatedDurationInSecs, description }) => {
      const dto: CreateWorkoutDto = {
        workoutName,
        steps: steps as CreateWorkoutDto['steps'],
        estimatedDurationInSecs,
        description,
      };
      const payload = buildWorkoutPayload(dto);
      const data = await client.createWorkout(payload);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    'create_strength_workout',
    {
      description:
        'Create a structured strength training workout with exercises, sets, reps or duration, and rest periods. Each exercise generates one step per set with a rest step after each set. Supports bodyweight and weighted exercises from the Garmin exercise library.',
      inputSchema: createStrengthWorkoutSchema.shape,
    },
    async ({ workoutName, exercises, defaultRestSeconds, estimatedDurationInSecs, description }) => {
      const dto: CreateStrengthWorkoutDto = {
        workoutName,
        exercises: exercises as StrengthExerciseDto[],
        defaultRestSeconds,
        estimatedDurationInSecs,
        description,
      };
      const payload = buildStrengthWorkoutPayload(dto);
      const data = await client.createWorkout(payload);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    'create_cycling_workout',
    {
      description:
        'Create a structured cycling workout (outdoor or indoor trainer) with warmup, intervals, repeats, and cooldown. Steps support time/distance end conditions and power (watts), cadence (RPM), heart rate zone, or speed targets',
      inputSchema: createCyclingWorkoutSchema.shape,
    },
    async ({ workoutName, bikeType, steps, estimatedDurationInSecs, description }) => {
      const dto: CreateCyclingWorkoutDto = {
        workoutName,
        bikeType: bikeType ?? 'cycling',
        steps: steps as CreateCyclingWorkoutDto['steps'],
        estimatedDurationInSecs,
        description,
      };
      const payload = buildCyclingWorkoutPayload(dto);
      const data = await client.createWorkout(payload);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    'schedule_workout',
    {
      description:
        'Schedule an existing workout to a specific date on the Garmin calendar. Use get_workouts to find workout IDs',
      inputSchema: scheduleWorkoutSchema.shape,
    },
    async ({ workoutId, date }) => {
      const data = await client.scheduleWorkout(workoutId, date);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    'update_workout',
    {
      description:
        'Update an existing running workout by fully replacing its steps. Use get_workouts to find the workout ID',
      inputSchema: updateWorkoutSchema.shape,
    },
    async ({ workoutId, workoutName, steps, estimatedDurationInSecs, description }) => {
      const dto: UpdateWorkoutDto = {
        workoutId,
        workoutName,
        steps: steps as CreateWorkoutDto['steps'],
        estimatedDurationInSecs,
        description,
      };
      const payload = buildWorkoutPayload(dto);
      const data = await client.updateWorkout(dto.workoutId, payload);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    'update_strength_workout',
    {
      description:
        'Update an existing strength workout by fully replacing its exercises. Use get_workouts to find the workout ID',
      inputSchema: updateStrengthWorkoutSchema.shape,
    },
    async ({ workoutId, workoutName, exercises, defaultRestSeconds, estimatedDurationInSecs, description }) => {
      const dto: UpdateStrengthWorkoutDto = {
        workoutId,
        workoutName,
        exercises: exercises as StrengthExerciseDto[],
        defaultRestSeconds,
        estimatedDurationInSecs,
        description,
      };
      const payload = buildStrengthWorkoutPayload(dto);
      const data = await client.updateWorkout(dto.workoutId, payload);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    'update_cycling_workout',
    {
      description:
        'Update an existing cycling or indoor cycling workout by fully replacing its steps. Use get_workouts to find the workout ID',
      inputSchema: updateCyclingWorkoutSchema.shape,
    },
    async ({ workoutId, workoutName, bikeType, steps, estimatedDurationInSecs, description }) => {
      const dto: UpdateCyclingWorkoutDto = {
        workoutId,
        workoutName,
        bikeType: bikeType ?? 'cycling',
        steps: steps as CreateCyclingWorkoutDto['steps'],
        estimatedDurationInSecs,
        description,
      };
      const payload = buildCyclingWorkoutPayload(dto);
      const data = await client.updateWorkout(dto.workoutId, payload);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    'delete_workout',
    {
      description: 'Delete a workout permanently. Works for any workout type (running, cycling, strength). This action cannot be undone',
      inputSchema: deleteWorkoutSchema.shape,
    },
    async ({ workoutId }) => {
      const dto: DeleteWorkoutDto = { workoutId };
      const data = await client.deleteWorkout(dto.workoutId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data ?? 'Workout deleted', null, 2) }],
      };
    },
  );
}
