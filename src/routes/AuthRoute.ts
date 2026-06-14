///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verify } from "argon2";
import { DataSource } from "typeorm";
import User, { UserStatus } from "../models/User.js";

interface RouteOptions {
    dataSource: DataSource;
    config: any;
}

async function extractBasicUser(request: FastifyRequest, reply: FastifyReply, userRepo: any): Promise<User | null> {
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

    const user = await userRepo.findOne({ where: { name: username } as any });
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
    const userRepo = opts.dataSource.getMongoRepository(User);
    const authenticate = (fastify as any).authenticate;

    // GET /user/login — Basic auth → issue JWT
    fastify.get("/login", async (request: FastifyRequest, reply: FastifyReply) => {
        const user = await extractBasicUser(request, reply, userRepo);
        if (!user) return;

        user.userStatus = UserStatus.ONLINE;
        user.dateModified = new Date();
        await userRepo.save(user);

        const token = (fastify as any).jwt.sign({
            uid: user.uid,
            name: user.name,
            email: user.email,
            roles: user.roles,
        });
        return reply.send({ token });
    });

    // GET /user/logout — JWT → set OFFLINE
    fastify.get("/logout", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
        const payload = (request as any).user;
        const user = await userRepo.findOne({ where: { uid: payload.uid } });
        if (!user) return reply.status(404).send({ message: "User not found" });

        user.userStatus = UserStatus.OFFLINE;
        user.dateModified = new Date();
        await userRepo.save(user);
        return reply.send({});
    });
}
