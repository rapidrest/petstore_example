///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import { DataSource } from "typeorm";
import User from "./models/User.js";
import Pet from "./models/Pet.js";
import Order from "./models/Order.js";

export function createDataSource(config: any): DataSource {
    const mongoConfig = config.get("datastores:mongo");
    const host = mongoConfig.host || "localhost";
    const port = mongoConfig.port || 27017;
    const database = mongoConfig.database || "petstore";
    const url = mongoConfig.url || `mongodb://${host}:${port}/${database}`;
    return new DataSource({
        type: "mongodb",
        url,
        entities: [User, Pet, Order],
        synchronize: true,
    });
}
