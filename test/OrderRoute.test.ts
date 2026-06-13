///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import config from "./config";
import * as request from "supertest";
import { Server, ConnectionManager, ACLRecord, ObjectFactory } from "@composer-js/service-core";
import { EventUtils, JWTUtils, Logger } from "@composer-js/core";
import { MongoRepository, DataSource } from "typeorm";
import { MongoMemoryServer } from "mongodb-memory-server";
import Order, { OrderStatus } from "../src/models/Order";
import Pet from "../src/models/Pet";
import { v4 as uuidv4 } from "uuid";

const mongod: MongoMemoryServer = new MongoMemoryServer({
    instance: {
        port: 9999,
        dbName: "rrst-test",
    },
});

describe("Order Tests", () => {
    const logger = Logger();
    const objectFactory: ObjectFactory = new ObjectFactory(config, logger);
    const server: Server = new Server(config, "./src", logger, objectFactory);
    const baseUrl = "/store/order";

    const admin: any = {
        uid: uuidv4(),
        roles: config.get("trusted_roles"),
    };
    const adminToken = JWTUtils.createToken(config.get("auth"), admin);
    let user: any = undefined;
    let authToken: any = undefined;
    let repo: MongoRepository<Order>;
    let aclRepo: MongoRepository<any>;
    let petRepo: MongoRepository<Pet>;

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
        await aclRepo.save(aclRepo.create(acl));

        return result;
    }

    const createOrders = async function(num: number, data?: any): Promise<Order[]> {
        const results: Order[] = [];

        for (let i = 0; i < num; i++) {
            results.push(await createOrder(data));
        }

        return results;
    }

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
        await aclRepo.save(aclRepo.create(acl));

        return result;
    }

    beforeAll(async () => {
        const connMgr: ConnectionManager = await objectFactory.newInstance(ConnectionManager, { name: "default" });

        await mongod.start();
        await server.start();

        let conn: any = connMgr.connections.get("acl");
        if (conn instanceof DataSource) {
            aclRepo = conn.getMongoRepository("AccessControlListMongo");
        }
        conn = connMgr.connections.get("mongo");
        if (conn instanceof DataSource) {
            repo = conn.getMongoRepository("Order");
            petRepo = conn.getMongoRepository("Pet");
        } else {
            throw new Error("Could not find user connection");
        }
    });

    afterAll(async () => {
        await server.stop();
        await mongod.stop();
    });

    beforeEach(async () => {
        user = {
            uid: uuidv4(),
        };
        authToken = JWTUtils.createToken(config.get("auth"), user);
        EventUtils.init(config, logger, authToken);

        try {
            await repo.clear();
            await petRepo.clear();
        } catch (err) {
            // The error "ns not found" occurs when the collection doesn't exist yet. We can ignore this error.
            if (err.message !== "ns not found") {
                throw err;
            }
        }
    });

    it("Can make count request.", async () => {
        const objs: Order[] = await createOrders(5);

        const result = await request(server.getApplication())
            .head(baseUrl)
            .set("Authorization", "jwt " + adminToken);

        expect(result).toBeDefined();
        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.headers).toHaveProperty("content-length");
        expect(result.headers["content-length"]).toBe((objs.length).toString());
    });

    it("Can make create request.", async () => {
        const pet: Pet = await createPet();
        const obj: Order = new Order({
            petId: pet.uid,
            quantity: 1,
        });

        const result = await request(server.getApplication())
            .post(baseUrl)
            .set("Authorization", "jwt " + authToken)
            .send(obj);

        expect(result).toBeDefined();
        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body).toBeDefined();
        expect(result.body.petId).toEqual(obj.petId);
        expect(result.body.quantity).toEqual(obj.quantity);
        expect(new Date(result.body.shipDate)).toEqual(obj.shipDate);
        expect(result.body.status).toEqual(obj.status);
        expect(result.body.complete).toEqual(obj.complete);

        // Validate the contents were stored correctly
        const existing: Order | null = await repo.findOne({uid: obj.uid} as any);
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
        const obj: Order = await createOrder();
        const url = baseUrl + "/" + obj.uid;

        const result = await request(server.getApplication())
            .delete(url)
            .set("Authorization", "jwt " + adminToken);

        expect(result).toBeDefined();
        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);

        // Validate the contents were removed
        const count: number = await repo.count({uid: obj.uid});
        expect(count).toBe(0);
    });

    it("Can make findAll request.", async () => {
        const objs: Order[] = await createOrders(5);

        const result = await request(server.getApplication())
            .get(baseUrl)
            .set("Authorization", "jwt " + adminToken);

        expect(result).toBeDefined();
        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body).toBeDefined();
        expect(result.body).toHaveLength(objs.length);
    });

    it("Can make findById request.", async () => {
        const obj: Order = await createOrder();
        const url = baseUrl + "/" + obj.uid;

        const result = await request(server.getApplication())
            .get(url)
            .set("Authorization", "jwt " + adminToken);

        expect(result).toBeDefined();
        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body).toBeDefined();
        expect(result.body.petId).toEqual(obj.petId);
        expect(result.body.quantity).toEqual(obj.quantity);
        expect(new Date(result.body.shipDate)).toEqual(obj.shipDate);
        expect(result.body.status).toEqual(obj.status);
        expect(result.body.complete).toEqual(obj.complete);

    });

    it("Can make truncate request.", async () => {
        const objs: Order[] = await createOrders(5);
        let count: number = await repo.count();
        expect(count).toBe(objs.length);

        const result = await request(server.getApplication())
            .delete(baseUrl)
            .set("Authorization", "jwt " + adminToken);

        expect(result).toBeDefined();
        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);

        count = await repo.count();
        expect(count).toBe(0);
    });

    it("Can make update request.", async () => {
        const obj: Order = await createOrder();
        const url = baseUrl + "/" + obj.uid;
        obj.quantity = 2;

        const result = await request(server.getApplication())
            .put(url)
            .set("Authorization", "jwt " + adminToken)
            .send(obj);

        expect(result).toBeDefined();
        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body).toBeDefined();
        expect(result.body.petId).toEqual(obj.petId);
        expect(result.body.quantity).toEqual(obj.quantity);
        expect(new Date(result.body.shipDate)).toEqual(obj.shipDate);
        expect(result.body.status).toEqual(obj.status);
        expect(result.body.complete).toEqual(obj.complete);

        // Validate the contents were stored correctly
        const existing: Order | null = await repo.findOne({uid: obj.uid} as any);
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.petId).toEqual(obj.petId);
            expect(existing.quantity).toEqual(obj.quantity);
            expect(new Date(existing.shipDate)).toEqual(obj.shipDate);
            expect(existing.status).toEqual(obj.status);
            expect(existing.complete).toEqual(obj.complete);
        }
    });

    it.skip("Can make update property request.", async () => {
        const obj: Order = await createOrder();
        const url = baseUrl + "/" + obj.uid + "/quantity";
        obj.quantity = 2;

        const result = await request(server.getApplication())
            .put(url)
            .set("Authorization", "jwt " + adminToken)
            .set("Content-Type", "application/json")
            .send(`"${obj.quantity}"`);

        expect(result).toBeDefined();
        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body).toBeDefined();
        expect(result.body.petId).toEqual(obj.petId);
        expect(result.body.quantity).toEqual(obj.quantity);
        expect(result.body.shipDate).toEqual(new Date(obj.shipDate));
        expect(result.body.status).toEqual(obj.status);
        expect(result.body.complete).toEqual(obj.complete);

        // Validate the contents were stored correctly
        const existing: Order | null = await repo.findOne({uid: obj.uid} as any);
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.petId).toEqual(obj.petId);
            expect(existing.quantity).toEqual(obj.quantity);
            expect(existing.shipDate).toEqual(obj.shipDate);
            expect(existing.status).toEqual(obj.status);
            expect(existing.complete).toEqual(obj.complete);
        }
    });
});
