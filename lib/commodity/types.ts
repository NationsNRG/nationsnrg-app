export type CommodityType =
  | 'crude_oil'
  | 'diesel'
  | 'jet_fuel'
  | 'lng'
  | 'lpg';

export type DealStatus =
  | 'submitted'
  | 'under_review'
  | 'verified'
  | 'rejected';

export type VerificationStatus =
  | 'unverified'
  | 'in_review'
  | 'verified'
  | 'failed';

export type DocumentType =
  | 'SCO'
  | 'FCO'
  | 'ICPO'
  | 'BCL'
  | 'POP';

export type CounterpartyRole =
  | 'buyer'
  | 'seller'
  | 'intermediary';