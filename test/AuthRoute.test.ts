///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { FastifyInstance } from "fastify";
import { hash } from "argon2";
import config from "./config.js";
import { createApp } from "../src/app.js";
import User, { UserStatus } from "../src/models/User.js";
import { Logger } from "@rapidrest/core";
import { ACLRecord, ACLUtils, ConnectionManager, MongoConnection, MongoRepository, ObjectFactory } from "@rapidrest/service-core";
import { initDatabase } from "../src/database.js";

const mongod = new MongoMemoryServer({
    instance: { port: 9999, dbName: "petstore_test" },
});

describe("Auth Tests", () => {
    let app: FastifyInstance;
    const logger = Logger();
    const objectFactory = new ObjectFactory(config, logger);
    let aclRepo: MongoRepository<any>;
    let userRepo: MongoRepository<User>;

    const createUser = async function(data?: any): Promise<User> {
        const obj: User = new User({
            name: "tutone",
            firstName: "Tommy",
            lastName: "Tutone",
            email: "tommy.tutone@gmail.com",
            password: await hash("password"),
            phone: "555-867-5309",
            userStatus: UserStatus.OFFLINE,
            ...data
        });

        const result: User = await userRepo.save(obj);

        const records: ACLRecord[] = [];

        // Owner has CRUD access
        records.push({
            userOrRoleId: obj.uid,
            create: true,
            read: true,
            update: true,
            delete: true,
            special: false,
            full: false,
        });

        // Everyone has no access
        records.push({
            userOrRoleId: ".*",
            create: false,
            read: false,
            update: false,
            delete: false,
            special: false,
            full: false,
        });

        const acl: any = {
            uid: result.uid,
            dateCreated: new Date(),
            dateModified: new Date(),
            version: 0,
            records,
            parentUid: "User"
        };
        await aclRepo.save(acl);

        return result;
    }

    beforeAll(async () => {
        await mongod.start();
        await initDatabase(config, objectFactory, logger);
        await objectFactory.newInstance(ACLUtils, { name: "default" });
        app = await createApp(config, objectFactory, logger);
        await app.ready();
        
        const connMgr: ConnectionManager | undefined = objectFactory.getInstance(ConnectionManager);
        let conn: any = connMgr?.connections.get("acl");
        if (conn instanceof MongoConnection) {
            aclRepo = conn.getMongoRepository("AccessControlListMongo");
        }
        conn = connMgr?.connections.get("mongo");
        if (conn instanceof MongoConnection) {
            userRepo = conn.getMongoRepository("User");
        } else {
            throw new Error("Could not find user connection");
        }
    });

    afterAll(async () => {
        await app.close();
        await objectFactory.destroy();
        await mongod.stop();
    });

    beforeEach(async () => {
        try {
            await userRepo.clear();
        } catch (err: any) {
            if (err.message !== "ns not found") throw err;
        }
    });

    it("Can make login request.", async () => {
        const user = await createUser();
        const credentials = Buffer.from(`${user.name}:password`).toString("base64");

        const response = await app.inject({
            method: "GET",
            url: "/user/login",
            headers: { authorization: `basic ${credentials}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toHaveProperty("token");

        const existing = await userRepo.findOne({ where: { uid: user.uid } });
        if (existing) {
            expect(existing.userStatus).toEqual(UserStatus.ONLINE);
        }
    });

    it("Can make logout request.", async () => {
        const user = await createUser();
        const authToken = (app as any).jwt.sign({ uid: user.uid });

        const response = await app.inject({
            method: "GET",
            url: "/user/logout",
            headers: { authorization: `jwt ${authToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);

        const existing = await userRepo.findOne({ where: { uid: user.uid } });
        if (existing) {
            expect(existing.userStatus).toEqual(UserStatus.OFFLINE);
        }
    });
});
