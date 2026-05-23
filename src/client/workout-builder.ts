import type { CreateWorkoutDto, WorkoutStepDto, RepeatGroupDto, CreateStrengthWorkoutDto, StrengthExerciseDto, CreateCyclingWorkoutDto, CyclingWorkoutStepDto } from '../dtos';
import { findExercise, listByCategory, EXERCISE_CATEGORIES } from '../constants';

const STEP_TYPE_MAP: Record<string, { stepTypeId: number; stepTypeKey: string }> = {
  warmup: { stepTypeId: 1, stepTypeKey: 'warmup' },
  cooldown: { stepTypeId: 2, stepTypeKey: 'cooldown' },
  interval: { stepTypeId: 3, stepTypeKey: 'interval' },
  recovery: { stepTypeId: 4, stepTypeKey: 'recovery' },
  rest: { stepTypeId: 5, stepTypeKey: 'rest' },
  repeat: { stepTypeId: 6, stepTypeKey: 'repeat' },
};

const END_CONDITION_MAP: Record<string, { conditionTypeId: number; conditionTypeKey: string }> = {
  distance: { conditionTypeId: 3, conditionTypeKey: 'distance' },
  time: { conditionTypeId: 2, conditionTypeKey: 'time' },
  open: { conditionTypeId: 1, conditionTypeKey: 'lap.button' },
};

const TARGET_TYPE_MAP: Record<string, { workoutTargetTypeId: number; workoutTargetTypeKey: string }> = {
  'no.target': { workoutTargetTypeId: 1, workoutTargetTypeKey: 'no.target' },
  speed: { workoutTargetTypeId: 6, workoutTargetTypeKey: 'speed.zone' },
  'heart.rate.zone': { workoutTargetTypeId: 4, workoutTargetTypeKey: 'heart.rate.zone' },
  'heart.rate': { workoutTargetTypeId: 4, workoutTargetTypeKey: 'heart.rate.zone' },
};

const ZONE_TARGET_TYPES = new Set(['heart.rate.zone', 'power.zone']);

const RUNNING_SPORT = { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 };
const CYCLING_SPORT = { sportTypeId: 2, sportTypeKey: 'cycling', displayOrder: 2 };
const INDOOR_CYCLING_SPORT = { sportTypeId: 2, sportTypeKey: 'indoor_cycling', displayOrder: 25 };
const STRENGTH_SPORT = { sportTypeId: 5, sportTypeKey: 'strength_training', displayOrder: 13 };
const WEIGHT_UNIT_KG = { unitId: 8, unitKey: 'kilogram', factor: 1000.0 };
const REPS_END_CONDITION = { conditionTypeId: 10, conditionTypeKey: 'reps' };
const TIME_END_CONDITION = { conditionTypeId: 2, conditionTypeKey: 'time' };
const NO_TARGET = { workoutTargetTypeId: 1, workoutTargetTypeKey: 'no.target' };

function isRepeatGroup(step: WorkoutStepDto | RepeatGroupDto): step is RepeatGroupDto {
  return step.type === 'repeat';
}

function buildExecutableStep(step: WorkoutStepDto, order: number): Record<string, unknown> {
  const stepType = STEP_TYPE_MAP[step.type]!;
  const endCondition = END_CONDITION_MAP[step.endConditionType ?? 'time']!;
  const targetKey = step.targetType ?? 'no.target';
  const target = TARGET_TYPE_MAP[targetKey]!;
  const isZone = ZONE_TARGET_TYPES.has(targetKey);

  return {
    type: 'ExecutableStepDTO',
    stepOrder: order,
    stepType: { stepTypeId: stepType.stepTypeId, stepTypeKey: stepType.stepTypeKey },
    endCondition: {
      conditionTypeId: endCondition.conditionTypeId,
      conditionTypeKey: endCondition.conditionTypeKey,
    },
    endConditionValue: step.endConditionValue ?? null,
    targetType: {
      workoutTargetTypeId: target.workoutTargetTypeId,
      workoutTargetTypeKey: target.workoutTargetTypeKey,
    },
    targetValueOne: isZone ? null : (step.targetValueLow ?? null),
    targetValueTwo: isZone ? null : (step.targetValueHigh ?? null),
    zoneNumber: isZone ? (step.targetValueLow ?? null) : null,
  };
}

