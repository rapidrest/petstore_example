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
import { ACLUtils, BaseOpenAPIRoute, BaseStatusRoute, ObjectFactory, RepoUtils } from "@rapidrest/service-core";
import User from "./models/User.js";
import { initDatabase } from "./database.js";

class OpenAPIRoute extends BaseOpenAPIRoute {};
class StatusRoute extends BaseStatusRoute {};

export async function createApp(config: any, objectFactory: ObjectFactory, logger: any): Promise<express.Application> {
    await initDatabase(config, objectFactory, logger);
    await objectFactory.newInstance(ACLUtils, { name: "default" });
    objectFactory.register(OpenAPIRoute);
    objectFactory.register(StatusRoute);
    
    const app = express();

    app.use(express.json());
    app.use(cors(config.get("cors")));

    const userRepo: RepoUtils<User> = await objectFactory.newInstance(RepoUtils, { name: User.name, initialize: true, args: [User] });
    setupPassport(passport, config, userRepo);
    app.use(passport.initialize() as unknown as express.RequestHandler);

    app.use("/api/auth", await createAuthRouter(passport, config, objectFactory));
    app.use("/api/user", await createUserRouter(passport, config, objectFactory));
    app.use("/api/pet", await createPetRouter(passport, config, objectFactory));
    app.use("/api/store/order", await createOrderRouter(passport, config, objectFactory));

    const openapiRoute: OpenAPIRoute = await objectFactory.newInstance(OpenAPIRoute);
    app.get("/", (_req, res) => res.json(openapiRoute.getHTML()));
    app.get("/api/openapi", (_req, res) => res.json(openapiRoute.getHTML()));
    app.get("/api/openapi.json", (_req, res) => res.json(openapiRoute.getJSON()));
    app.get("/api/openapi.yaml", (_req, res) => res.json(openapiRoute.getYAML()));
    const statusRoute: StatusRoute = await objectFactory.newInstance(StatusRoute);
    app.get("/api/status", (_req, res) => res.json(statusRoute.get()));

    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        const status: number = err.status ?? err.statusCode ?? 500;
        res.status(status).json({ code: err.code, error: err.message });
    });

    return app;
}
