import type { DocumentType } from './types';

export type CommodityDealScoringInput = {
  commodity: string;
  buyerName: string | null;
  sellerName: string | null;
  volume: number | null;
  price: number | null;
  documents: Array<{
    documentType: DocumentType;
    verified: boolean;
  }>;
  counterparties: Array<{
    role: 'buyer' | 'seller' | 'intermediary';
    verificationStatus: 'unverified' | 'in_review' | 'verified' | 'failed';
    riskFlags: string[] | null;
  }>;
};

export type CommodityDealScoringResult = {
  riskScore: number;
  verificationStatus: 'unverified' | 'in_review' | 'verified' | 'failed';
  reasons: string[];
};

function hasVerifiedDocument(
  documents: CommodityDealScoringInput['documents'],
  type: DocumentType,
): boolean {
  return documents.some(
    (document) => document.documentType === type && document.verified === true,
  );
}

export function scoreCommodityDeal(
  input: CommodityDealScoringInput,
): CommodityDealScoringResult {
  let riskScore = 50;
  const reasons: string[] = [];

  if (!input.buyerName) {
    riskScore += 10;
    reasons.push('Buyer name missing');
  }

  if (!input.sellerName) {
    riskScore += 10;
    reasons.push('Seller name missing');
  }

  if (!input.volume || input.volume <= 0) {
    riskScore += 15;
    reasons.push('Volume missing or invalid');
  }

  if (!input.price || input.price <= 0) {
    riskScore += 15;
    reasons.push('Price missing or invalid');
  }

  if (hasVerifiedDocument(input.documents, 'ICPO')) {
    riskScore -= 10;
    reasons.push('Verified ICPO present');
  }

  if (hasVerifiedDocument(input.documents, 'BCL')) {
    riskScore -= 10;
    reasons.push('Verified BCL present');
  }

  if (hasVerifiedDocument(input.documents, 'POP')) {
    riskScore -= 15;
    reasons.push('Verified POP present');
  }

  const failedCounterparty = input.counterparties.some(
    (counterparty) => counterparty.verificationStatus === 'failed',
  );

  if (failedCounterparty) {
    riskScore += 25;
    reasons.push('At least one counterparty failed verification');
  }

  const flaggedCounterparty = input.counterparties.some(
    (counterparty) => (counterparty.riskFlags?.length ?? 0) > 0,
  );

  if (flaggedCounterparty) {
    riskScore += 15;
    reasons.push('Counterparty has risk flags');
  }

  riskScore = Math.max(0, Math.min(100, riskScore));

  let verificationStatus: 'unverified' | 'in_review' | 'verified' | 'failed' =
    'unverified';

  if (riskScore >= 80) {
    verificationStatus = 'failed';
  } else if (riskScore <= 20) {
    verificationStatus = 'verified';
  } else {
    verificationStatus = 'in_review';
  }

  return {
    riskScore,
    verificationStatus,
    reasons,
  };
}