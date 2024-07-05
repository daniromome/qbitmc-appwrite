import { load } from 'https://deno.land/std@0.224.0/dotenv/mod.ts'
import { Client, Databases, Query, Users } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { Locale, Preferences, Profile, getLocale } from 'jsr:@qbitmc/common@1.1.0';

const env = await load()

const environment = {
  PTERODACTYL_URL: env['PTERODACTYL_URL'],
  PTERODACTYL_TOKEN: env['PTERODACTYL_TOKEN'],
  APPWRITE_ENDPOINT: env['APPWRITE_ENDPOINT'],
  APPWRITE_PROJECT: env['APPWRITE_PROJECT'],
  APPWRITE_API_KEY: env['APPWRITE_API_KEY'],
  APPWRITE_DATABASE_ID: env['APPWRITE_DATABASE_ID'],
  APPWRITE_COLLECTION_PROFILE: env['APPWRITE_COLLECTION_PROFILE']
}

if (Object.values(environment).some(value => !value)) throw new Error('Environment not set')

const appwrite = {
  collection: environment.APPWRITE_COLLECTION_PROFILE!,
  database: environment.APPWRITE_DATABASE_ID!,
  endpoint: environment.APPWRITE_ENDPOINT!,
  key: environment.APPWRITE_API_KEY!,
  project: environment.APPWRITE_PROJECT!
}

const pterodactyl = {
  url: environment.PTERODACTYL_URL!,
  token: environment.PTERODACTYL_TOKEN!
}

const client = new Client()
  .setEndpoint(appwrite.endpoint)
  .setProject(appwrite.project)
  .setKey(appwrite.key)

const users = new Users(client)

const qbitors = await users.list<Preferences>([Query.contains('labels', 'qbitor')])

if (qbitors.total === 0) throw new Error('No qbitors found in appwrite project')

const databases = new Databases(client)

const profiles = await Promise.all(qbitors.users.map(u => databases.getDocument<Profile>(appwrite.database, appwrite.collection, u.$id)))

const locales = qbitors.users.reduce((acc, cur) => {
  acc[cur.$id] = getLocale(cur.prefs.locale?.split('-').at(0))
  return acc
}, {} as Record<string, Locale>)

await Promise.all(
  profiles.flatMap(profile => profile.players.map(player =>
    fetch(`${pterodactyl.url}/client/servers/85a729e2/command`, {
      headers: {
        Authorization: `Bearer ${pterodactyl.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command: `team join ${locales[profile.$id]} ${player.ign}` }),
      method: 'POST'
    })
  ))
)