import type {
  SupplierPortalStatus,
  SupplierRequestStatus,
  SupplierRequestType,
} from '@/lib/suppliers/types';

export function assertSupplierPortalStatus(value: string): SupplierPortalStatus {
  if (['active', 'inactive', 'testing', 'pending'].includes(value)) {
    return value as SupplierPortalStatus;
  }

  throw new Error('Invalid supplier portal status.');
}

export function assertSupplierRequestType(value: string): SupplierRequestType {
  if (['pricing', 'enrollment'].includes(value)) {
    return value as SupplierRequestType;
  }

  throw new Error('Invalid supplier request type.');
}

export function assertSupplierRequestStatus(value: string): SupplierRequestStatus {
  if (['open', 'in_review', 'responded', 'closed'].includes(value)) {
    return value as SupplierRequestStatus;
  }

  throw new Error('Invalid supplier request status.');
}