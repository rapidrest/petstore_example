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
import Order, { OrderStatus } from "../src/models/Order.js";
import Pet from "../src/models/Pet.js";
import { DataSource, MongoRepository } from "typeorm";

const mongod = new MongoMemoryServer({
    instance: { port: 9999, dbName: "petstore_test" },
});

describe("Order Tests", () => {
    let app: FastifyInstance;
    let dataSource: DataSource;
    let repo: MongoRepository<Order>;
    let petRepo: MongoRepository<Pet>;
    let adminToken: string;
    let userToken: string;

    const createPet = async (data?: any): Promise<Pet> => {
        const obj = new Pet({ name: "gigi", ...data });
        return petRepo.save(obj);
    };

    const createOrder = async (data?: any): Promise<Order> => {
        const petId = data?.petId || (await createPet()).uid;
        const obj = new Order({
            petId,
            quantity: 1,
            shipDate: new Date(),
            status: OrderStatus.PLACED,
            complete: false,
            ...data,
        });
        return repo.save(obj);
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
        app = await createApp(config, dataSource);
        await app.ready();
        repo = dataSource.getMongoRepository(Order);
        petRepo = dataSource.getMongoRepository(Pet);
        adminToken = (app as any).jwt.sign({
            uid: uuidv4(),
            roles: config.get("trusted_roles"),
        });
        userToken = (app as any).jwt.sign({ uid: uuidv4(), roles: [] });
    });

    afterAll(async () => {
        await app.close();
        await dataSource.destroy();
        await mongod.stop();
    });

    beforeEach(async () => {
        try {
            await repo.clear();
            await petRepo.clear();
        } catch (err: any) {
            if (err.message !== "ns not found") throw err;
        }
    });

    it("Can make count request.", async () => {
        const objs = await createOrders(5);

        const response = await app.inject({
            method: "HEAD",
            url: "/store/order",
            headers: { authorization: `jwt ${adminToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        expect(response.headers).toHaveProperty("content-length");
        expect(response.headers["content-length"]).toBe(objs.length.toString());
    });

    it("Can make create request.", async () => {
        const pet = await createPet();
        const obj = new Order({ petId: pet.uid, quantity: 1 });

        const response = await app.inject({
            method: "POST",
            url: "/store/order",
            headers: { authorization: `jwt ${adminToken}` },
            payload: obj,
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toBeDefined();
        expect(body.petId).toEqual(obj.petId);
        expect(body.quantity).toEqual(obj.quantity);
        expect(new Date(body.shipDate)).toEqual(obj.shipDate);
        expect(body.status).toEqual(obj.status);
        expect(body.complete).toEqual(obj.complete);

        const existing = await repo.findOne({ where: { uid: obj.uid } });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.petId).toEqual(obj.petId);
            expect(existing.quantity).toEqual(obj.quantity);
            expect(new Date(existing.shipDate)).toEqual(obj.shipDate);
            expect(existing.status).toEqual(obj.status);
            expect(existing.complete).toEqual(obj.complete);
        }
    });

    it("Can make delete request.", async () => {
        const obj = await createOrder();

        const response = await app.inject({
            method: "DELETE",
            url: `/store/order/${obj.uid}`,
            headers: { authorization: `jwt ${adminToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);

        const count = await repo.count({ where: { uid: obj.uid } as any });
        expect(count).toBe(0);
    });

    it("Can make findAll request.", async () => {
        const objs = await createOrders(5);

        const response = await app.inject({
            method: "GET",
            url: "/store/order",
            headers: { authorization: `jwt ${adminToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toHaveLength(objs.length);
    });

    it("Can make findById request.", async () => {
        const obj = await createOrder();

        const response = await app.inject({
            method: "GET",
            url: `/store/order/${obj.uid}`,
            headers: { authorization: `jwt ${adminToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toBeDefined();
        expect(body.petId).toEqual(obj.petId);
        expect(body.quantity).toEqual(obj.quantity);
        expect(new Date(body.shipDate)).toEqual(obj.shipDate);
        expect(body.status).toEqual(obj.status);
        expect(body.complete).toEqual(obj.complete);
    });

    it("Can make truncate request.", async () => {
        const objs = await createOrders(5);
        let count = await repo.count();
        expect(count).toBe(objs.length);

        const response = await app.inject({
            method: "DELETE",
            url: "/store/order",
            headers: { authorization: `jwt ${adminToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);

        count = await repo.count();
        expect(count).toBe(0);
    });

    it("Can make update request.", async () => {
        const obj = await createOrder();
        obj.quantity = 2;

        const response = await app.inject({
            method: "PUT",
            url: `/store/order/${obj.uid}`,
            headers: { authorization: `jwt ${adminToken}` },
            payload: obj,
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toBeDefined();
        expect(body.petId).toEqual(obj.petId);
        expect(body.quantity).toEqual(obj.quantity);
        expect(new Date(body.shipDate)).toEqual(obj.shipDate);
        expect(body.status).toEqual(obj.status);
        expect(body.complete).toEqual(obj.complete);

        const existing = await repo.findOne({ where: { uid: obj.uid } });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.petId).toEqual(obj.petId);
            expect(existing.quantity).toEqual(obj.quantity);
            expect(new Date(existing.shipDate)).toEqual(obj.shipDate);
            expect(existing.status).toEqual(obj.status);
            expect(existing.complete).toEqual(obj.complete);
        }
    });
});
