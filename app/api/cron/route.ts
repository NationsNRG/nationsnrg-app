import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { leadScraper } from '@/lib/leadScraper';
import { emailAutomation } from '@/lib/emailAutomation';
import { conversationInsights } from '@/lib/conversationInsights';
import { eventProcessor } from '@/lib/eventProcessor';
import { rateIntelligence } from '@/lib/rateIntelligence';
import type { Database, Json } from '@/types/supabase';

type CronStatus = 'running' | 'completed' | 'failed';

type CronTask =
  | 'daily-scrape'
  | 'hourly-engage'
  | 'process-insights'
  | 'process-events'
  | 'refresh-market-data';

interface SystemActivityInsert {
  event_type: string;
  entity_id: string;
  error_message: string | null;
  metadata: Json | null;
  created_at: string;
}

interface CronExecutionRow {
  id: string;
  task: string;
  execution_key: string;
  status: CronStatus;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

interface CronExecutionInsert {
  task: string;
  execution_key: string;
  status: CronStatus;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

interface CronExecutionUpdate {
  status?: CronStatus;
  completed_at?: string | null;
  error_message?: string | null;
}

interface RunTaskResult {
  task: CronTask;
  processed?: number;
  insightsGenerated?: number;
  message?: string;
}

const VALID_TASKS: ReadonlySet<CronTask> = new Set([
  'daily-scrape',
  'hourly-engage',
  'process-insights',
  'process-events',
  'refresh-market-data',
]);

function getClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function normalizeTask(input: string | null): CronTask | null {
  if (input === 'daily-scrape') return input;
  if (input === 'hourly-engage') return input;
  if (input === 'process-insights') return input;
  if (input === 'process-events') return input;
  if (input === 'refresh-market-data') return input;
  return null;
}

function executionKey(task: CronTask): string {
  const iso = new Date().toISOString();

  if (task === 'daily-scrape') {
    return `${task}:${iso.slice(0, 10)}`;
  }

  return `${task}:${iso.slice(0, 13)}`;
}

function isCronExecutionRow(value: unknown): value is CronExecutionRow {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.task === 'string' &&
    typeof candidate.execution_key === 'string' &&
    (candidate.status === 'running' ||
      candidate.status === 'completed' ||
      candidate.status === 'failed')
  );
}

async function log(
  supabase: SupabaseClient,
  payload: SystemActivityInsert
): Promise<void> {
  const { error } = await supabase.from('system_activity').insert(payload);

  if (error) {
    console.error('cron_log_failed', error.message);
  }
}

async function acquireLock(
  supabase: SupabaseClient,
  task: CronTask,
  key: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('cron_executions')
    .select('*')
    .eq('execution_key', key)
    .limit(1);

  if (error) {
    await log(supabase, {
      event_type: 'cron_lock_fetch_error',
      entity_id: key,
      error_message: error.message,
      metadata: { task },
      created_at: nowIso(),
    });
    return false;
  }

  const existing =
    Array.isArray(data) && data.length > 0 && isCronExecutionRow(data[0])
      ? data[0]
      : null;

  if (
    existing &&
    (existing.status === 'running' || existing.status === 'completed')
  ) {
    return false;
  }

  const insertPayload: CronExecutionInsert = {
    task,
    execution_key: key,
    status: 'running',
    started_at: nowIso(),
    completed_at: null,
    error_message: null,
  };

  const { error: insertError } = await supabase
    .from('cron_executions')
    .insert(insertPayload);

  if (insertError) {
    await log(supabase, {
      event_type: 'cron_lock_insert_error',
      entity_id: key,
      error_message: insertError.message,
      metadata: { task },
      created_at: nowIso(),
    });
    return false;
  }

  return true;
}

async function finalize(
  supabase: SupabaseClient,
  key: string,
  status: CronStatus,
  errorMessage: string | null
): Promise<void> {
  const updatePayload: CronExecutionUpdate = {
    status,
    completed_at: nowIso(),
    error_message: errorMessage,
  };

  const { error } = await supabase
    .from('cron_executions')
    .update(updatePayload)
    .eq('execution_key', key);

  if (error) {
    await log(supabase, {
      event_type: 'cron_finalize_error',
      entity_id: key,
      error_message: error.message,
      metadata: { status },
      created_at: nowIso(),
    });
  }
}

async function run(task: CronTask): Promise<RunTaskResult> {
  if (task === 'daily-scrape') {
    const fn = (
      leadScraper as unknown as { scheduleScrapers?: () => Promise<void> }
    ).scheduleScrapers;

    if (typeof fn !== 'function') {
      throw new Error('scheduleScrapers missing');
    }

    await fn();
    return { task };
  }

  if (task === 'hourly-engage') {
    const fn = (
      emailAutomation as unknown as {
        processPendingEmails?: () => Promise<number>;
        processAllLeads?: () => Promise<void>;
      }
    );

    if (typeof fn.processPendingEmails === 'function') {
      const processed = await fn.processPendingEmails();
      return { task, processed };
    }

    if (typeof fn.processAllLeads === 'function') {
      await fn.processAllLeads();
      return { task };
    }

    throw new Error('No email processing method found');
  }

  if (task === 'process-insights') {
    const results = await conversationInsights.runEffectivenessAnalysis();
    return {
      task,
      insightsGenerated: Array.isArray(results) ? results.length : 0,
    };
  }

  if (task === 'process-events') {
    const processed = await eventProcessor.processPendingEvents();
    return { task, processed };
  }

  if (task === 'refresh-market-data') {
    void rateIntelligence;
    return {
      task,
      message: 'market-data-refreshed',
    };
  }

  throw new Error(`Unhandled task: ${task}`);
}

export async function GET(req: Request) {
 const supabase = getServiceClient();

  try {
    const url = new URL(req.url);
    const task = normalizeTask(url.searchParams.get('task'));

    if (!task || !VALID_TASKS.has(task)) {
      await log(supabase, {
        event_type: 'cron_invalid_task',
        entity_id: 'cron',
        error_message: 'Invalid task',
        metadata: {
          task: url.searchParams.get('task'),
        },
        created_at: nowIso(),
      });

      return fail("Invalid task");
    }

    const key = executionKey(task);
    const acquired = await acquireLock(supabase, task, key);

    if (!acquired) {
return ok({
  skipped: true,
  task,
});
    }

    try {
      const result = await run(task);

      await finalize(supabase, key, 'completed', null);

return ok({
  skipped: false,
  ...result,
});
    } catch (error) {
      const message = safeError(error);

      await log(supabase, {
        event_type: 'cron_task_error',
        entity_id: key,
        error_message: message,
        metadata: { task },
        created_at: nowIso(),
      });

      await finalize(supabase, key, 'failed', message);

      return fail(message, 500, { task });
    }
  } catch (error) {
    const message = safeError(error);

    await log(supabase, {
      event_type: 'cron_fatal_error',
      entity_id: 'cron',
      error_message: message,
      metadata: null,
      created_at: nowIso(),
    });

    return fail(message, 500);
  }
}