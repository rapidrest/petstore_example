///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { hash } from "argon2";
import { v4 as uuidv4 } from "uuid";
import config from "./config.js";
import { GET, HEAD, POST, DELETE } from "../app/api/user/route.js";
import { GET as getById, PUT, DELETE as deleteById } from "../app/api/user/[id]/route.js";
import User, { UserStatus } from "../src/models/User.js";
import { ACLRecord, ACLUtils, ConnectionManager, MongoConnection, MongoRepository, ObjectFactory } from "@rapidrest/service-core";
import { JWTUtils, Logger } from "@rapidrest/core";
import { initDatabase } from "../src/database.js";
import { inject, setupGlobals, teardownGlobals } from "./helpers.js";

const mongod = new MongoMemoryServer({
    instance: { port: 9999, dbName: "petstore_test" },
});

describe("User Tests", () => {
    const logger = Logger();
    const objectFactory = new ObjectFactory(config, logger);
    let repo: MongoRepository<User>;
    let aclRepo: MongoRepository<any>;

    const trustedRoles: string[] = config.get("trusted_roles");
    const admin: any = { uid: uuidv4(), name: "admin", roles: trustedRoles };
    const adminToken = JWTUtils.createTokenSync(config.get("auth"), admin);
    let user: any;
    let userToken: string;

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

        const result: User = await repo.save(obj);

        const records: ACLRecord[] = [];
        records.push({
            userOrRoleId: user.uid,
            create: true,
            read: true,
            update: true,
            delete: true,
            special: false,
            full: false,
        });
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
    };

    const createUsers = async function(num: number, data?: any): Promise<User[]> {
        const results: User[] = [];
        for (let i = 0; i < num; i++) {
            results.push(await createUser({
                name: `${data?.name || "tutone"}#${i}`,
                ...data
            }));
        }
        return results;
    };

    beforeAll(async () => {
        await mongod.start();
        const testDatastores = {
            acl: { type: "mongodb", url: "mongodb://localhost:9999/acls", synchronize: true },
            mongo: { type: "mongodb", url: "mongodb://localhost:9999/petstore_test" },
        };
        await initDatabase(config, objectFactory, logger, testDatastores);
        await objectFactory.newInstance(ACLUtils, { name: "default" });
        setupGlobals(objectFactory, logger);

        const connMgr: ConnectionManager | undefined = objectFactory.getInstance(ConnectionManager);
        let conn: any = connMgr?.connections.get("acl");
        if (conn instanceof MongoConnection) {
            aclRepo = conn.getMongoRepository("AccessControlListMongo");
        }
        conn = connMgr?.connections.get("mongo");
        if (conn instanceof MongoConnection) {
            repo = conn.getMongoRepository("User");
        } else {
            throw new Error("Could not find user connection");
        }
    });

    afterAll(async () => {
        teardownGlobals();
        await objectFactory.destroy();
        await mongod.stop();
    });

    beforeEach(async () => {
        user = { uid: uuidv4(), name: "user", roles: [] };
        userToken = JWTUtils.createTokenSync(config.get("auth"), user);
        try {
            await repo.clear();
        } catch (err: any) {
            if (err.message !== "ns not found") throw err;
        }
    });

    it("Can make count request.", async () => {
        const objs = await createUsers(5);

        const response = await inject(HEAD, {
            method: "HEAD",
            url: "/api/user",
            headers: { authorization: `jwt ${adminToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        expect(response.headers).toHaveProperty("content-length");
        expect(response.headers["content-length"]).toBe(objs.length.toString());
    });

    it("Can make create request.", async () => {
        const obj = new User({
            name: "tutone",
            firstName: "Tommy",
            lastName: "Tutone",
            email: "tommy.tutone@gmail.com",
            password: await hash("password"),
            phone: "555-867-5309",
            userStatus: UserStatus.OFFLINE,
        });

        const response = await inject(POST, {
            method: "POST",
            url: "/api/user",
            payload: obj,
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toBeDefined();
        expect(body.name).toEqual(obj.name);
        expect(body.firstName).toEqual(obj.firstName);
        expect(body.lastName).toEqual(obj.lastName);
        expect(body.email).toEqual(obj.email);
        expect(body.phone).toEqual(obj.phone);
        expect(body.userStatus).toEqual(obj.userStatus);

        const existing = await repo.findOne({ where: { uid: obj.uid } });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.name).toEqual(obj.name);
            expect(existing.firstName).toEqual(obj.firstName);
            expect(existing.lastName).toEqual(obj.lastName);
            expect(existing.email).toEqual(obj.email);
            expect(existing.phone).toEqual(obj.phone);
            expect(existing.userStatus).toEqual(obj.userStatus);
        }
    });

    it("Can make delete request.", async () => {
        const obj = await createUser();

        const response = await inject(deleteById, {
            method: "DELETE",
            url: `/api/user/${obj.uid}`,
            headers: { authorization: `jwt ${adminToken}` },
            params: { id: obj.uid },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);

        const count = await repo.count({ uid: obj.uid });
        expect(count).toBe(0);
    });

    it("Can make findAll request.", async () => {
        const objs = await createUsers(5);

        const response = await inject(GET, {
            method: "GET",
            url: "/api/user",
            headers: { authorization: `jwt ${adminToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toHaveLength(objs.length);
    });

    it("Can make findById request.", async () => {
        const obj = await createUser();

        const response = await inject(getById, {
            method: "GET",
            url: `/api/user/${obj.uid}`,
            headers: { authorization: `jwt ${adminToken}` },
            params: { id: obj.uid },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toBeDefined();
        expect(body.name).toEqual(obj.name);
        expect(body.firstName).toEqual(obj.firstName);
        expect(body.lastName).toEqual(obj.lastName);
        expect(body.email).toEqual(obj.email);
        expect(body.phone).toEqual(obj.phone);
        expect(body.userStatus).toEqual(obj.userStatus);
    });

    it("Can make truncate request.", async () => {
        const objs = await createUsers(5);
        let count = await repo.count();
        expect(count).toBe(objs.length);

        const response = await inject(DELETE, {
            method: "DELETE",
            url: "/api/user",
            headers: { authorization: `jwt ${adminToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);

        count = await repo.count();
        expect(count).toBe(0);
    });

    it("Can make update request.", async () => {
        const obj = await createUser();
        obj.phone = "818-867-5309";

        const response = await inject(PUT, {
            method: "PUT",
            url: `/api/user/${obj.uid}`,
            headers: { authorization: `jwt ${adminToken}` },
            payload: obj,
            params: { id: obj.uid },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toBeDefined();
        expect(body.name).toEqual(obj.name);
        expect(body.firstName).toEqual(obj.firstName);
        expect(body.lastName).toEqual(obj.lastName);
        expect(body.email).toEqual(obj.email);
        expect(body.phone).toEqual(obj.phone);
        expect(body.userStatus).toEqual(obj.userStatus);

        const existing = await repo.findOne({ uid: obj.uid });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.name).toEqual(obj.name);
            expect(existing.firstName).toEqual(obj.firstName);
            expect(existing.lastName).toEqual(obj.lastName);
            expect(existing.email).toEqual(obj.email);
            expect(existing.phone).toEqual(obj.phone);
            expect(existing.userStatus).toEqual(obj.userStatus);
        }
    });
});
