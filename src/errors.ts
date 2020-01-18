export class BugsnagError extends Error {
  tags: Record<string, any>

  constructor(message: string, tags: Record<string, any> = {}) {
    super(message)
    this.tags = tags
  }
}
