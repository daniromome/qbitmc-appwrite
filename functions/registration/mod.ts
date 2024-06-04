import { Account, Client, Databases } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { RESTGetAPICurrentUserResult } from "https://deno.land/x/discord_api_types@0.37.87/v10.ts";

export default async ({ req, res, log, error }: any) => {
  const project = Deno.env.get('APPWRITE_FUNCTION_PROJECT_ID')
  const database = Deno.env.get('APPWRITE_DATABASE_ID')
  const collection = Deno.env.get('APPWRITE_COLLECTION_PROFILE')
  const env = Deno.env.get('ENV') || 'dev'
  if (!project) error('Appwrite project environment variable is not defined')
  if (!database) error('Database id environment variable is not defined')
  if (!collection) error('Collection id environment variable is not defined')
    
  const { accessToken } = JSON.parse(req.body)
  if (!accessToken) error('Discord access token was not sent in the request body')
  
  if (!project || !database || !collection || !accessToken) return res.empty()
      
  const userClient = new Client()
    .setEndpoint('https://appwrite.qbitmc.com/v1')
    .setProject(project)
    .setJWT(req.headers['x-appwrite-user-jwt'])

  const databases = new Databases(userClient)

  const account = new Account(userClient)

  const user = await account.get()

  try {
    const profile = await databases.getDocument(database, collection, user.$id)
    return res.json(profile)
  } catch (_) {
    const discordResponse = await fetch(
      'https://discord.com/api/v10/users/@me',
      { headers: { authorization: `Bearer ${accessToken}` }, method: 'GET' }
    )
    const discordUser = (await discordResponse.json()) as RESTGetAPICurrentUserResult
    if (env === 'dev') {
      log('User\'s locale:', discordUser.locale)
      log('User\'s discord id:', discordUser.id)
    }
    if (discordUser.locale) await account.updatePrefs({ ...account.getPrefs(), locale: discordUser.locale })
    const profile = await databases.createDocument(database, collection, user.$id, { discord: discordUser.id }, [])
    return res.json(profile)
  }
}