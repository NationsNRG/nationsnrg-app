import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';
import type { PipelineActivityLogInput } from './types';

function getServiceRoleSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isJsonObject(value: Json | null | undefined): value is Record<string, Json | undefined> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asJson(value: unknown): Json {
  return value as Json;
}

export async function logPipelineActivity(
  input: PipelineActivityLogInput,
): Promise<void> {
  try {
    const supabase = getServiceRoleSupabase();

    const existingMetadataResult = await supabase
      .from('deal_pipeline')
      .select('metadata')
      .eq('id', input.pipelineId)
      .maybeSingle();

    if (existingMetadataResult.error) {
      throw existingMetadataResult.error;
    }

    const rawMetadata = existingMetadataResult.data?.metadata;
    const currentMetadata: Record<string, Json | undefined> = isJsonObject(rawMetadata)
      ? rawMetadata
      : {};

    const existingActivityRaw = currentMetadata.activity;
    const existingActivity: Json[] = Array.isArray(existingActivityRaw)
      ? existingActivityRaw
      : [];

    const nextEntry = asJson({
      id: crypto.randomUUID(),
      kind: input.kind,
      message: input.message,
      payload: (input.payload ?? {}) as Json,
      createdAt: new Date().toISOString(),
    });

    const nextMetadata: Json = {
      ...currentMetadata,
      activity: [...existingActivity, nextEntry],
    };

    const updateResult = await supabase
      .from('deal_pipeline')
      .update({
        metadata: nextMetadata,
      })
      .eq('id', input.pipelineId);

    if (updateResult.error) {
      throw updateResult.error;
    }
  } catch (error) {
    console.error('logPipelineActivity failed', {
      pipelineId: input.pipelineId,
      kind: input.kind,
      error,
    });
  }
}