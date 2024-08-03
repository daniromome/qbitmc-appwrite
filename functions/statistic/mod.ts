import { Client, Databases, ID, Permission, Query, Role } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { ServerDocument, VISIBILITY, StatisticDocument, USER_LABEL, PlayerDocument } from 'jsr:@qbitmc/common@1.3.2'
import { loadEnvironment } from 'jsr:@qbitmc/deno@1.3.0/appwrite'

interface PterodactylFile {
  name: string
  mode: string
  size: number
  is_file: boolean
  is_symlink: boolean
  is_editable: boolean
  mimetype: string
  created_at: string
  modified_at: string
}

interface PterodactylListFilesResponse {
  object: 'list'
  data: {
    object: string,
    attributes: PterodactylFile
  }[]
}

interface StatisticFile {
  stats: Record<string, Record<string, number>>
  DataVersion: number
}

// deno-lint-ignore no-explicit-any
export default async ({ _req, res, log, error }: any) => {
  const environment = loadEnvironment()

  const client = new Client()
    .setEndpoint(environment.appwrite.api.endpoint) 
    .setProject(environment.appwrite.api.project)
    .setKey(environment.appwrite.api.key)
  
  const databases = new Databases(client)

  const [serverList, playerList] = await Promise.all([
    databases.listDocuments<ServerDocument>(
      environment.appwrite.database,
      environment.appwrite.collection.server,
      [Query.equal('visibility', VISIBILITY.PRIVATE)]
    ),
    databases.listDocuments<PlayerDocument>(
      environment.appwrite.database,
      environment.appwrite.collection.player,
      [Query.limit(100)]
    )
  ])

  const players = playerList.documents.map(doc => doc.$id)

  const servers = serverList.documents.filter(server => server.metadata.some(m => m.key === 'statistics' && m.value === 'true'))

  if (servers.length === 0) {
    error('No servers have statistics enabled.')
    return res.empty()
  }

  const headers = {
    Authorization: `Bearer ${environment.pterodactyl.token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
  
  for (const server of servers) {
    const world = server.metadata.find(m => m.key === 'world')?.value
    if (!world) {
      error(`Server ${server.name} does not have a world defined in its metadata`)
      return
    }
    log(`Processing statistics for server ${server.name}`)
    const listFilesRequest = await fetch(`${environment.pterodactyl.url}/client/servers/${server.$id}/files/list?directory=/${world}/stats`, {
      headers: { Authorization: `Bearer ${environment.pterodactyl.token}`, 'Accept': 'application/json' }
    })
    const listFilesResponse = await listFilesRequest.json() as PterodactylListFilesResponse
    const statisticFiles = listFilesResponse.data.filter(file => players.includes(file.attributes.name.split('.')[0]))
    if (statisticFiles.length === 0) {
      error(`Server ${server.name} does not yet have any statistics in /${world}/stats`)
      return
    }
    const permissions = [
      Permission.read(Role.label(USER_LABEL.FAMILY)),
      Permission.read(Role.label(USER_LABEL.SUPPORTER)),
      Permission.read(Role.label(USER_LABEL.MOD)),
      Permission.read(Role.label(USER_LABEL.ADMIN))
    ]
    for (const statFile of statisticFiles) {
      const player = statFile.attributes.name.split('.')[0]
      log(`Procesing statistics for player with id ${player}`)
      const statRequest = await fetch(`${environment.pterodactyl.url}/client/servers/${server.$id}/files/contents?file=/${world}/stats/${statFile.attributes.name}`, { headers })
      const statResponse = await statRequest.json() as StatisticFile
      const statistics = await Promise.all(
        await Object.entries(statResponse.stats).reduce(async (promisedRequestAccumulator, [type, stat]) => {
          const requestAccumulator = await promisedRequestAccumulator
          const statRequests = await Object.entries(stat).reduce( 
            async (promisedAccumulator, [name, value]) => {
              const accumulator = await promisedAccumulator
              const { total, documents } = await databases.listDocuments<StatisticDocument>(
                environment.appwrite.database,
                environment.appwrite.collection.statistic,
                [Query.equal('player', player), Query.equal('type', type), Query.equal('name', name), Query.limit(1)]
              )
              if (total === 0) accumulator.push(
                databases.createDocument<StatisticDocument>(
                  environment.appwrite.database,
                  environment.appwrite.collection.statistic,
                  ID.unique(),
                  { type, name, value, server: server.$id, player },
                  permissions
                )
              ); else if (documents.at(0)!.value !== value) databases.updateDocument<StatisticDocument>(
                environment.appwrite.database,
                environment.appwrite.collection.statistic,
                documents.at(0)!.$id,
                { value },
                permissions
              )
              return accumulator
            },
            Promise.resolve([] as Promise<StatisticDocument>[])
          )
          return [...requestAccumulator, ...statRequests]
        }, Promise.resolve([] as Promise<StatisticDocument>[]))
      )
      log(`Successfully processed ${statistics.length} for player with id ${player}`)
    }
  }

  return res.empty()
}