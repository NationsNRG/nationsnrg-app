export type IntegrationAuthMode =
  | 'none'
  | 'api_key'
  | 'username_password'
  | 'client_credentials'
  | 'api_token'

export type BoxWidgetMode = 'iframe' | 'script' | 'unconfigured'

export type IntegrationConfigStatus<TPreview extends Record<string, unknown>> = {
  configured: boolean
  missing: string[]
  preview: TPreview
}

export type IntegrationCheckResponse<TPreview extends Record<string, unknown>> = {
  success: true
  configured: boolean
  missing: string[]
  preview: TPreview
}