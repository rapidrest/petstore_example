///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { DataSource } from "typeorm";
import { ModelUtils } from "@composer-js/service-core/dist/lib/models/ModelUtils.js";
import { UserUtils } from "@composer-js/core/dist/lib/UserUtils.js";
import Pet from "../models/Pet.js";

interface RouteOptions {
    dataSource: DataSource;
    config: any;
}

export async function petRoutes(fastify: FastifyInstance, opts: RouteOptions): Promise<void> {
    const repo = opts.dataSource.getMongoRepository(Pet);
    const authenticate = (fastify as any).authenticate;
    const trustedRoles: string[] = opts.config.get("trusted_roles") || ["admin"];

    // GET + HEAD / — HEAD returns count in Content-Length, GET returns all pets.
    // Combined to prevent Fastify auto-HEAD from overriding the explicit HEAD handler.
    // No auth required for GET or HEAD on pets.
    fastify.route({
        method: ["GET", "HEAD"],
        url: "/",
        handler: async (request: FastifyRequest, reply: FastifyReply) => {
            const queryParams: any = request.query;
            const limit: number = queryParams.limit ? Math.min(Number(queryParams.limit), 1000) : 100;
            const page: number = queryParams.page ? Number(queryParams.page) : 0;
            const skip: number = page * limit;
            const query = ModelUtils.buildSearchQuery(Pet, repo, request.params, queryParams);
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

    // POST / — create one or many pets (auth required)
    fastify.post("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user || !UserUtils.hasRoles(request.user, trustedRoles)) {
            return reply.status(401).send({ message: "Unauthorized "});
        }
        const body = request.body as any;
        if (Array.isArray(body)) {
            const pets = body.map((p: any) => new Pet(p));
            const saved = await repo.save(pets);
            return reply.status(201).send(saved);
        } else {
            const pet = new Pet(body);
            const saved = await repo.save(pet);
            return reply.status(201).send(saved);
        }
    });

    // GET /:id — find pet by uid (no auth required)
    fastify.get("/:id", async (request: FastifyRequest, reply: FastifyReply) => {
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
        const pet = await repo.aggregate(query).limit(1).next();
        if (!pet) return reply.status(404).send({ message: "Pet not found" });
        return reply.send(pet);
    });

    // PUT /:id — update pet by uid (auth required)
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
        if (!existing) return reply.status(404).send({ message: "Pet not found" });

        const { _id, ...updates } = request.body as any;
        Object.assign(existing, updates);
        existing.dateModified = new Date();
        const saved = await repo.save(existing);
        return reply.send(saved);
    });

    // DELETE /:id — delete pet by uid (auth required)
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
        if (!existing) return reply.status(404).send({ message: "Pet not found" });
        await repo.deleteOne({ uid: existing.uid });
        return reply.status(200).send({});
    });

    // DELETE / — truncate all pets (auth required)
    fastify.delete("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user || !UserUtils.hasRoles(request.user, trustedRoles)) {
            return reply.status(401).send({ message: "Unauthorized "});
        }
        const query = ModelUtils.buildSearchQuery(Pet, repo, request.params, request.query);
        await repo.deleteMany(query);
        return reply.status(200).send({});
    });
}
