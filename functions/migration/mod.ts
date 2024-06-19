import { Client, Databases, Users } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { Profile, MigrationDocument, USER_LABEL, Preferences } from 'jsr:@qbitmc/common@1.1.0';
import { loadEnvironment } from 'jsr:@qbitmc/deno@1.1.0/appwrite'

// deno-lint-ignore no-explicit-any
export default async ({ req, res, _log, error }: any) => {
  const environment = loadEnvironment()
  const document: Profile = req.body
  if (!document.$id) throw new Error('Bad Request')

  const client = new Client()
    .setEndpoint(environment.appwrite.api.endpoint) 
    .setProject(environment.appwrite.api.project)
    .setKey(environment.appwrite.api.key)
  
  const databases = new Databases(client)
  const users = new Users(client)

  try {
    const [migration, user] = await Promise.all([
      databases.getDocument<MigrationDocument>(
        environment.appwrite.database,
        environment.appwrite.collection.migration,
        document.discord,
      ),
      users.get<Preferences>(document.$id)
    ])
    await Promise.all([
      databases.createDocument(
        environment.appwrite.database,
        environment.appwrite.collection.player,
        migration.uuid,
        { ign: migration.ign, profile: document.$id }
      ),
      users.updateLabels(document.$id, [ USER_LABEL.QBITOR, USER_LABEL.APPLICANT ]),
      users.updatePrefs(document.$id, { ...user.prefs, player: migration.uuid })
    ])
    return res.empty()
  } catch (e) {
    if (environment.config.env === 'dev') error(e.message)
    return res.empty()
  }
  
}