import { createLogger } from "./infra/logging.js";
import { loadConfig } from "./infra/config.js";

const config = loadConfig();
const logger = createLogger();

logger.info({
  event: "server.boot",
  port: config.port,
  maps: ["shuagou"],
  reserved: ["haoren-td", "element-td"],
});
