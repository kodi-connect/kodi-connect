// @flow

export function sleep(time: number) {
  return new Promise(resolve => setTimeout(() => resolve(), time));
}

export function daysBeforeNow(timestamp: string): number {
  const ms = Date.now() - (new Date(timestamp)).getTime();
  return Math.ceil(ms / (1000 * 3600 * 24));
}

export function daysFromNow(timestamp: string): number {
  const ms = (new Date(timestamp)).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 3600 * 24));
}
