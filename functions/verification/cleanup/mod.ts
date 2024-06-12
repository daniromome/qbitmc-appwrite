import { Client, Databases, Query } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'

// deno-lint-ignore no-explicit-any
export default async ({ _req, res, log, _error }: any) => {
  const endpoint = Deno.env.get('APPWRITE_ENDPOINT')
  const project = Deno.env.get('APPWRITE_FUNCTION_PROJECT_ID')
  const key = Deno.env.get('APPWRITE_API_KEY')
  const database = Deno.env.get('APPWRITE_DATABASE_ID')
  const collection = Deno.env.get('APPWRITE_COLLECTION_VERIFICATION')
    
  if (!endpoint) throw new Error('Appwrite endpoint environment variable is not defined') 
  if (!project) throw new Error('Appwrite project environment variable is not defined')
  if (!key) throw new Error('Appwrite key environment variable is not defined')
  if (!database) throw new Error('Database id environment variable is not defined')
  if (!collection) throw new Error('Verification collection id environment variable is not defined')

  const client = new Client()
      .setEndpoint(endpoint)
      .setProject(project)
      .setKey(key)
  const databases = new Databases(client)

  const documentList = await databases.listDocuments(database, collection, [Query.lessThan('expires', new Date().toISOString())])
  if (!documentList) return res.empty()
  await Promise.allSettled(documentList.documents.map(d => databases.deleteDocument(database, collection, d.$id)))
  log(`Deleted ${documentList.total} expired verifications`)
  return res.empty()
}