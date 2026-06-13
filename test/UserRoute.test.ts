///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import { hash } from "argon2";
import { sign } from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import supertest from "supertest";
import { DataSource } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import config from "./config.js";
import { createApp } from "../src/app.js";
import { createDataSource } from "../src/data-source.js";
import User, { UserStatus } from "../src/models/User.js";

const mongod = new MongoMemoryServer({
    instance: { port: 9999, dbName: "petstore_test" },
});

describe("User Tests", () => {
    let dataSource: DataSource;
    let app: ReturnType<typeof createApp>;
    let repo: ReturnType<typeof dataSource.getMongoRepository<User>>;

    const jwtConfig = config.get("auth");
    const trustedRoles: string[] = config.get("trusted_roles");

    const makeToken = (payload: any) =>
        sign(payload, jwtConfig.secret, {
            expiresIn: jwtConfig.options.expiresIn,
            audience: jwtConfig.options.audience,
            issuer: jwtConfig.options.issuer,
        });

    const adminToken = makeToken({ uid: uuidv4(), name: "admin", roles: trustedRoles });

    const createUser = async (data?: any): Promise<User> => {
        const user = new User({
            name: "tutone",
            firstName: "Tommy",
            lastName: "Tutone",
            email: "tommy.tutone@gmail.com",
            password: await hash("password"),
            phone: "555-867-5309",
            userStatus: UserStatus.OFFLINE,
            ...data,
        });
        return repo.save(user);
    };

    const createUsers = async (num: number, data?: any): Promise<User[]> => {
        const results: User[] = [];
        for (let i = 0; i < num; i++) {
            results.push(await createUser({ name: `${data?.name ?? "tutone"}#${i}`, ...data }));
        }
        return results;
    };

    beforeAll(async () => {
        await mongod.start();
        dataSource = createDataSource(config);
        await dataSource.initialize();
        app = createApp(config, dataSource);
        repo = dataSource.getMongoRepository(User);
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
        const objs = await createUsers(5);

        const result = await supertest(app)
            .head("/user")
            .set("Authorization", `jwt ${adminToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.headers).toHaveProperty("content-length");
        expect(result.headers["content-length"]).toBe(objs.length.toString());
    });

    it("Can make create request.", async () => {
        const obj = new User({
            name: "tutone",
            firstName: "Tommy",
            lastName: "Tutone",
            email: "tommy.tutone@gmail.com",
            password: "password",
            phone: "555-867-5309",
            userStatus: UserStatus.OFFLINE,
        });

        const result = await supertest(app).post("/user").send(obj);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body.name).toEqual(obj.name);
        expect(result.body.firstName).toEqual(obj.firstName);
        expect(result.body.lastName).toEqual(obj.lastName);
        expect(result.body.email).toEqual(obj.email);
        expect(result.body.phone).toEqual(obj.phone);
        expect(result.body.userStatus).toEqual(obj.userStatus);

        const existing = await repo.findOne({ where: { name: obj.name } as any });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.name).toEqual(obj.name);
            expect(existing.email).toEqual(obj.email);
        }
    });

    it("Can make delete request.", async () => {
        const obj = await createUser();

        const result = await supertest(app)
            .delete(`/user/${obj.uid}`)
            .set("Authorization", `jwt ${adminToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);

        const existing = await repo.findOne({ where: { uid: obj.uid } as any });
        expect(existing).toBeNull();
    });

    it("Can make findAll request.", async () => {
        const objs = await createUsers(5);

        const result = await supertest(app)
            .get("/user")
            .set("Authorization", `jwt ${adminToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body).toHaveLength(objs.length);
    });

    it("Can make findById request.", async () => {
        const obj = await createUser();

        const result = await supertest(app)
            .get(`/user/${obj.uid}`)
            .set("Authorization", `jwt ${adminToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body.name).toEqual(obj.name);
        expect(result.body.firstName).toEqual(obj.firstName);
        expect(result.body.lastName).toEqual(obj.lastName);
        expect(result.body.email).toEqual(obj.email);
        expect(result.body.phone).toEqual(obj.phone);
        expect(result.body.userStatus).toEqual(obj.userStatus);
    });

    it("Can make truncate request.", async () => {
        await createUsers(5);
        expect(await repo.count()).toBe(5);

        const result = await supertest(app)
            .delete("/user")
            .set("Authorization", `jwt ${adminToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(await repo.count()).toBe(0);
    });

    it("Can make update request.", async () => {
        const obj = await createUser();
        obj.phone = "818-867-5309";

        const result = await supertest(app)
            .put(`/user/${obj.uid}`)
            .set("Authorization", `jwt ${adminToken}`)
            .send(obj);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body.name).toEqual(obj.name);
        expect(result.body.phone).toEqual(obj.phone);
        expect(result.body.userStatus).toEqual(obj.userStatus);

        const existing = await repo.findOne({ where: { uid: obj.uid } as any });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.phone).toEqual(obj.phone);
        }
    });
});
