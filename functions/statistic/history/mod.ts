import { Client, Databases, ID, Permission, Query, Role, Models } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { StatisticDocument, USER_LABEL, StatisticHistoryDocument } from 'jsr:@qbitmc/common@1.3.2'
import { loadEnvironment } from 'jsr:@qbitmc/deno@1.3.0/appwrite'

async function getAllDocuments<T extends Models.Document>(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  queries: string[] = []
): Promise<T[]> {
  const limit = 100;
  let allDocuments: T[] = [];
  let lastId: string | undefined = undefined;

  while (true) {
    const currentQueries = [...queries, Query.limit(limit)];
    if (lastId) {
      currentQueries.push(Query.cursorAfter(lastId));
    }

    const response = await databases.listDocuments<T>(
      databaseId,
      collectionId,
      currentQueries
    );

    allDocuments = allDocuments.concat(response.documents);

    if (response.documents.length < limit) {
      break;
    }

    lastId = response.documents[response.documents.length - 1].$id;
  }

  return allDocuments;
}

// deno-lint-ignore no-explicit-any
export default async ({ _req, res, log, error }: any) => {
  const environment = loadEnvironment()

  const client = new Client()
    .setEndpoint(environment.appwrite.api.endpoint) 
    .setProject(environment.appwrite.api.project)
    .setKey(environment.appwrite.api.key)
  
  const databases = new Databases(client)

  const statistics = await getAllDocuments<StatisticDocument>(
    databases,
    environment.appwrite.database,
    environment.appwrite.collection.statistic
  )

  const filteredStatistics = await statistics.reduce(async (promisedAccumulator, statistic) => {
    const accumulator = await promisedAccumulator
    const history = await databases.listDocuments<StatisticHistoryDocument>(
      environment.appwrite.database,
      environment.appwrite.collection.statisticHistory,
      [Query.orderDesc('$createdAt'), Query.limit(1)]
    )
    const previousValue = history.documents.at(0)?.value || 0
    if (statistic.value !== previousValue) accumulator.push(statistic)
    return accumulator
  }, Promise.resolve([] as StatisticDocument[]))

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