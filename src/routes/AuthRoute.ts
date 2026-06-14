///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { Router } from "express";
import jwt from "jsonwebtoken";
import { DataSource } from "typeorm";
import User, { UserStatus } from "../models/User.js";

export function createAuthRouter(passportInstance: any, config: any, dataSource: DataSource): Router {
    const router = Router();
    const userRepo = dataSource.getMongoRepository(User);
    const jwtConfig = config.get("auth");

    const basicAuth = passportInstance.authenticate("basic", { session: false });
    const jwtAuth = passportInstance.authenticate("jwt", { session: false });

    /**
     * GET /user/login
     * Authenticates via HTTP Basic and returns a JWT token.
     */
    router.get("/user/login", basicAuth, async (req, res) => {
        try {
            const user = req.user as User;

            user.userStatus = UserStatus.ONLINE;
            user.dateModified = new Date();
            await userRepo.save(user);

            const payload = { uid: user.uid, name: user.name, email: user.email, roles: user.roles };
            const token = jwt.sign(payload, jwtConfig.secret, {
                expiresIn: jwtConfig.options?.expiresIn ?? "1h",
                audience: jwtConfig.options?.audience,
                issuer: jwtConfig.options?.issuer,
            });

            return res.json({ token });
        } catch (err) {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    /**
     * GET /user/logout
     * Marks the authenticated user as OFFLINE.
     */
    router.get("/user/logout", jwtAuth, async (req, res) => {
        try {
            const payload = req.user as any;
            const user = await userRepo.findOne({ where: { uid: payload.uid } });
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            user.userStatus = UserStatus.OFFLINE;
            user.dateModified = new Date();
            await userRepo.save(user);

            return res.status(200).json({});
        } catch (err) {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    return router;
}
