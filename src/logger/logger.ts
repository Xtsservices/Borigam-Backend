import winston, { createLogger, format, transports } from 'winston';
import dotenv from "dotenv";

dotenv.config();


const env =process.env.ENV;
const errorLogFileName = `error${env}.log`;
const combinedLogFileName = `combined${env}.log`;
let Level: any
if (env === "production") {
  Level = 'error'
} else {
  Level = ['debug', 'warn', 'info'];
}
//logger class to print logs
export class Logger {
  private logger: winston.Logger;
  constructor() {
    //logger syntax
    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new transports.Console({ format: format.json() }),
        new transports.File({ dirname: "src/Logger", filename: errorLogFileName, level: 'error', format: format.json() }),
        new transports.File({ dirname: "src/Logger", filename: combinedLogFileName, format: format.json() })
      ]
    });
  }
  //info method
  info(message: string, response?: any) {
    this.logger.info(message);
  }
  warn(message: string, Key?: string) {
    this.logger.warn(message, Key);
  }
  error(message: string, error?: any) {
    this.logger.error(message, error);
  }
  debug(message: string) {
    this.logger.debug(message);
  }
}
export default new Logger();