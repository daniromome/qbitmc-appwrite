import { Client, Databases } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { Profile } from 'jsr:@qbitmc/common@1.1.0';
import { loadEnvironment } from 'jsr:@qbitmc/deno@1.2.0/appwrite'

// deno-lint-ignore no-explicit-any
export default async ({ req, res, _log, _error }: any) => {
  const environment = loadEnvironment()
  const document: Profile = req.body
  if (!document.$id) throw new Error('Bad Request')

  const client = new Client()
    .setEndpoint(environment.appwrite.api.endpoint) 
    .setProject(environment.appwrite.api.project)
    .setKey(environment.appwrite.api.key)
  
  const databases = new Databases(client)

  const customerRequest = await fetch('https://api.stripe.com/v1/customers', {
    headers: {
      Authorization: `Bearer ${environment.stripe.secret}`
    },
    method: 'POST'
  })

  const customerResponse = await customerRequest.json()
  
  await databases.updateDocument(
    environment.appwrite.database,
    environment.appwrite.collection.profile,
    document.$id,
    { customer: customerResponse.id }
  )

  return res.empty()
}