import InstallationController from "../controllers/InstallationController";
import { aaCors } from "../../firebase-utils";
import * as express from "express";

module.exports = function routes() {
  const app = express();

  app.use(aaCors);
  app.use(express.json());

  const c = new InstallationController();

  app.get("/direct", c.directInstall.bind(c));
  app.get("/oauth-complete", c.oauthComplete.bind(c));

  return app;
};
