///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import express from "express";
import passport from "passport";
import cors from "cors";
import { setupPassport } from "./auth/passport.js";
import { createAuthRouter } from "./routes/AuthRoute.js";
import { createUserRouter } from "./routes/UserRoute.js";
import { createPetRouter } from "./routes/PetRoute.js";
import { createOrderRouter } from "./routes/OrderRoute.js";
import { ACLUtils, ObjectFactory, RepoUtils } from "@rapidrest/service-core";
import User from "./models/User.js";
import { initDatabase } from "./database.js";

export async function createApp(config: any, objectFactory: ObjectFactory, logger: any): Promise<express.Application> {
    await initDatabase(config, objectFactory, logger);
    await objectFactory.newInstance(ACLUtils, { name: "default" });
    
    const app = express();

    app.use(express.json());
    app.use(cors(config.get("cors")));

    const userRepo: RepoUtils<User> = await objectFactory.newInstance(RepoUtils, { name: User.name, initialize: true, args: [User] });
    setupPassport(passport, config, userRepo);
    app.use(passport.initialize() as unknown as express.RequestHandler);

    app.use(await createAuthRouter(passport, config, objectFactory));
    app.use("/user", await createUserRouter(passport, config, objectFactory));
    app.use("/pet", await createPetRouter(passport, config, objectFactory));
    app.use("/store/order", await createOrderRouter(passport, config, objectFactory));

    app.get("/", (_req, res) => res.json({ name: config.get("service_name"), time: new Date().toISOString(), version: config.get("version"), }));
    app.get("/status", (_req, res) => res.json({ name: config.get("service_name"), time: new Date().toISOString(), version: config.get("version"), }));

    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        const status: number = err.status ?? err.statusCode ?? 500;
        res.status(status).json({ code: err.code, error: err.message });
    });

    return app;
}
