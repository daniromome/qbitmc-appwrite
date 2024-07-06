import { Client, Databases, Query } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { Locale, MetadataDocument, ServerDocument, VISIBILITY, getLocale } from 'jsr:@qbitmc/common@1.2.0';
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
      .flatMap<Promise<unknown>[]>(server => {
        if (server.metadata.length === 0) return []
        const messages = server.metadata.reduce((acc, cur) => {
          if (cur.key === 'broadcasted') acc['broadcasted'] = cur
          if (cur.key !== 'announcement_en' && cur.key !== 'announcement_es') return acc
          const locale = getLocale(cur.key.split('_').at(-1))
          if (!acc[locale]) acc[locale] = [cur]
          else acc[locale].push(cur)
          return acc
        }, {} as { [k in Locale]: MetadataDocument[] } & { 'broadcasted': MetadataDocument })
        if (!messages.broadcasted || messages.en.length === 0 || messages.es.length === 0) return []
        const broadcastedAnnouncements: string[] = JSON.parse(messages.broadcasted.value)
        const isCompletedCycle = messages.es.length + messages.en.length === broadcastedAnnouncements.length
        const announcementsEn = isCompletedCycle ? messages.en : messages.en.filter(m => broadcastedAnnouncements.includes(m.$id))
        const announcementsEs = isCompletedCycle ? messages.es : messages.es.filter(m => broadcastedAnnouncements.includes(m.$id))
        const enIndex = Math.floor(Math.random() * announcementsEn.length)
        const esIndex = Math.floor(Math.random() * announcementsEs.length)
        const announcementEn = announcementsEn[enIndex]
        const announcementEs = announcementsEs[esIndex]
        return [
          databases.updateDocument(
            environment.appwrite.database,
            messages.broadcasted.$collectionId,
            messages.broadcasted.$id,
            { value: JSON.stringify(isCompletedCycle ? [...broadcastedAnnouncements, announcementEn.$id, announcementEs.$id] : []) }
          ),
          fetch(`${environment.pterodactyl.url}/client/servers/${server.$id.split('-').at(0)}/command`, {
            headers,
            body: JSON.stringify({ command: announcementEn.value }),
            method: 'POST'
          }),
          fetch(`${environment.pterodactyl.url}/client/servers/${server.$id.split('-').at(0)}/command`, {
            headers,
            body: JSON.stringify({ command: announcementEs.value }),
            method: 'POST'
          })
        ]
      })
  )

  return res.empty()
}