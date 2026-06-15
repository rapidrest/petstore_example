///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import { DataSource } from "typeorm";
import { authRoutes } from "./routes/AuthRoute.js";
import { userRoutes } from "./routes/UserRoute.js";
import { petRoutes } from "./routes/PetRoute.js";
import { orderRoutes } from "./routes/OrderRoute.js";

export interface AppOptions {
    logger?: boolean;
}

export async function createApp(config: any, dataSource: DataSource, opts: AppOptions = {}): Promise<FastifyInstance> {
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
            const decoded = (app.jwt as any).verify(token);
            (request as any).user = decoded;
        } catch {
            return reply.status(401).send({ message: "Unauthorized" });
        }
    });

    const routeOpts = { dataSource, config };
    await app.register(authRoutes, { prefix: "/user", ...routeOpts });
    await app.register(userRoutes, { prefix: "/user", ...routeOpts });
    await app.register(petRoutes, { prefix: "/pet", ...routeOpts });
    await app.register(orderRoutes, { prefix: "/store/order", ...routeOpts });

    app.get("/", async () => ({
        name: config.get("service_name"),
        time: new Date().toISOString(),
        version: config.get("version")
    }));
    app.get("/status", async () => ({
        name: config.get("service_name"),
        time: new Date().toISOString(),
        version: config.get("version")
    }));

    return app;
}
