///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import * as argon from "argon2";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import User from "../models/User.js";
import { ApiErrorMessages, CRUDRoute, ObjectFactory, RepoUtils } from "@rapidrest/service-core";
import { ApiError, UserUtils } from "@rapidrest/core";

interface RouteOptions {
    config: any;
    objectFactory: ObjectFactory;
    logger: any;
}

export async function userRoutes(fastify: FastifyInstance, opts: RouteOptions): Promise<void> {
    const authenticate = (fastify as any).authenticate;
    class UserRoute extends CRUDRoute<User> {
        get modelClass(): any {
            return User;
        }
        protected repoUtilsClass: any = RepoUtils<User>;
    }
    const crudRoute: UserRoute = await opts.objectFactory.newInstance(UserRoute, { name: "default" });
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

    // POST / — create user
    fastify.post("/", { preHandler: [] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const obj = Array.isArray(request.body) ? request.body : [request.body];
            for (const user of obj) {
                if (user.password) {
                    user.password = await argon.hash(user.password);
                }
            }
            const result = await crudRoute.create(request.body as any, request as any, request.user as any);
            reply.status(201).send(result);
        } catch (err: any) {
            reply.status(400).send(err);
        }
    });

    // GET /:id — find user by uid
    fastify.get("/:id", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id } = request.params as any;
            const result = await crudRoute.findById(id, request.query, request.user as any);
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

            // Only admins and the user itself can make changes
            const user = request.user as any;
            if (!UserUtils.hasRoles(request.user, trustedRoles) && (id !== user.uid || obj.uid !== user.uid)) {
                throw new ApiError(ApiErrorMessages.AUTH_PERMISSION_FAILURE, 403, ApiErrorMessages.AUTH_PERMISSION_FAILURE);
            }

            if (obj.password) {
                obj.password = await argon.hash(obj.password);
            }

            const result = await crudRoute.update(id, request.body as any, request as any, request.user as any);
            reply.status(200).send(result);
        } catch (err: any) {
            reply.status(400).send(err);
        }
    });

    // DELETE /:id — delete user by uid
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

    // DELETE / — truncate all users
    fastify.delete("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await crudRoute.truncate(request.params, request.query, request.user as any);
            reply.status(200).send();
        } catch (err: any) {
            reply.status(400).send(err);
        }
    });
}
