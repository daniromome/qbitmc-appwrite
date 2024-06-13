import { Client, Databases } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { loadEnvironment } from 'jsr:@qbitmc/deno/appwrite'

// deno-lint-ignore no-explicit-any
export default async ({ req, res, log, error }: any) => {
  const environment = loadEnvironment()

  const allowedIps = environment.config.hosts ? environment.config.hosts.split(',') : []
  const ips = (req.headers['x-forwarded-for'] as string).split(', ')
  if (!allowedIps.some(i => ips.includes(i))) throw new Error('Unauthorized')

  const { uuid, name, expires } = req.body as { uuid: string; name: string; expires: string }
  if (!uuid || !name || !expires) throw new Error('Bad Request')

  const client = new Client()
      .setEndpoint(environment.appwrite.api.endpoint) 
      .setProject(environment.appwrite.api.project)
      .setKey(environment.appwrite.api.key)
  const databases = new Databases(client)

  try {
    await databases.getDocument(environment.appwrite.database, environment.appwrite.collection.player, uuid)
    return res.json({ code: null, alreadyLinked: true })
  } catch (e) {
    error(e)
  }

  const code = Array.from(Array(6)).map(() => Math.floor(Math.random() * 10)).join('')
  await databases.createDocument(environment.appwrite.database, environment.appwrite.collection.verification, code, { uuid, name, expires })

  return res.json({ code, alreadyLinked: false })
}