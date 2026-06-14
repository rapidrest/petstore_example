///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { hash as argonHash } from "argon2";
import { DataSource } from "typeorm";
import User from "../models/User.js";

interface RouteOptions {
    dataSource: DataSource;
    config: any;
}

export async function userRoutes(fastify: FastifyInstance, opts: RouteOptions): Promise<void> {
    const repo = opts.dataSource.getMongoRepository(User);
    const authenticate = (fastify as any).authenticate;

    // GET + HEAD / — HEAD returns count in Content-Length, GET returns all users.
    // Combined to prevent Fastify auto-HEAD from overriding the explicit HEAD handler.
    fastify.route({
        method: ["GET", "HEAD"],
        url: "/",
        preHandler: [authenticate],
        handler: async (request: FastifyRequest, reply: FastifyReply) => {
            if (request.method === "HEAD") {
                const count = await repo.count();
                reply.header("content-length", count.toString());
                return reply.code(200).send("");
            }
            const users = await repo.find();
            return reply.send(users);
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
        const { id } = request.params as any;
        const user = await repo.findOne({ where: { uid: id } as any });
        if (!user) return reply.status(404).send({ message: "User not found" });
        return reply.send(user);
    });

    // PUT /:id — update user by uid
    fastify.put("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as any;
        const existing = await repo.findOne({ where: { uid: id } as any });
        if (!existing) return reply.status(404).send({ message: "User not found" });

        const { _id, ...updates } = request.body as any;
        Object.assign(existing, updates);
        existing.dateModified = new Date();
        const saved = await repo.save(existing);
        return reply.send(saved);
    });

    // DELETE /:id — delete user by uid
    fastify.delete("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as any;
        await repo.deleteOne({ uid: id });
        return reply.status(200).send({});
    });

    // DELETE / — truncate all users
    fastify.delete("/", { preHandler: [authenticate] }, async (_request: FastifyRequest, reply: FastifyReply) => {
        await repo.deleteMany({});
        return reply.status(200).send({});
    });
}
