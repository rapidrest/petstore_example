///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import config from "./config.js";
import { createDataSource } from "../src/data-source.js";
import { createApp } from "../src/app.js";
import Pet, { PetStatus } from "../src/models/Pet.js";
import Category from "../src/models/Category.js";
import Tag from "../src/models/Tag.js";
import { DataSource, MongoRepository } from "typeorm";

const mongod = new MongoMemoryServer({
    instance: { port: 9999, dbName: "petstore_test" },
});

describe("Pet Tests", () => {
    let app: FastifyInstance;
    let dataSource: DataSource;
    let repo: MongoRepository<Pet>;
    let adminToken: string;

    const createPet = async (data?: any): Promise<Pet> => {
        const obj = new Pet({
            category: new Category({ name: "dog" }),
            name: "gigi",
            photoUrls: ["image1.jpg", "image2.jpg", "image3.jpg"],
            status: PetStatus.AVAILABLE,
            tags: [new Tag({ name: "friendly" }), new Tag({ name: "white" })],
            ...data,
        });
        return repo.save(obj);
    };

    const createPets = async (num: number, data?: any): Promise<Pet[]> => {
        const results: Pet[] = [];
        for (let i = 0; i < num; i++) {
            results.push(await createPet(data));
        }
        return results;
    };

    beforeAll(async () => {
        await mongod.start();
        dataSource = createDataSource(config);
        await dataSource.initialize();
        app = await createApp(config, dataSource);
        await app.ready();
        repo = dataSource.getMongoRepository(Pet);
        adminToken = (app as any).jwt.sign({
            uid: uuidv4(),
            roles: config.get("trusted_roles"),
        });
    });

    afterAll(async () => {
        await app.close();
        await dataSource.destroy();
        await mongod.stop();
    });

    beforeEach(async () => {
        try {
            await repo.clear();
        } catch (err: any) {
            if (err.message !== "ns not found") throw err;
        }
    });

    it("Can make count request.", async () => {
        const objs = await createPets(5);

        const response = await app.inject({
            method: "HEAD",
            url: "/pet",
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
            url: "/pet",
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

        const existing = await repo.findOne({ where: { uid: obj.uid } as any });
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
            url: `/pet/${obj.uid}`,
            headers: { authorization: `jwt ${adminToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);

        const count = await repo.count({ where: { uid: obj.uid } as any });
        expect(count).toBe(0);
    });

    it("Can make findAll request.", async () => {
        const objs = await createPets(5);

        const response = await app.inject({
            method: "GET",
            url: "/pet",
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
            url: `/pet/${obj.uid}`,
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
            url: "/pet",
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
            url: `/pet/${obj.uid}`,
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

        const existing = await repo.findOne({ where: { uid: obj.uid } as any });
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
