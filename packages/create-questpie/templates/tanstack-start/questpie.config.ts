import { cms } from "@/questpie/server/app";

export const config = {
  app: cms,
  cli: {
    migrations: {
      directory: "./src/migrations",
    },
  },
};

export default config;
