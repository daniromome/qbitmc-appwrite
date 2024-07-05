import { load } from 'https://deno.land/std@0.224.0/dotenv/mod.ts'
import { Client, Databases } from 'https://deno.land/x/appwrite@11.0.0/mod.ts';
import { ServerDocument } from 'jsr:@qbitmc/common@1.2.0';

const env = await load()

const environment = {
  APPWRITE_ENDPOINT: env['APPWRITE_ENDPOINT'],
  APPWRITE_PROJECT: env['APPWRITE_PROJECT'],
  APPWRITE_API_KEY: env['APPWRITE_API_KEY'],
  APPWRITE_DATABASE_ID: env['APPWRITE_DATABASE_ID'],
  APPWRITE_COLLECTION_SERVER: env['APPWRITE_COLLECTION_SERVER']
}

if (Object.values(environment).some(value => !value)) throw new Error('Environment not set')

const appwrite = {
  collection: environment.APPWRITE_COLLECTION_SERVER!,
  database: environment.APPWRITE_DATABASE_ID!,
  endpoint: environment.APPWRITE_ENDPOINT!,
  key: environment.APPWRITE_API_KEY!,
  project: environment.APPWRITE_PROJECT!
}

const server = '85a729e2-0274-40da-8f85-0a7a095c2db5'

const client = new Client()
  .setEndpoint(appwrite.endpoint)
  .setProject(appwrite.project)
  .setKey(appwrite.key)

const databases = new Databases(client)

const announcements = [
  {
    key: 'announcement_en',
    value: 'tellraw @a[team=en] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Building on the ","color":"gray"},{"text":"Spawnchunks ","color":"blue"},{"text":"without explicit permission is ","color":"gray"},{"text":"prohibited","color":"red"}]'
  },
  {
    key: 'announcement_es',
    value: 'tellraw @a[team=es] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Construír en los ","color":"gray"},{"text":"Spawn Chunks ","color":"blue"},{"text":"está ","color":"gray"},{"text":"prohibido","color":"red"},{"text":". Esta zona está reservada para proyectos comunitarios.","color":"gray"}]'
  },
  {
    key: 'announcement_en',
    value: 'tellraw @a[team=en] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Item duping is strictly ","color":"gray"},{"text":"forbidden ","color":"red"},{"text":"the only exceptions to this rule are TNT dupers and the community\'s sand farm","color":"gray"}]'
  },
  {
    key: 'announcement_es',
    value: 'tellraw @a[team=es] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] El uso de duplicadores está estrictamente ","color":"gray"},{"text":"prohibido ","color":"red"},{"text":"a excepción de los duplicadores de TNT y la granja de arena comunitaria","color":"gray"}]'
  },
  {
    key: 'announcement_en',
    value: 'tellraw @a[team=en] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Remember not to use the ","color":"gray"},{"text":"End Gateways ","color":"dark_aqua"},{"text":"located in the north, south, east and west direction directly from 0, 0. These are reserved for community builds","color":"gray"}]'
  },
  {
    key: 'announcement_es',
    value: 'tellraw @a[team=es] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Recuerda no usar las ","color":"gray"},{"text":"End Gateways ","color":"dark_aqua"},{"text":"ubicadas en dirección norte, sur, este y oeste directamente de 0, 0 puesto que están reservadas para granjas comunitarias","color":"gray"}]'
  },
  {
    key: 'announcement_en',
    value: 'tellraw @a[team=en] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Be respectful toward other members of the community, any verbal abuse or sign of harassment will be sanctioned accordingly","color":"gray"}]'
  },
  {
    key: 'announcement_es',
    value: 'tellraw @a[team=es] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Se respetuoso con lo demás miembros de la comunidad, cualquier abuso verbal o indicio de hostigamiento será sancionado","color":"gray"}]'
  },
  {
    key: 'announcement_en',
    value: 'tellraw @a[team=en] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Take care of the server\'s environment (do not leave floating trees, when chopping trees down make sure to place some saplings in the area & repair any creeper holes you leave behind)","color":"gray"}]'
  },
  {
    key: 'announcement_es',
    value: 'tellraw @a[team=es] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Cuída el medio ambiente en el servidor (no dejes árboles flotando, replanta los árboles talados y repara tus explosiones de creeper)","color":"gray"}]'
  },
  {
    key: 'announcement_en',
    value: 'tellraw @a[team=en] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Have common sense. We trust your ability to make a good judgement about the actions you take and know you\'re capable of identifying what\'s good from what its not","color":"gray"}]'
  },
  {
    key: 'announcement_es',
    value: 'tellraw @a[team=es] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Ten sentido común. Confíamos en tu habilidad para hacer un buen juicio de las acciones que tomas y que eres capaz de distinguir lo que está bien de lo que no","color":"gray"}]'
  },
  {
    key: 'announcement_en',
    value: 'tellraw @a[team=en] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Avoid any kind of political arguments that may be controversial or hurtful toward other people","color":"gray"}]'
  },
  {
    key: 'announcement_es',
    value: 'tellraw @a[team=es] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Evita cualquier tipo de discusión política que pudiese ser controversial o hiriente hacia otras personas","color":"gray"}]'
  },
  {
    key: 'announcement_en',
    value: 'tellraw @a[team=en] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Using any kind of modification that drastically alters the way to play the game or gives you an advantage over other players is not allowed","color":"gray"}]'
  },
  {
    key: 'announcement_es',
    value: 'tellraw @a[team=es] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Ninguna modificación que altere de manera drástica la forma de jugar el juego o te brinde ventaja sobre los demás jugadores está permitida","color":"gray"}]'
  },
  {
    key: 'announcement_en',
    value: 'tellraw @a[team=en] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Make sure to read the rules, failing to comply with them may result in an ","color":"gray"},{"text":"immediate ban","color":"red"}]'
  },
  {
    key: 'announcement_es',
    value: 'tellraw @a[team=es] ["",{"text":"[","color":"gray"},{"text":"QbitMC","color":"blue"},{"text":"] Asegurate de leer las reglas, el incumplimiento de las mismas puede resultar en un ","color":"gray"},{"text":"ban inmediato ","color":"red"},{"text":"sin previo aviso","color":"gray"}]'
  }
]

const serverDoc = await databases.getDocument<ServerDocument>(
  appwrite.database,
  appwrite.collection,
  server
)

await Promise.all(
  serverDoc.metadata.filter(m => m.key.startsWith('announcement')).map(m =>
    databases.deleteDocument(
      appwrite.database,
      m.$collectionId,
      m.$id
    )
  )
)

await databases.updateDocument(
  appwrite.database,
  appwrite.collection,
  server,
  { metadata: { ...serverDoc.metadata, ...announcements } }
)