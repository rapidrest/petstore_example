///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import config from "../config.js";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { hash as argonHash } from "argon2";
import { DataSource } from "typeorm";
import { ModelUtils } from "@composer-js/service-core/dist/lib/models/ModelUtils.js";
import { UserUtils } from "@composer-js/core/dist/lib/UserUtils.js";
import User from "../models/User.js";

interface RouteOptions {
    dataSource: DataSource;
    config: any;
}

export async function userRoutes(fastify: FastifyInstance, opts: RouteOptions): Promise<void> {
    const repo = opts.dataSource.getMongoRepository(User);
    const authenticate = (fastify as any).authenticate;
    const trustedRoles: string[] = config.get("trusted_roles") || ["admin"];

    // GET + HEAD / — HEAD returns count in Content-Length, GET returns all users.
    // Combined to prevent Fastify auto-HEAD from overriding the explicit HEAD handler.
    fastify.route({
        method: ["GET", "HEAD"],
        url: "/",
        preHandler: [authenticate],
        handler: async (request: FastifyRequest, reply: FastifyReply) => {
            if (!request.user || !UserUtils.hasRoles(request.user, trustedRoles)) {
                return reply.status(401).send({ message: "Unauthorized "});
            }
            const queryParams: any = request.query;
            const limit: number = queryParams.limit ? Math.min(Number(queryParams.limit), 1000) : 100;
            const page: number = queryParams.page ? Number(queryParams.page) : 0;
            const skip: number = page * limit;
            const query = ModelUtils.buildSearchQuery(User, repo, request.params, queryParams);
            if (request.method === "HEAD") {
                const count = await repo.count(query);
                reply.header("content-length", count.toString());
                return reply.code(200).send("");
            } else {
                const results = await repo.aggregate(query).skip(skip).limit(limit).toArray();
                return reply.send(results);
            }
        },
    });

    // POST / — create one or many users
    fastify.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
        const body = request.body as any;
        if (Array.isArray(body)) {
            const users = await Promise.all(
                body.map(async (u: any) => {
                    const user = new User(u);
                    if (user.password) user.password = await argonHash(user.password);
                    return user;
                })
            );
            const saved = await repo.save(users);
            return reply.status(201).send(saved);
        } else {
            const user = new User(body);
            if (user.password) user.password = await argonHash(user.password);
            const saved = await repo.save(user);
            return reply.status(201).send(saved);
        }
    });

    // GET /:id — find user by uid
    fastify.get("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user || !UserUtils.hasRoles(request.user, trustedRoles)) {
            return reply.status(401).send({ message: "Unauthorized "});
        }
        const { id } = request.params as any;
        const query = [
            {
                $match: {
                    $or: [{ uid: id }, { name: id }]
                }
            },
            {
                $sort: { version: -1 },
            },
        ];
        const user = await repo.aggregate(query).limit(1).next();
        if (!user) return reply.status(404).send({ message: "User not found" });
        return reply.send(user);
    });

    // PUT /:id — update user by uid
    fastify.put("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user || !UserUtils.hasRoles(request.user, trustedRoles)) {
            return reply.status(401).send({ message: "Unauthorized "});
        }
        const { id } = request.params as any;
        const query = [
            {
                $match: {
                    $or: [{ uid: id }, { name: id }]
                }
            },
            {
                $sort: { version: -1 },
            },
        ];
        const existing = await repo.aggregate(query).limit(1).next();
        if (!existing) return reply.status(404).send({ message: "User not found" });

        const { _id, ...updates } = request.body as any;
        Object.assign(existing, updates);
        existing.dateModified = new Date();
        const saved = await repo.save(existing);
        return reply.send(saved);
    });

    // DELETE /:id — delete user by uid
    fastify.delete("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user || !UserUtils.hasRoles(request.user, trustedRoles)) {
            return reply.status(401).send({ message: "Unauthorized "});
        }
        const { id } = request.params as any;
        const query = [
            {
                $match: {
                    $or: [{ uid: id }, { name: id }]
                }
            },
            {
                $sort: { version: -1 },
            },
        ];
        const existing = await repo.aggregate(query).limit(1).next();
        if (!existing) return reply.status(404).send({ message: "User not found" });
        await repo.deleteOne({ uid: existing.uid });
        return reply.status(200).send({});
    });

    // DELETE / — truncate all users
    fastify.delete("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user || !UserUtils.hasRoles(request.user, trustedRoles)) {
            return reply.status(401).send({ message: "Unauthorized "});
        }
        const query = ModelUtils.buildSearchQuery(User, repo, request.params, request.query);
                await repo.deleteMany(query);
        return reply.status(200).send({});
    });
}
