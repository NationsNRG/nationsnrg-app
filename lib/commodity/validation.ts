import {
  CommodityType,
  DealStatus,
  VerificationStatus,
  DocumentType,
  CounterpartyRole,
} from './types';

export function assertCommodity(value: string): CommodityType {
  if (
    value === 'crude_oil' ||
    value === 'diesel' ||
    value === 'jet_fuel' ||
    value === 'lng' ||
    value === 'lpg'
  ) {
    return value;
  }

  throw new Error('Invalid commodity type');
}

export function assertDealStatus(value: string): DealStatus {
  if (
    value === 'submitted' ||
    value === 'under_review' ||
    value === 'verified' ||
    value === 'rejected'
  ) {
    return value;
  }

  throw new Error('Invalid deal status');
}

export function assertVerificationStatus(value: string): VerificationStatus {
  if (
    value === 'unverified' ||
    value === 'in_review' ||
    value === 'verified' ||
    value === 'failed'
  ) {
    return value;
  }

  throw new Error('Invalid verification status');
}

export function assertDocumentType(value: string): DocumentType {
  if (
    value === 'SCO' ||
    value === 'FCO' ||
    value === 'ICPO' ||
    value === 'BCL' ||
    value === 'POP'
  ) {
    return value;
  }

  throw new Error('Invalid document type');
}

export function assertCounterpartyRole(value: string): CounterpartyRole {
  if (
    value === 'buyer' ||
    value === 'seller' ||
    value === 'intermediary'
  ) {
    return value;
  }

  throw new Error('Invalid counterparty role');
}