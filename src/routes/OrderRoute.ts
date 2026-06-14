///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { DataSource } from "typeorm";
import Order from "../models/Order.js";

interface RouteOptions {
    dataSource: DataSource;
    config: any;
}

export async function orderRoutes(fastify: FastifyInstance, opts: RouteOptions): Promise<void> {
    const repo = opts.dataSource.getMongoRepository(Order);
    const authenticate = (fastify as any).authenticate;

    // GET + HEAD / — HEAD returns count in Content-Length, GET returns all orders.
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
            const orders = await repo.find();
            return reply.send(orders);
        },
    });

    // POST / — create order
    fastify.post("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        const order = new Order(request.body as any);
        const saved = await repo.save(order);
        return reply.status(201).send(saved);
    });

    // GET /:id — find order by uid
    fastify.get("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as any;
        const order = await repo.findOne({ where: { uid: id } });
        if (!order) return reply.status(404).send({ message: "Order not found" });
        return reply.send(order);
    });

    // PUT /:id — update order by uid
    fastify.put("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as any;
        const existing = await repo.findOne({ where: { uid: id } });
        if (!existing) return reply.status(404).send({ message: "Order not found" });

        const { _id, ...updates } = request.body as any;
        Object.assign(existing, updates);
        existing.dateModified = new Date();
        const saved = await repo.save(existing);
        return reply.send(saved);
    });

    // DELETE /:id — delete order by uid
    fastify.delete("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as any;
        await repo.deleteOne({ uid: id });
        return reply.status(200).send({});
    });

    // DELETE / — truncate all orders
    fastify.delete("/", { preHandler: [authenticate] }, async (_request: FastifyRequest, reply: FastifyReply) => {
        await repo.deleteMany({});
        return reply.status(200).send({});
    });
}
