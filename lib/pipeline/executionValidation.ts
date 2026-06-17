import type { Json } from '@/types/supabase';
import {
  ENROLLMENT_EXECUTION_STATUSES,
  ENROLLMENT_EXECUTION_TRANSITIONS,
  EXECUTION_SEND_METHODS,
  PRICING_EXECUTION_STATUSES,
  PRICING_EXECUTION_TRANSITIONS,
  type EnrollmentExecutionStatus,
  type ExecutionSendMethod,
  type PricingExecutionStatus,
} from '@/lib/pipeline/execution';

function hasValue(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isJsonObject(value: Json | null | undefined): value is Record<string, Json | undefined> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeNullableString(value: string | null | undefined): string | null {
  if (!hasValue(value)) {
    return null;
  }

  return value.trim();
}

export function normalizeNullableTimestamp(value: string | null | undefined): string | null {
  if (!hasValue(value)) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid timestamp value.');
  }

  return date.toISOString();
}

export function normalizeExecutionPayload(value: Json | null | undefined): Json {
  if (value == null) {
    return {};
  }

  if (!isJsonObject(value)) {
    throw new Error('executionPayload must be a JSON object.');
  }

  return value;
}

export function assertPricingExecutionStatus(
  value: string | null | undefined,
): PricingExecutionStatus {
  if (!hasValue(value)) {
    throw new Error('pricing execution status is required.');
  }

  if (
    (PRICING_EXECUTION_STATUSES as readonly string[]).includes(value.trim()) === false
  ) {
    throw new Error('Invalid pricing execution status.');
  }

  return value.trim() as PricingExecutionStatus;
}

export function assertEnrollmentExecutionStatus(
  value: string | null | undefined,
): EnrollmentExecutionStatus {
  if (!hasValue(value)) {
    throw new Error('enrollment execution status is required.');
  }

  if (
    (ENROLLMENT_EXECUTION_STATUSES as readonly string[]).includes(value.trim()) === false
  ) {
    throw new Error('Invalid enrollment execution status.');
  }

  return value.trim() as EnrollmentExecutionStatus;
}

export function assertExecutionSendMethod(
  value: string | null | undefined,
): ExecutionSendMethod {
  if (!hasValue(value)) {
    throw new Error('execution send method is required.');
  }

  if ((EXECUTION_SEND_METHODS as readonly string[]).includes(value.trim()) === false) {
    throw new Error('Invalid execution send method.');
  }

  return value.trim() as ExecutionSendMethod;
}

export function assertPricingExecutionTransition(
  currentStatus: PricingExecutionStatus,
  nextStatus: PricingExecutionStatus,
): void {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowed = PRICING_EXECUTION_TRANSITIONS[currentStatus];
  if (allowed.includes(nextStatus)) {
    return;
  }

  throw new Error(
    `Invalid pricing execution transition from ${currentStatus} to ${nextStatus}.`,
  );
}

export function assertEnrollmentExecutionTransition(
  currentStatus: EnrollmentExecutionStatus,
  nextStatus: EnrollmentExecutionStatus,
): void {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowed = ENROLLMENT_EXECUTION_TRANSITIONS[currentStatus];
  if (allowed.includes(nextStatus)) {
    return;
  }

  throw new Error(
    `Invalid enrollment execution transition from ${currentStatus} to ${nextStatus}.`,
  );
}