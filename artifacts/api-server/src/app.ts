import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust exactly ONE hop of upstream proxy (Replit's edge, or a single
// reverse-proxy in production). This causes Express to derive `req.ip`
// from the right-most entry of `X-Forwarded-For` written by that trusted
// hop, NOT from arbitrary client-supplied prefixes. Setting this to
// `true` (the previous value) trusted the entire forwarded chain, which
// let any client spoof `X-Forwarded-For: 1.2.3.4` to evade per-IP
// rate limits. See https://expressjs.com/en/guide/behind-proxies.html.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));

app.use("/api", router);

export default app;
