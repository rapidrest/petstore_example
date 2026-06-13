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
import Order, { OrderStatus } from "../src/models/Order.js";
import Pet from "../src/models/Pet.js";

const mongod = new MongoMemoryServer({
    instance: { port: 9999, dbName: "petstore_test" },
});

describe("Order Tests", () => {
    let dataSource: DataSource;
    let app: ReturnType<typeof createApp>;
    let repo: ReturnType<typeof dataSource.getMongoRepository<Order>>;
    let petRepo: ReturnType<typeof dataSource.getMongoRepository<Pet>>;

    const jwtConfig = config.get("auth");
    const trustedRoles: string[] = config.get("trusted_roles");

    const makeToken = (payload: any) =>
        sign(payload, jwtConfig.secret, {
            expiresIn: jwtConfig.options.expiresIn,
            audience: jwtConfig.options.audience,
            issuer: jwtConfig.options.issuer,
        });

    const adminToken = makeToken({ uid: uuidv4(), name: "admin", roles: trustedRoles });
    let userToken: string;

    const createPet = async (data?: any): Promise<Pet> => {
        const pet = new Pet({ name: "gigi", ...data });
        return petRepo.save(pet);
    };

    const createOrder = async (data?: any): Promise<Order> => {
        const petId = data?.petId ?? (await createPet()).uid;
        const order = new Order({
            petId,
            quantity: 1,
            shipDate: new Date(),
            status: OrderStatus.PLACED,
            complete: false,
            ...data,
        });
        return repo.save(order);
    };

    const createOrders = async (num: number, data?: any): Promise<Order[]> => {
        const results: Order[] = [];
        for (let i = 0; i < num; i++) {
            results.push(await createOrder(data));
        }
        return results;
    };

    beforeAll(async () => {
        await mongod.start();
        dataSource = createDataSource(config);
        await dataSource.initialize();
        app = createApp(config, dataSource);
        repo = dataSource.getMongoRepository(Order);
        petRepo = dataSource.getMongoRepository(Pet);
    });

    afterAll(async () => {
        await dataSource.destroy();
        await mongod.stop();
    });

    beforeEach(async () => {
        userToken = makeToken({ uid: uuidv4(), name: "user", roles: [] });
        try {
            await repo.deleteMany({});
            await petRepo.deleteMany({});
        } catch {
            // ignore "ns not found" on first run
        }
    });

    it("Can make count request.", async () => {
        const objs = await createOrders(5);

        const result = await supertest(app)
            .head("/store/order")
            .set("Authorization", `jwt ${adminToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.headers).toHaveProperty("content-length");
        expect(result.headers["content-length"]).toBe(objs.length.toString());
    });

    it("Can make create request.", async () => {
        const pet = await createPet();
        const obj = new Order({ petId: pet.uid, quantity: 1 });

        const result = await supertest(app)
            .post("/store/order")
            .set("Authorization", `jwt ${userToken}`)
            .send(obj);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body.petId).toEqual(obj.petId);
        expect(result.body.quantity).toEqual(obj.quantity);
        expect(result.body.status).toEqual(obj.status);
        expect(result.body.complete).toEqual(obj.complete);

        const existing = await repo.findOne({ where: { petId: pet.uid } as any });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.petId).toEqual(obj.petId);
            expect(existing.quantity).toEqual(obj.quantity);
        }
    });

    it("Can make delete request.", async () => {
        const obj = await createOrder();

        const result = await supertest(app)
            .delete(`/store/order/${obj.uid}`)
            .set("Authorization", `jwt ${adminToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);

        const existing = await repo.findOne({ where: { uid: obj.uid } as any });
        expect(existing).toBeNull();
    });

    it("Can make findAll request.", async () => {
        const objs = await createOrders(5);

        const result = await supertest(app)
            .get("/store/order")
            .set("Authorization", `jwt ${adminToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body).toHaveLength(objs.length);
    });

    it("Can make findById request.", async () => {
        const obj = await createOrder();

        const result = await supertest(app)
            .get(`/store/order/${obj.uid}`)
            .set("Authorization", `jwt ${adminToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body.petId).toEqual(obj.petId);
        expect(result.body.quantity).toEqual(obj.quantity);
        expect(result.body.status).toEqual(obj.status);
        expect(result.body.complete).toEqual(obj.complete);
    });

    it("Can make truncate request.", async () => {
        await createOrders(5);
        expect(await repo.count()).toBe(5);

        const result = await supertest(app)
            .delete("/store/order")
            .set("Authorization", `jwt ${adminToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(await repo.count()).toBe(0);
    });

    it("Can make update request.", async () => {
        const obj = await createOrder();
        obj.quantity = 2;

        const result = await supertest(app)
            .put(`/store/order/${obj.uid}`)
            .set("Authorization", `jwt ${adminToken}`)
            .send(obj);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body.petId).toEqual(obj.petId);
        expect(result.body.quantity).toEqual(obj.quantity);
        expect(result.body.status).toEqual(obj.status);
        expect(result.body.complete).toEqual(obj.complete);

        const existing = await repo.findOne({ where: { uid: obj.uid } as any });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.quantity).toEqual(2);
        }
    });
});
