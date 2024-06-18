import { Client, Databases, Models, Query, Users } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { ServerDocument } from "jsr:@qbitmc/common@0.0.12";
import { EnrollmentApplicationStatusDocument, VISIBILITY, getLocale, Preferences, PlayerDocument } from 'jsr:@qbitmc/common@0.0.16'
import { loadEnvironment } from 'jsr:@qbitmc/deno@0.0.8/appwrite'
import i18next from 'https://esm.sh/i18next@23.11.5'

// deno-lint-ignore no-explicit-any
export default async ({ req, res, log, _error }: any) => {
  const environment = loadEnvironment()
  const document: EnrollmentApplicationStatusDocument = req.body
  if (!document.$id) throw new Error('Bad Request')

  if (environment.config.env === 'dev') log(JSON.stringify(document))

  if (!document.approved) return res.empty()

  const client = new Client()
    .setEndpoint(environment.appwrite.api.endpoint) 
    .setProject(environment.appwrite.api.project)
    .setKey(environment.appwrite.api.key)
  
  const databases = new Databases(client)

  const users = new Users(client)

  const [whitelistServerList, user] = await Promise.all([
    databases.listDocuments(
      environment.appwrite.database,
      environment.appwrite.collection.server,
      [Query.contains('visibility', [VISIBILITY.PRIVATE])]
    ),
    users.get<Preferences>(document.application.profile.$id)
  ])

  const players = await databases.listDocuments<PlayerDocument>(
    environment.appwrite.database,
    environment.appwrite.collection.player,
    [Query.equal('profile', document.application.profile.$id)]
  )

  i18next.init({
    lng: getLocale((user.prefs.locale?.split('-')[0])),
    resources: {
      en: {
        translation: {
          'tellraw.approved': 'tellraw @a ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Application for player ","color":"gray"},{"text":"{{ign}} ","color":"blue"},{"text":"has just been ","color":"gray"},{"text":"approved","color":"green"},{"text":"!","color":"gray"}]',
          'tellraw.rejected': 'tellraw @a ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Application for player ","color":"gray"},{"text":"{{ign}} ","color":"blue"},{"text":"has just been ","color":"gray"},{"text":"rejected","color":"red"}]',
        }
      },
      es: {
        translation: {
          'tellraw.approved': 'tellraw @a ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] La aplicación del jugador ","color":"gray"},{"text":"{{ign}} ","color":"blue"},{"text":"ha sido ","color":"gray"},{"text":"aprobada","color":"green"},{"text":"!","color":"gray"}]',
          'tellraw.rejected': 'tellraw @a ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] La aplicación del jugador ","color":"gray"},{"text":"{{ign}} ","color":"blue"},{"text":"ha sido ","color":"gray"},{"text":"rechazada","color":"red"}]',
        }
      }
    }
  })

  const headers = {
    Authorization: `Bearer ${environment.pterodactyl.token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }

  const ign = players.documents.find(p => p.$id === user.prefs.player)?.ign
    || players.documents[0].ign

  await Promise.all(
    whitelistServerList.documents.flatMap((server) =>
      players.documents.flatMap(player => [
        fetch(`${environment.pterodactyl.url}/client/servers/${server.$id.split('-').at(0)}/command`, {
          headers,
          body: JSON.stringify({ command: `whitelist add ${player.ign}` })
        }),
        fetch(`${environment.pterodactyl.url}/client/servers/${server.$id.split('-').at(0)}/command`, {
          headers,
          body: JSON.stringify({
            command: i18next.t(document.approved ? 'tellraw.approved' : 'tellraw.rejected', { ign })
          })
        }),
      ])
    )
  )

  const moddedServers = await databases.listDocuments<{ mod: string; servers: ServerDocument[] } & Models.Document>(
    environment.appwrite.database,
    environment.appwrite.collection.mods
  )

  await Promise.all(
    moddedServers.documents.flatMap(doc => {
      if (doc.mod === 'luckperms') return doc.servers.flatMap(server =>
        document.application.profile.players.map(player =>
          fetch(`${environment.pterodactyl.url}/client/servers/${server.$id.split('-').at(0)}/command`, {
            headers,
            body: JSON.stringify({ command: `lp user ${player.ign} parent set qbitor` })
          })
        )
      )
    })
  )

  return res.empty()
}