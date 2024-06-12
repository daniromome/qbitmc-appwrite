import { Client, Databases, ID, Permission, Role, Users } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { MinecraftAuth, XboxSecureToken } from './models.ts'
import { loadEnvironment } from 'jsr:@qbitmc/deno@0.0.3/appwrite';

// deno-lint-ignore no-explicit-any
export default async ({ req, res, log, _error }: any) => {
  const environment = loadEnvironment()
  const env = environment.config.env
  
  const { accessToken } = JSON.parse(req.body)
  if (!accessToken) throw new Error('Micosoft access token was not sent in the request body')

  const jsonHeaders = { 'Content-Type': 'application/json', Accept: 'application/json' }

  if (env === 'dev') log('Requesting xbox live auth token...')
  const xboxLiveAuthRequest = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
    method: 'POST',
    body: JSON.stringify({
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: `d=${accessToken}`
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT'
    }),
    headers: jsonHeaders
  })

  const xboxLiveAuthResponse: XboxSecureToken = await xboxLiveAuthRequest.json()
  if (env === 'dev') log('Successfully obtained xbox live auth token')

  if (env === 'dev') log('Requesting xbox secure token...')
  const xboxSecureTokenRequest = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
    method: 'POST',
    body: JSON.stringify({
      Properties: {
        SandboxId: 'RETAIL',
        UserTokens: [xboxLiveAuthResponse.Token]
      },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT'
    }),
    headers: jsonHeaders
  })

  const xboxSecureToken: XboxSecureToken = await xboxSecureTokenRequest.json()
  if (env === 'dev') log('Successfully obtained xbox secure token')

  const minecraftApi = 'https://api.minecraftservices.com'

  if (env === 'dev') log('Logging in to minecraft service...')
  const minecraftAuthRequest = await fetch(`${minecraftApi}/authentication/login_with_xbox`, {
    method: 'POST',
    body: JSON.stringify({
      identityToken: `XBL3.0 x=${xboxSecureToken.DisplayClaims.xui.at(0)?.uhs}${xboxSecureToken.Token}`
    }),
    headers: jsonHeaders
  })

  const minecraftAuth: MinecraftAuth = await minecraftAuthRequest.json()
  if (env === 'dev') log('Successfully logged in to minecraft service')

  if (env === 'dev') log('Getting user\'s minecraft profile...')
  const minecraftProfileRequest = await fetch(`${minecraftApi}/minecraft/profile`, {
    method: 'GET',
    headers: { ...jsonHeaders, Authorization: `Bearer ${minecraftAuth.access_token}` }
  })

  const minecraftProfile: { id: string, name: string } = await minecraftProfileRequest.json()
  
  const { id, name } = minecraftProfile
  if (env === 'dev') log(`Got minecraft profile for ${name} with id ${id}`)

  const uuid = `${id.substring(0, 8)}-${id.substring(8, 4)}-${id.substring(12, 4)}-${id.substring(16, 4)}-${id.substring(20)}`

  const client = new Client()
      .setEndpoint(environment.appwrite.api.endpoint)
      .setProject(environment.appwrite.api.project)
      .setKey(environment.appwrite.api.key)
  const databases = new Databases(client)
  const users = new Users(client)
  const user = await users.get(req.headers['x-appwrite-user-id'])
  if (env === 'dev') log(`Saving player profile...`)
  await databases.createDocument(
    environment.appwrite.database,
    environment.appwrite.collection.player,
    ID.unique(),
    { uuid, name, profile: user.$id },
    [Permission.read(Role.user(user.$id))]
  )
  if (env === 'dev') log(`Player profile successfully linked!`)
  const profile = await databases.getDocument(
    environment.appwrite.database,
    environment.appwrite.collection.profile,
    user.$id
  )
  return res.json(profile)
}