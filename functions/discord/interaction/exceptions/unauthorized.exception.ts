export class UnauthorizedException extends Error {
  constructor(message?: string) {
    super(message || 'User does not have enough permissions to do this')
  }
}