import { Client, Databases, Query } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { ServerDocument, VISIBILITY } from 'jsr:@qbitmc/common@1.2.0';
import { loadEnvironment } from 'jsr:@qbitmc/deno@1.2.0/appwrite'

// deno-lint-ignore no-explicit-any
export default async ({ _req, res, _log, _error }: any) => {
  const environment = loadEnvironment()

  const client = new Client()
    .setEndpoint(environment.appwrite.api.endpoint) 
    .setProject(environment.appwrite.api.project)
    .setKey(environment.appwrite.api.key)
  
  const databases = new Databases(client)

  const serverList = await databases.listDocuments<ServerDocument>(
    environment.appwrite.database,
    environment.appwrite.collection.server,
    [Query.equal('visibility', VISIBILITY.PRIVATE)]
  )

  if (serverList.total === 0) return res.empty()

  const headers = {
    Authorization: `Bearer ${environment.pterodactyl.token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }

  await Promise.all(
    serverList.documents
      .filter(server => !!server.metadata.some(m => m.key === 'announcement_en'))
      .flatMap(server => {
        const broadcastedDocument = server.metadata.find(m => m.key === 'broadcasted')
        const broadcasted: string[] = JSON.parse(broadcastedDocument!.value) 
        const enAll = server.metadata.filter(m => m.key === 'announcement_en')
        if (broadcasted.length === enAll.length) broadcasted.splice(0, broadcasted.length)
        const en = enAll.filter(m => !broadcasted.includes(m.$id))
        const es = server.metadata.filter(m => m.key === 'announcement_es' && !broadcasted.includes(m.$id))
        const broadcastEn = en[Math.floor(Math.random() * en.length - 1)]
        const broadcastEs = es[Math.floor(Math.random() * es.length - 1)]
        broadcasted.push(broadcastEn.$id)
        broadcasted.push(broadcastEs.$id)
        return [
          databases.updateDocument(
            environment.appwrite.database,
            broadcastedDocument!.$collectionId,
            broadcastedDocument!.$id,
            { value: JSON.stringify(broadcasted) }
          ),
          fetch(`${environment.pterodactyl.url}/client/servers/${server.$id.split('-').at(0)}/command`, {
            headers,
            body: JSON.stringify({ command: `tellraw @a[team=en] ${broadcastEn.value}` }),
            method: 'POST'
          }),
          fetch(`${environment.pterodactyl.url}/client/servers/${server.$id.split('-').at(0)}/command`, {
            headers,
            body: JSON.stringify({ command: `tellraw @a[team=es] ${broadcastEs.value}` }),
            method: 'POST'
          })
        ]
      })
  )

  return res.empty()
}