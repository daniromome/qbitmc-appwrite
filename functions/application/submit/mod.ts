import { Client, Users, Storage, Databases, ID } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { createBot, ChannelTypes, MessageComponentTypes, ButtonStyles } from 'https://deno.land/x/discordeno@18.0.1/mod.ts'
import { EnrollmentApplicationDocument, Preferences, DECIMAL_COLOR } from 'jsr:@qbitmc/common/models'
import { getLocale } from 'jsr:@qbitmc/common/utils'
import i18next from "https://esm.sh/i18next@23.11.5"

// deno-lint-ignore no-explicit-any
export default async ({ req, res, _log, _error }: any) => {
  const token = Deno.env.get('DISCORD_TOKEN')
  const channel = Deno.env.get('DISCORD_CHANNEL_APPLICATION')
  const endpoint = Deno.env.get('APPWRITE_ENDPOINT')
  const project = Deno.env.get('APPWRITE_FUNCTION_PROJECT_ID')
  const key = Deno.env.get('APPWRITE_API_KEY')
  const bucket = Deno.env.get('APPWRITE_BUCKET_APPLICATION')
  const database = Deno.env.get('APPWRITE_DATABASE_ID')
  const collection = Deno.env.get('APPWRITE_COLLECTION_APPLICATION_STATUS')
  if (!collection) throw new Error('Application status collection id environment variable is not defined')
  if (!database) throw new Error('Database id environment variable is not defined')
  if (!endpoint) throw new Error('Appwrite endpoint environment variable is not defined') 
  if (!project) throw new Error('Appwrite project environment variable is not defined')
  if (!key) throw new Error('Appwrite key environment variable is not defined')
  if (!token) throw new Error('Discord token environment variable is not defined') 
  if (!channel) throw new Error('Discord channel application environment variable is not defined')
  if (!bucket) throw new Error('Appwrite bucket application environment variable is not defined')
  const application: EnrollmentApplicationDocument = req.body
  if (!application.$id) throw new Error('Bad Request')
  const client = new Client()
    .setEndpoint(endpoint) 
    .setProject(project)
    .setKey(key);
  const users = new Users(client)
  const storage = new Storage(client)
  const databases = new Databases(client)
  const user = await users.get<Preferences>(application.profile.$id)
  i18next.init({
    lng: getLocale((user.prefs.locale?.split('-')[0])),
    resources: {
      en: {
        translation: {
          'application.public.title': 'New application',
          'application.public.description': '{{ign}} has sent a community access request',
          'application.private.title': '{{ign}}\'s Application',
          'application.private.age': 'Age',
          'application.private.reasons': 'Reasons',
          'application.private.experiences': 'Experiences',
          'application.private.approve': 'Approve',
          'application.private.reject': 'Reject'
        }
      },
      es: {
        translation: {
          'application.public.title': 'Nueva aplicación',
          'application.public.description': '{{ign}} ha enviado una solicitud de acceso a la comunidad',
          'application.private.title': 'Aplicación de {{ign}}',
          'application.private.age': 'Edad',
          'application.private.reasons': 'Razones',
          'application.private.experiences': 'Experiencias',
          'application.private.approve': 'Aceptar',
          'application.private.reject': 'Rechazar'
        }
      }
    }
  })
  const player = application.profile.players.find(p => p.$id === user.prefs.player) || application.profile.players[0]
  const bot = createBot({ token })
  const threadName = i18next.t('application.private.title', { ign: player.ign })
  const thumbnail = { url: `https://api.mineatar.io/head/${player.$id}?scale=16` }
  const [files, thread] = await Promise.all([
    Promise.all(application.media.map(async (m) => {
      const [buffer, file] = await Promise.all([
        storage.getFileView(bucket, m),
        storage.getFile(bucket, m)
      ])
      const blob = new Blob([buffer], { type: file.mimeType })
      return { blob, name: file.name }
    })),
    bot.helpers.startThreadWithoutMessage(channel, { type: ChannelTypes.PrivateThread, name: threadName, autoArchiveDuration: 1440, invitable: false }),
    bot.helpers.sendMessage(channel, { embeds: [{
      color: DECIMAL_COLOR.PRIMARY,
      title: i18next.t('application.public.title'),
      description: i18next.t('application.public.description', { ign: player.ign }),
      thumbnail
    }]})
  ])
  
  await Promise.all([
    databases.createDocument(database, collection, ID.unique(), { application: application.$id, channel: thread.id.toString() }),
    bot.helpers.addThreadMember(thread.id, application.profile.discord)
  ])

  await bot.helpers.sendMessage(thread.id, {
    embeds: [{
      author: { name: player.ign, url: `https://discord.com/users/${application.profile.discord}` },
      fields: [
        { name: i18next.t('application.private.age'), value: application.age.toString() },
        { name: i18next.t('application.private.reasons'), value: application.reasons },
        { name: i18next.t('application.private.experiences'), value: application.experience }
      ],
      thumbnail
    }],
    file: files,
    components: [
      { components: [
        {
          type: MessageComponentTypes.Button,
          label: i18next.t('application.private.approve'),
          style: ButtonStyles.Success,
          customId: `enrollment.approve=${application.$id}`
        },
        {
          type: MessageComponentTypes.Button,
          label: i18next.t('application.private.reject'),
          style: ButtonStyles.Danger,
          customId: `enrollment.reject=${application.$id}`
        }
      ], type: MessageComponentTypes.ActionRow }
    ]
  })
  return res.empty()
}