import { load } from 'https://deno.land/std@0.224.0/dotenv/mod.ts'
import { Client, Databases } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'

type UserResource = {
  username: string
  email: string
  attributes: {
    minecraft_uuid?: [string],
    minecraft_ign?: [string],
    application_created_at?: [string],
    application_approved?: [string],
    disabled?: [string],
    locale: [string],
    new_account?: [string]
  },
}

const env = await load()

const environment = {
  KEYCLOAK_CLIENT_ID: env['KEYCLOAK_CLIENT_ID'],
  KEYCLOAK_CLIENT_SECRET: env['KEYCLOAK_CLIENT_SECRET'],
  KEYCLOAK_URL: env['KEYCLOAK_URL'],
  APPWRITE_ENDPOINT: env['APPWRITE_ENDPOINT'],
  APPWRITE_PROJECT: env['APPWRITE_PROJECT'],
  APPWRITE_API_KEY: env['APPWRITE_API_KEY'],
  APPWRITE_DATABASE_ID: env['APPWRITE_DATABASE_ID'],
  APPWRITE_COLLECTION_MIGRATION: env['APPWRITE_COLLECTION_MIGRATION']
}

if (Object.values(environment).some(value => !value)) throw new Error('Environment not set')

const keycloak = {
  client: {
    id: environment.KEYCLOAK_CLIENT_ID!,
    secret: environment.KEYCLOAK_CLIENT_SECRET!
  },
  url: environment.KEYCLOAK_URL!
}

const appwrite = {
  collection: environment.APPWRITE_COLLECTION_MIGRATION!,
  database: environment.APPWRITE_DATABASE_ID!,
  endpoint: environment.APPWRITE_ENDPOINT!,
  key: environment.APPWRITE_API_KEY!,
  project: environment.APPWRITE_PROJECT!
}

const tokenBody = new URLSearchParams()
tokenBody.set('client_id', keycloak.client.id)
tokenBody.set('client_secret', keycloak.client.secret)
tokenBody.set('grant_type', 'client_credentials')

const tokenRequest = await fetch(
  `${keycloak.url}/realms/master/protocol/openid-connect/token`,
  {
    method: 'POST',
    body: tokenBody
  }
)

const tokenResponse = await tokenRequest.json()
const token = tokenResponse.access_token as string

const usersRequest = await fetch(
  `${keycloak.url}/admin/realms/qbitmc/users`,
  {
    headers: { Authorization: `Bearer ${token}`}
  }
)

const usersResponse = await usersRequest.json() as UserResource[]

const client = new Client()
  .setEndpoint(appwrite.endpoint)
  .setProject(appwrite.project)
  .setKey(appwrite.key)

const databases = new Databases(client)

await Promise.all(
  usersResponse
    .filter(user =>
      user.attributes.application_approved?.at(0) === 'true'
      && (
        !user.attributes.disabled
        || user.attributes.disabled.at(0) === 'false'
      )
    )
    .map(user =>
      databases.createDocument(
        appwrite.database,
        appwrite.collection,
        user.username,
        {
          uuid: user.attributes.minecraft_uuid?.at(0),
          ign: user.attributes.minecraft_ign?.at(0),
        }
      )
    )
)
