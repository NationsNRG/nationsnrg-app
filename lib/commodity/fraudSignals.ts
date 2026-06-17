import type { Database, Json } from '@/types/supabase';

type CommodityDealRow = Database['public']['Tables']['commodity_deals']['Row'];
type CommodityDocumentRow = Database['public']['Tables']['commodity_documents']['Row'];
type CommodityCounterpartyRow = Database['public']['Tables']['commodity_counterparties']['Row'];

export type FraudSignalInsert =
  Database['public']['Tables']['commodity_fraud_signals']['Insert'];

export type FraudSignalType =
  | 'duplicate_checksum'
  | 'duplicate_deal_signature'
  | 'repeated_failed_counterparty'
  | 'missing_core_documents'
  | 'buyer_seller_overlap'
  | 'high_risk_intermediary_cluster';

function normalizeNullableString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildDealSignature(deal: CommodityDealRow): string {
  return [
    normalizeNullableString(deal.commodity),
    normalizeNullableString(deal.buyer_name),
    normalizeNullableString(deal.seller_name),
    deal.volume != null ? String(deal.volume) : null,
    deal.price != null ? String(deal.price) : null,
    normalizeNullableString(deal.currency),
  ]
    .filter(Boolean)
    .join('|')
    .toLowerCase();
}

function buildSignalMetadata(input: Record<string, Json>): Json {
  return input;
}

export function buildDuplicateDocumentSignals(input: {
  dealId: string;
  currentDocuments: CommodityDocumentRow[];
  allDocuments: CommodityDocumentRow[];
}): FraudSignalInsert[] {
  const signals: FraudSignalInsert[] = [];

  for (const document of input.currentDocuments) {
    const checksum = normalizeNullableString(document.checksum_sha256);

    if (!checksum) {
      continue;
    }

    const duplicateDocuments = input.allDocuments.filter(
      (item) => item.id !== document.id && item.checksum_sha256 === checksum,
    );

    if (duplicateDocuments.length > 0) {
      signals.push({
        deal_id: input.dealId,
        signal_type: 'duplicate_checksum',
        severity: 'high',
        status: 'open',
        notes: `Document checksum matches ${duplicateDocuments.length} other record(s).`,
        metadata: buildSignalMetadata({
          checksum_sha256: checksum,
          duplicate_document_ids: duplicateDocuments.map((item) => item.id),
          current_document_id: document.id,
        }),
      });
    }
  }

  return signals;
}

export function buildDuplicateDealSignatureSignals(input: {
  currentDeal: CommodityDealRow;
  allDeals: CommodityDealRow[];
}): FraudSignalInsert[] {
  const currentSignature = buildDealSignature(input.currentDeal);

  if (!currentSignature) {
    return [];
  }

  const duplicates = input.allDeals.filter(
    (deal) => deal.id !== input.currentDeal.id && buildDealSignature(deal) === currentSignature,
  );

  if (duplicates.length === 0) {
    return [];
  }

  return [
    {
      deal_id: input.currentDeal.id,
      signal_type: 'duplicate_deal_signature',
      severity: 'high',
      status: 'open',
      notes: `Deal signature matches ${duplicates.length} other deal(s).`,
      metadata: buildSignalMetadata({
        signature: currentSignature,
        duplicate_deal_ids: duplicates.map((deal) => deal.id),
      }),
    },
  ];
}

export function buildCounterpartySignals(input: {
  dealId: string;
  counterparties: CommodityCounterpartyRow[];
  allCounterparties: CommodityCounterpartyRow[];
}): FraudSignalInsert[] {
  const signals: FraudSignalInsert[] = [];

  const normalizedNames = input.counterparties
    .map((counterparty) => ({
      id: counterparty.id,
      role: counterparty.role,
      name: normalizeNullableString(counterparty.name)?.toLowerCase() ?? null,
      verificationStatus: counterparty.verification_status,
      riskFlags: counterparty.risk_flags ?? [],
    }))
    .filter((counterparty) => counterparty.name);

  const buyerNames = normalizedNames
    .filter((counterparty) => counterparty.role === 'buyer')
    .map((counterparty) => counterparty.name);

  const sellerNames = normalizedNames
    .filter((counterparty) => counterparty.role === 'seller')
    .map((counterparty) => counterparty.name);

  const overlap = buyerNames.find((buyerName) => sellerNames.includes(buyerName));

  if (overlap) {
    signals.push({
      deal_id: input.dealId,
      signal_type: 'buyer_seller_overlap',
      severity: 'critical',
      status: 'open',
      notes: 'Buyer and seller names overlap on the same deal.',
      metadata: buildSignalMetadata({
        overlapping_name: overlap,
      }),
    });
  }

  for (const counterparty of normalizedNames) {
    const historicalFailures = input.allCounterparties.filter((item) => {
      const historicalName = normalizeNullableString(item.name)?.toLowerCase() ?? null;
      return (
        historicalName === counterparty.name &&
        item.verification_status === 'failed'
      );
    });

    if (historicalFailures.length > 0) {
      signals.push({
        deal_id: input.dealId,
        signal_type: 'repeated_failed_counterparty',
        severity: 'high',
        status: 'open',
        notes: `Counterparty has ${historicalFailures.length} prior failed verification record(s).`,
        metadata: buildSignalMetadata({
          counterparty_name: counterparty.name,
          historical_failure_count: historicalFailures.length,
        }),
      });
    }

    const riskFlagCount = counterparty.riskFlags.length;
    if (counterparty.role === 'intermediary' && riskFlagCount >= 2) {
      signals.push({
        deal_id: input.dealId,
        signal_type: 'high_risk_intermediary_cluster',
        severity: 'high',
        status: 'open',
        notes: 'Intermediary counterparty has multiple risk flags.',
        metadata: buildSignalMetadata({
          counterparty_name: counterparty.name,
          risk_flags: counterparty.riskFlags,
        }),
      });
    }
  }

  return signals;
}

export function buildMissingCoreDocumentSignals(input: {
  dealId: string;
  documents: CommodityDocumentRow[];
}): FraudSignalInsert[] {
  const presentTypes = new Set(input.documents.map((document) => document.document_type));

  const requiredTypes = ['ICPO', 'BCL', 'POP'];
  const missing = requiredTypes.filter((type) => !presentTypes.has(type));

  if (missing.length === 0) {
    return [];
  }

  return [
    {
      deal_id: input.dealId,
      signal_type: 'missing_core_documents',
      severity: 'medium',
      status: 'open',
      notes: `Missing core document(s): ${missing.join(', ')}`,
      metadata: buildSignalMetadata({
        missing_document_types: missing,
      }),
    },
  ];
}