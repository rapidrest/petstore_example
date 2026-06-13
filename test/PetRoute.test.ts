///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import { sign } from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import supertest from "supertest";
import { DataSource } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import config from "./config.js";
import { createApp } from "../src/app.js";
import { createDataSource } from "../src/data-source.js";
import Pet, { PetStatus } from "../src/models/Pet.js";
import Category from "../src/models/Category.js";
import Tag from "../src/models/Tag.js";

const mongod = new MongoMemoryServer({
    instance: { port: 9999, dbName: "petstore_test" },
});

describe("Pet Tests", () => {
    let dataSource: DataSource;
    let app: ReturnType<typeof createApp>;
    let repo: ReturnType<typeof dataSource.getMongoRepository<Pet>>;

    const jwtConfig = config.get("auth");
    const trustedRoles: string[] = config.get("trusted_roles");

    const makeToken = (payload: any) =>
        sign(payload, jwtConfig.secret, {
            expiresIn: jwtConfig.options.expiresIn,
            audience: jwtConfig.options.audience,
            issuer: jwtConfig.options.issuer,
        });

    const adminToken = makeToken({ uid: uuidv4(), name: "admin", roles: trustedRoles });

    const createPet = async (data?: any): Promise<Pet> => {
        const pet = new Pet({
            category: new Category({ name: "dog" }),
            name: "gigi",
            photoUrls: ["image1.jpg", "image2.jpg", "image3.jpg"],
            status: PetStatus.AVAILABLE,
            tags: [new Tag({ name: "friendly" }), new Tag({ name: "white" })],
            ...data,
        });
        return repo.save(pet);
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
        app = createApp(config, dataSource);
        repo = dataSource.getMongoRepository(Pet);
    });

    afterAll(async () => {
        await dataSource.destroy();
        await mongod.stop();
    });

    beforeEach(async () => {
        try {
            await repo.deleteMany({});
        } catch {
            // ignore "ns not found" on first run
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

        const existing = await repo.findOne({ where: { name: obj.name } as any });
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

        const existing = await repo.findOne({ where: { uid: obj.uid } as any });
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

        const existing = await repo.findOne({ where: { uid: obj.uid } as any });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.status).toEqual(PetStatus.ADOPTED);
        }
    });
});
