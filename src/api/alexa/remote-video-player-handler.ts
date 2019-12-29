import _ from 'lodash'
import uuid from 'uuid/v4'
import { asyncKodiRpcCommand } from '../../tunnel-server'

import { AlexaRequest } from './types'
import { KodiInstances } from '../../tunnel-server'

export type VideoFilter = {
  titles: string[]
  collections: string[]
  genres: string[]
  actors: string[]
  roles: string[]
  mediaType?: string | null | undefined
  season?: string | null | undefined
  episode?: string | null | undefined
}

function getEntityByType(entities: Record<string, any>[], type: string): string | null | undefined {
  const entity = entities.find(e => e.type === type)
  if (!entity) return null
  return entity.value && entity.value.toLowerCase()
}

function getEntitiesByType(entities: Record<string, any>[], type: string): string[] {
  return entities
    .filter(e => e.type === type)
    .map(e => e.value)
    .filter((v, i, arr) => arr.indexOf(v) === i)
}

const GENRE_MAPPING = {
  'science fiction': ['sci-fi', 'sci fi'],
}

export function mapGenres(genres: string[]) {
  return genres.reduce(
    (acc, genre) => [...acc, genre, ...(GENRE_MAPPING[genre.toLowerCase()] || [])],
    []
  )
}

export function createFilterFromEntities(entities: Record<string, any>[]): VideoFilter {
  return {
    titles: getEntitiesByType(entities, 'Video'),
    collections: getEntitiesByType(entities, 'Franchise'),
    genres: mapGenres(getEntitiesByType(entities, 'Genre')),
    actors: getEntitiesByType(entities, 'Actor'),
    roles: getEntitiesByType(entities, 'Character'),
    mediaType: getEntityByType(entities, 'MediaType'),
    season: getEntityByType(entities, 'Season'),
    episode: getEntityByType(entities, 'Episode'),
  }
}

export default async function remoteVideoPlayerHandler(
  { event, username }: AlexaRequest,
  kodiInstances: KodiInstances
) {
  const name = _.get(event, 'directive.header.name')
  const endpointId = _.get(event, 'directive.endpoint.endpointId')

  const filter = createFilterFromEntities(_.get(event, 'directive.payload.entities', []))

  switch (name) {
    case 'SearchAndPlay':
      await asyncKodiRpcCommand(kodiInstances, username, endpointId, 'searchAndPlay', {
        filter,
      })
      break
    case 'SearchAndDisplayResults':
      await asyncKodiRpcCommand(kodiInstances, username, endpointId, 'searchAndDisplay', {
        filter,
      })
      break
    default:
      throw new Error(`Unsupported RemoteVideoPlayer name: ${name}`)
  }

  const endpoint = {
    endpointId,
  }

  const header = {
    messageId: uuid(),
    correlationToken: _.get(event, 'directive.header.correlationToken'),
    name: 'Response',
    namespace: 'Alexa',
    payloadVersion: '3',
  }

  const payload = {}

  return { endpoint, header, payload }
}
