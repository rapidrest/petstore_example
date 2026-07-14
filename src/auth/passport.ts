///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { verify as argonVerify } from "argon2";
import { BasicStrategy } from "passport-http";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import User from "../models/User.js";
import { RepoUtils } from "@rapidrest/service-core";

export function setupPassport(passportInstance: any, config: any, repoUtils: RepoUtils<User>): void {
    const jwtConfig = config.get("auth");

    // Basic strategy for the login endpoint (Authorization: Basic <base64>)
    passportInstance.use(
        new BasicStrategy(async (username: string, password: string, done: any) => {
            try {
                const user = await repoUtils.findOne(username, { ignoreACL: true });
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
                if (payload.profile) {
                    try {
                        return done(null, JSON.parse(payload.profile));
                    } catch {
                        return done(null, false);
                    }
                }
                return done(null, payload);
            }
        )
    );
}
