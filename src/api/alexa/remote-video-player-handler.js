// @flow

import _ from 'lodash';
import uuid from 'uuid/v4';
import { kodiRpcCommand } from '../../tunnel-server';

import type { AlexaHandlerRequest } from './types';
import type { KodiInstances } from '../../tunnel-server';

export type VideoFilter = {
  titles: string[],
  collections: string[],
  genres: string[],
  actors: string[],
  roles: string[],
  mediaType?: ?string,
  season?: ?string,
  episode?: ?string,
};

function getEntityByType(entities: Object[], type: string): ?string {
  const entity = entities.find(e => e.type === type);
  if (!entity) return null;
  return entity.value && entity.value.toLowerCase();
}

function getEntitiesByType(entities: Object[], type: string): string[] {
  return entities
    .filter(e => e.type === type)
    .map(e => e.value)
    .filter((v, i, arr) => arr.indexOf(v) === i);
}

const GENRE_MAPPING = {
  'science fiction': ['sci-fi', 'sci fi'],
};

export function mapGenres(genres: string[]) {
  return genres.reduce((acc, genre) => ([
    ...acc,
    genre,
    ...(GENRE_MAPPING[genre.toLowerCase()] || []),
  ]), []);
}

export function createFilterFromEntities(entities: Object[]): VideoFilter {
  const filter: VideoFilter = {
    titles: getEntitiesByType(entities, 'Video'),
    collections: getEntitiesByType(entities, 'Franchise'),
    genres: mapGenres(getEntitiesByType(entities, 'Genre')),
    actors: getEntitiesByType(entities, 'Actor'),
    roles: getEntitiesByType(entities, 'Character'),
    mediaType: getEntityByType(entities, 'MediaType'),
    season: getEntityByType(entities, 'Season'),
    episode: getEntityByType(entities, 'Episode'),
  };

  return filter;
}

export default async function remoteVideoPlayerHandler({ event, username }: AlexaHandlerRequest, kodiInstances: KodiInstances) {
  const name = _.get(event, 'directive.header.name');
  const endpointId = _.get(event, 'directive.endpoint.endpointId');

  const filter = createFilterFromEntities(_.get(event, 'directive.payload.entities', []));

  switch (name) {
    case 'SearchAndPlay':
      await kodiRpcCommand(kodiInstances, username, endpointId, 'searchAndPlay', filter);
      break;
    case 'SearchAndDisplayResults':
      await kodiRpcCommand(kodiInstances, username, endpointId, 'searchAndDisplay', filter);
      break;
    default:
      throw new Error(`Unsupported RemoteVideoPlayer name: ${name}`);
  }

  const endpoint = {
    ..._.get(event, 'directive.endpoint'),
  };

  const header = {
    messageId: uuid(),
    correlationToken: _.get(event, 'directive.header.correlationToken'),
    name: 'Response',
    namespace: 'Alexa',
    payloadVersion: '3',
  };

  const payload = {};

  return { endpoint, header, payload };
}
