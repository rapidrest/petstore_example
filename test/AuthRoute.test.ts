///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import { hash } from "argon2";
import { sign } from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import supertest from "supertest";
import { DataSource } from "typeorm";
import config from "./config.js";
import { createApp } from "../src/app.js";
import { createDataSource } from "../src/data-source.js";
import User, { UserStatus } from "../src/models/User.js";

const mongod = new MongoMemoryServer({
    instance: { port: 9999, dbName: "petstore_test" },
});

describe("Auth Tests", () => {
    let dataSource: DataSource;
    let app: ReturnType<typeof createApp>;
    let repo: ReturnType<typeof dataSource.getMongoRepository<User>>;

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

    it("Can make login request.", async () => {
        const user = await createUser();
        const credentials = Buffer.from(`${user.name}:password`).toString("base64");

        const result = await supertest(app)
            .get("/user/login")
            .set("Authorization", `basic ${credentials}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);
        expect(result.body).toHaveProperty("token");

        const existing = await repo.findOne({ where: { uid: user.uid } as any });
        if (existing) {
            expect(existing.userStatus).toEqual(UserStatus.ONLINE);
        }
    });

    it("Can make logout request.", async () => {
        const user = await createUser();
        const jwtConfig = config.get("auth");
        const authToken = sign(
            { uid: user.uid, name: user.name, email: user.email, roles: user.roles },
            jwtConfig.secret,
            {
                expiresIn: jwtConfig.options.expiresIn,
                audience: jwtConfig.options.audience,
                issuer: jwtConfig.options.issuer,
            }
        );

        const result = await supertest(app)
            .get("/user/logout")
            .set("Authorization", `jwt ${authToken}`);

        expect(result.status).toBeGreaterThanOrEqual(200);
        expect(result.status).toBeLessThan(300);

        const existing = await repo.findOne({ where: { uid: user.uid } as any });
        if (existing) {
            expect(existing.userStatus).toEqual(UserStatus.OFFLINE);
        }
    });
});
