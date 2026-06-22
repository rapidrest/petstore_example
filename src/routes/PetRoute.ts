///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import Pet from "../models/Pet.js";
import { ModelRoute, ObjectFactory, RepoUtils } from "@rapidrest/service-core";

interface RouteOptions {
    config: any;
    objectFactory: ObjectFactory;
    logger: any;
}

export async function petRoutes(fastify: FastifyInstance, opts: RouteOptions): Promise<void> {
    const authenticate = (fastify as any).authenticate;
    class PetRoute extends ModelRoute<Pet> {
        get modelClass(): any {
            return Pet;
        }
        protected repoUtilsClass: any = RepoUtils<Pet>;
    }
    const modelRoute: PetRoute = await opts.objectFactory.newInstance(PetRoute, { name: "default" });

    // GET + HEAD / — HEAD returns count in Content-Length, GET returns all pets.
    // Combined to prevent Fastify auto-HEAD from overriding the explicit HEAD handler.
    fastify.route({
        method: ["GET", "HEAD"],
        url: "/",
        preHandler: [],
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
                    await modelRoute.doCount({ query: request.query, req: request as any, res: fakeRes, user: request.user as any });
                    reply.hijack();
                    reply.raw.setHeader("content-length", String(countValue));
                    reply.raw.statusCode = 200;
                    reply.raw.end();
                    return;
                } else {
                    const result = await modelRoute.doFindAll({ query: request.query, req: request as any, res: reply as any, user: request.user as any });
                    reply.status(200).send(result);
                }
            } catch (err: any) {
                reply.status(500).send(err);
            }
        },
    });

    // POST / — create pet
    fastify.post("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const result = await modelRoute.doCreate(request.body as any, { req: request as any, res: reply as any, user: request.user as any });
            reply.status(201).send(result);
        } catch (err: any) {
            reply.status(400).send(err);
        }
    });

    // GET /:id — find pet by uid
    fastify.get("/:id", {}, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as any;
            const result = await modelRoute.doFindById(id, { query: request.query, req: request as any, res: reply as any, user: request.user as any });
            reply.status(200).send(result);
        } catch (err: any) {
            reply.status(400).send(err);
        }
    });

    // PUT /:id — update pet by uid
    fastify.put("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as any;
            const result = await modelRoute.doUpdate(id, request.body as any, { req: request as any, res: reply as any, user: request.user as any });
            reply.status(200).send(result);
        } catch (err: any) {
            reply.status(400).send(err);
        }
    });

    // DELETE /:id — delete pet by uid
    fastify.delete("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as any;
            await modelRoute.doDelete(id, { req: request as any, res: reply as any, user: request.user as any });
            reply.status(200).send();
        } catch (err: any) {
            reply.status(500).send(err);
        }
    });

    // DELETE / — truncate all pets
    fastify.delete("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await modelRoute.doTruncate({ params: request.params, query: request.query, req: request as any, res: reply as any, user: request.user as any });
            reply.status(200).send();
        } catch (err: any) {
            reply.status(400).send(err);
        }
    });
}
