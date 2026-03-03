export {
  createPinoTransport,
  createPinoTransportInternal,
  type LogscopePinoTransportOptions,
  type PinoTransportDependencies,
} from './pino/transport';
export { mapPinoLevel } from './pino/map-pino-level';

import { createPinoTransport } from './pino/transport';

export default createPinoTransport;
