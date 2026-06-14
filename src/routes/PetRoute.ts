///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { DataSource } from "typeorm";
import Pet from "../models/Pet.js";

interface RouteOptions {
    dataSource: DataSource;
    config: any;
}

export async function petRoutes(fastify: FastifyInstance, opts: RouteOptions): Promise<void> {
    const repo = opts.dataSource.getMongoRepository(Pet);
    const authenticate = (fastify as any).authenticate;

    // GET + HEAD / — HEAD returns count in Content-Length, GET returns all pets.
    // Combined to prevent Fastify auto-HEAD from overriding the explicit HEAD handler.
    // No auth required for GET or HEAD on pets.
    fastify.route({
        method: ["GET", "HEAD"],
        url: "/",
        handler: async (request: FastifyRequest, reply: FastifyReply) => {
            if (request.method === "HEAD") {
                const count = await repo.count();
                reply.header("content-length", count.toString());
                return reply.code(200).send("");
            }
            const pets = await repo.find();
            return reply.send(pets);
        },
    });

    // POST / — create one or many pets (auth required)
    fastify.post("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
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
        const pet = await repo.findOne({ where: { uid: id } as any });
        if (!pet) return reply.status(404).send({ message: "Pet not found" });
        return reply.send(pet);
    });

    // PUT /:id — update pet by uid (auth required)
    fastify.put("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as any;
        const existing = await repo.findOne({ where: { uid: id } as any });
        if (!existing) return reply.status(404).send({ message: "Pet not found" });

        const { _id, ...updates } = request.body as any;
        Object.assign(existing, updates);
        existing.dateModified = new Date();
        const saved = await repo.save(existing);
        return reply.send(saved);
    });

    // DELETE /:id — delete pet by uid (auth required)
    fastify.delete("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as any;
        await repo.deleteOne({ uid: id });
        return reply.status(200).send({});
    });

    // DELETE / — truncate all pets (auth required)
    fastify.delete("/", { preHandler: [authenticate] }, async (_request: FastifyRequest, reply: FastifyReply) => {
        await repo.deleteMany({});
        return reply.status(200).send({});
    });
}
