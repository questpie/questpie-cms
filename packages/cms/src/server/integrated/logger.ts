import pino from "pino";

export interface LoggerConfig {
	/**
	 * Log level (debug, info, warn, error)
	 * Defaults to 'info'
	 */
	level?: string;
	/**
	 * Enable pretty printing (useful for dev)
	 * Defaults to false (true if NODE_ENV is development)
	 */
	pretty?: boolean;
	/**
	 * Redact keys (e.g. ["req.headers.authorization"])
	 */
	redact?: string[];
}

export class LoggerService {
	private logger: pino.Logger;

	constructor(config: LoggerConfig = {}) {
		const isDev = process.env.NODE_ENV === "development";
		
		this.logger = pino({
			level: config.level || "info",
			redact: config.redact,
			transport: (config.pretty ?? isDev) ? {
				target: "pino-pretty",
				options: {
					colorize: true,
					ignore: "pid,hostname",
					translateTime: "HH:MM:ss Z",
				}
			} : undefined
		});
	}

	debug(msg: string, ...args: any[]) {
		this.logger.debug(msg, ...args);
	}

	info(msg: string, ...args: any[]) {
		this.logger.info(msg, ...args);
	}

	warn(msg: string, ...args: any[]) {
		this.logger.warn(msg, ...args);
	}

	error(msg: string, ...args: any[]) {
		this.logger.error(msg, ...args);
	}
	
	child(bindings: Record<string, any>) {
		const childLogger = new LoggerService();
		childLogger.logger = this.logger.child(bindings);
		return childLogger;
	}
}
