import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import mongoose from 'mongoose'

import { VideoFilter, createFilterFromEntities } from '../remote-video-player-handler'
import config from '../../../config'

export function readEvent(fileName: string): Record<string, any> {
  return JSON.parse(
    fs.readFileSync(path.join(path.resolve(__dirname), 'data', fileName)).toString()
  )
}

export function getEventAndFilter(
  fileName: string
): { event: Record<string, any>; filter: VideoFilter } {
  const event = readEvent(fileName)
  const entities = _.get(event, 'directive.payload.entities')
  const filter = createFilterFromEntities(entities)
  return { event, filter }
}

export function connectMongoose(): Promise<void> {
  return new Promise((resolve, reject) => {
    mongoose.connect(config.mongoConnectString, error => {
      if (error) reject(error)
      else resolve()
    })
  })
}

export function closeMongoose(): Promise<void> {
  return new Promise((resolve, reject) => {
    mongoose.disconnect(error => {
      if (error) reject(error)
      else resolve()
    })
  })
}
