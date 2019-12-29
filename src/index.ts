import createServer from './server'
import createLogger from './logging'

const logger = createLogger('index')

const server = createServer()

server.listen(3005, undefined, undefined, () => {
  logger.info('Server listening', { port: server.address().port })
})
