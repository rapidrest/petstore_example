///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import * as argon from "argon2";
import { ApiError, JWTUser, JWTUtils, ObjectDecorators } from "@composer-js/core";
import {
    RouteDecorators,
    DocDecorators,
    ApiErrorMessages,
    RepoUtils
} from "@composer-js/service-core";
import { BasicStrategy } from "passport-http";
import * as passport from "passport";
import User, { UserStatus } from "../models/User";
import AuthToken from "../models/AuthToken";

const { Config, Init, Inject } = ObjectDecorators;
const { Summary, Description, Returns } = DocDecorators;
const {
    Auth,
    Get,
    Route,
} = RouteDecorators;
const AuthUser = RouteDecorators.User;

/**
 * Handles all REST API requests for the endpoint `/user/login`.
 * 
 * @author <AUTHOR>
 */
@Description("Handles all REST API requests for the endpoint `/user/login`.")
@Route("/")
class AuthRoute {
    @Config("auth")
    private jwtConfig?: any;

    @Inject(RepoUtils, { name: User.name, args: [User] })
    protected userUtils?: RepoUtils<User>;

    /**
     * Called on server startup to initialize the route with any defaults.
     */
    @Init
    private async initialize() {
        passport.use("basic",
            new BasicStrategy(async (username: string, password: string, done: Function) => {
                if (!this.userUtils) {
                    throw new Error("User repository not set.");
                }

                let user: User = await this.userUtils.findOne(username);
                if (!user) {
                    return done(null, false);
                }

                const success: boolean = await argon.verify(user.password, password);
                if (!success) {
                    return done(null, false);
                }

                user = await this.userUtils.update({
                    uid: user.uid,
                    version: user.version,
                    userStatus: UserStatus.ONLINE
                }, user, { ignoreACL: true });
                return done(null, user);
            })
        );
    }

    /**
     * Authenticates the user using HTTP Basic and returns a JSON Web Token access token to be used with future API requests.
     */
    @Summary("login")
    @Description("Authenticates the user using HTTP Basic and returns a JSON Web Token access token to be used with future API requests.")
    @Returns([AuthToken, undefined])
    @Auth(["basic"])
    @Get("/user/login")
    private async login(@AuthUser user: JWTUser): Promise<AuthToken | undefined> {
        if (!user) {
            throw new ApiError(ApiErrorMessages.AUTH_FAILED, 401, "Invalid user or password.");
        }

        const token: string = JWTUtils.createToken(this.jwtConfig, user);
        return new AuthToken({
            token
        });
    }

    /**
     * Logs out the current user
     */
    @Summary("logout")
    @Description("Logs out the current user.")
    @Returns([null])
    @Auth(["jwt"])
    @Get("/user/logout")
    private async logout(@AuthUser user: JWTUser): Promise<void> {
        if (!this.userUtils) {
            throw new Error("User repository not set.");
        }
        
        let foundUser: User = await this.userUtils.findOne(user.uid);
        if (!foundUser) {
            throw new ApiError(ApiErrorMessages.NOT_FOUND, 404, "User not found.");
        }

        await this.userUtils.update({
            uid: foundUser.uid,
            version: foundUser.version,
            userStatus: UserStatus.OFFLINE
        }, foundUser, { ignoreACL: true });
    }
}

export default AuthRoute;
