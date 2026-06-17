export type PublicPricingIntakeStatus =
  | 'new'
  | 'reviewing'
  | 'quoted'
  | 'contacted'
  | 'converted'
  | 'closed'
  | 'lost'

export type PublicPricingCommodity =
  | 'electricity'
  | 'natural_gas'
  | 'other'

export type CreatePublicPricingIntakeRequestBody = {
  companyName?: unknown
  contactName?: unknown
  email?: unknown
  phone?: unknown
  state?: unknown
  zipCode?: unknown
  utility?: unknown
  averageMonthlyBill?: unknown
  averageMonthlyUsage?: unknown
  commodity?: unknown
  notes?: unknown
  metadata?: unknown
}

export type NormalizedPublicPricingIntakeRequest = {
  companyName: string | null
  contactName: string | null
  email: string
  phone: string | null
  state: string | null
  zipCode: string | null
  utility: string | null
  averageMonthlyBill: number | null
  averageMonthlyUsage: number | null
  commodity: PublicPricingCommodity
  notes: string | null
  metadata: Record<string, unknown>
}