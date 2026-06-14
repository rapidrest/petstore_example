///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { verify as argonVerify } from "argon2";
import { DataSource } from "typeorm";
import { BasicStrategy } from "passport-http";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import User from "../models/User.js";

export function setupPassport(passportInstance: any, config: any, dataSource: DataSource): void {
    const userRepo = dataSource.getMongoRepository(User);
    const jwtConfig = config.get("auth");

    // Basic strategy for the login endpoint (Authorization: Basic <base64>)
    passportInstance.use(
        new BasicStrategy(async (username: string, password: string, done: any) => {
            try {
                const user = await userRepo.findOne({ where: { name: username } });
                if (!user) {
                    return done(null, false);
                }
                const valid = await argonVerify(user.password, password);
                if (!valid) {
                    return done(null, false);
                }
                return done(null, user);
            } catch (err) {
                return done(err);
            }
        })
    );

    // JWT strategy for all protected endpoints (Authorization: jwt <token>)
    passportInstance.use(
        new JwtStrategy(
            {
                jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
                secretOrKey: jwtConfig.secret,
                issuer: jwtConfig.options?.issuer,
                audience: jwtConfig.options?.audience,
            },
            (payload: any, done: any) => {
                return done(null, payload);
            }
        )
    );
}
