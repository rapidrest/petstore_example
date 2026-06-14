///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { FastifyInstance } from "fastify";
import { hash } from "argon2";
import { v4 as uuidv4 } from "uuid";
import config from "./config.js";
import { createDataSource } from "../src/data-source.js";
import { createApp } from "../src/app.js";
import User, { UserStatus } from "../src/models/User.js";
import { DataSource, MongoRepository } from "typeorm";

const mongod = new MongoMemoryServer({
    instance: { port: 9999, dbName: "petstore_test" },
});

describe("User Tests", () => {
    let app: FastifyInstance;
    let dataSource: DataSource;
    let repo: MongoRepository<User>;
    let adminToken: string;

    const createUser = async (data?: any): Promise<User> => {
        const obj = new User({
            name: "tutone",
            firstName: "Tommy",
            lastName: "Tutone",
            email: "tommy.tutone@gmail.com",
            password: await hash("password"),
            phone: "555-867-5309",
            userStatus: UserStatus.OFFLINE,
            ...data,
        });
        return repo.save(obj);
    };

    const createUsers = async (num: number, data?: any): Promise<User[]> => {
        const results: User[] = [];
        for (let i = 0; i < num; i++) {
            results.push(await createUser({ name: `tutone#${i}`, ...data }));
        }
        return results;
    };

    beforeAll(async () => {
        await mongod.start();
        dataSource = createDataSource(config);
        await dataSource.initialize();
        app = await createApp(config, dataSource);
        await app.ready();
        repo = dataSource.getMongoRepository(User);
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
        const objs = await createUsers(5);

        const response = await app.inject({
            method: "HEAD",
            url: "/user",
            headers: { authorization: `jwt ${adminToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        expect(response.headers).toHaveProperty("content-length");
        expect(response.headers["content-length"]).toBe(objs.length.toString());
    });

    it("Can make create request.", async () => {
        const obj = new User({
            name: "tutone",
            firstName: "Tommy",
            lastName: "Tutone",
            email: "tommy.tutone@gmail.com",
            password: await hash("password"),
            phone: "555-867-5309",
            userStatus: UserStatus.OFFLINE,
        });

        const response = await app.inject({
            method: "POST",
            url: "/user",
            payload: obj,
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toBeDefined();
        expect(body.name).toEqual(obj.name);
        expect(body.firstName).toEqual(obj.firstName);
        expect(body.lastName).toEqual(obj.lastName);
        expect(body.email).toEqual(obj.email);
        expect(body.phone).toEqual(obj.phone);
        expect(body.userStatus).toEqual(obj.userStatus);

        const existing = await repo.findOne({ where: { uid: obj.uid } });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.name).toEqual(obj.name);
            expect(existing.firstName).toEqual(obj.firstName);
            expect(existing.lastName).toEqual(obj.lastName);
            expect(existing.email).toEqual(obj.email);
            expect(existing.phone).toEqual(obj.phone);
            expect(existing.userStatus).toEqual(obj.userStatus);
        }
    });

    it("Can make delete request.", async () => {
        const obj = await createUser();

        const response = await app.inject({
            method: "DELETE",
            url: `/user/${obj.uid}`,
            headers: { authorization: `jwt ${adminToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);

        const count = await repo.count({ where: { uid: obj.uid } as any });
        expect(count).toBe(0);
    });

    it("Can make findAll request.", async () => {
        const objs = await createUsers(5);

        const response = await app.inject({
            method: "GET",
            url: "/user",
            headers: { authorization: `jwt ${adminToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toHaveLength(objs.length);
    });

    it("Can make findById request.", async () => {
        const obj = await createUser();

        const response = await app.inject({
            method: "GET",
            url: `/user/${obj.uid}`,
            headers: { authorization: `jwt ${adminToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toBeDefined();
        expect(body.name).toEqual(obj.name);
        expect(body.firstName).toEqual(obj.firstName);
        expect(body.lastName).toEqual(obj.lastName);
        expect(body.email).toEqual(obj.email);
        expect(body.phone).toEqual(obj.phone);
        expect(body.userStatus).toEqual(obj.userStatus);
    });

    it("Can make truncate request.", async () => {
        const objs = await createUsers(5);
        let count = await repo.count();
        expect(count).toBe(objs.length);

        const response = await app.inject({
            method: "DELETE",
            url: "/user",
            headers: { authorization: `jwt ${adminToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);

        count = await repo.count();
        expect(count).toBe(0);
    });

    it("Can make update request.", async () => {
        const obj = await createUser();
        obj.phone = "818-867-5309";

        const response = await app.inject({
            method: "PUT",
            url: `/user/${obj.uid}`,
            headers: { authorization: `jwt ${adminToken}` },
            payload: obj,
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toBeDefined();
        expect(body.name).toEqual(obj.name);
        expect(body.firstName).toEqual(obj.firstName);
        expect(body.lastName).toEqual(obj.lastName);
        expect(body.email).toEqual(obj.email);
        expect(body.phone).toEqual(obj.phone);
        expect(body.userStatus).toEqual(obj.userStatus);

        const existing = await repo.findOne({ where: { uid: obj.uid } });
        expect(existing).toBeDefined();
        if (existing) {
            expect(existing.name).toEqual(obj.name);
            expect(existing.firstName).toEqual(obj.firstName);
            expect(existing.lastName).toEqual(obj.lastName);
            expect(existing.email).toEqual(obj.email);
            expect(existing.phone).toEqual(obj.phone);
            expect(existing.userStatus).toEqual(obj.userStatus);
        }
    });
});
