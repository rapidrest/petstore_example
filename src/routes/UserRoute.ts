///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import * as argon from "argon2";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import User from "../models/User.js";
import { ApiErrorMessages, ModelRoute, ObjectFactory, RepoUtils } from "@rapidrest/service-core";
import { ApiError, UserUtils } from "@rapidrest/core";

interface RouteOptions {
    config: any;
    objectFactory: ObjectFactory;
    logger: any;
}

export async function userRoutes(fastify: FastifyInstance, opts: RouteOptions): Promise<void> {
    const authenticate = (fastify as any).authenticate;
    class UserRoute extends ModelRoute<User> {
        get modelClass(): any {
            return User;
        }
        protected repoUtilsClass: any = RepoUtils<User>;
    }
    const modelRoute: UserRoute = await opts.objectFactory.newInstance(UserRoute, { name: "default" });
    const trustedRoles: [] = opts.config.get("trusted_roles");

    // GET + HEAD / — HEAD returns count in Content-Length, GET returns all users.
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

    // POST / — create user
    fastify.post("/", { preHandler: [] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await modelRoute.doValidate(request.body as any, { user: request.user as any });
            const obj = Array.isArray(request.body) ? request.body : [request.body];
            for (const user of obj) {
                if (user.password) {
                    user.password = await argon.hash(user.password);
                }
            }
            const result = await modelRoute.doCreate(request.body as any, { req: request as any, res: reply as any, user: request.user as any });
            reply.status(201).send(result);
        } catch (err: any) {
            reply.status(400).send(err);
        }
    });

    // GET /:id — find user by uid
    fastify.get("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as any;
            const result = await modelRoute.doFindById(id, { query: request.query, req: request as any, res: reply as any, user: request.user as any });
            reply.status(200).send(result);
        } catch (err: any) {
            reply.status(400).send(err);
        }
    });

    // PUT /:id — update user by uid
    fastify.put("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as any;
            const obj: any = request.body;
            await modelRoute.doValidate(obj, { user: request.user as any });

            // Only admins and the user itself can make changes
            const user = request.user as any;
            if (!UserUtils.hasRoles(request.user, trustedRoles) && (id !== user.uid || obj.uid !== user.uid)) {
                throw new ApiError(ApiErrorMessages.AUTH_PERMISSION_FAILURE, 403, ApiErrorMessages.AUTH_PERMISSION_FAILURE);
            }

            if (obj.password) {
                obj.password = await argon.hash(obj.password);
            }

            const result = await modelRoute.doUpdate(id, request.body as any, { req: request as any, res: reply as any, user: request.user as any });
            reply.status(200).send(result);
        } catch (err: any) {
            reply.status(400).send(err);
        }
    });

    // DELETE /:id — delete user by uid
    fastify.delete("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as any;
            await modelRoute.doDelete(id, { req: request as any, res: reply as any, user: request.user as any });
            reply.status(200).send();
        } catch (err: any) {
            reply.status(500).send(err);
        }
    });

    // DELETE / — truncate all users
    fastify.delete("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await modelRoute.doTruncate({ params: request.params, query: request.query, req: request as any, res: reply as any, user: request.user as any });
            reply.status(200).send();
        } catch (err: any) {
            reply.status(400).send(err);
        }
    });
}
