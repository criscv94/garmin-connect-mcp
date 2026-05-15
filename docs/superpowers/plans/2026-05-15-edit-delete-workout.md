# Edit & Delete Workout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `update_workout`, `update_strength_workout`, `update_cycling_workout`, and `delete_workout` MCP tools so users can modify or remove any existing workout without leaving the MCP environment.

**Architecture:** New Zod schemas extend the existing create schemas with a required `workoutId` field. Two new `GarminClient` methods (`updateWorkout`, `deleteWorkout`) call `PUT /workout-service/workout/{id}` and `DELETE /workout-service/workout/{id}` respectively. Four new tools registered in `write.tools.ts` follow the exact same pattern as the existing create tools — same builder, same response format.

**Tech Stack:** TypeScript strict, Zod 3, `@modelcontextprotocol/sdk`, axios, vitest (live API integration tests)

---

## File Map

| File | Change |
|---|---|
| `src/dtos/workout.dto.ts` | Add 4 new schemas + 4 new DTO types |
| `src/client/garmin.client.ts` | Add `updateWorkout` and `deleteWorkout` methods |
| `src/client/garmin.client.test.ts` | Add live integration tests for both new methods |
| `src/tools/write.tools.ts` | Register 4 new MCP tools |

---

## Task 1: Add DTOs and Schemas to `workout.dto.ts`

**Files:**
- Modify: `src/dtos/workout.dto.ts`

- [ ] **Step 1: Add 4 new DTO types at the bottom of the file, after `createStrengthWorkoutSchema`**

Open `src/dtos/workout.dto.ts` and append these types after the last export (after `createStrengthWorkoutSchema`):

```typescript
export type UpdateWorkoutDto = CreateWorkoutDto & { workoutId: number };
export type UpdateStrengthWorkoutDto = CreateStrengthWorkoutDto & { workoutId: number };
export type UpdateCyclingWorkoutDto = CreateCyclingWorkoutDto & { workoutId: number };
export type DeleteWorkoutDto = { workoutId: number };
```

- [ ] **Step 2: Add 4 new Zod schemas immediately after the 4 new types**

```typescript
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
```

- [ ] **Step 3: Verify TypeScript compiles with no errors**

```bash
cd /Users/cristiancortes/garmin-mcp && npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 4: Commit**

```bash
git add src/dtos/workout.dto.ts
git commit -m "feat(workout): add update and delete DTO types and Zod schemas"
```

---

## Task 2: Add Client Methods + Integration Tests

**Files:**
- Modify: `src/client/garmin.client.ts`
- Modify: `src/client/garmin.client.test.ts`

- [ ] **Step 1: Add `updateWorkout` and `deleteWorkout` to `GarminClient`**

Open `src/client/garmin.client.ts`. After the `createWorkout` method (currently the last method in the file, around line 754), add:

```typescript
  async updateWorkout(workoutId: number, payload: Record<string, unknown>): Promise<unknown> {
    return this.request(`${WORKOUT_ENDPOINT}/${workoutId}`, {
      method: 'PUT',
      body: { ...payload, workoutId },
    });
  }

  async deleteWorkout(workoutId: number): Promise<unknown> {
    return this.request(`${WORKOUT_ENDPOINT}/${workoutId}`, { method: 'DELETE' });
  }
