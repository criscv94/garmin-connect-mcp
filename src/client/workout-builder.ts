import type { CreateWorkoutDto, WorkoutStepDto, RepeatGroupDto } from '../dtos';

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
  speed: { workoutTargetTypeId: 4, workoutTargetTypeKey: 'speed.zone' },
  'heart.rate.zone': { workoutTargetTypeId: 2, workoutTargetTypeKey: 'heart.rate.zone' },
};

const RUNNING_SPORT = { sportTypeId: 1, sportTypeKey: 'running', displayOrder: 1 };

function isRepeatGroup(step: WorkoutStepDto | RepeatGroupDto): step is RepeatGroupDto {
  return step.type === 'repeat';
}

function buildExecutableStep(step: WorkoutStepDto, order: number): Record<string, unknown> {
  const stepType = STEP_TYPE_MAP[step.type]!;
  const endCondition = END_CONDITION_MAP[step.endConditionType ?? 'time']!;
  const target = TARGET_TYPE_MAP[step.targetType ?? 'no.target']!;

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
    targetValueOne: step.targetValueLow ?? null,
    targetValueTwo: step.targetValueHigh ?? null,
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
