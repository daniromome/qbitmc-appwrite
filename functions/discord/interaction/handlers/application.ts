import { Client, Databases, Users } from 'https://deno.land/x/appwrite@11.0.0/mod.ts'
import { EnrollmentApplicationDocument, Preferences } from 'jsr:@qbitmc/common@0.0.6/models'
import { ApplicationAction } from '../models/action.ts'
import { Role } from '../models/role.ts'
import { Prefix } from '../models/prefix.ts'
import { BaseHandler } from '../models/handler.ts'
import { Environment } from 'jsr:@qbitmc/deno@0.0.3/appwrite'
import { UnauthorizedException } from '../exceptions/unauthorized.exception.ts'
import i18next from 'https://esm.sh/i18next@23.11.5'
import { Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";
import { getLocale } from "jsr:@qbitmc/common/utils";

export class ApplicationHandler implements BaseHandler {
  readonly roles = [Role.ADMIN, Role.MOD] as const
  readonly prefix = Prefix.APPLICATION
  readonly action: ApplicationAction
  readonly value: string

  constructor(action: string, value: string) {
    this.action = ApplicationAction[action as keyof typeof ApplicationAction]
    this.value = value
  }

  async handle(environment: Environment, payload: Interaction): Promise<string> {
    try {
      const client = new Client()
        .setEndpoint(environment.appwrite.api.endpoint)
        .setProject(environment.appwrite.api.project)
        .setKey(environment.appwrite.api.key)
      const databases = new Databases(client)
      const application = await databases.getDocument<EnrollmentApplicationDocument>(
        environment.appwrite.database,
        environment.appwrite.collection.application,
        this.value
      )
      const users = new Users(client)
      const applicant = await users.get<Preferences>(application.profile.$id)
      i18next.init({
        lng: getLocale(applicant.prefs.locale),
        resources: {
          en: {
            translation: {
              'application.interaction.unauthorized': 'Sorry {{ name }}, you do not have enough permissions to approve or reject an application.',
              'application.interaction.success': 'The review for this application has been successfully registered, please wait a few minutes for our systems to complete the enrollment process.',
              'application.interaction.failure': 'An error ocurred while processing this application\'s review, please try again later.',

            }
          },
          es: {
            translation: {
              'application.interaction.unauthorized': 'Lo siento {{ name }}, no tienes permisos suficientes para aprobar o rechazar una aplicación.',
              'application.interaction.success': 'La revisión para esta aplicación ha sido registrada de manera éxitosa, porfavor espera unos minutos para que nuestros sistemas completen el proceso de inscripción',
              'application.interaction.failure': 'Ocurrió un error al procesar la revisión de esta aplicación, porfavor intenta de nuevo más tarde.',
            }
          }
        }
      })
      const allowedRoles = this.roles.map(r => environment.discord.role[r])
      const roles = payload.member?.roles
      if (!roles || !roles.some(r => allowedRoles.includes(r.toString()))) throw new UnauthorizedException(
        i18next.t('application.interaction.unauthorized', { name: payload.member?.user?.username })
      )
      const { $collectionId, $id } = application.status
      await databases.updateDocument(
        environment.appwrite.database,
        $collectionId,
        $id,
        { approved: this.action === ApplicationAction.APPROVE }
      )
      return i18next.t('application.interaction.success')
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return error.message
      }
      return i18next.t('application.interaction.failure')
    }
  }
}