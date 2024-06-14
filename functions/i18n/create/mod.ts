import { Client, Databases, ID } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { LOCALE, ProductDocument, ServerDocument } from 'jsr:@qbitmc/common@0.0.12'
import { loadEnvironment } from 'jsr:@qbitmc/deno@0.0.6/appwrite'

// deno-lint-ignore no-explicit-any
export default async ({ req, res, _log, _error }: any) => {
  const environment = loadEnvironment()
  const document: ProductDocument | ServerDocument = req.body
  if (!document.$id) throw new Error('Bad Request')

  const typeMap = {
    server: environment.appwrite.collection.server === document.$collectionId,
    product: environment.appwrite.collection.product === document.$collectionId
  }

  const typeEntry = Object.entries(typeMap).find(([_, v]) => v)
  if (!typeEntry) return res.empty()
  const type = typeEntry[0]

  const locales = Object.values(LOCALE)

  const client = new Client()
    .setEndpoint(environment.appwrite.api.endpoint) 
    .setProject(environment.appwrite.api.project)
    .setKey(environment.appwrite.api.key)
  
  const databases = new Databases(client)

  if (type === 'server' || type === 'product') {
    await Promise.all(locales.flatMap(locale => [
      databases.createDocument(
        environment.appwrite.database,
        environment.appwrite.collection.i18n,
        ID.unique(),
        {
          key: `${type}.name.${document.$id}`,
          message: locale === 'en' && document['name'] ? document['name'] : '',
          locale
        }
      ),
      databases.createDocument(
        environment.appwrite.database,
        environment.appwrite.collection.i18n,
        ID.unique(),
        {
          key: `${type}.description.${document.$id}`,
          message: locale === 'en' && document['description'] ? document['description'] : '',
          locale
        }
      ),
    ]))
    
  }
  
  return res.empty()
}