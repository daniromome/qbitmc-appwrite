import { Models } from "https://deno.land/x/appwrite@11.0.0/mod.ts";

export interface Preferences extends Models.Preferences {
  nickname?: string
  locale?: string
  player?: string
}

export type User = Models.User<Preferences>