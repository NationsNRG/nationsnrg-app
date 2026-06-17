export type DistributionChannel =
  | 'blog'
  | 'newsletter'
  | 'linkedin'
  | 'twitter'
  | 'youtube'
  | 'short_video'
  | 'email'
  | 'sales_enablement'

export type VariantType =
  | 'blog'
  | 'linkedin'
  | 'twitter_post'
  | 'twitter_thread'
  | 'newsletter'
  | 'youtube_long'
  | 'short_video'
  | 'email'
  | 'sales_brief'

export function toTitleCase(value: string | null | undefined): string {
  if (!value) return '—'

  return value
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function formatInsightTaxonomyLabel(
  value: string | null | undefined
): string {
  if (!value) return '—'

  const normalized = value.trim().toLowerCase()

  switch (normalized) {
    case 'twitter':
      return 'X / Twitter'
    case 'twitter_post':
      return 'X Post'
    case 'twitter_thread':
      return 'X Thread'
    case 'youtube':
      return 'YouTube'
    case 'youtube_long':
      return 'YouTube Long'
    case 'linkedin':
      return 'LinkedIn'
    case 'newsletter':
      return 'Newsletter'
    case 'email':
      return 'Email'
    case 'blog':
      return 'Blog'
    case 'short_video':
      return 'Short Video'
    case 'sales_enablement':
      return 'Sales Enablement'
    case 'sales_brief':
      return 'Sales Brief'
    default:
      return toTitleCase(normalized)
  }
}

export function getVariantDisplayTitle(params: {
  title?: string | null
  variantType?: string | null
}): string {
  const title = params.title?.trim()

  if (title) {
    return title
  }

  const variantType = params.variantType?.trim()

  if (variantType) {
    return formatInsightTaxonomyLabel(variantType)
  }

  return 'Unlabeled variant'
}

export function getVariantDisplayType(
  variantType: string | null | undefined
): string {
  if (variantType?.trim()) {
    return formatInsightTaxonomyLabel(variantType)
  }

  return 'Unknown Variant Type'
}