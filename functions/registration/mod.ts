import { Account, Client, Databases, Permission, Role } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { RESTGetAPICurrentUserResult } from 'https://deno.land/x/discord_api_types@0.37.87/v10.ts'
import { loadEnvironment } from 'jsr:@qbitmc/deno@0.0.7/appwrite';

// deno-lint-ignore no-explicit-any
export default async ({ req, res, log, error }: any) => {
  const environment = loadEnvironment()
  
  const { accessToken } = JSON.parse(req.body)
  if (!accessToken) throw new Error('Discord access token was not sent in the request body')
      
  const userClient = new Client()
    .setEndpoint(environment.appwrite.api.endpoint)
    .setProject(environment.appwrite.api.project)
    .setJWT(req.headers['x-appwrite-user-jwt'])

  const account = new Account(userClient)

  const user = await account.get()

  try {
    const userDatabases = new Databases(userClient)
    const profile = await userDatabases.getDocument(
      environment.appwrite.database,
      environment.appwrite.collection.profile,
      user.$id
    )
    return res.json(profile)
  } catch (_) {
    const client = new Client()
      .setEndpoint(environment.appwrite.api.endpoint)
      .setProject(environment.appwrite.api.project)
      .setKey(environment.appwrite.api.key)
    const databases = new Databases(client)
    const discordResponse = await fetch(
      'https://discord.com/api/v10/users/@me',
      { headers: { authorization: `Bearer ${accessToken}` }, method: 'GET' }
    )
    const discordUser = (await discordResponse.json()) as RESTGetAPICurrentUserResult
    if (environment.config.env === 'dev') {
      log(`User's locale: ${discordUser.locale}`)
      log(`User's discord id: ${discordUser.id}`)
    }
    if (discordUser.locale) await account.updatePrefs({ ...account.getPrefs(), locale: discordUser.locale })
    try {
      await fetch(
        `https://discord.com/api/v10/guilds/${environment.discord.guild}/members/${discordUser.id}`,
        {
          headers: { Authorization: `Bot ${environment.discord.token}`, 'Content-Type': 'application/json' },
          method: 'PUT',
          body: JSON.stringify({ access_token: accessToken })
        }
      )
      if (environment.config.env === 'dev') log(`Successfully joined discord server`)
    } catch (error) {
      if (environment.config.env === 'dev') {
        error(error.message)
        error('An unexpected error ocurred while trying to join discord server')
      }
    }
    
    const profile = await databases.createDocument(
      environment.appwrite.database,
      environment.appwrite.collection.profile,
      user.$id,
      { discord: discordUser.id },
      [Permission.read(Role.user(user.$id))]
    )
    return res.json(profile)
  }
}