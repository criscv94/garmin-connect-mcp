import { describe, it, expect } from 'vitest';
import { buildWorkoutPayload, buildCyclingWorkoutPayload } from './workout-builder';

type ExecutableStep = {
  type: string;
  stepType: { stepTypeId: number; stepTypeKey: string };
  targetType: { workoutTargetTypeId: number; workoutTargetTypeKey: string };
  targetValueOne: number | null;
  targetValueTwo: number | null;
  zoneNumber: number | null;
};

function firstStep(payload: Record<string, unknown>): ExecutableStep {
  const segments = payload.workoutSegments as Array<{ workoutSteps: ExecutableStep[] }>;
  return segments[0]!.workoutSteps[0]!;
}

describe('buildWorkoutPayload (running)', () => {
  it('puts speed bounds into targetValueOne/Two, leaves zoneNumber null', () => {
    const payload = buildWorkoutPayload({
      workoutName: 'test',
      steps: [
        {
          type: 'interval',
          endConditionType: 'time',
          endConditionValue: 300,
          targetType: 'speed',
          targetValueLow: 3.5,
          targetValueHigh: 4.0,
        },
      ],
    });

    const step = firstStep(payload);
    expect(step.targetType.workoutTargetTypeKey).toBe('speed.zone');
    expect(step.targetValueOne).toBe(3.5);
    expect(step.targetValueTwo).toBe(4.0);
    expect(step.zoneNumber).toBeNull();
  });

  it('heart.rate.zone puts zone number into zoneNumber and leaves targetValueOne/Two null', () => {
    const payload = buildWorkoutPayload({
      workoutName: 'test',
      steps: [
        {
          type: 'interval',
          endConditionType: 'time',
          endConditionValue: 600,
          targetType: 'heart.rate.zone',
          targetValueLow: 2,
          targetValueHigh: 2,
        },
      ],
    });

    const step = firstStep(payload);
    expect(step.targetType.workoutTargetTypeKey).toBe('heart.rate.zone');
    expect(step.targetType.workoutTargetTypeId).toBe(4);
    expect(step.zoneNumber).toBe(2);
    expect(step.targetValueOne).toBeNull();
    expect(step.targetValueTwo).toBeNull();
  });

  it('heart.rate.zone ignores targetValueHigh when low and high differ', () => {
    const payload = buildWorkoutPayload({
      workoutName: 'test',
      steps: [
        {
          type: 'interval',
          endConditionType: 'time',
          endConditionValue: 600,
          targetType: 'heart.rate.zone',
          targetValueLow: 3,
          targetValueHigh: 5,
        },
      ],
    });

    const step = firstStep(payload);
    expect(step.zoneNumber).toBe(3);
    expect(step.targetValueOne).toBeNull();
    expect(step.targetValueTwo).toBeNull();
  });

  it('no.target leaves all target value fields null', () => {
    const payload = buildWorkoutPayload({
      workoutName: 'test',
      steps: [{ type: 'warmup', endConditionType: 'time', endConditionValue: 300 }],
    });

    const step = firstStep(payload);
    expect(step.targetType.workoutTargetTypeKey).toBe('no.target');
    expect(step.targetValueOne).toBeNull();
    expect(step.targetValueTwo).toBeNull();
    expect(step.zoneNumber).toBeNull();
  });
});

describe('buildCyclingWorkoutPayload', () => {
  it('power.zone puts zone number into zoneNumber and leaves targetValueOne/Two null', () => {
    const payload = buildCyclingWorkoutPayload({
      workoutName: 'test',
      bikeType: 'indoor_cycling',
      steps: [
        {
          type: 'interval',
          endConditionType: 'time',
          endConditionValue: 180,
          targetType: 'power.zone',
          targetValueLow: 4,
          targetValueHigh: 4,
        },
      ],
    });

    const step = firstStep(payload);
    expect(step.targetType.workoutTargetTypeKey).toBe('power.zone');
    expect(step.zoneNumber).toBe(4);
    expect(step.targetValueOne).toBeNull();
    expect(step.targetValueTwo).toBeNull();
  });

  it('power.zone with raw watts routes the low value into zoneNumber (documents the breaking change for the BPM-in-zone-field workaround)', () => {
    const payload = buildCyclingWorkoutPayload({
      workoutName: 'test',
      bikeType: 'indoor_cycling',
      steps: [
        {
          type: 'interval',
          endConditionType: 'time',
          endConditionValue: 180,
          targetType: 'power.zone',
          targetValueLow: 200,
          targetValueHigh: 250,
        },
      ],
    });

    const step = firstStep(payload);
    expect(step.zoneNumber).toBe(200);
  });

  it('heart.rate.zone on cycling also writes to zoneNumber', () => {
    const payload = buildCyclingWorkoutPayload({
      workoutName: 'test',
      bikeType: 'indoor_cycling',
      steps: [
        {
          type: 'interval',
          endConditionType: 'time',
          endConditionValue: 600,
          targetType: 'heart.rate.zone',
          targetValueLow: 2,
          targetValueHigh: 2,
        },
      ],
    });

    const step = firstStep(payload);
    expect(step.zoneNumber).toBe(2);
    expect(step.targetValueOne).toBeNull();
    expect(step.targetValueTwo).toBeNull();
  });

  it('speed/cadence/no.target still use targetValueOne/Two', () => {
    const speedPayload = buildCyclingWorkoutPayload({
      workoutName: 'test',
      bikeType: 'cycling',
      steps: [
        { type: 'interval', endConditionType: 'time', endConditionValue: 120,
          targetType: 'speed', targetValueLow: 8.0, targetValueHigh: 10.0 },
      ],
    });
    const speedStep = firstStep(speedPayload);
    expect(speedStep.targetValueOne).toBe(8.0);
    expect(speedStep.targetValueTwo).toBe(10.0);
    expect(speedStep.zoneNumber).toBeNull();

    const cadencePayload = buildCyclingWorkoutPayload({
      workoutName: 'test',
      bikeType: 'indoor_cycling',
      steps: [
        { type: 'interval', endConditionType: 'time', endConditionValue: 120,
          targetType: 'cadence', targetValueLow: 85, targetValueHigh: 95 },
      ],
    });
    const cadenceStep = firstStep(cadencePayload);
    expect(cadenceStep.targetValueOne).toBe(85);
    expect(cadenceStep.targetValueTwo).toBe(95);
    expect(cadenceStep.zoneNumber).toBeNull();
  });
});
