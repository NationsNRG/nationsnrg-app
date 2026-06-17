import { NextResponse } from 'next/server';
import { smsCloser } from '@/lib/smsCloser';

type WebhookSuccessResponse = {
    success: true;
};

type WebhookErrorResponse = {
    success: false;
    error: string;
    code: string;
};

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function normalizeString(value: string): string {
    return value.trim();
}

function buildSuccessResponse(status = 200): NextResponse<WebhookSuccessResponse> {
    return NextResponse.json(
        {
            success: true,
        },
        { status }
    );
}

function buildErrorResponse(
    code: string,
    error: string,
    status: number
): NextResponse<WebhookErrorResponse> {
    return NextResponse.json(
        {
            success: false,
            code,
            error,
        },
        { status }
    );
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && isNonEmptyString(error.message)) {
        return error.message;
    }

    return 'Unknown error';
}

async function extractWebhookPayload(req: Request): Promise<{ from: string; body: string }> {
    const formData = await req.formData();

    const fromValue = formData.get('From');
    const bodyValue = formData.get('Body');

    if (!isNonEmptyString(fromValue)) {
        throw new Error('Missing From field');
    }

    if (!isNonEmptyString(bodyValue)) {
        throw new Error('Missing Body field');
    }

    return {
        from: normalizeString(fromValue),
        body: normalizeString(bodyValue),
    };
}

export async function POST(
    req: Request
): Promise<NextResponse<WebhookSuccessResponse | WebhookErrorResponse>> {
    let payload: { from: string; body: string };

    try {
        payload = await extractWebhookPayload(req);
    } catch (error: unknown) {
        return buildErrorResponse('INVALID_WEBHOOK_PAYLOAD', getErrorMessage(error), 400);
    }

    try {
        await smsCloser.handleReply(payload.from, payload.body);
        return buildSuccessResponse();
    } catch (error: unknown) {
        console.error('SMS webhook error:', error);
        return buildErrorResponse('SMS_WEBHOOK_PROCESSING_FAILED', getErrorMessage(error), 500);
    }
}