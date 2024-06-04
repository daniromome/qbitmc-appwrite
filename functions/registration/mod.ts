import { Account, Client, Databases, Permission, Role } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { RESTGetAPICurrentUserResult } from "https://deno.land/x/discord_api_types@0.37.87/v10.ts";

export default async ({ req, res, log, error }: any) => {
  const endpoint = Deno.env.get('APPWRITE_ENDPOINT')
  const project = Deno.env.get('APPWRITE_FUNCTION_PROJECT_ID')
  const database = Deno.env.get('APPWRITE_DATABASE_ID')
  const collection = Deno.env.get('APPWRITE_COLLECTION_PROFILE')
  const env = Deno.env.get('ENV') || 'dev'
  if (!endpoint) throw new Error('Appwrite endpoint environment variable is not defined') 
  if (!project) throw new Error('Appwrite project environment variable is not defined')
  if (!database) throw new Error('Database id environment variable is not defined')
  if (!collection) throw new Error('Collection id environment variable is not defined')
  
  const { accessToken } = JSON.parse(req.body)
  if (!accessToken) throw new Error('Discord access token was not sent in the request body')
      
  const userClient = new Client()
    .setEndpoint(endpoint)
    .setProject(project)
    .setJWT(req.headers['x-appwrite-user-jwt'])

  const account = new Account(userClient)

  const user = await account.get()

  try {
    const userDatabases = new Databases(userClient)
    const profile = await userDatabases.getDocument(database, collection, user.$id)
    return res.json(profile)
  } catch (_) {
    const key = Deno.env.get('APPWRITE_API_KEY')
    if (!key) throw new Error('Appwrite key environment variable is not defined')
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(project)
      .setKey(key);
    const databases = new Databases(client)
    const discordResponse = await fetch(
      'https://discord.com/api/v10/users/@me',
      { headers: { authorization: `Bearer ${accessToken}` }, method: 'GET' }
    )
    const discordUser = (await discordResponse.json()) as RESTGetAPICurrentUserResult
    if (env === 'dev') {
      log(`User's locale: ${discordUser.locale}`)
      log(`User's discord id: ${discordUser.id}`)
    }
    if (discordUser.locale) await account.updatePrefs({ ...account.getPrefs(), locale: discordUser.locale })
    const profile = await databases.createDocument(
      database,
      collection,
      user.$id,
      { discord: discordUser.id },
      [Permission.read(Role.user(user.$id))]
    )
    return res.json(profile)
  }
}