import { Account, Client, Databases, Permission, Role } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { RESTGetAPICurrentUserResult } from 'https://deno.land/x/discord_api_types@0.37.87/v10.ts'
import { loadEnvironment } from 'jsr:@qbitmc/deno@1.2.0/appwrite'
import { Locale, MigrationDocument, Preferences } from 'jsr:@qbitmc/common'

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
    let customer: string | undefined = undefined
    try {
      const customerRequest = await fetch('https://api.stripe.com/v1/customers', {
        headers: {
          Authorization: `Bearer ${environment.stripe.secret}`
        },
        method: 'POST'
      })
      const customerResponse = await customerRequest.json()
      customer = customerResponse.id
      log(customer)
    } catch (_e) {
      error('An error ocurred while trying to create customer')
    }
    let migration: MigrationDocument | undefined = undefined
    try {
      migration = await databases.getDocument<MigrationDocument>(
        environment.appwrite.database,
        environment.appwrite.collection.migration,
        discordUser.id
      )
    } catch (_e) {
      log('No migration pending for this user')
    }

    const prefs: Preferences = { ...user.prefs }
    if (discordUser.locale) prefs.locale = discordUser.locale as Locale
    if (migration) prefs.player = migration.ign
    await account.updatePrefs(prefs)

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
    } catch (e) {
      if (environment.config.env === 'dev') {
        error(e.message)
        error('An unexpected error ocurred while trying to join discord server')
      }
    }
    
    const profile = await databases.createDocument(
      environment.appwrite.database,
      environment.appwrite.collection.profile,
      user.$id,
      { discord: discordUser.id, customer  },
      [Permission.read(Role.user(user.$id))]
    )

    if (migration) {
      await databases.createDocument(
        environment.appwrite.database,
        environment.appwrite.collection.player,
        migration.uuid,
        { ign: migration.ign, profile: profile.$id }
      )
    }

    return res.json(profile)
  }
}