export function buildWorkoutPayload(dto: CreateWorkoutDto): Record<string, unknown> {
  const workoutSteps: Record<string, unknown>[] = [];
  let stepOrder = 1;

  for (const step of dto.steps) {
    if (isRepeatGroup(step)) {
      const nestedSteps: Record<string, unknown>[] = [];
      for (const nested of step.steps) {
        nestedSteps.push(buildExecutableStep(nested, stepOrder));
        stepOrder++;
      }
      workoutSteps.push({
        type: 'RepeatGroupDTO',
        stepOrder,
        stepType: { stepTypeId: 6, stepTypeKey: 'repeat' },
        numberOfIterations: step.iterations,
        workoutSteps: nestedSteps,
      });
      stepOrder++;
    } else {
      workoutSteps.push(buildExecutableStep(step, stepOrder));
      stepOrder++;
    }
  }

  const payload: Record<string, unknown> = {
    workoutName: dto.workoutName,
    sportType: RUNNING_SPORT,
    workoutSegments: [
      {
        segmentOrder: 1,
        sportType: RUNNING_SPORT,
        workoutSteps,
      },
    ],
  };

  if (dto.estimatedDurationInSecs) {
    payload.estimatedDurationInSecs = dto.estimatedDurationInSecs;
  }

  if (dto.description) {
    payload.description = dto.description;
  }

  return payload;
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i]![0] = i;
  for (let j = 0; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[a.length]![b.length]!;
}

function suggestExercises(category: string, badName: string, limit = 5): string[] {
  if (!EXERCISE_CATEGORIES.includes(category)) {
    return EXERCISE_CATEGORIES
      .map((c) => [c, levenshtein(category, c)] as const)
      .sort((a, b) => a[1] - b[1])
      .slice(0, limit)
      .map(([c]) => `category=${c}`);
  }
  return listByCategory(category)
    .map((e) => [e.name, levenshtein(badName, e.name)] as const)
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([n]) => n);
}

function validateExercise(exercise: StrengthExerciseDto): void {
  if (findExercise(exercise.exerciseCategory, exercise.exerciseName)) return;
  const suggestions = suggestExercises(exercise.exerciseCategory, exercise.exerciseName);
  const hint = suggestions.length > 0 ? ` Did you mean: ${suggestions.join(', ')}?` : '';
  throw new Error(
    `Unknown exercise '${exercise.exerciseCategory}/${exercise.exerciseName}' — not in Garmin's strength catalog.${hint}`,
  );
}

function buildStrengthExerciseStep(exercise: StrengthExerciseDto, order: number): Record<string, unknown> {
  validateExercise(exercise);
  const isTimeBased = exercise.durationSeconds !== undefined;
  const step: Record<string, unknown> = {
    type: 'ExecutableStepDTO',
    stepOrder: order,
    stepType: { stepTypeId: 3, stepTypeKey: 'interval' },
    endCondition: isTimeBased ? TIME_END_CONDITION : REPS_END_CONDITION,
    endConditionValue: isTimeBased ? exercise.durationSeconds : exercise.reps,
    targetType: NO_TARGET,
    targetValueOne: null,
    targetValueTwo: null,
    category: exercise.exerciseCategory,
    exerciseName: exercise.exerciseName,
  };

  if (exercise.weightKg !== undefined) {
    step.weightValue = exercise.weightKg;
    step.weightUnit = WEIGHT_UNIT_KG;
  }

  return step;
}

function buildStrengthRestStep(durationSeconds: number, order: number): Record<string, unknown> {
  return {
    type: 'ExecutableStepDTO',
    stepOrder: order,
    stepType: { stepTypeId: 5, stepTypeKey: 'rest' },
    endCondition: TIME_END_CONDITION,
    endConditionValue: durationSeconds,
    targetType: NO_TARGET,
    targetValueOne: null,
    targetValueTwo: null,
  };
}

export function buildStrengthWorkoutPayload(dto: CreateStrengthWorkoutDto): Record<string, unknown> {
  const workoutSteps: Record<string, unknown>[] = [];
  let stepOrder = 1;
  const defaultRest = dto.defaultRestSeconds ?? 90;

  for (const exercise of dto.exercises) {
    const restSecs = exercise.restSeconds ?? defaultRest;

    if (exercise.sets > 1) {
      const nested: Record<string, unknown>[] = [];
      nested.push(buildStrengthExerciseStep(exercise, stepOrder++));
      nested.push(buildStrengthRestStep(restSecs, stepOrder++));
      workoutSteps.push({
        type: 'RepeatGroupDTO',
        stepOrder,
        stepType: { stepTypeId: 6, stepTypeKey: 'repeat' },
        numberOfIterations: exercise.sets,
        workoutSteps: nested,
      });
      stepOrder++;
    } else {
      workoutSteps.push(buildStrengthExerciseStep(exercise, stepOrder++));
      workoutSteps.push(buildStrengthRestStep(restSecs, stepOrder++));
    }
  }

  const payload: Record<string, unknown> = {
    workoutName: dto.workoutName,
    sportType: STRENGTH_SPORT,
    workoutSegments: [
      {
        segmentOrder: 1,
        sportType: STRENGTH_SPORT,
        workoutSteps,
      },
    ],
  };

  if (dto.estimatedDurationInSecs) {
    payload.estimatedDurationInSecs = dto.estimatedDurationInSecs;
  }

  if (dto.description) {
    payload.description = dto.description;
  }

  return payload;
}

