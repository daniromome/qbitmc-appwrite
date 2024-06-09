import { Account, Client, Databases } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { Verification } from '../../../models/verification.ts'

// deno-lint-ignore no-explicit-any
export default async ({ req, res, log, _error }: any) => {
  const endpoint = Deno.env.get('APPWRITE_ENDPOINT')
  const project = Deno.env.get('APPWRITE_FUNCTION_PROJECT_ID')
  const key = Deno.env.get('APPWRITE_API_KEY')
  const database = Deno.env.get('APPWRITE_DATABASE_ID')
  const verificationCollection = Deno.env.get('APPWRITE_COLLECTION_VERIFICATION')
  const playerCollection = Deno.env.get('APPWRITE_COLLECTION_PLAYER')
    
  if (!endpoint) throw new Error('Appwrite endpoint environment variable is not defined') 
  if (!project) throw new Error('Appwrite project environment variable is not defined')
  if (!key) throw new Error('Appwrite key environment variable is not defined')
  if (!database) throw new Error('Database id environment variable is not defined')
  if (!verificationCollection) throw new Error('Verification collection id environment variable is not defined')
  if (!playerCollection) throw new Error('Player collection id environment variable is not defined')

  const { code } = req.body as { code: number }
  if (!code) throw new Error('Verification code was not sent in the request body')

  const client = new Client()
      .setEndpoint(endpoint)
      .setProject(project)
      .setKey(key);
  const databases = new Databases(client)

  const verification = await databases.getDocument<Verification>(database, verificationCollection, code.toString())
  const expires = new Date(verification.expires)

  if (expires.valueOf() < Date.now()) throw new Error('Verification code expired please get a new one')

  const userClient = new Client()
    .setEndpoint(endpoint)
    .setProject(project)
    .setJWT(req.headers['x-appwrite-user-jwt'])

  const account = new Account(userClient)

  const user = await account.get()

  const [player] = await Promise.allSettled([
    databases.createDocument(database, playerCollection, verification.uuid, { ign: verification.name, profile: user.$id }),
    databases.deleteDocument(database, verificationCollection, verification.$id)
  ])
  
  log(`Successfully verified account for ${verification.name}`)
  return res.json(player)
}