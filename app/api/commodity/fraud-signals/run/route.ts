import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import {
  buildCounterpartySignals,
  buildDuplicateDealSignatureSignals,
  buildDuplicateDocumentSignals,
  buildMissingCoreDocumentSignals,
} from '@/lib/commodity/fraudSignals';

type RequestBody = {
  dealId?: string;
};

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const dealId = normalizeNullableString(body.dealId);

    if (!dealId) {
      return NextResponse.json({ error: 'dealId is required.' }, { status: 400 });
    }

    const supabase = getSupabase();

    const [dealResult, documentsResult, counterpartiesResult, allDealsResult, allDocumentsResult, allCounterpartiesResult] =
      await Promise.all([
        supabase.from('commodity_deals').select('*').eq('id', dealId).maybeSingle(),
        supabase.from('commodity_documents').select('*').eq('deal_id', dealId),
        supabase.from('commodity_counterparties').select('*').eq('deal_id', dealId),
        supabase.from('commodity_deals').select('*'),
        supabase.from('commodity_documents').select('*'),
        supabase.from('commodity_counterparties').select('*'),
      ]);

    if (dealResult.error) {
      return NextResponse.json({ error: dealResult.error.message }, { status: 500 });
    }

    if (!dealResult.data) {
      return NextResponse.json({ error: 'Commodity deal not found.' }, { status: 404 });
    }

    if (documentsResult.error || counterpartiesResult.error || allDealsResult.error || allDocumentsResult.error || allCounterpartiesResult.error) {
      return NextResponse.json({ error: 'Failed to load fraud-signal inputs.' }, { status: 500 });
    }

    await supabase
      .from('commodity_fraud_signals')
      .delete()
      .eq('deal_id', dealId)
      .eq('status', 'open');

    const documents = documentsResult.data ?? [];
    const counterparties = counterpartiesResult.data ?? [];
    const allDeals = allDealsResult.data ?? [];
    const allDocuments = allDocumentsResult.data ?? [];
    const allCounterparties = allCounterpartiesResult.data ?? [];

    const signals = [
      ...buildDuplicateDocumentSignals({
        dealId,
        currentDocuments: documents,
        allDocuments,
      }),
      ...buildDuplicateDealSignatureSignals({
        currentDeal: dealResult.data,
        allDeals,
      }),
      ...buildCounterpartySignals({
        dealId,
        counterparties,
        allCounterparties,
      }),
      ...buildMissingCoreDocumentSignals({
        dealId,
        documents,
      }),
    ];

    if (signals.length > 0) {
      const insertResult = await supabase
        .from('commodity_fraud_signals')
        .insert(signals);

      if (insertResult.error) {
        return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
      }
    }

    const logResult = await supabase
      .from('commodity_verification_logs')
      .insert({
        deal_id: dealId,
        action: 'fraud_signal_run',
        result: signals.length > 0 ? 'signals_detected' : 'clear',
        notes:
          signals.length > 0
            ? `Generated ${signals.length} fraud signal(s).`
            : 'No fraud signals detected.',
      });

    if (logResult.error) {
      return NextResponse.json({ error: logResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      signals,
      signalCount: signals.length,
    });
  } catch (error) {
    console.error('POST /api/commodity/fraud-signals/run failed', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error while running fraud signals.',
      },
      { status: 500 },
    );
  }
}