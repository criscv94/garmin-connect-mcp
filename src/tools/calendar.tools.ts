import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GarminClient } from '../client';
import { getCalendarSchema, rescheduleWorkoutSchema, unscheduleWorkoutSchema } from '../dtos';

export function registerCalendarTools(server: McpServer, client: GarminClient): void {
  server.registerTool(
    'get_calendar',
    {
      description:
        'Get Garmin calendar items for a date range: scheduled workouts (from you, a coach or a training plan) and completed activities. Each item has a date, title and itemType. For scheduled workouts, id is the schedule ID used by reschedule_workout and unschedule_workout, and workoutId is the workout itself',
      inputSchema: getCalendarSchema.shape,
    },
    async ({ startDate, endDate, itemType }) => {
      const data = await client.getCalendar(startDate, endDate, itemType);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    'reschedule_workout',
    {
      description:
        'Move a scheduled workout to a different date on the Garmin calendar, keeping the same schedule entry. Use get_calendar to find the schedule ID',
      inputSchema: rescheduleWorkoutSchema.shape,
    },
    async ({ scheduleId, date }) => {
      const data = await client.rescheduleWorkout(scheduleId, date);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
      };
    },
  );

  server.registerTool(
    'unschedule_workout',
    {
      description:
        'Remove a scheduled workout from the Garmin calendar. The workout itself stays in your workout library. Use get_calendar to find the schedule ID',
      inputSchema: unscheduleWorkoutSchema.shape,
    },
    async ({ scheduleId }) => {
      await client.unscheduleWorkout(scheduleId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ scheduleId, unscheduled: true }, null, 2) }],
      };
    },
  );
}
