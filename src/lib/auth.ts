///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import jwt from "jsonwebtoken";
import config from "../config.js";

const authConfig = config.get("auth") || {};
const jwtSecret: string = authConfig.secret || "MyPasswordIsSecure";

/**
 * Verifies the "Authorization: jwt <token>" header and returns the user payload,
 * or null if missing / invalid.
 */
export function extractJwtUser(request: Request): any | null {
    const authHeader = request.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("jwt ")) {
        return null;
    }
    try {
        const token = authHeader.slice(4).trim();
        const payload: any = jwt.verify(token, jwtSecret);
        if (payload?.profile) {
            return typeof payload.profile === "string" ? JSON.parse(payload.profile) : payload.profile;
        }
        return payload;
    } catch {
        return null;
    }
}

/**
 * Returns `{ user }` on success or a 401 `Response` on failure.
 * Call this at the top of protected handlers:
 * -  const auth = requireAuth(request);
 * - if (auth instanceof Response) return auth;
 */
export function requireAuth(request: Request): { user: any } | Response {
    const user = extractJwtUser(request);
    if (!user) {
        return Response.json({ message: "Unauthorized" }, { status: 401 });
    }
    return { user };
}
