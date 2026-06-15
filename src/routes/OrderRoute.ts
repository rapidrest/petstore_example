///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { DataSource } from "typeorm";
import { ModelUtils } from "@composer-js/service-core/dist/lib/models/ModelUtils.js";
import { UserUtils } from "@composer-js/core/dist/lib/UserUtils.js";
import Order from "../models/Order.js";

interface RouteOptions {
    dataSource: DataSource;
    config: any;
}

export async function orderRoutes(fastify: FastifyInstance, opts: RouteOptions): Promise<void> {
    const repo = opts.dataSource.getMongoRepository(Order);
    const authenticate = (fastify as any).authenticate;
    const trustedRoles: string[] = opts.config.get("trusted_roles") || ["admin"];

    // GET + HEAD / — HEAD returns count in Content-Length, GET returns all orders.
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
            const query = ModelUtils.buildSearchQuery(Order, repo, request.params, queryParams);
            if (request.method === "HEAD") {
                const count = await repo.count(query);
                reply.header("content-length", count.toString());
                return reply.code(200).send("");
            } else {
                const orders = await repo.aggregate(query).skip(skip).limit(limit).toArray();
                return reply.send(orders);
            }
        },
    });

    // POST / — create order
    fastify.post("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user || !UserUtils.hasRoles(request.user, trustedRoles)) {
            return reply.status(401).send({ message: "Unauthorized "});
        }
        const order = new Order(request.body as any);
        const saved = await repo.save(order);
        return reply.status(201).send(saved);
    });

    // GET /:id — find order by uid
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
        const order = await repo.aggregate(query).limit(1).next();
        if (!order) return reply.status(404).send({ message: "Order not found" });
        return reply.send(order);
    });

    // PUT /:id — update order by uid
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
        if (!existing) return reply.status(404).send({ message: "Order not found" });

        const { _id, ...updates } = request.body as any;
        Object.assign(existing, updates);
        existing.dateModified = new Date();
        const saved = await repo.save(existing);
        return reply.send(saved);
    });

    // DELETE /:id — delete order by uid
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
        if (!existing) return reply.status(404).send({ message: "Order not found" });
        await repo.deleteOne({ uid: existing.uid });
        return reply.status(200).send({});
    });

    // DELETE / — truncate all orders
    fastify.delete("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user || !UserUtils.hasRoles(request.user, trustedRoles)) {
            return reply.status(401).send({ message: "Unauthorized "});
        }
        const query = ModelUtils.buildSearchQuery(Order, repo, request.params, request.query);
        await repo.deleteMany(query);
        return reply.status(200).send({});
    });
}
