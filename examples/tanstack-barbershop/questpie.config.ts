/**
 * Questpie Configuration for CLI
 *
 * This file is used by the Questpie CLI for migrations and other commands.
 * It exports the Questpie instance and CLI-specific settings.
 *
 * @example
 * ```ts
 * export const config = {
 *   app: cms,
 *   cli: {
 *     migrations: {
 *       directory: "./src/migrations",
 *     },
 *   },
 * };
 * ```
 */

import { cms } from "@/questpie/server/cms";

export const config = {
  app: cms,
  cli: {
    migrations: {
      directory: "./src/migrations",
    },
  },
};

export default config;
