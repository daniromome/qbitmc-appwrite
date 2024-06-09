import { Client, Databases } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'

// deno-lint-ignore no-explicit-any
export default async ({ req, res, log, error }: any) => {
  const endpoint = Deno.env.get('APPWRITE_ENDPOINT')
  const project = Deno.env.get('APPWRITE_FUNCTION_PROJECT_ID')
  const key = Deno.env.get('APPWRITE_API_KEY')
  const database = Deno.env.get('APPWRITE_DATABASE_ID')
  const verificationCollection = Deno.env.get('APPWRITE_COLLECTION_VERIFICATION')
  const playerCollection = Deno.env.get('APPWRITE_COLLECTION_PLAYER')
  const allowed = Deno.env.get('ALLOWED_IP')
    
  if (!endpoint) throw new Error('Appwrite endpoint environment variable is not defined') 
  if (!project) throw new Error('Appwrite project environment variable is not defined')
  if (!key) throw new Error('Appwrite key environment variable is not defined')
  if (!database) throw new Error('Database id environment variable is not defined')
  if (!verificationCollection) throw new Error('Verification collection id environment variable is not defined')
  if (!playerCollection) throw new Error('Player collection id environment variable is not defined')

  const allowedIps = allowed ? allowed.split(',') : []
  const ips = (req.headers['x-forwarded-for'] as string).split(',')
  if (!allowedIps.some(i => ips.includes(i))) throw new Error('Unauthorized')

  const { uuid, name, expires } = req.body as { uuid: string; name: string; expires: string }
  if (!uuid || !name || !expires) throw new Error('Bad Request')

  const client = new Client()
      .setEndpoint(endpoint)
      .setProject(project)
      .setKey(key);
  const databases = new Databases(client)

  try {
    await databases.getDocument(database, playerCollection, uuid)
    return res.json({ code: null, alreadyLinked: true })
  } catch (e) {
    error(e)
  }

  const code = Array.from(Array(6)).map(() => Math.floor(Math.random() * 10)).join('')
  await databases.createDocument(database, verificationCollection, code, { uuid, name, expires })

  return res.json({ code, alreadyLinked: false })
}