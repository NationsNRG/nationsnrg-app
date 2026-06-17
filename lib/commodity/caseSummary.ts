import type { Database, Json } from '@/types/supabase';

type CommodityDealRow = Database['public']['Tables']['commodity_deals']['Row'];
type CommodityDocumentRow = Database['public']['Tables']['commodity_documents']['Row'];
type CommodityCounterpartyRow = Database['public']['Tables']['commodity_counterparties']['Row'];
type CommodityFraudSignalRow = Database['public']['Tables']['commodity_fraud_signals']['Row'];

export type CommodityCaseSummary = {
  overview: {
    dealName: string;
    commodity: string;
    buyerName: string | null;
    sellerName: string | null;
    volume: number | null;
    unit: string | null;
    price: number | null;
    currency: string | null;
  };
  verification: {
    dealStatus: string;
    verificationStatus: string;
    operatorReviewStatus: string;
    escalationStatus: string;
    riskScore: number;
  };
  documents: {
    total: number;
    verified: number;
    missingCore: string[];
  };
  counterparties: {
    total: number;
    verified: number;
    failed: number;
    flagged: number;
  };
  fraudSignals: {
    total: number;
    critical: number;
    high: number;
    open: number;
  };
  recommendation: {
    readyForPresentment: boolean;
    readyForRejection: boolean;
    recommendationLabel: 'present' | 'reject' | 'hold';
    reasons: string[];
  };
};

function isCoreDocument(type: string): boolean {
  return type === 'ICPO' || type === 'BCL' || type === 'POP';
}

export function buildCommodityCaseSummary(input: {
  deal: CommodityDealRow;
  documents: CommodityDocumentRow[];
  counterparties: CommodityCounterpartyRow[];
  fraudSignals: CommodityFraudSignalRow[];
}): CommodityCaseSummary {
  const verifiedDocuments = input.documents.filter((document) => document.verified === true);
  const missingCore = ['ICPO', 'BCL', 'POP'].filter(
    (type) => !input.documents.some((document) => document.document_type === type),
  );

  const verifiedCounterparties = input.counterparties.filter(
    (counterparty) => counterparty.verification_status === 'verified',
  );

  const failedCounterparties = input.counterparties.filter(
    (counterparty) => counterparty.verification_status === 'failed',
  );

  const flaggedCounterparties = input.counterparties.filter(
    (counterparty) => (counterparty.risk_flags?.length ?? 0) > 0,
  );

  const criticalSignals = input.fraudSignals.filter((signal) => signal.severity === 'critical');
  const highSignals = input.fraudSignals.filter((signal) => signal.severity === 'high');
  const openSignals = input.fraudSignals.filter((signal) => signal.status === 'open');

  const reasons: string[] = [];
  let recommendationLabel: 'present' | 'reject' | 'hold' = 'hold';
  let readyForPresentment = false;
  let readyForRejection = false;

  if (criticalSignals.length > 0) {
    reasons.push('Critical fraud signals detected');
  }

  if (failedCounterparties.length > 0) {
    reasons.push('At least one counterparty failed verification');
  }

  if (missingCore.length > 0) {
    reasons.push(`Missing core documents: ${missingCore.join(', ')}`);
  }

  if ((input.deal.risk_score ?? 0) >= 80) {
    reasons.push('Risk score is too high');
  }

  if (
    criticalSignals.length === 0 &&
    failedCounterparties.length === 0 &&
    missingCore.length === 0 &&
    (input.deal.risk_score ?? 0) <= 25
  ) {
    recommendationLabel = 'present';
    readyForPresentment = true;
    reasons.push('Deal is sufficiently verified for operator presentment');
  } else if (
    criticalSignals.length > 0 ||
    failedCounterparties.length > 0 ||
    (input.deal.risk_score ?? 0) >= 80
  ) {
    recommendationLabel = 'reject';
    readyForRejection = true;
    reasons.push('Deal is unsuitable for presentment in current state');
  } else {
    recommendationLabel = 'hold';
    reasons.push('Further review is required before decision');
  }

  return {
    overview: {
      dealName: input.deal.deal_name,
      commodity: input.deal.commodity,
      buyerName: input.deal.buyer_name,
      sellerName: input.deal.seller_name,
      volume: input.deal.volume,
      unit: input.deal.unit,
      price: input.deal.price,
      currency: input.deal.currency,
    },
    verification: {
      dealStatus: input.deal.status,
      verificationStatus: input.deal.verification_status,
      operatorReviewStatus: input.deal.operator_review_status,
      escalationStatus: input.deal.escalation_status,
      riskScore: input.deal.risk_score ?? 0,
    },
    documents: {
      total: input.documents.length,
      verified: verifiedDocuments.length,
      missingCore,
    },
    counterparties: {
      total: input.counterparties.length,
      verified: verifiedCounterparties.length,
      failed: failedCounterparties.length,
      flagged: flaggedCounterparties.length,
    },
    fraudSignals: {
      total: input.fraudSignals.length,
      critical: criticalSignals.length,
      high: highSignals.length,
      open: openSignals.length,
    },
    recommendation: {
      readyForPresentment,
      readyForRejection,
      recommendationLabel,
      reasons,
    },
  };
}

export function caseSummaryToJson(summary: CommodityCaseSummary): Json {
  return summary as unknown as Json;
}