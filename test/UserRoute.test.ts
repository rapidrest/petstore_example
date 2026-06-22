///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import { hash } from "argon2";
import express from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import supertest from "supertest";
import { v4 as uuidv4 } from "uuid";
import config from "./config.js";
import { createApp } from "../src/app.js";
import User, { UserStatus } from "../src/models/User.js";
import { JWTUtils, Logger } from "@rapidrest/core";
import { ACLRecord, ACLUtils, ConnectionManager, MongoConnection, MongoRepository, ObjectFactory } from "@rapidrest/service-core";
import { initDatabase } from "../src/database.js";

const mongod = new MongoMemoryServer({
    instance: { port: 9999, dbName: "petstore_test" },
});

describe("User Tests", () => {
    let app: express.Application;
    const logger = Logger();
    const objectFactory = new ObjectFactory(config, logger);
    let repo: MongoRepository<User>;
    let aclRepo: MongoRepository<any>;

    const jwtConfig = config.get("auth");
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

        // Owner has CRUD access
        records.push({
            userOrRoleId: user.uid,
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

    const createUsers = async function(num: number, data?: any): Promise<User[]> {
        const results: User[] = [];

        for (let i = 0; i < num; i++) {
            results.push(await createUser({
                name: `${data?.name || "tutone"}#${i}`,
                ...data
            }));
        }

        return results;
    }

    beforeAll(async () => {
        await mongod.start();
        await initDatabase(config, objectFactory, logger);
        await objectFactory.newInstance(ACLUtils, { name: "default" });
        app = await createApp(config, objectFactory, logger);

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
        await mongod.stop();
        await objectFactory.destroy();
    });

    beforeEach(async () => {
        user = { uid: uuidv4(), name: "user", roles: [] };
        userToken = JWTUtils.createTokenSync(config.get("auth"), user);

        try {
            await repo.clear();
        } catch (err: any) {
            // The error "ns not found" occurs when the collection doesn't exist yet. We can ignore this error.
            if (err.message !== "ns not found") {
                throw err;
            }
        }
    });

    it("Can make count request.", async () => {
        const objs = await createUsers(5);

        const result = await supertest(app)
            .head("/user")
            .set("Authorization", `jwt ${adminToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.headers).toHaveProperty("content-length");
        expect(result.headers["content-length"]).toBe(objs.length.toString());
    });

    it("Can make create request.", async () => {
        const obj = new User({
            name: "tutone",
            firstName: "Tommy",
            lastName: "Tutone",
            email: "tommy.tutone@gmail.com",
            password: "password",
            phone: "555-867-5309",
            userStatus: UserStatus.OFFLINE,
        });

        const result = await supertest(app).post("/user").send(obj);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body.name).toEqual(obj.name);
        expect(result.body.firstName).toEqual(obj.firstName);
        expect(result.body.lastName).toEqual(obj.lastName);
        expect(result.body.email).toEqual(obj.email);
        expect(result.body.phone).toEqual(obj.phone);
        expect(result.body.userStatus).toEqual(obj.userStatus);

        const existing = await repo.findOne({ where: { name: obj.name } });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.name).toEqual(obj.name);
            expect(existing.email).toEqual(obj.email);
        }
    });

    it("Can make delete request.", async () => {
        const obj = await createUser();

        const result = await supertest(app)
            .delete(`/user/${obj.uid}`)
            .set("Authorization", `jwt ${adminToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);

        const existing = await repo.findOne({ where: { uid: obj.uid } });
        expect(existing).toBeNull();
    });

    it("Can make findAll request.", async () => {
        const objs = await createUsers(5);

        const result = await supertest(app)
            .get("/user")
            .set("Authorization", `jwt ${adminToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body).toHaveLength(objs.length);
    });

    it("Can make findById request.", async () => {
        const obj = await createUser();

        const result = await supertest(app)
            .get(`/user/${obj.uid}`)
            .set("Authorization", `jwt ${adminToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body.name).toEqual(obj.name);
        expect(result.body.firstName).toEqual(obj.firstName);
        expect(result.body.lastName).toEqual(obj.lastName);
        expect(result.body.email).toEqual(obj.email);
        expect(result.body.phone).toEqual(obj.phone);
        expect(result.body.userStatus).toEqual(obj.userStatus);
    });

    it("Can make truncate request.", async () => {
        await createUsers(5);
        expect(await repo.count()).toBe(5);

        const result = await supertest(app)
            .delete("/user")
            .set("Authorization", `jwt ${adminToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(await repo.count()).toBe(0);
    });

    it("Can make update request.", async () => {
        const obj = await createUser();
        obj.phone = "818-867-5309";

        const result = await supertest(app)
            .put(`/user/${obj.uid}`)
            .set("Authorization", `jwt ${adminToken}`)
            .send(obj);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body.name).toEqual(obj.name);
        expect(result.body.phone).toEqual(obj.phone);
        expect(result.body.userStatus).toEqual(obj.userStatus);

        const existing = await repo.findOne({ where: { uid: obj.uid } });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.phone).toEqual(obj.phone);
        }
    });
});
