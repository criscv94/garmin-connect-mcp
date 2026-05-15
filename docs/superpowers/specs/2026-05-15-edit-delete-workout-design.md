# Edit & Delete Workout — Design Spec

**Date:** 2026-05-15
**Scope:** Add update and delete tools for all workout types (running, cycling, strength)

---

## Problem

The MCP server can create and schedule workouts but offers no way to modify or remove them. Users must leave the MCP environment to edit or delete workouts in the Garmin Connect web UI.

---

## Solution Overview

Four new MCP tools registered in `write.tools.ts`:

| Tool | HTTP | Workout types |
|---|---|---|
| `update_workout` | PUT | Running |
| `update_strength_workout` | PUT | Strength |
| `update_cycling_workout` | PUT | Cycling |
| `delete_workout` | DELETE | All (type-agnostic) |

---

## Architecture

### Garmin API

- **Update:** `PUT /workout-service/workout/{workoutId}` — requires full workout payload with `workoutId` included in the body
- **Delete:** `DELETE /workout-service/workout/{workoutId}` — no body required

### Payload Construction

The existing builders (`buildWorkoutPayload`, `buildStrengthWorkoutPayload`, `buildCyclingWorkoutPayload`) in `workout-builder.ts` are **not modified**. The `workoutId` is injected at the `GarminClient.updateWorkout` level before the PUT call:

```typescript
async updateWorkout(workoutId: number, payload: Record<string, unknown>): Promise<unknown> {
  return this.request(`${WORKOUT_ENDPOINT}/${workoutId}`, {
    method: 'PUT',
    body: { ...payload, workoutId },
  });
}
```

This keeps builders pure (payload shape only) and the client owns API concerns.

---

## Changes by File

### `src/dtos/workout.dto.ts`

Four new schemas composed from existing ones via Zod `.extend()`:

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

Four new DTO types (explicit, not inferred via `z.infer<>`):

```typescript
export type UpdateWorkoutDto = CreateWorkoutDto & { workoutId: number };
export type UpdateStrengthWorkoutDto = CreateStrengthWorkoutDto & { workoutId: number };
export type UpdateCyclingWorkoutDto = CreateCyclingWorkoutDto & { workoutId: number };
export type DeleteWorkoutDto = { workoutId: number };
```

### `src/client/garmin.client.ts`

Two new methods added after `createWorkout`:

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

### `src/tools/write.tools.ts`

Four new `server.registerTool` calls following existing patterns:

- `update_workout` — destructures `workoutId` + all `create_workout` params, calls builder then `client.updateWorkout`
- `update_strength_workout` — same pattern for strength
- `update_cycling_workout` — same pattern for cycling
- `delete_workout` — takes only `workoutId`, calls `client.deleteWorkout`, returns confirmation string on null response

---

## Data Flow

```
MCP Tool input
  → Zod schema validation (existing create schema + workoutId)
  → existing builder (unchanged) → payload
  → client.updateWorkout(workoutId, payload)
    → PUT /workout-service/workout/{workoutId}  body: { ...payload, workoutId }
  → JSON response returned as tool content
```

---

## Error Handling

No new error handling needed. The existing `GarminClient.request` retry-on-401 and axios error propagation covers all cases. The `delete_workout` tool returns `'Workout deleted'` when the API returns null/empty (same pattern as `delete_activity`).

---

## Out of Scope

- Partial update / PATCH (Garmin API has no PATCH for workouts)
- Unscheduling a workout from the calendar (separate API: `DELETE /workout-service/schedule/{workoutId}`)
- Editing training plan workouts
