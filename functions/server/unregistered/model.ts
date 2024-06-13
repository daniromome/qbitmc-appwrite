interface SftpDetails {
  ip: string
  port: number
}

interface Limits {
  memory: number
  swap: number
  disk: number
  io: number
  cpu: number
}

interface FeatureLimits {
  databases: number
  allocations: number
  backups: number
}

interface AllocationAttributes {
  id: number
  ip: string
  ip_alias: string | null
  port: number
  notes: string | null
  is_default: boolean
}

interface Allocation {
  object: string
  attributes: AllocationAttributes
}

interface AllocationsRelationship {
  object: string
  data: Allocation[]
}

interface Relationships {
  allocations: AllocationsRelationship
}

interface ServerAttributes {
  server_owner: boolean
  identifier: string
  uuid: string
  name: string
  node: string
  sftp_details: SftpDetails
  description: string
  limits: Limits
  feature_limits: FeatureLimits
  is_suspended: boolean
  is_installing: boolean
  relationships: Relationships
}

interface Server {
  object: 'server'
  attributes: ServerAttributes
}

interface Pagination {
  total: number
  count: number
  per_page: number
  current_page: number
  total_pages: number
  links: unknown
}

interface Meta {
  pagination: Pagination
}

export interface PterodactylResponse {
  object: string
  data: Server[]
  meta: Meta
}
