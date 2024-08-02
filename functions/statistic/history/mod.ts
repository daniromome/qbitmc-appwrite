import { Client, Databases, ID, Permission, Query, Role } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { StatisticDocument, USER_LABEL, StatisticHistoryDocument } from 'jsr:@qbitmc/common@1.3.2'
import { loadEnvironment } from 'jsr:@qbitmc/deno@1.3.0/appwrite'

// deno-lint-ignore no-explicit-any
export default async ({ _req, res, log, error }: any) => {
  const environment = loadEnvironment()

  const client = new Client()
    .setEndpoint(environment.appwrite.api.endpoint) 
    .setProject(environment.appwrite.api.project)
    .setKey(environment.appwrite.api.key)
  
  const databases = new Databases(client)

  const yesterday = new Date(Date.now() - 90000000).toISOString()

  const [statistics, history] = await Promise.all([
    databases.listDocuments<StatisticDocument>(
      environment.appwrite.database,
      environment.appwrite.collection.statistic
    ),
    databases.listDocuments<StatisticHistoryDocument>(
      environment.appwrite.database,
      environment.appwrite.collection.statisticHistory,
      [Query.greaterThanEqual('$createdAt', yesterday)]
    )
  ])

  const previousStatistics = history.documents.reduce((acc, cur) => {
    if (!acc[cur.stat.$id]) acc[cur.stat.$id] = cur.value
    return acc
  }, {} as Record<string, number>)

  // Only add statistics into history if their values are different from the latest history record
  const filteredStatistics = statistics.documents.filter(stat => !previousStatistics[stat.$id] || previousStatistics[stat.$id] !== stat.value)

  if (filteredStatistics.length === 0) {
    error('There are no statistics to add into the history')
    return res.empty()
  }
  
  const permissions = [
    Permission.read(Role.label(USER_LABEL.FAMILY)),
    Permission.read(Role.label(USER_LABEL.SUPPORTER)),
    Permission.read(Role.label(USER_LABEL.MOD)),
    Permission.read(Role.label(USER_LABEL.ADMIN))
  ]

  await Promise.all(
    filteredStatistics.map(statistic =>
      databases.createDocument(
        environment.appwrite.database,
        environment.appwrite.collection.statisticHistory,
        ID.unique(),
        { stat: statistic.$id, value: statistic.value },
        permissions
      )
    )
  )

  log(`Successfully added ${filteredStatistics.length} statistics to the history`)

  return res.empty()
}