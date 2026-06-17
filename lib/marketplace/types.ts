export type MarketplaceProvider = 'box'

export type MarketplaceCommodity = 'electricity' | 'natural_gas'

export type MarketplaceCustomerType = 'commercial' | 'residential'

export type PricingRequestBody = {
  provider?: unknown
  commodity?: unknown
  customerType?: unknown
  state?: unknown
  zipCode?: unknown
  utility?: unknown
  annualUsage?: unknown
  averageMonthlyBill?: unknown
  businessName?: unknown
  contactName?: unknown
  email?: unknown
  phone?: unknown
  metadata?: unknown
}

export type NormalizedPricingRequest = {
  provider: MarketplaceProvider
  commodity: MarketplaceCommodity
  customerType: MarketplaceCustomerType
  state: string | null
  zipCode: string | null
  utility: string | null
  annualUsage: number | null
  averageMonthlyBill: number | null
  businessName: string | null
  contactName: string | null
  email: string | null
  phone: string | null
  metadata: Record<string, unknown>
}

export type EnrollmentRequestBody = {
  provider?: unknown
  commodity?: unknown
  customerType?: unknown
  offerId?: unknown
  planCode?: unknown
  utility?: unknown
  annualUsage?: unknown
  averageMonthlyBill?: unknown
  businessName?: unknown
  contactName?: unknown
  email?: unknown
  phone?: unknown
  serviceAddress?: unknown
  metadata?: unknown
}

export type NormalizedEnrollmentRequest = {
  provider: MarketplaceProvider
  commodity: MarketplaceCommodity
  customerType: MarketplaceCustomerType
  offerId: string | null
  planCode: string | null
  utility: string | null
  annualUsage: number | null
  averageMonthlyBill: number | null
  businessName: string | null
  contactName: string | null
  email: string | null
  phone: string | null
  serviceAddress: string | null
  metadata: Record<string, unknown>
}

export type EnrollmentStatusRequestBody = {
  provider?: unknown
  enrollmentId?: unknown
  contractId?: unknown
  externalId?: unknown
  metadata?: unknown
}

export type NormalizedEnrollmentStatusRequest = {
  provider: MarketplaceProvider
  enrollmentId: string | null
  contractId: string | null
  externalId: string | null
  metadata: Record<string, unknown>
}