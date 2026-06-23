///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import express from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import supertest from "supertest";
import { v4 as uuidv4 } from "uuid";
import config from "./config.js";
import { createApp } from "../src/app.js";
import Pet, { PetStatus } from "../src/models/Pet.js";
import Category from "../src/models/Category.js";
import Tag from "../src/models/Tag.js";
import { ACLRecord, ACLUtils, ConnectionManager, MongoConnection, MongoRepository, ObjectFactory } from "@rapidrest/service-core";
import { initDatabase } from "../src/database.js";
import { JWTUtils, Logger } from "@rapidrest/core";

const mongod = new MongoMemoryServer({
    instance: { port: 9999, dbName: "petstore_test" },
});

describe("Pet Tests", () => {
    let app: express.Application;
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
        await objectFactory.destroy();
        await mongod.stop();
    }, 30000);

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

        const result = await supertest(app).head("/pet");

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.headers).toHaveProperty("content-length");
        expect(result.headers["content-length"]).toBe(objs.length.toString());
    });

    it("Can make create request.", async () => {
        const obj = new Pet({
            category: new Category({ name: "dog" }),
            name: "rex",
            photoUrls: ["image1.jpg", "image2.jpg", "image3.jpg"],
            status: PetStatus.AVAILABLE,
            tags: [new Tag({ name: "timid" }), new Tag({ name: "black" })],
        });

        const result = await supertest(app)
            .post("/pet")
            .set("Authorization", `jwt ${adminToken}`)
            .send(obj);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body.name).toEqual(obj.name);
        expect(result.body.status).toEqual(obj.status);
        expect(result.body.photoUrls).toEqual(obj.photoUrls);

        const existing = await repo.findOne({ where: { name: obj.name } });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.name).toEqual(obj.name);
            expect(existing.status).toEqual(obj.status);
        }
    });

    it("Can make delete request.", async () => {
        const obj = await createPet();

        const result = await supertest(app)
            .delete(`/pet/${obj.uid}`)
            .set("Authorization", `jwt ${adminToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);

        const existing = await repo.findOne({ where: { uid: obj.uid } });
        expect(existing).toBeNull();
    });

    it("Can make findAll request.", async () => {
        const objs = await createPets(5);

        const result = await supertest(app).get("/pet");

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body).toHaveLength(objs.length);
    });

    it("Can make findById request.", async () => {
        const obj = await createPet();

        const result = await supertest(app).get(`/pet/${obj.uid}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body.name).toEqual(obj.name);
        expect(result.body.status).toEqual(obj.status);
        expect(result.body.photoUrls).toEqual(obj.photoUrls);
    });

    it("Can make truncate request.", async () => {
        await createPets(5);
        expect(await repo.count()).toBe(5);

        const result = await supertest(app)
            .delete("/pet")
            .set("Authorization", `jwt ${adminToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(await repo.count()).toBe(0);
    });

    it("Can make update request.", async () => {
        const obj = await createPet();
        obj.status = PetStatus.ADOPTED;

        const result = await supertest(app)
            .put(`/pet/${obj.uid}`)
            .set("Authorization", `jwt ${adminToken}`)
            .send(obj);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body.name).toEqual(obj.name);
        expect(result.body.status).toEqual(obj.status);

        const existing = await repo.findOne({ where: { uid: obj.uid } });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.status).toEqual(PetStatus.ADOPTED);
        }
    });
});
