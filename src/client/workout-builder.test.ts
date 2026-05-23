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
  it('speed bounds go into targetValueOne/Two, zoneNumber null', () => {
    const payload = buildWorkoutPayload({
      workoutName: 'test',
      steps: [
        { type: 'interval', endConditionType: 'time', endConditionValue: 300,
          targetType: 'speed', targetValueLow: 3.5, targetValueHigh: 4.0 },
      ],
    });
    const step = firstStep(payload);
    expect(step.targetType.workoutTargetTypeKey).toBe('speed.zone');
    expect(step.targetValueOne).toBe(3.5);
    expect(step.targetValueTwo).toBe(4.0);
    expect(step.zoneNumber).toBeNull();
  });

  it('heart.rate.zone routes zone number into zoneNumber, leaves target values null', () => {
    const payload = buildWorkoutPayload({
      workoutName: 'test',
      steps: [
        { type: 'interval', endConditionType: 'time', endConditionValue: 600,
          targetType: 'heart.rate.zone', targetValueLow: 2, targetValueHigh: 2 },
      ],
    });
    const step = firstStep(payload);
    expect(step.targetType.workoutTargetTypeId).toBe(4);
    expect(step.targetType.workoutTargetTypeKey).toBe('heart.rate.zone');
    expect(step.zoneNumber).toBe(2);
    expect(step.targetValueOne).toBeNull();
    expect(step.targetValueTwo).toBeNull();
  });

  it('heart.rate.zone uses targetValueLow as the single zone when low/high differ', () => {
    const payload = buildWorkoutPayload({
      workoutName: 'test',
      steps: [
        { type: 'interval', endConditionType: 'time', endConditionValue: 600,
          targetType: 'heart.rate.zone', targetValueLow: 3, targetValueHigh: 5 },
      ],
    });
    const step = firstStep(payload);
    expect(step.zoneNumber).toBe(3);
    expect(step.targetValueOne).toBeNull();
    expect(step.targetValueTwo).toBeNull();
  });

  it('heart.rate (raw BPM) emits id 4 / heart.rate.zone with BPM in targetValueOne/Two', () => {
    const payload = buildWorkoutPayload({
      workoutName: 'test',
      steps: [
        { type: 'interval', endConditionType: 'time', endConditionValue: 600,
          targetType: 'heart.rate', targetValueLow: 130, targetValueHigh: 145 },
      ],
    });
    const step = firstStep(payload);
    expect(step.targetType.workoutTargetTypeId).toBe(4);
    expect(step.targetType.workoutTargetTypeKey).toBe('heart.rate.zone');
    expect(step.targetValueOne).toBe(130);
    expect(step.targetValueTwo).toBe(145);
    expect(step.zoneNumber).toBeNull();
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
  it('power.zone routes zone number into zoneNumber, leaves target values null', () => {
    const payload = buildCyclingWorkoutPayload({
      workoutName: 'test',
      bikeType: 'indoor_cycling',
      steps: [
        { type: 'interval', endConditionType: 'time', endConditionValue: 180,
          targetType: 'power.zone', targetValueLow: 4, targetValueHigh: 4 },
      ],
    });
    const step = firstStep(payload);
    expect(step.targetType.workoutTargetTypeKey).toBe('power.zone');
    expect(step.zoneNumber).toBe(4);
    expect(step.targetValueOne).toBeNull();
    expect(step.targetValueTwo).toBeNull();
  });

  it('power.zone with raw watts routes the low value into zoneNumber (callers should migrate to power.3s)', () => {
    const payload = buildCyclingWorkoutPayload({
      workoutName: 'test',
      bikeType: 'indoor_cycling',
      steps: [
        { type: 'interval', endConditionType: 'time', endConditionValue: 180,
          targetType: 'power.zone', targetValueLow: 200, targetValueHigh: 250 },
      ],
    });
    const step = firstStep(payload);
    expect(step.zoneNumber).toBe(200);
  });

  it('power.3s emits id 10 / power.3s with watts in targetValueOne/Two (TrainingPeaks-compatible)', () => {
    const payload = buildCyclingWorkoutPayload({
      workoutName: 'test',
      bikeType: 'indoor_cycling',
      steps: [
        { type: 'interval', endConditionType: 'time', endConditionValue: 180,
          targetType: 'power.3s', targetValueLow: 270, targetValueHigh: 290 },
      ],
    });
    const step = firstStep(payload);
    expect(step.targetType.workoutTargetTypeId).toBe(10);
    expect(step.targetType.workoutTargetTypeKey).toBe('power.3s');
    expect(step.targetValueOne).toBe(270);
    expect(step.targetValueTwo).toBe(290);
    expect(step.zoneNumber).toBeNull();
  });

  it('heart.rate.zone routes to zoneNumber on cycling steps', () => {
    const payload = buildCyclingWorkoutPayload({
      workoutName: 'test',
      bikeType: 'indoor_cycling',
      steps: [
        { type: 'interval', endConditionType: 'time', endConditionValue: 600,
          targetType: 'heart.rate.zone', targetValueLow: 2, targetValueHigh: 2 },
      ],
    });
    const step = firstStep(payload);
    expect(step.zoneNumber).toBe(2);
    expect(step.targetValueOne).toBeNull();
    expect(step.targetValueTwo).toBeNull();
  });

  it('heart.rate (raw BPM) emits id 4 / heart.rate.zone with BPM in targetValueOne/Two', () => {
    const payload = buildCyclingWorkoutPayload({
      workoutName: 'test',
      bikeType: 'indoor_cycling',
      steps: [
        { type: 'interval', endConditionType: 'time', endConditionValue: 600,
          targetType: 'heart.rate', targetValueLow: 120, targetValueHigh: 140 },
      ],
    });
    const step = firstStep(payload);
    expect(step.targetType.workoutTargetTypeId).toBe(4);
    expect(step.targetType.workoutTargetTypeKey).toBe('heart.rate.zone');
    expect(step.targetValueOne).toBe(120);
    expect(step.targetValueTwo).toBe(140);
    expect(step.zoneNumber).toBeNull();
  });

  it('power.3s inside a repeat group is preserved (not rewritten to running schema)', () => {
    const payload = buildCyclingWorkoutPayload({
      workoutName: 'test',
      bikeType: 'indoor_cycling',
      steps: [
        { type: 'warmup', endConditionType: 'time', endConditionValue: 600 },
        {
          type: 'repeat',
          iterations: 5,
          steps: [
            { type: 'interval', endConditionType: 'time', endConditionValue: 180,
              targetType: 'power.3s', targetValueLow: 270, targetValueHigh: 290 },
            { type: 'recovery', endConditionType: 'time', endConditionValue: 180,
              targetType: 'power.3s', targetValueLow: 110, targetValueHigh: 130 },
          ],
        },
        { type: 'cooldown', endConditionType: 'time', endConditionValue: 300 },
      ],
    });

    const segments = payload.workoutSegments as Array<{ workoutSteps: Array<Record<string, unknown>> }>;
    const repeat = segments[0]!.workoutSteps[1] as { type: string; numberOfIterations: number; workoutSteps: ExecutableStep[] };
    expect(repeat.type).toBe('RepeatGroupDTO');
    expect(repeat.numberOfIterations).toBe(5);

    const intervalStep = repeat.workoutSteps[0]!;
    expect(intervalStep.targetType.workoutTargetTypeId).toBe(10);
    expect(intervalStep.targetType.workoutTargetTypeKey).toBe('power.3s');
    expect(intervalStep.targetValueOne).toBe(270);
    expect(intervalStep.targetValueTwo).toBe(290);

    const recoveryStep = repeat.workoutSteps[1]!;
    expect(recoveryStep.targetType.workoutTargetTypeKey).toBe('power.3s');
    expect(recoveryStep.targetValueOne).toBe(110);
    expect(recoveryStep.targetValueTwo).toBe(130);
  });

  it('cadence inside a repeat group routes through the cycling schema', () => {
    const payload = buildCyclingWorkoutPayload({
      workoutName: 'test',
      bikeType: 'cycling',
      steps: [
        {
          type: 'repeat',
          iterations: 3,
          steps: [
            { type: 'interval', endConditionType: 'time', endConditionValue: 120,
              targetType: 'cadence', targetValueLow: 90, targetValueHigh: 100 },
          ],
        },
      ],
    });
    const segments = payload.workoutSegments as Array<{ workoutSteps: Array<Record<string, unknown>> }>;
    const repeat = segments[0]!.workoutSteps[0] as { workoutSteps: ExecutableStep[] };
    expect(repeat.workoutSteps[0]!.targetType.workoutTargetTypeKey).toBe('cadence');
    expect(repeat.workoutSteps[0]!.targetValueOne).toBe(90);
  });

  it('speed and cadence keep their raw value ranges in targetValueOne/Two', () => {
    const speedPayload = buildCyclingWorkoutPayload({
      workoutName: 'test',
      bikeType: 'cycling',
      steps: [
        { type: 'interval', endConditionType: 'time', endConditionValue: 120,
          targetType: 'speed', targetValueLow: 8.0, targetValueHigh: 10.0 },
      ],
    });
    const speedStep = firstStep(speedPayload);
    expect(speedStep.targetType.workoutTargetTypeKey).toBe('speed.zone');
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
    expect(cadenceStep.targetType.workoutTargetTypeKey).toBe('cadence');
    expect(cadenceStep.targetValueOne).toBe(85);
    expect(cadenceStep.targetValueTwo).toBe(95);
    expect(cadenceStep.zoneNumber).toBeNull();
  });
});
