import bugsnag from 'bugsnag'

type LoggerFunctionType = (message: string, data?: Record<string, any>) => void

type LoggerType = {
  debug: LoggerFunctionType
  info: LoggerFunctionType
  warn: LoggerFunctionType
  error: LoggerFunctionType
}

type SeverityType = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR'

const severities: SeverityType[] = ['DEBUG', 'INFO', 'WARNING', 'ERROR']

function getEnvLogLevel(): SeverityType {
  const ell = process.env.LOG_LEVEL
  if (ell === 'DEBUG' || ell === 'INFO' || ell === 'WARNING' || ell === 'ERROR') return ell

  // Default LogLevel
  return 'DEBUG'
}

function logBugsnag(severity: SeverityType, message: string, data: Record<string, any>): void {
  if (process.env.NODE_ENV !== 'production') return

  const { error, err, ...restData } = data

  bugsnag.notify(
    error || err || message,
    {
      severity: severity.toLowerCase(),
      data: {
        ...restData,
        message,
      },
    },
    e => {
      // eslint-disable-next-line no-console
      if (e) console.error(`Bugsnag notify failed ${e.message}`)
    }
  )
}

const logLevel: SeverityType = getEnvLogLevel()
const configuredSeverityIndex = severities.indexOf(logLevel)

function createLogFn(level: SeverityType, moduleName: string): LoggerFunctionType {
  if (severities.indexOf(level) < configuredSeverityIndex) return () => {}

  return (message: string, data: Record<string, any> = {}): void => {
    const dataMessage = [
      `level="${level}"`,
      `module="${moduleName}"`,
      ...Object.keys(data).map(key => {
        switch (key) {
          case 'error':
            return `errorMessage="${data[key].message}" errorStack="${data[key].stack}"`
          default:
            return `${key}="${
              typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]
            }"`
        }
      }),
    ].join(' ')

    // eslint-disable-next-line no-console
    console.log(`${dataMessage} ${message}`.replace(/\n/g, ' '))

    if (level === 'ERROR') {
      logBugsnag(level, message, data)
    }
  }
}

export default function createLogger(moduleName: string): LoggerType {
  return {
    debug: createLogFn('DEBUG', moduleName),
    info: createLogFn('INFO', moduleName),
    warn: createLogFn('WARNING', moduleName),
    error: createLogFn('ERROR', moduleName),
  }
}
