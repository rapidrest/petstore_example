///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import Order from "../models/Order.js";
import { CRUDRoute, ObjectFactory, RepoUtils } from "@rapidrest/service-core";

interface RouteOptions {
    config: any;
    objectFactory: ObjectFactory;
    logger: any;
}

export async function orderRoutes(fastify: FastifyInstance, opts: RouteOptions): Promise<void> {
    const authenticate = (fastify as any).authenticate;
    class OrderRoute extends CRUDRoute<Order> {
        get modelClass(): any {
            return Order;
        }
        protected repoUtilsClass: any = RepoUtils<Order>;
    }
    const crudRoute: OrderRoute = await opts.objectFactory.newInstance(OrderRoute, { name: "default" });

    // GET + HEAD / — HEAD returns count in Content-Length, GET returns all orders.
    // Combined to prevent Fastify auto-HEAD from overriding the explicit HEAD handler.
    fastify.route({
        method: ["GET", "HEAD"],
        url: "/",
        preHandler: [authenticate],
        handler: async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                if (request.method === "HEAD") {
                    let countValue = 0;
                    const fakeRes: any = {
                        setHeader(name: string, value: any) {
                            if (name === "content-length") countValue = Number(value);
                        },
                        status(_code: number) { return this; },
                    };
                    await crudRoute.count(request.params, request.query, fakeRes, request.user as any);
                    reply.hijack();
                    reply.raw.setHeader("content-length", String(countValue));
                    reply.raw.statusCode = 200;
                    reply.raw.end();
                    return;
                } else {
                    const result = await crudRoute.find(request.params, request.query, request.user as any);
                    reply.status(200).send(result);
                }
            } catch (err: any) {
                reply.status(500).send(err);
            }
        },
    });

    // POST / — create order
    fastify.post("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const result = await crudRoute.create(request.body as any, request as any, request.user as any);
            reply.status(201).send(result);
        } catch (err: any) {
            reply.status(400).send(err);
        }
    });

    // GET /:id — find order by uid
    fastify.get("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as any;
            const result = await crudRoute.findById(id, request.query, request.user as any);
            reply.status(200).send(result);
        } catch (err: any) {
            reply.status(400).send(err);
        }
    });

    // PUT /:id — update order by uid
    fastify.put("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as any;
            const result = await crudRoute.update(id, request.body as any, request as any, request.user as any);
            reply.status(200).send(result);
        } catch (err: any) {
            reply.status(400).send(err);
        }
    });

    // DELETE /:id — delete order by uid
    fastify.delete("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as any;
            const { purge, version } = request.query as any;
            await crudRoute.delete(id, version, purge, request as any, request.user as any);
            reply.status(200).send();
        } catch (err: any) {
            reply.status(500).send(err);
        }
    });

    // DELETE / — truncate all orders
    fastify.delete("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await crudRoute.truncate(request.params, request.query, request.user as any);
            reply.status(200).send();
        } catch (err: any) {
            reply.status(400).send(err);
        }
    });
}
