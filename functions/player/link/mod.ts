import { Account, Client, Databases, ID, Permission, Role } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { MinecraftAuth, XboxSecureToken } from './models.ts';

// deno-lint-ignore no-explicit-any
export default async ({ req, res, log, _error }: any) => {
  const endpoint = Deno.env.get('APPWRITE_ENDPOINT')
  const project = Deno.env.get('APPWRITE_FUNCTION_PROJECT_ID')
  const database = Deno.env.get('APPWRITE_DATABASE_ID')
  const profileCollection = Deno.env.get('APPWRITE_COLLECTION_PROFILE')
  const playerCollection = Deno.env.get('APPWRITE_COLLECTION_PLAYER')
  const env = Deno.env.get('ENV') || 'dev'
  const key = Deno.env.get('APPWRITE_API_KEY')
    
  if (!endpoint) throw new Error('Appwrite endpoint environment variable is not defined') 
  if (!project) throw new Error('Appwrite project environment variable is not defined')
  if (!database) throw new Error('Database id environment variable is not defined')
  if (!profileCollection) throw new Error('Profile collection id environment variable is not defined')
  if (!playerCollection) throw new Error('Player collection id environment variable is not defined')
  if (!key) throw new Error('Appwrite key environment variable is not defined')
  
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
      identityToken: `XBL3.0 x=${xboxSecureToken.DisplayClaims.xui.at(0)?.uhs};${xboxSecureToken.Token}`
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

  const userClient = new Client()
    .setEndpoint(endpoint)
    .setProject(project)
    .setJWT(req.headers['x-appwrite-user-jwt'])

  const account = new Account(userClient)

  const user = await account.get()

  const client = new Client()
      .setEndpoint(endpoint)
      .setProject(project)
      .setKey(key);
  const databases = new Databases(client)
  if (env === 'dev') log(`Saving player profile...`)
  await databases.createDocument(
    database,
    playerCollection,
    ID.unique(),
    { uuid, name, profile: user.$id },
    [Permission.read(Role.user(user.$id))]
  )
  if (env === 'dev') log(`Player profile successfully linked!`)
  const profile = await databases.getDocument(database, profileCollection, user.$id)
  return res.json(profile)
}