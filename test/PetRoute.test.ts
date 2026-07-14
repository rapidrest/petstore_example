///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import config from "./config.js";
import { createApp } from "../src/app.js";
import Pet, { PetStatus } from "../src/models/Pet.js";
import Category from "../src/models/Category.js";
import Tag from "../src/models/Tag.js";
import { JWTUtils, Logger } from "@rapidrest/core";
import { ACLRecord, ACLUtils, ConnectionManager, MongoConnection, MongoRepository, ObjectFactory } from "@rapidrest/service-core";
import { initDatabase } from "../src/database.js";

const mongod = new MongoMemoryServer({
    instance: { port: 9999, dbName: "petstore_test" },
});

describe("Pet Tests", () => {
    let app: FastifyInstance;
    const logger = Logger();
    const objectFactory = new ObjectFactory(config, logger);
    let repo: MongoRepository<Pet>;
    let aclRepo: MongoRepository<any>;

    const jwtConfig = config.get("auth");
    const trustedRoles: string[] = config.get("trusted_roles");

    const admin: any = { uid: uuidv4(), name: "admin", roles: trustedRoles };
    const adminToken = JWTUtils.createTokenSync(config.get("auth"), admin);
    let user: any;
    let userToken: string;

    const createPet = async function(data?: any): Promise<Pet> {
        const obj: Pet = new Pet({
            category: new Category({
                name: "dog"
            }),
            name: "gigi",
            photoUrls: ["image1.jpg", "image2.jpg", "image3.jpg"],
            status: PetStatus.AVAILABLE,
            tags: [new Tag({ name: "friendly" }), new Tag({ name: "white" })],
            ...data
        });

        const result: Pet = await repo.save(obj);

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
            parentUid: "Pet"
        };
        await aclRepo.save(acl);

        return result;
    }

    const createPets = async function(num: number, data?: any): Promise<Pet[]> {
        const results: Pet[] = [];

        for (let i = 0; i < num; i++) {
            results.push(await createPet(data));
        }

        return results;
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
            repo = conn.getMongoRepository("Pet");
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
        const objs = await createPets(5);

        const response = await app.inject({
            method: "HEAD",
            url: "/api/pet",
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        expect(response.headers).toHaveProperty("content-length");
        expect(response.headers["content-length"]).toBe(objs.length.toString());
    });

    it("Can make create request.", async () => {
        const obj = new Pet({
            category: new Category({ name: "dog" }),
            name: "rex",
            photoUrls: ["image1.jpg", "image2.jpg", "image3.jpg"],
            status: PetStatus.AVAILABLE,
            tags: [new Tag({ name: "timid" }), new Tag({ name: "black" })],
        });

        const response = await app.inject({
            method: "POST",
            url: "/api/pet",
            headers: { authorization: `jwt ${adminToken}` },
            payload: obj,
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toBeDefined();
        expect(body.category).toEqual(obj.category);
        expect(body.name).toEqual(obj.name);
        expect(body.photoUrls).toEqual(obj.photoUrls);
        expect(body.status).toEqual(obj.status);
        expect(body.tags).toEqual(obj.tags);

        const existing = await repo.findOne({ where: { uid: obj.uid } });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.category).toEqual(obj.category);
            expect(existing.name).toEqual(obj.name);
            expect(existing.photoUrls).toEqual(obj.photoUrls);
            expect(existing.status).toEqual(obj.status);
            expect(existing.tags).toEqual(obj.tags);
        }
    });

    it("Can make delete request.", async () => {
        const obj = await createPet();

        const response = await app.inject({
            method: "DELETE",
            url: `/api/pet/${obj.uid}`,
            headers: { authorization: `jwt ${adminToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);

        const count = await repo.count({ uid: obj.uid });
        expect(count).toBe(0);
    });

    it("Can make findAll request.", async () => {
        const objs = await createPets(5);

        const response = await app.inject({
            method: "GET",
            url: "/api/pet",
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toHaveLength(objs.length);
    });

    it("Can make findById request.", async () => {
        const obj = await createPet();

        const response = await app.inject({
            method: "GET",
            url: `/api/pet/${obj.uid}`,
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toBeDefined();
        expect(body.category).toEqual(obj.category);
        expect(body.name).toEqual(obj.name);
        expect(body.photoUrls).toEqual(obj.photoUrls);
        expect(body.status).toEqual(obj.status);
        expect(body.tags).toEqual(obj.tags);
    });

    it("Can make truncate request.", async () => {
        const objs = await createPets(5);
        let count = await repo.count();
        expect(count).toBe(objs.length);

        const response = await app.inject({
            method: "DELETE",
            url: "/api/pet",
            headers: { authorization: `jwt ${adminToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);

        count = await repo.count();
        expect(count).toBe(0);
    });

    it("Can make update request.", async () => {
        const obj = await createPet();
        obj.status = PetStatus.ADOPTED;

        const response = await app.inject({
            method: "PUT",
            url: `/api/pet/${obj.uid}`,
            headers: { authorization: `jwt ${adminToken}` },
            payload: obj,
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toBeDefined();
        expect(body.category).toEqual(obj.category);
        expect(body.name).toEqual(obj.name);
        expect(body.photoUrls).toEqual(obj.photoUrls);
        expect(body.status).toEqual(obj.status);
        expect(body.tags).toEqual(obj.tags);

        const existing = await repo.findOne({ uid: obj.uid });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.category).toEqual(obj.category);
            expect(existing.name).toEqual(obj.name);
            expect(existing.photoUrls).toEqual(obj.photoUrls);
            expect(existing.status).toEqual(obj.status);
            expect(existing.tags).toEqual(obj.tags);
        }
    });
});
