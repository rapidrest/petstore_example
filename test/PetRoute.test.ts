///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
// This mock MUST be defined before we import ConnectionManager (or anything that pulls it in such as Server)
vi.mock("ioredis", async () => {
    const RedisMock = await import("ioredis-mock");
    return { Redis: RedisMock.default || RedisMock };
});
import config from "./config";
import { request } from "@rapidrest/service-core/test";
import { Server, ConnectionManager, ACLRecord, ObjectFactory, MongoConnection, MongoRepository } from "@rapidrest/service-core";
import { EventUtils, JWTUtils, Logger } from "@rapidrest/core";
import { MongoMemoryServer } from "mongodb-memory-server";
import Pet, { PetStatus } from "../src/models/Pet.js";
import Tag from "../src/models/Tag.js";
import Category from "../src/models/Category.js";
import { v4 as uuidv4 } from "uuid";

const mongod: MongoMemoryServer = new MongoMemoryServer({
    instance: {
        port: 9999,
        dbName: "rrst-test",
    },
});

describe("Pet Tests", () => {
    const logger = Logger();
    const objectFactory: ObjectFactory = new ObjectFactory(config, logger);
    const server: Server = new Server({ config, basePath: "./src", logger, objectFactory });
    const baseUrl = "/api/pet";

    const admin: any = {
        uid: uuidv4(),
        roles: config.get("trusted_roles"),
    };
    const adminToken = JWTUtils.createTokenSync(config.get("auth"), admin);
    let user: any = undefined;
    let authToken: any = undefined;
    let repo: MongoRepository<Pet>;
    let aclRepo: MongoRepository<any>;

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
        await server.start();

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
        await server.stop();
        await mongod.stop();
        await objectFactory.destroy();
    });

    beforeEach(async () => {
        user = {
            uid: uuidv4(),
        };
        authToken = await JWTUtils.createToken(config.get("auth"), user);
        await EventUtils.init(config, logger, authToken);

        try {
            await repo.clear();
        } catch (err) {
            // The error "ns not found" occurs when the collection doesn't exist yet. We can ignore this error.
            if (err.message !== "ns not found") {
                throw err;
            }
        }
    });

    it("Can make count request.", async () => {
        const objs: Pet[] = await createPets(5);

        const result = await request(server.getApplication())
            .head(baseUrl);

        expect(result).toBeDefined();
        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.headers).toHaveProperty("content-length");
        expect(result.headers["content-length"]).toBe((objs.length).toString());
    });

    it("Can make create request.", async () => {
        const obj: Pet = new Pet({
            category: new Category({
                name: "dog"
            }),
            name: "rex",
            photoUrls: ["image1.jpg", "image2.jpg", "image3.jpg"],
            status: PetStatus.AVAILABLE,
            tags: [new Tag({ name: "timid" }), new Tag({ name: "black" })],
        });

        const result = await request(server.getApplication())
            .post(baseUrl)
            .set("Authorization", "jwt " + adminToken)
            .send(obj);

        expect(result).toBeDefined();
        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body).toBeDefined();
        expect(result.body.category).toEqual(obj.category);
        expect(result.body.name).toEqual(obj.name);
        expect(result.body.photoUrls).toEqual(obj.photoUrls);
        expect(result.body.status).toEqual(obj.status);
        expect(result.body.tags).toEqual(obj.tags);

        // Validate the contents were stored correctly
        const existing: Pet | null = await repo.findOne({uid: obj.uid} as any);
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
        const obj: Pet = await createPet();
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
        const objs: Pet[] = await createPets(5);

        const result = await request(server.getApplication())
            .get(baseUrl);

        expect(result).toBeDefined();
        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body).toBeDefined();
        expect(result.body).toHaveLength(objs.length);
    });

    it("Can make findById request.", async () => {
        const obj: Pet = await createPet();
        const url = baseUrl + "/" + obj.uid;

        const result = await request(server.getApplication())
            .get(url);

        expect(result).toBeDefined();
        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body).toBeDefined();
        expect(result.body.category).toEqual(obj.category);
        expect(result.body.name).toEqual(obj.name);
        expect(result.body.photoUrls).toEqual(obj.photoUrls);
        expect(result.body.status).toEqual(obj.status);
        expect(result.body.tags).toEqual(obj.tags);
    });

    it("Can make truncate request.", async () => {
        const objs: Pet[] = await createPets(5);
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
        const obj: Pet = await createPet();
        const url = baseUrl + "/" + obj.uid;
        obj.status = PetStatus.ADOPTED;

        const result = await request(server.getApplication())
            .put(url)
            .set("Authorization", "jwt " + adminToken)
            .send(obj);

        expect(result).toBeDefined();
        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body).toBeDefined();
        expect(result.body.category).toEqual(obj.category);
        expect(result.body.name).toEqual(obj.name);
        expect(result.body.photoUrls).toEqual(obj.photoUrls);
        expect(result.body.status).toEqual(obj.status);
        expect(result.body.tags).toEqual(obj.tags);

        // Validate the contents were stored correctly
        const existing: Pet | null = await repo.findOne({uid: obj.uid} as any);
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.category).toEqual(obj.category);
            expect(existing.name).toEqual(obj.name);
            expect(existing.photoUrls).toEqual(obj.photoUrls);
            expect(existing.status).toEqual(obj.status);
            expect(existing.tags).toEqual(obj.tags);
        }
    });

    it.skip("Can make update property request.", async () => {
        const obj: Pet = await createPet();
        const url = baseUrl + "/" + obj.uid + "/status";
        obj.status = PetStatus.ADOPTED;

        const result = await request(server.getApplication())
            .put(url)
            .set("Authorization", "jwt " + adminToken)
            .send(obj.status);

        expect(result).toBeDefined();
        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body).toBeDefined();
        expect(result.body.category).toEqual(obj.category);
        expect(result.body.name).toEqual(obj.name);
        expect(result.body.photoUrls).toEqual(obj.photoUrls);
        expect(result.body.status).toEqual(obj.status);
        expect(result.body.tags).toEqual(obj.tags);

        // Validate the contents were stored correctly
        const existing: Pet | null = await repo.findOne({uid: obj.uid} as any);
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
