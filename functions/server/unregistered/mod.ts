import { Client, Databases } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { ServerDocument, VISIBILITY } from 'jsr:@qbitmc/common@0.0.8'
import { loadEnvironment } from 'jsr:@qbitmc/deno@0.0.4/appwrite'
import { PterodactylResponse } from './model.ts'

// deno-lint-ignore no-explicit-any
export default async ({ req, res, _log, _error }: any) => {
  const environment = loadEnvironment()

  const client = new Client()
      .setEndpoint(environment.appwrite.api.endpoint) 
      .setProject(environment.appwrite.api.project)
      .setJWT(req.headers['x-appwrite-user-jwt'])

  const databases = new Databases(client)

  const serverList = await databases.listDocuments<ServerDocument>(
    environment.appwrite.database,
    environment.appwrite.collection.server
  )

  const existingServers = new Set(serverList.documents.map(s => s.$id))

  const request = await fetch(
    `${environment.pterodactyl.url}/client`,
    { 
      headers: {
        Authorization: `Bearer ${environment.pterodactyl.token}`,
        'Content-Type': 'application/json',
        'Accept': 'Application/vnd.pterodactyl.v1+json'
      }
    }
  )

  const response: PterodactylResponse = await request.json()

  const servers: ServerDocument[] = await Promise.all(
    response.data
      .filter(s => !existingServers.has(s.attributes.uuid))
      .map(s => databases.createDocument<ServerDocument>(
        environment.appwrite.database,
        environment.appwrite.collection.server,
        s.attributes.uuid,
        {
          description: s.attributes.description,
          game: '',
          ip: '',
          loader: '',
          media: [],
          name: s.attributes.name,
          version: '',
          visibility: VISIBILITY.DRAFT
        }
      )
    )
  )

  return res.json([
    ...serverList.documents.filter(s => s.visibility === VISIBILITY.DRAFT),
    ...servers
  ])
}