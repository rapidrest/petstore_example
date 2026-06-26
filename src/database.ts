import { ConnectionManager, ObjectFactory } from "@rapidrest/service-core";
import { AccessControlListMongo } from "@rapidrest/service-core/dist/lib/security/AccessControlListMongo.js";
import Order from "./models/Order.js";
import Pet from "./models/Pet.js";
import User from "./models/User.js";

/**
 * Initializes the database connection manager.
 * @param config 
 * @param objectFactory 
 * @param logger 
 */
export async function initDatabase(config: any, objectFactory: ObjectFactory, logger: any, datastoresOverride?: any): Promise<void> {
    const connectionManager: ConnectionManager = await objectFactory.newInstance(ConnectionManager, { name: "default" });
    const datastores: any = datastoresOverride ?? config.get("datastores");
    const models: Map<string, any> = new Map();
    models.set(AccessControlListMongo.name, AccessControlListMongo);
    models.set(Order.name, Order);
    models.set(Pet.name, Pet);
    models.set(User.name, User);
    logger.info("Initializing database connection(s)...");
    await connectionManager.connect(datastores, models);
    logger.info("Database connected");
}