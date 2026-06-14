///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { FastifyInstance } from "fastify";
import { hash } from "argon2";
import config from "./config.js";
import { createDataSource } from "../src/data-source.js";
import { createApp } from "../src/app.js";
import User, { UserStatus } from "../src/models/User.js";
import { DataSource, MongoRepository } from "typeorm";

const mongod = new MongoMemoryServer({
    instance: { port: 9999, dbName: "petstore_test" },
});

describe("Auth Tests", () => {
    let app: FastifyInstance;
    let dataSource: DataSource;
    let userRepo: MongoRepository<User>;

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
        return userRepo.save(obj);
    };

    beforeAll(async () => {
        await mongod.start();
        dataSource = createDataSource(config);
        await dataSource.initialize();
        app = await createApp(config, dataSource);
        await app.ready();
        userRepo = dataSource.getMongoRepository(User);
    });

    afterAll(async () => {
        await app.close();
        await dataSource.destroy();
        await mongod.stop();
    });

    beforeEach(async () => {
        try {
            await userRepo.clear();
        } catch (err: any) {
            if (err.message !== "ns not found") throw err;
        }
    });

    it("Can make login request.", async () => {
        const user = await createUser();
        const credentials = Buffer.from(`${user.name}:password`).toString("base64");

        const response = await app.inject({
            method: "GET",
            url: "/user/login",
            headers: { authorization: `basic ${credentials}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        const body = response.json();
        expect(body).toHaveProperty("token");

        const existing = await userRepo.findOne({ where: { uid: user.uid } as any });
        if (existing) {
            expect(existing.userStatus).toEqual(UserStatus.ONLINE);
        }
    });

    it("Can make logout request.", async () => {
        const user = await createUser();
        const authToken = (app as any).jwt.sign({ uid: user.uid });

        const response = await app.inject({
            method: "GET",
            url: "/user/logout",
            headers: { authorization: `jwt ${authToken}` },
        });

        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);

        const existing = await userRepo.findOne({ where: { uid: user.uid } as any });
        if (existing) {
            expect(existing.userStatus).toEqual(UserStatus.OFFLINE);
        }
    });
});