```

These go inside the `GarminClient` class, before the closing `}`.

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
cd /Users/cristiancortes/garmin-mcp && npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 3: Write failing integration tests**

Open `src/client/garmin.client.test.ts`. Add a new `describe` block after the `'Badges & Challenges'` block and before `'Utility: dateRange'`:

```typescript
  describe('Workouts (write)', () => {
    it('update_workout — create running workout, update name, then delete', async () => {
      const { buildWorkoutPayload } = await import('./workout-builder');

      const createPayload = buildWorkoutPayload({
        workoutName: '__test_run_create__',
        steps: [
          { type: 'warmup', endConditionType: 'time', endConditionValue: 300 },
          { type: 'interval', endConditionType: 'time', endConditionValue: 600 },
          { type: 'cooldown', endConditionType: 'open' },
        ],
      });

      const created = await client.createWorkout(createPayload) as { workoutId: number };
      expect(created.workoutId).toBeDefined();
      await sleep(DELAY_MS);

      const updatePayload = buildWorkoutPayload({
        workoutName: '__test_run_updated__',
        steps: [
          { type: 'warmup', endConditionType: 'time', endConditionValue: 300 },
          { type: 'interval', endConditionType: 'time', endConditionValue: 900 },
          { type: 'cooldown', endConditionType: 'open' },
        ],
      });

      const updated = await client.updateWorkout(created.workoutId, updatePayload) as { workoutName: string };
      expect(updated).toBeDefined();
      expect(updated.workoutName).toBe('__test_run_updated__');
      await sleep(DELAY_MS);

      await client.deleteWorkout(created.workoutId);
    }, 60000);

    it('update_strength_workout — create, update, delete', async () => {
      const { buildStrengthWorkoutPayload } = await import('./workout-builder');

      const createPayload = buildStrengthWorkoutPayload({
        workoutName: '__test_strength_create__',
        exercises: [
          { exerciseCategory: 'SQUAT', exerciseName: 'SQUAT', sets: 2, reps: 10, restSeconds: 60 },
        ],
      });

      const created = await client.createWorkout(createPayload) as { workoutId: number };
      expect(created.workoutId).toBeDefined();
      await sleep(DELAY_MS);

      const updatePayload = buildStrengthWorkoutPayload({
        workoutName: '__test_strength_updated__',
        exercises: [
          { exerciseCategory: 'SQUAT', exerciseName: 'SQUAT', sets: 3, reps: 12, restSeconds: 90 },
        ],
      });

      const updated = await client.updateWorkout(created.workoutId, updatePayload) as { workoutName: string };
      expect(updated).toBeDefined();
      expect(updated.workoutName).toBe('__test_strength_updated__');
      await sleep(DELAY_MS);

      await client.deleteWorkout(created.workoutId);
    }, 60000);

    it('update_cycling_workout — create, update, delete', async () => {
      const { buildCyclingWorkoutPayload } = await import('./workout-builder');

      const createPayload = buildCyclingWorkoutPayload({
        workoutName: '__test_cycling_create__',
        bikeType: 'indoor_cycling',
        steps: [
          { type: 'warmup', endConditionType: 'time', endConditionValue: 300 },
          { type: 'interval', endConditionType: 'time', endConditionValue: 300, targetType: 'power.zone', targetValueLow: 200, targetValueHigh: 250 },
          { type: 'cooldown', endConditionType: 'open' },
        ],
      });

      const created = await client.createWorkout(createPayload) as { workoutId: number };
      expect(created.workoutId).toBeDefined();
      await sleep(DELAY_MS);

      const updatePayload = buildCyclingWorkoutPayload({
        workoutName: '__test_cycling_updated__',
        bikeType: 'indoor_cycling',
        steps: [
          { type: 'warmup', endConditionType: 'time', endConditionValue: 600 },
          { type: 'interval', endConditionType: 'time', endConditionValue: 600, targetType: 'power.zone', targetValueLow: 250, targetValueHigh: 300 },
          { type: 'cooldown', endConditionType: 'open' },
        ],
      });

      const updated = await client.updateWorkout(created.workoutId, updatePayload) as { workoutName: string };
      expect(updated).toBeDefined();
      expect(updated.workoutName).toBe('__test_cycling_updated__');
      await sleep(DELAY_MS);

      await client.deleteWorkout(created.workoutId);
    }, 60000);

    it('delete_workout — create then delete returns no error', async () => {
      const { buildWorkoutPayload } = await import('./workout-builder');

      const payload = buildWorkoutPayload({
        workoutName: '__test_delete_only__',
        steps: [
          { type: 'interval', endConditionType: 'time', endConditionValue: 300 },
        ],
      });

      const created = await client.createWorkout(payload) as { workoutId: number };
      expect(created.workoutId).toBeDefined();
      await sleep(DELAY_MS);

      const result = await client.deleteWorkout(created.workoutId);
      expect(result === null || result === undefined || typeof result === 'object').toBe(true);
    }, 60000);
  });
```

- [ ] **Step 4: Run the tests to confirm they pass against the live API**

```bash
cd /Users/cristiancortes/garmin-mcp && npx vitest run src/client/garmin.client.test.ts --reporter=verbose 2>&1 | grep -A3 "Workouts (write)"
```

Expected: all 4 tests in `Workouts (write)` show as `✓`.

If any test fails with a network/auth error, check that `GARMIN_EMAIL` and `GARMIN_PASSWORD` are set in your `.env` file.

- [ ] **Step 5: Commit**

```bash
git add src/client/garmin.client.ts src/client/garmin.client.test.ts
git commit -m "feat(workout): add updateWorkout and deleteWorkout client methods with integration tests"
```

---

## Task 3: Register the 4 New MCP Tools

**Files:**
- Modify: `src/tools/write.tools.ts`

- [ ] **Step 1: Add the new schema and type imports to `write.tools.ts`**

Open `src/tools/write.tools.ts`. The existing import from `'../dtos'` lists schemas — extend it to include the new ones:

```typescript
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
} from '../dtos';
```

- [ ] **Step 2: Register `update_workout` tool — add after the `schedule_workout` registration**

At the end of `registerWriteTools`, after the `schedule_workout` `registerTool` call, add:

```typescript
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
      const payload = buildWorkoutPayload({ ...dto });
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
      const payload = buildStrengthWorkoutPayload({ ...dto });
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
      const payload = buildCyclingWorkoutPayload({ ...dto });
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
      const data = await client.deleteWorkout(workoutId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data ?? 'Workout deleted', null, 2) }],
      };
    },
  );
```

- [ ] **Step 3: Verify TypeScript compiles with no errors**

```bash
cd /Users/cristiancortes/garmin-mcp && npx tsc --noEmit
```

Expected: no output (zero errors).

- [ ] **Step 4: Build the project**

```bash
cd /Users/cristiancortes/garmin-mcp && npm run build
```

Expected: output ends with something like `ESM Build success`.

- [ ] **Step 5: Commit**

```bash
git add src/tools/write.tools.ts
git commit -m "feat(workout): register update_workout, update_strength_workout, update_cycling_workout, delete_workout MCP tools"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 4 tools specified in the spec (`update_workout`, `update_strength_workout`, `update_cycling_workout`, `delete_workout`) are implemented across Tasks 1–3.
- [x] **No placeholders:** Every step has exact code, exact commands, and exact expected output.
- [x] **Type consistency:** `UpdateWorkoutDto`, `UpdateStrengthWorkoutDto`, `UpdateCyclingWorkoutDto` defined in Task 1 are imported and used in Task 3. `updateWorkout(workoutId, payload)` defined in Task 2 is called in Task 3.
- [x] **Builder reuse:** Existing `buildWorkoutPayload`, `buildStrengthWorkoutPayload`, `buildCyclingWorkoutPayload` are used unchanged — `workoutId` injected inside `client.updateWorkout`.
- [x] **Delete pattern:** `delete_workout` returns `'Workout deleted'` on null/empty response, matching the existing `delete_activity` tool.
