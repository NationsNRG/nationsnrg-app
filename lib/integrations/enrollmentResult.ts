import type { Database, Json } from '@/types/supabase';
import type { NormalizedEnrollmentResponse } from '@/lib/integrations/types';

export type EnrollmentAttemptRow =
  Database['public']['Tables']['enrollment_attempts']['Row'];

export type EnrollmentExecutionUpdate =
  Database['public']['Tables']['enrollment_executions']['Update'];

export type EnrollmentAttemptUpdate =
  Database['public']['Tables']['enrollment_attempts']['Update'];

export type EnrollmentResultIngestionInput = {
  pipelineId: string;
  enrollmentAttempt: EnrollmentAttemptRow;
  response: NormalizedEnrollmentResponse;
};

export type EnrollmentResultIngestionRecord = {
  enrollmentAttemptUpdate: EnrollmentAttemptUpdate;
  enrollmentExecutionUpdate: EnrollmentExecutionUpdate;
  externalReference: string | null;
  sourceProviderKey: string;
  sourceMode: string;
};

function normalizeNullableString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNullableTimestamp(value: string | null | undefined): string | null {
  const normalized = normalizeNullableString(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid enrollment response timestamp.');
  }

  return parsed.toISOString();
}

function assertNormalizedStatus(
  response: NormalizedEnrollmentResponse,
): NonNullable<NormalizedEnrollmentResponse['normalizedStatus']> {
  if (!response.success) {
    throw new Error('Cannot ingest unsuccessful enrollment response.');
  }

  if (!response.normalizedStatus) {
    throw new Error('Enrollment response does not include a normalized status.');
  }

  return response.normalizedStatus;
}

function mapEnrollmentAttemptStatus(
  normalizedStatus: string | null,
): EnrollmentAttemptRow['status'] {
  switch (normalizedStatus) {
    case 'accepted':
      return 'accepted';
    case 'rejected':
      return 'rejected';
    case 'failed':
      return 'failed';
    case 'submitted':
    case 'pending_supplier_review':
    case 'pending':
      return 'submitted';
    default:
      return 'submitted';
  }
}

function mapEnrollmentExecutionStatus(
  normalizedStatus: string | null,
): Database['public']['Tables']['enrollment_executions']['Update']['execution_status'] {
  switch (normalizedStatus) {
    case 'accepted':
      return 'accepted';
    case 'rejected':
      return 'rejected';
    case 'failed':
      return 'failed';
    case 'submitted':
    case 'pending':
    case 'pending_supplier_review':
      return 'pending_supplier_review';
    default:
      return 'pending_supplier_review';
  }
}

function buildExecutionPayload(input: {
  response: NormalizedEnrollmentResponse;
  enrollmentAttempt: EnrollmentAttemptRow;
  externalReference: string | null;
}): Json {
  return {
    source: 'integration_result',
    sourceProviderKey: input.response.providerKey,
    sourceMode: input.response.mode,
    externalReference: input.externalReference,
    requiresManualOperator: input.response.requiresManualOperator,
    enrollmentAttemptId: input.enrollmentAttempt.id,
    rawPayload: input.response.rawPayload ?? {},
    normalizedStatus: input.response.normalizedStatus ?? {},
  };
}

export function buildEnrollmentUpdatesFromResult(
  input: EnrollmentResultIngestionInput,
): EnrollmentResultIngestionRecord {
  const normalizedStatus = assertNormalizedStatus(input.response);
  const externalReference =
    normalizeNullableString(input.response.externalReference) ??
    normalizeNullableString(input.enrollmentAttempt.external_enrollment_id);

  const responseReceivedAt = normalizeNullableTimestamp(
    typeof normalizedStatus.rawPayload === 'object' &&
      normalizedStatus.rawPayload !== null &&
      !Array.isArray(normalizedStatus.rawPayload) &&
      typeof normalizedStatus.rawPayload.responseReceivedAt === 'string'
      ? normalizedStatus.rawPayload.responseReceivedAt
      : new Date().toISOString(),
  );

  const enrollmentAttemptUpdate: EnrollmentAttemptUpdate = {
    status: mapEnrollmentAttemptStatus(normalizeNullableString(normalizedStatus.status)),
    external_enrollment_id: externalReference,
    failure_reason: normalizeNullableString(normalizedStatus.failureReason),
    submitted_at: input.enrollmentAttempt.submitted_at ?? new Date().toISOString(),
  };

  const enrollmentExecutionUpdate: EnrollmentExecutionUpdate = {
    execution_status: mapEnrollmentExecutionStatus(
      normalizeNullableString(normalizedStatus.status),
    ),
    external_reference: externalReference,
    response_received_at: responseReceivedAt,
    failure_reason: normalizeNullableString(normalizedStatus.failureReason),
    execution_payload: buildExecutionPayload({
      response: input.response,
      enrollmentAttempt: input.enrollmentAttempt,
      externalReference,
    }),
  };

  return {
    enrollmentAttemptUpdate,
    enrollmentExecutionUpdate,
    externalReference,
    sourceProviderKey: String(input.response.providerKey),
    sourceMode: input.response.mode,
  };
}

export function buildEnrollmentResultSummary(
  response: NormalizedEnrollmentResponse,
): {
  externalReference: string | null;
  normalizedStatus: string | null;
  failureReason: string | null;
} {
  return {
    externalReference: normalizeNullableString(response.externalReference),
    normalizedStatus: normalizeNullableString(response.normalizedStatus?.status),
    failureReason: normalizeNullableString(response.normalizedStatus?.failureReason),
  };
}