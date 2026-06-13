///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import express from "express";
import passport from "passport";
import cors from "cors";
import { DataSource } from "typeorm";
import { setupPassport } from "./auth/passport.js";
import { createAuthRouter } from "./routes/AuthRoute.js";
import { createUserRouter } from "./routes/UserRoute.js";
import { createPetRouter } from "./routes/PetRoute.js";
import { createOrderRouter } from "./routes/OrderRoute.js";

export function createApp(config: any, dataSource: DataSource): express.Application {
    const app = express();

    app.use(express.json());
    app.use(cors(config.get("cors")));

    setupPassport(passport, config, dataSource);
    app.use(passport.initialize() as unknown as express.RequestHandler);

    app.use(createAuthRouter(passport, config, dataSource));
    app.use("/user", createUserRouter(passport, config, dataSource));
    app.use("/pet", createPetRouter(passport, config, dataSource));
    app.use("/store/order", createOrderRouter(passport, config, dataSource));

    app.get("/", (_req, res) => res.json({ status: "ok", service: config.get("service_name") }));

    return app;
}
