import { Client, Users, Storage, Databases, ID } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { createBot, ChannelTypes, MessageComponentTypes, ButtonStyles } from 'https://deno.land/x/discordeno@18.0.1/mod.ts'
import { EnrollmentApplicationDocument, Preferences, DECIMAL_COLOR, USER_LABEL } from 'jsr:@qbitmc/common@1.0.0'
import { getLocale } from 'jsr:@qbitmc/common/utils'
import i18next from 'https://esm.sh/i18next@23.11.5'
import { loadEnvironment } from "jsr:@qbitmc/deno/appwrite";

// deno-lint-ignore no-explicit-any
export default async ({ req, res, _log, _error }: any) => {
  const environment = loadEnvironment()
  const application: EnrollmentApplicationDocument = req.body
  if (!application.$id) throw new Error('Bad Request')
  const client = new Client()
    .setEndpoint(environment.appwrite.api.endpoint) 
    .setProject(environment.appwrite.api.project)
    .setKey(environment.appwrite.api.key)
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
  const bot = createBot({ token: environment.discord.token })
  const threadName = i18next.t('application.private.title', { ign: player.ign })
  const thumbnail = { url: `https://api.mineatar.io/head/${player.$id}?scale=16` }
  const [files, thread] = await Promise.all([
    Promise.all(application.media.map(async (m) => {
      const [buffer, file] = await Promise.all([
        storage.getFileView(environment.appwrite.bucket.application, m),
        storage.getFile(environment.appwrite.bucket.application, m)
      ])
      const blob = new Blob([buffer], { type: file.mimeType })
      return { blob, name: file.name }
    })),
    bot.helpers.startThreadWithoutMessage(environment.discord.channel.application, { type: ChannelTypes.PrivateThread, name: threadName, autoArchiveDuration: 1440, invitable: false }),
    bot.helpers.sendMessage(environment.discord.channel.application, { embeds: [{
      color: DECIMAL_COLOR.PRIMARY,
      title: i18next.t('application.public.title'),
      description: i18next.t('application.public.description', { ign: player.ign }),
      thumbnail
    }]})
  ])
  
  await Promise.all([
    databases.createDocument(
      environment.appwrite.database,
      environment.appwrite.collection.status,
      ID.unique(),
      { application: application.$id, channel: thread.id.toString() }
    ),
    bot.helpers.addThreadMember(thread.id, application.profile.discord),
    users.updateLabels(user.$id, [...user.labels, USER_LABEL.APPLICANT ])
  ])

  await bot.helpers.sendMessage(thread.id, {
    embeds: [{
      color: DECIMAL_COLOR.PRIMARY,
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
          customId: `application.approve=${application.$id}`
        },
        {
          type: MessageComponentTypes.Button,
          label: i18next.t('application.private.reject'),
          style: ButtonStyles.Danger,
          customId: `application.reject=${application.$id}`
        }
      ], type: MessageComponentTypes.ActionRow }
    ]
  })

  return res.empty()
}