import { Account, Client } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { RESTGetAPICurrentUserResult } from 'https://deno.land/x/discord_api_types/v10.ts';

export default async ({ req, res, log, error }: any) => {
  const project = Deno.env.get('APPWRITE_FUNCTION_PROJECT_ID')
  // const key = Deno.env.get('APPWRITE_API_KEY')
  // const database = Deno.env.get('DATABASE_ID')
  // const collection = Deno.env.get('DATABASE_ENROLLMENT_ID')
  if (!project) error('Appwrite project environment variable is not defined')
  //if (!key) error('Appwrite key environment variable is not defined')
  // if (!database) error('Database id environment variable is not defined')
  //  if (!collection) error('Collection id environment variable is not defined')
  if (!project)  return res.empty()
  const userClient = new Client()
    .setEndpoint('https://appwrite.qbitmc.com/v1')
    .setProject(project)
    .setJWT(req.headers['x-appwrite-user-jwt'])

  const account = new Account(userClient)

  const session = await account.getSession('current')

  log('provider', session.provider)
  log('token', session.providerAccessToken)

  const discordResponse = await fetch(
    'https://discord.com/api/v10/users/@me',
    { headers: { authorization: `Bearer ${session.providerAccessToken}` }, method: 'GET' }
  )

  const discordUser = (await discordResponse.json()) as RESTGetAPICurrentUserResult
  log('locale', discordUser.locale)
  log('username', discordUser.id)

  return res.empty()

  // const client = new Client()
  //   .setEndpoint('https://appwrite.qbitmc.com/v1')
  //   .setProject(project)
  //   .setKey(key)

  // const databases = new Databases(client)
}