import { verifySignature, Interaction, InteractionResponseTypes, InteractionTypes, createBot, AllowedMentionsTypes } from 'https://deno.land/x/discordeno@18.0.1/mod.ts'
import { camelize } from 'https://deno.land/x/camelize@2.0.0/mod.ts'
import { getHandler } from './models/handler.ts'
import { loadEnvironment } from 'jsr:@qbitmc/deno@0.0.3/appwrite'

// deno-lint-ignore no-explicit-any
export default async ({ req, res, _log, _error }: any) => {
  const environment = loadEnvironment()

  const signature = req.headers['x-signature-ed25519']
  const timestamp = req.headers['x-signature-timestamp']
  if (!signature || !timestamp) throw new Error('Bad Request')

  const { body, isValid } = verifySignature({
    publicKey: environment.discord.publicKey,
    body: req.bodyRaw,
    signature,
    timestamp
  })
  if (!isValid) throw new Error('Unauthorized')

  const payload = camelize<Interaction>(JSON.parse(body)) as Interaction

  if (payload.type === InteractionTypes.Ping) {
    return res.json({
      type: InteractionResponseTypes.Pong
    })
  }

  const customId = payload.data?.customId

  if (!customId) throw new Error('Bad Request')

  const [prefix, arg] = customId.split('.')
  const [action, value] = arg.split('=')

  const handler = new(getHandler(prefix))(action, value)

  const message = await handler.handle(environment, payload)

  const channel = payload.channelId!
  const bot = createBot({ token: environment.discord.token })
  await bot.helpers.sendMessage(channel, { content: message, messageReference: { failIfNotExists: false, messageId: payload.message!.id }, allowedMentions: { parse: [AllowedMentionsTypes.UserMentions] } })
  return res.empty()
}