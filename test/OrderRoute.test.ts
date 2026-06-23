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
import Order, { OrderStatus } from "../src/models/Order.js";
import Pet from "../src/models/Pet.js";
import { ACLRecord, ACLUtils, ConnectionManager, MongoConnection, MongoRepository, ObjectFactory } from "@rapidrest/service-core";
import { JWTUtils, Logger } from "@rapidrest/core";
import { initDatabase } from "../src/database.js";

const mongod = new MongoMemoryServer({
    instance: { port: 9999, dbName: "petstore_test" },
});

describe("Order Tests", () => {
    let app: express.Application;
    const logger = Logger();
    const objectFactory = new ObjectFactory(config, logger);
    let repo: MongoRepository<Order>;
    let aclRepo: MongoRepository<any>;
    let petRepo: MongoRepository<Pet>;

    const jwtConfig = config.get("auth");
    const trustedRoles: string[] = config.get("trusted_roles");

    const admin: any = { uid: uuidv4(), name: "admin", roles: trustedRoles };
    const adminToken = JWTUtils.createTokenSync(config.get("auth"), admin);
    let user: any;
    let userToken: string;

    const createOrder = async function(data?: any): Promise<Order> {
        const obj: Order = new Order({
            petId: data?.petId || (await createPet()).uid,
            quantity: 1,
            shipDate: new Date(),
            status: OrderStatus.PLACED,
            complete: false,
            ...data
        });

        const result: Order = await repo.save(obj);

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
            parentUid: "Order"
        };
        await aclRepo.save(acl);

        return result;
    }

    const createOrders = async (num: number, data?: any): Promise<Order[]> => {
        const results: Order[] = [];
        for (let i = 0; i < num; i++) {
            results.push(await createOrder(data));
        }
        return results;
    };

    const createPet = async function(data?: any): Promise<Pet> {
        const obj: Pet = new Pet({
            petId: uuidv4(),
            quantity: 1,
            shipDate: new Date(),
            status: "",
            complete: false,
            ...data
        });

        const result: Pet = await petRepo.save(obj);

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
            repo = conn.getMongoRepository("Order");
            petRepo = conn.getMongoRepository("Pet");
        } else {
            throw new Error("Could not find user connection");
        }
    });

    afterAll(async () => {
        await objectFactory.destroy();
        await mongod.stop();
    });

    beforeEach(async () => {
        user = { uid: uuidv4(), name: "user", roles: [] };
        userToken = JWTUtils.createTokenSync(config.get("auth"), user);
        try {
            await repo.clear();
            await petRepo.clear();
        } catch (err: any) {
            // The error "ns not found" occurs when the collection doesn't exist yet. We can ignore this error.
            if (err.message !== "ns not found") {
                throw err;
            }
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

        const existing = await repo.findOne({ where: { petId: pet.uid } });
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

        const existing = await repo.findOne({ where: { uid: obj.uid } });
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

        const existing = await repo.findOne({ where: { uid: obj.uid } });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.quantity).toEqual(2);
        }
    });
});
