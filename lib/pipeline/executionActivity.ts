import type { Json } from '@/types/supabase';
import type {
  EnrollmentExecutionStatus,
  ExecutionSendMethod,
  PricingExecutionStatus,
} from '@/lib/pipeline/execution';

type ActivityEntry = {
  id: string;
  kind: string;
  message: string;
  payload: Json;
  createdAt: string;
};

function createActivityEntry(
  kind: string,
  message: string,
  payload: Json,
): ActivityEntry {
  return {
    id: crypto.randomUUID(),
    kind,
    message,
    payload,
    createdAt: new Date().toISOString(),
  };
}

function isJsonObject(value: Json | null | undefined): value is Record<string, Json | undefined> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getExistingActivity(metadata: Json | null | undefined): ActivityEntry[] {
  if (!isJsonObject(metadata)) {
    return [];
  }

  const activity = metadata.activity;
  if (!Array.isArray(activity)) {
    return [];
  }

  return activity.filter(
    (entry): entry is ActivityEntry =>
      typeof entry === 'object' &&
      entry !== null &&
      !Array.isArray(entry) &&
      typeof (entry as { id?: unknown }).id === 'string' &&
      typeof (entry as { kind?: unknown }).kind === 'string' &&
      typeof (entry as { message?: unknown }).message === 'string' &&
      typeof (entry as { createdAt?: unknown }).createdAt === 'string',
  );
}

function appendActivity(metadata: Json | null | undefined, entry: ActivityEntry): Json {
  const existing = getExistingActivity(metadata);

  if (isJsonObject(metadata)) {
    return {
      ...metadata,
      activity: [entry, ...existing],
    };
  }

  return {
    activity: [entry],
  };
}

export function appendPricingExecutionCreatedActivity(
  metadata: Json | null | undefined,
  input: {
    executionId: string;
    pricingRequestId: string;
    executionStatus: PricingExecutionStatus;
    sendMethod: ExecutionSendMethod;
    recipientEmail: string | null;
  },
): Json {
  return appendActivity(
    metadata,
    createActivityEntry(
      'pricing_execution_created',
      `Pricing execution created as ${input.executionStatus}.`,
      {
        executionId: input.executionId,
        pricingRequestId: input.pricingRequestId,
        executionStatus: input.executionStatus,
        sendMethod: input.sendMethod,
        recipientEmail: input.recipientEmail,
      },
    ),
  );
}

export function appendPricingExecutionStatusChangedActivity(
  metadata: Json | null | undefined,
  input: {
    executionId: string;
    previousStatus: PricingExecutionStatus;
    nextStatus: PricingExecutionStatus;
    externalReference: string | null;
  },
): Json {
  return appendActivity(
    metadata,
    createActivityEntry(
      'pricing_execution_status_changed',
      `Pricing execution moved from ${input.previousStatus} to ${input.nextStatus}.`,
      {
        executionId: input.executionId,
        previousStatus: input.previousStatus,
        nextStatus: input.nextStatus,
        externalReference: input.externalReference,
      },
    ),
  );
}

export function appendPricingExecutionFollowUpActivity(
  metadata: Json | null | undefined,
  input: {
    executionId: string;
    followUpAt: string;
    operatorNotes: string | null;
  },
): Json {
  return appendActivity(
    metadata,
    createActivityEntry(
      'pricing_execution_follow_up_logged',
      'Pricing execution follow-up logged.',
      {
        executionId: input.executionId,
        followUpAt: input.followUpAt,
        operatorNotes: input.operatorNotes,
      },
    ),
  );
}

export function appendEnrollmentExecutionCreatedActivity(
  metadata: Json | null | undefined,
  input: {
    executionId: string;
    enrollmentAttemptId: string;
    executionStatus: EnrollmentExecutionStatus;
    sendMethod: ExecutionSendMethod;
    recipientEmail: string | null;
  },
): Json {
  return appendActivity(
    metadata,
    createActivityEntry(
      'enrollment_execution_created',
      `Enrollment execution created as ${input.executionStatus}.`,
      {
        executionId: input.executionId,
        enrollmentAttemptId: input.enrollmentAttemptId,
        executionStatus: input.executionStatus,
        sendMethod: input.sendMethod,
        recipientEmail: input.recipientEmail,
      },
    ),
  );
}

export function appendEnrollmentExecutionStatusChangedActivity(
  metadata: Json | null | undefined,
  input: {
    executionId: string;
    previousStatus: EnrollmentExecutionStatus;
    nextStatus: EnrollmentExecutionStatus;
    externalReference: string | null;
    failureReason: string | null;
  },
): Json {
  return appendActivity(
    metadata,
    createActivityEntry(
      'enrollment_execution_status_changed',
      `Enrollment execution moved from ${input.previousStatus} to ${input.nextStatus}.`,
      {
        executionId: input.executionId,
        previousStatus: input.previousStatus,
        nextStatus: input.nextStatus,
        externalReference: input.externalReference,
        failureReason: input.failureReason,
      },
    ),
  );
}

export function appendEnrollmentExecutionFollowUpActivity(
  metadata: Json | null | undefined,
  input: {
    executionId: string;
    followUpAt: string;
    operatorNotes: string | null;
  },
): Json {
  return appendActivity(
    metadata,
    createActivityEntry(
      'enrollment_execution_follow_up_logged',
      'Enrollment execution follow-up logged.',
      {
        executionId: input.executionId,
        followUpAt: input.followUpAt,
        operatorNotes: input.operatorNotes,
      },
    ),
  );
}