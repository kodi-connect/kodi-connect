import _ from 'lodash'
import Ajv from 'ajv'

import jsonSchemaDraft06 from 'ajv/lib/refs/json-schema-draft-06.json'
import alexaSmartHomeMessageSchema from './alexa_smart_home_message_schema.json'
import createLogger from '../../logging'

const logger = createLogger('api/alexa/validation')

function jsonSchemaValidationImpl(response: Record<string, any>): void {
  if (
    ['Alexa.Video', 'Alexa.Discovery', 'Alexa'].includes(_.get(response, 'event.header.namespace'))
  ) {
    // TODO - merge/update Alexa jsonschema when available for Video Skill
    return
  }

  const ajv = new Ajv({ schemaId: 'auto' })
  ajv.addMetaSchema(jsonSchemaDraft06)

  const valid = ajv.validate(alexaSmartHomeMessageSchema, response)

  if (!valid) {
    logger.warn('Invalid JSON response:', { ajvErrors: ajv.errors })
    throw new Error('Invalid JSON response')
  }
}

export function jsonSchemaValidation(response: Record<string, any>): void {
  // eslint-disable-next-line no-console
  console.time('json-validation')

  jsonSchemaValidationImpl(response)

  // eslint-disable-next-line no-console
  console.timeEnd('json-validation')
}
