///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import { ACLUtils, BaseOpenAPIRoute, BaseStatusRoute, ObjectFactory, RepoUtils } from "@rapidrest/service-core";
import { authRoutes } from "./routes/AuthRoute.js";
import { userRoutes } from "./routes/UserRoute.js";
import { petRoutes } from "./routes/PetRoute.js";
import { orderRoutes } from "./routes/OrderRoute.js";
import { initDatabase } from "./database.js";
import jwt from "jsonwebtoken";

class OpenAPIRoute extends BaseOpenAPIRoute {}
class StatusRoute extends BaseStatusRoute {}

export interface AppOptions {
    logger?: boolean;
}

export async function createApp(config: any, objectFactory: ObjectFactory, logger: any, opts: AppOptions = {}): Promise<FastifyInstance> {
    await initDatabase(config, objectFactory, logger);
    await objectFactory.newInstance(ACLUtils, { name: "default" });
    const app = Fastify({ logger: opts.logger ?? false });

    const corsConfig = config.get("cors") || {};
    await app.register(fastifyCors, corsConfig);

    const authConfig = config.get("auth") || {};
    const jwtSecret: string = authConfig.secret || "secret";
    const jwtOptions = authConfig.options || {};
    await app.register(fastifyJwt as any, {
        secret: jwtSecret,
        sign: {
            expiresIn: jwtOptions.expiresIn,
            audience: jwtOptions.audience,
            issuer: jwtOptions.issuer,
        },
        verify: {
            audience: jwtOptions.audience,
            issuer: jwtOptions.issuer,
        },
    });

    // JWT preHandler decorator — reads "Authorization: jwt <token>" scheme
    app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
        const authHeader = request.headers.authorization ?? "";
        if (!authHeader.toLowerCase().startsWith("jwt ")) {
            return reply.status(401).send({ message: "Unauthorized" });
        }
        try {
            const token = authHeader.slice(4).trim();
            const payload: any = jwt.verify(token, jwtSecret);
            if (payload?.profile) {
                (request as any).user = typeof payload.profile === "string"
                    ? JSON.parse(payload.profile)
                    : payload.profile;
            } else {
                (request as any).user = payload;
            }
        } catch {
            return reply.status(401).send({ message: "Unauthorized" });
        }
    });

    const routeOpts = { config, objectFactory, logger };
    await app.register(authRoutes, { prefix: "/api/auth", ...routeOpts });
    await app.register(userRoutes, { prefix: "/api/user", ...routeOpts });
    await app.register(petRoutes, { prefix: "/api/pet", ...routeOpts });
    await app.register(orderRoutes, { prefix: "/api/store/order", ...routeOpts });

    objectFactory.register(OpenAPIRoute);
    const openapiRoute: OpenAPIRoute = await objectFactory.newInstance(OpenAPIRoute);
    app.get("/", async () => openapiRoute.getHTML());
    app.get("/api/openapi", async () => openapiRoute.getHTML());
    app.get("/api/openapi.json", async () => openapiRoute.getJSON());
    app.get("/api/openapi.yaml", async () => openapiRoute.getYAML());

    objectFactory.register(StatusRoute);
    const statusRoute: StatusRoute = await objectFactory.newInstance(StatusRoute);
    app.get("/api/status", async () => statusRoute.get());

    return app;
}
