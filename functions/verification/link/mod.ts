import { Account, Client, Databases, Models, Users } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { loadEnvironment } from 'jsr:@qbitmc/deno/appwrite'
import { Preferences } from 'jsr:@qbitmc/common'

interface Verification extends Models.Document { uuid: string; name: string; expires: string }

// deno-lint-ignore no-explicit-any
export default async ({ req, res, log, _error }: any) => {
  const environment = loadEnvironment()

  const { code } = JSON.parse(req.body)
  if (!code) throw new Error('Verification code was not sent in the request body')

  const client = new Client()
      .setEndpoint(environment.appwrite.api.endpoint)
      .setProject(environment.appwrite.api.project)
      .setKey(environment.appwrite.api.key)

  const databases = new Databases(client)

  const verification = await databases.getDocument<Verification>(
    environment.appwrite.database,
    environment.appwrite.collection.verification,
    code.toString()
  )
  const expires = new Date(verification.expires)

  if (expires.valueOf() < Date.now()) throw new Error('Verification code expired please get a new one')

  const users = new Users(client)
  const user = await users.get<Preferences>(req.headers['x-appwrite-user-id'])

  const [player] = await Promise.allSettled([
    databases.createDocument(
      environment.appwrite.database,
      environment.appwrite.collection.player,
      verification.uuid,
      { ign: verification.name, profile: user.$id }
    ),
    databases.deleteDocument(
      environment.appwrite.database,
      environment.appwrite.collection.verification,
      verification.$id
    )
  ])

  if (!user.prefs.player) await users.updatePrefs(user.$id, { ...user.prefs, player: verification.uuid })
  
  log(`Successfully verified account for ${verification.name}`)
  return res.json(player)
}