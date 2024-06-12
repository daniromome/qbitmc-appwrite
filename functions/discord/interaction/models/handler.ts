import { Environment } from 'jsr:@qbitmc/deno@0.0.3/appwrite'
import { ApplicationHandler } from '../handlers/application.ts'
import { Prefix } from './prefix.ts'
import { Role } from './role.ts'
import { Interaction } from "https://deno.land/x/discordeno@18.0.1/mod.ts";

export interface BaseHandler {
  readonly roles: readonly Role[]
  readonly prefix: Prefix
  readonly action: string
  readonly value: string

  handle: (environment: Environment, payload: Interaction) => Promise<string>
}

export type Handler = typeof ApplicationHandler

export function getHandler(prefix: string): Handler {
  if (prefix === Prefix.APPLICATION) return ApplicationHandler
  throw new Error(`No handler for prefix ${prefix}`)
}
