export {
  createWinstonTransport,
  createWinstonTransportInternal,
  type LogscopeWinstonTransportOptions,
  type WinstonTransportDependencies,
} from './winston/transport';
export { mapWinstonLevel } from './winston/map-winston-level';

import { createWinstonTransport } from './winston/transport';

export default createWinstonTransport;
