import * as express from "express";
import { aaCors, sanitizePath } from "./firebase-utils";
import { inspect } from "util";

const app = express();

app.use(aaCors);
app.use(express.json());

app.get(
  "/*",
  sanitizePath((req: express.Request, res: express.Response) => {
    const firebaseInfo = {
      process_env: process.env,
      request: req,
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(inspect(firebaseInfo));
  }),
);

export default app;
