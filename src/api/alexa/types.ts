export type AmazonAlexaRequest = {
  context: Record<string, any>
  event: Record<string, any>
}

export type AlexaRequest = AmazonAlexaRequest & {
  username: string
  meta: {
    region?: string
  }
}
