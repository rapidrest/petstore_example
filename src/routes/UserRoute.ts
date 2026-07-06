///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import * as argon from "argon2";
import {
    RouteDecorators,
    UpdateObject,
    ApiErrorMessages,
    CRUDRoute
} from "@rapidrest/service-core";
import User from "../models/User.js";
import { ApiError, JWTUser, UserUtils} from "@rapidrest/core";

const {
    Model,
    Param,
    Route,
} = RouteDecorators;
const AuthUser = RouteDecorators.User;

/**
 * Handles all REST API requests for the endpoint `/user`.
 * 
 * @author <AUTHOR>
 */
@Model(User)
@Route("/user")
class UserRoute extends CRUDRoute<User> {
    protected async validateCreate(obj: Partial<User> | Partial<User>[], @AuthUser user: JWTUser) {
        await super.validateCreate(obj, user);

        obj = Array.isArray(obj) ? obj : [obj];
        for (const user of obj) {
            if (user.password) {
                user.password = await argon.hash(user.password);
            }
        }
    }

    public async validateUpdate(@Param("id") id: string, obj: UpdateObject<User>, @AuthUser user: JWTUser) {
        await super.validateUpdate(id, obj, user);

        // Only admins and the user itself can make changes
        if (!UserUtils.hasRoles(user, this.trustedRoles) && (id !== user.uid || obj.uid !== user.uid)) {
            throw new ApiError(ApiErrorMessages.AUTH_PERMISSION_FAILURE, 403, ApiErrorMessages.AUTH_PERMISSION_FAILURE);
        }

        if (obj.password) {
            obj.password = await argon.hash(obj.password);
        }
    }
}

export default UserRoute;
