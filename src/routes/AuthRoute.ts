///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verify } from "argon2";
import User, { UserStatus } from "../models/User.js";
import { ObjectFactory, RepoUtils } from "@rapidrest/service-core";
import { JWTUtils } from "@rapidrest/core";

interface RouteOptions {
    config: any;
    objectFactory: ObjectFactory;
    logger: any;
}

async function extractBasicUser(request: FastifyRequest, reply: FastifyReply, userRepo: RepoUtils<User>): Promise<User | null> {
    const authHeader = request.headers.authorization ?? "";
    if (!authHeader.toLowerCase().startsWith("basic ")) {
        reply.status(401).send({ message: "Unauthorized" });
        return null;
    }
    const base64 = authHeader.slice(6).trim();
    const decoded = Buffer.from(base64, "base64").toString("utf-8");
    const colonIdx = decoded.indexOf(":");
    if (colonIdx < 0) {
        reply.status(401).send({ message: "Invalid credentials" });
        return null;
    }
    const username = decoded.slice(0, colonIdx);
    const password = decoded.slice(colonIdx + 1);

    const user = await userRepo.findOne(username);
    if (!user) {
        reply.status(401).send({ message: "Invalid credentials" });
        return null;
    }
    const valid = await verify(user.password, password);
    if (!valid) {
        reply.status(401).send({ message: "Invalid credentials" });
        return null;
    }
    return user;
}

export async function authRoutes(fastify: FastifyInstance, opts: RouteOptions): Promise<void> {
    const userRepo: RepoUtils<User> = await opts.objectFactory.newInstance(RepoUtils, { name: User.name, initialize: true, args: [User] });
    const authenticate = (fastify as any).authenticate;

    // GET /user/login — Basic auth → issue JWT
    fastify.get("/login", async (request: FastifyRequest, reply: FastifyReply) => {
        let user = await extractBasicUser(request, reply, userRepo);
        if (!user) return;

        user = await userRepo.update({
            uid: user.uid,
            version: user.version,
            userStatus: UserStatus.ONLINE,
            dateModified: new Date(),
        }, user, {
            ignoreACL: true,
            user
        });

        const token = await JWTUtils.createToken(opts.config.get("auth"), user);
        return reply.send({ token });
    });

    // GET /user/logout — JWT → set OFFLINE
    fastify.get("/logout", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        const payload = (request as any).user;
        const user = await userRepo.findOne(payload.uid);
        if (!user) return reply.status(404).send({ message: "User not found" });

        await userRepo.update({
            uid: user.uid,
            version: user.version,
            userStatus: UserStatus.OFFLINE,
            dateModified: new Date(),
        }, user, {
            ignoreACL: true,
            user
        });
        return reply.status(204).send();
    });
}