const CYCLING_TARGET_TYPE_MAP: Record<string, { workoutTargetTypeId: number; workoutTargetTypeKey: string }> = {
  'no.target': { workoutTargetTypeId: 1, workoutTargetTypeKey: 'no.target' },
  'power.zone': { workoutTargetTypeId: 2, workoutTargetTypeKey: 'power.zone' },
  cadence: { workoutTargetTypeId: 3, workoutTargetTypeKey: 'cadence' },
  'heart.rate.zone': { workoutTargetTypeId: 4, workoutTargetTypeKey: 'heart.rate.zone' },
  'heart.rate': { workoutTargetTypeId: 4, workoutTargetTypeKey: 'heart.rate.zone' },
  speed: { workoutTargetTypeId: 6, workoutTargetTypeKey: 'speed.zone' },
  'power.3s': { workoutTargetTypeId: 10, workoutTargetTypeKey: 'power.3s' },
};

function buildCyclingExecutableStep(step: CyclingWorkoutStepDto, order: number): Record<string, unknown> {
  const stepType = STEP_TYPE_MAP[step.type]!;
  const endCondition = END_CONDITION_MAP[step.endConditionType ?? 'time']!;
  const targetKey = step.targetType ?? 'no.target';
  const target = CYCLING_TARGET_TYPE_MAP[targetKey]!;
  const isZone = ZONE_TARGET_TYPES.has(targetKey);

  return {
    type: 'ExecutableStepDTO',
    stepOrder: order,
    stepType: { stepTypeId: stepType.stepTypeId, stepTypeKey: stepType.stepTypeKey },
    endCondition: {
      conditionTypeId: endCondition.conditionTypeId,
      conditionTypeKey: endCondition.conditionTypeKey,
    },
    endConditionValue: step.endConditionValue ?? null,
    targetType: {
      workoutTargetTypeId: target.workoutTargetTypeId,
      workoutTargetTypeKey: target.workoutTargetTypeKey,
    },
    targetValueOne: isZone ? null : (step.targetValueLow ?? null),
    targetValueTwo: isZone ? null : (step.targetValueHigh ?? null),
    zoneNumber: isZone ? (step.targetValueLow ?? null) : null,
  };
}

function isCyclingRepeatGroup(step: CyclingWorkoutStepDto | RepeatGroupDto): step is RepeatGroupDto {
  return step.type === 'repeat';
}

export function buildCyclingWorkoutPayload(dto: CreateCyclingWorkoutDto): Record<string, unknown> {
  const sportType = dto.bikeType === 'indoor_cycling' ? INDOOR_CYCLING_SPORT : CYCLING_SPORT;
  const workoutSteps: Record<string, unknown>[] = [];
  let stepOrder = 1;

  for (const step of dto.steps) {
    if (isCyclingRepeatGroup(step)) {
      const nestedSteps: Record<string, unknown>[] = [];
      for (const nested of step.steps) {
        nestedSteps.push(buildCyclingExecutableStep(nested as CyclingWorkoutStepDto, stepOrder));
        stepOrder++;
      }
      workoutSteps.push({
        type: 'RepeatGroupDTO',
        stepOrder,
        stepType: { stepTypeId: 6, stepTypeKey: 'repeat' },
        numberOfIterations: step.iterations,
        workoutSteps: nestedSteps,
      });
      stepOrder++;
    } else {
      workoutSteps.push(buildCyclingExecutableStep(step, stepOrder));
      stepOrder++;
    }
  }

  const payload: Record<string, unknown> = {
    workoutName: dto.workoutName,
    sportType,
    workoutSegments: [
      {
        segmentOrder: 1,
        sportType,
        workoutSteps,
      },
    ],
  };

  if (dto.estimatedDurationInSecs) {
    payload.estimatedDurationInSecs = dto.estimatedDurationInSecs;
  }

  if (dto.description) {
    payload.description = dto.description;
  }

  return payload;
}
