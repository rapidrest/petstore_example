///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { v4 as uuidv4 } from "uuid";
import config from "./config.js";
import { GET, HEAD, POST, DELETE } from "../app/api/order/route.js";
import { GET as getById, PUT, DELETE as deleteById } from "../app/api/order/[id]/route.js";
import Order, { OrderStatus } from "../src/models/Order.js";
import Pet from "../src/models/Pet.js";
import { ACLRecord, ACLUtils, ConnectionManager, MongoConnection, MongoRepository, ObjectFactory } from "@rapidrest/service-core";
import { JWTUtils, Logger } from "@rapidrest/core";
import { initDatabase } from "../src/database.js";
import { inject, setupGlobals, teardownGlobals } from "./helpers.js";

const mongod = new MongoMemoryServer({
    instance: { port: 9999, dbName: "petstore_test" },
});

describe("Order Tests", () => {
    const logger = Logger();
    const objectFactory = new ObjectFactory(config, logger);
    let repo: MongoRepository<Order>;
    let aclRepo: MongoRepository<any>;
    let petRepo: MongoRepository<Pet>;

    const trustedRoles: string[] = config.get("trusted_roles");
    const admin: any = { uid: uuidv4(), name: "admin", roles: trustedRoles };
    const adminToken = JWTUtils.createTokenSync(config.get("auth"), admin);
    let user: any;
    let userToken: string;

    const createPet = async function(data?: any): Promise<Pet> {
        const obj: Pet = new Pet({
            name: "fido",
            photoUrls: [],
            ...data
        });

        const result: Pet = await petRepo.save(obj);

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
            parentUid: "Pet"
        };
        await aclRepo.save(acl);

        return result;
    };

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
            parentUid: "Order"
        };
        await aclRepo.save(acl);

        return result;
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
            repo = conn.getMongoRepository("Order");
            petRepo = conn.getMongoRepository("Pet");
        } else {
            throw new Error("Could not find order connection");
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
            await petRepo.clear();
        } catch (err: any) {
            if (err.message !== "ns not found") throw err;
        }
    });

    it("Can make count request.", async () => {
        const objs = await createOrders(5);

        const response = await inject(HEAD, {
            method: "HEAD",
            url: "/api/store/order",
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

        const response = await inject(POST, {
            method: "POST",
            url: "/api/store/order",
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

        const response = await inject(deleteById, {
            method: "DELETE",
            url: `/api/store/order/${obj.uid}`,
            headers: { authorization: `jwt ${adminToken}` },
            params: { id: obj.uid },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);

        const count = await repo.count({ uid: obj.uid });
        expect(count).toBe(0);
    });

    it("Can make findAll request.", async () => {
        const objs = await createOrders(5);

        const response = await inject(GET, {
            method: "GET",
            url: "/api/store/order",
            headers: { authorization: `jwt ${adminToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toHaveLength(objs.length);
    });

    it("Can make findById request.", async () => {
        const obj = await createOrder();

        const response = await inject(getById, {
            method: "GET",
            url: `/api/store/order/${obj.uid}`,
            headers: { authorization: `jwt ${adminToken}` },
            params: { id: obj.uid },
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

        const response = await inject(DELETE, {
            method: "DELETE",
            url: "/api/store/order",
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

        const response = await inject(PUT, {
            method: "PUT",
            url: `/api/store/order/${obj.uid}`,
            headers: { authorization: `jwt ${adminToken}` },
            payload: obj,
            params: { id: obj.uid },
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

        const existing = await repo.findOne({ uid: obj.uid });
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
