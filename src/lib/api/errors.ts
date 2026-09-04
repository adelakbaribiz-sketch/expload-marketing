/**
 * Typed error a route handler can throw to get a specific status code and
 * message back from `withProtection`'s catch block, instead of the generic
 * 500 every other uncaught exception maps to. Useful inside a `db.$transaction`
 * callback, where returning a `NextResponse` isn't an option — throwing aborts
 * the transaction and the error carries its intended status back out.
 */
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
