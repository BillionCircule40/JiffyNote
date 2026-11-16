import { PoolClient } from 'pg';
import { pool } from '../index';

export interface PlanEventRecord {
  id: string;
  title: string;
  dayOfWeek: number;
  daysOfWeek?: number[];
  startTime: string;
  endTime: string;
  color: string;
  noteIds?: string[];
}

export interface PlanRecord {
  id: string;
  title: string;
  description: string;
  color: string;
  events: PlanEventRecord[];
  recurrence?: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
}

const getPlansWithClient = async (client: PoolClient, userId: string): Promise<PlanRecord[]> => {
  const plansResult = await client.query(
    `SELECT id, name AS title, description, color, recurrence
     FROM plans WHERE user_id = $1 ORDER BY created_at, id`,
    [userId]
  );
  const eventsResult = await client.query(
    `SELECT plan_events.id, plan_events.plan_id, plan_events.title,
            plan_events.day_of_week AS "dayOfWeek",
            plan_events.days_of_week AS "daysOfWeek",
            TO_CHAR(plan_events.start_time, 'HH24:MI') AS "startTime",
            TO_CHAR(plan_events.end_time, 'HH24:MI') AS "endTime",
            plan_events.color,
            plan_events.note_ids AS "noteIds"
     FROM plan_events
     INNER JOIN plans ON plans.id = plan_events.plan_id
     WHERE plans.user_id = $1
     ORDER BY plan_events.day_of_week, plan_events.start_time, plan_events.id`,
    [userId]
  );
  const eventsByPlan = new Map<string, PlanEventRecord[]>();

  for (const event of eventsResult.rows as (PlanEventRecord & { plan_id: string })[]) {
    const events = eventsByPlan.get(event.plan_id) ?? [];
    events.push({
      id: event.id,
      title: event.title,
      dayOfWeek: event.dayOfWeek,
      daysOfWeek: event.daysOfWeek?.length ? event.daysOfWeek : [event.dayOfWeek],
      startTime: event.startTime,
      endTime: event.endTime,
      color: event.color,
      noteIds: event.noteIds ?? [],
    });
    eventsByPlan.set(event.plan_id, events);
  }

  return plansResult.rows.map((plan) => ({
    id: plan.id,
    title: plan.title,
    description: plan.description ?? '',
    color: plan.color,
    recurrence: plan.recurrence ?? undefined,
    events: eventsByPlan.get(plan.id) ?? [],
  }));
};

export const getPlansByUserId = async (userId: string): Promise<PlanRecord[]> => {
  const client = await pool.connect();
  try {
    return await getPlansWithClient(client, userId);
  } finally {
    client.release();
  }
};

export const replacePlansForUser = async (userId: string, plans: PlanRecord[]): Promise<PlanRecord[]> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM plans WHERE user_id = $1', [userId]);

    for (const plan of plans) {
      await client.query(
        `INSERT INTO plans (id, user_id, name, description, color, recurrence)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [plan.id, userId, plan.title, plan.description, plan.color, plan.recurrence ?? null]
      );

      for (const event of plan.events) {
        await client.query(
          `INSERT INTO plan_events (id, plan_id, title, day_of_week, days_of_week, start_time, end_time, color, note_ids)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9::jsonb)`,
          [event.id, plan.id, event.title, event.dayOfWeek, JSON.stringify(event.daysOfWeek?.length ? event.daysOfWeek : [event.dayOfWeek]), event.startTime, event.endTime, event.color, JSON.stringify(event.noteIds ?? [])]
        );
      }
    }

    await client.query('COMMIT');
    return await getPlansWithClient(client, userId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};