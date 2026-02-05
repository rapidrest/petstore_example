///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import * as argon from "argon2";
import { ApiError, JWTUser, JWTUtils, ObjectDecorators } from "@composer-js/core";
import {
    RouteDecorators,
    DocDecorators,
    DatabaseDecorators,
    ModelUtils,
    ApiErrorMessages
} from "@composer-js/service-core";
import { BasicStrategy } from "passport-http";
import * as passport from "passport";
import { MongoRepository as Repo } from "typeorm";
import User, { UserStatus } from "../models/User";
import AuthToken from "../models/AuthToken";

const { Config, Init } = ObjectDecorators;
const { MongoRepository } = DatabaseDecorators;
const { Summary, Description, Returns } = DocDecorators;
const {
    Auth,
    Get,
    Request,
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

    @MongoRepository(User)
    protected userRepo?: Repo<User>;

    /**
     * Called on server startup to initialize the route with any defaults.
     */
    @Init
    private async initialize() {
        passport.use("basic",
            new BasicStrategy(async (username: string, password: string, done: Function) => {
                if (!this.userRepo) {
                    throw new Error("User repository not set.");
                }

                const search: any = ModelUtils.buildIdSearchQuery(this.userRepo, User, username);
                let user: User = await this.userRepo.findOne(search);
                if (!user) {
                    return done(null, false);
                }

                const success: boolean = await argon.verify(user.password, password);
                if (!success) {
                    return done(null, false);
                }

                user.userStatus = UserStatus.ONLINE;
                user.version++;
                user = await this.userRepo.save(user);
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
        if (!this.userRepo) {
            throw new Error("User repository not set.");
        }
        
        const search: any = ModelUtils.buildIdSearchQuery(this.userRepo, User, user.uid);
        let foundUser: User = await this.userRepo.findOne(search);
        if (!foundUser) {
            throw new ApiError(ApiErrorMessages.NOT_FOUND, 404, "User not found.");
        }

        foundUser.userStatus = UserStatus.OFFLINE;
        foundUser.version++;
        await this.userRepo.save(foundUser);
    }
}

export default AuthRoute;
