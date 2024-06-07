export interface XboxSecureToken {
  IssueInstant: string
  NotAfter: string
  Token: string
  DisplayClaims: {
    xui: { uhs: string }[]
  }
}

export interface MinecraftAuth {
  username: string
  roles: string[]
  metadata: Record<string, unknown>
  access_token: string
  expires_in: number
  token_type: string
}