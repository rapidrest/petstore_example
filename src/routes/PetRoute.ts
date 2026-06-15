///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import config from "../config.js";
import { Router } from "express";
import { DataSource } from "typeorm";
import { ModelUtils } from "@composer-js/service-core/dist/lib/models/ModelUtils.js";
import { UserUtils } from "@composer-js/core/dist/lib/UserUtils.js";
import Pet from "../models/Pet.js";

export function createPetRouter(passportInstance: any, _config: any, dataSource: DataSource): Router {
    const router = Router();
    const repo = dataSource.getMongoRepository(Pet);
    const jwtAuth = passportInstance.authenticate("jwt", { session: false });
    const trustedRoles: string[] = config.get("trusted_roles") || ["admin"];

    /** HEAD / — return count in Content-Length (no auth required) */
    router.head("/", async (req, res) => {
        try {
            const query = ModelUtils.buildSearchQuery(Pet, repo, req.params, req.query);
            const count = await repo.count(query);
            res.setHeader("Content-Length", count.toString());
            res.status(200).end();
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** POST / — create one or many pets */
    router.post("/", jwtAuth, async (req, res) => {
        try {
            if (!req.user || !UserUtils.hasRoles(req.user, trustedRoles)) {
                return res.status(401).json({ message: "Unauthorized "});
            }
            const body = req.body;
            if (Array.isArray(body)) {
                const pets = body.map((p) => new Pet(p));
                const saved = await repo.save(pets);
                return res.status(201).json(saved);
            } else {
                const pet = new Pet(body);
                const saved = await repo.save(pet);
                return res.status(201).json(saved);
            }
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** GET / — find all pets (no auth required) */
    router.get("/", async (req, res) => {
        try {
            const limit: number = req.query.limit ? Math.min(Number(req.query.limit), 1000) : 100;
            const page: number = req.query.page ? Number(req.query.page) : 0;
            const skip: number = page * limit;
            const query = ModelUtils.buildSearchQuery(Pet, repo, req.params, req.query);
            const pets = await repo.aggregate(query).skip(skip).limit(limit).toArray();
            return res.json(pets);
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** GET /:id — find pet by uid (no auth required) */
    router.get("/:id", async (req, res) => {
        try {
            const query = [
                {
                    $match: {
                        $or: [{ uid: req.params.id }, { name: req.params.id }]
                    }
                },
                {
                    $sort: { version: -1 },
                },
            ];
            const pet = await repo.aggregate(query).limit(1).next();
            if (!pet) return res.status(404).json({ message: "Pet not found" });
            return res.json(pet);
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** PUT /:id — full update */
    router.put("/:id", jwtAuth, async (req, res) => {
        try {
            if (!req.user || !UserUtils.hasRoles(req.user, trustedRoles)) {
                return res.status(401).json({ message: "Unauthorized "});
            }
            const query = [
                {
                    $match: {
                        $or: [{ uid: req.params.id }, { name: req.params.id }]
                    }
                },
                {
                    $sort: { version: -1 },
                },
            ];
            const existing = await repo.aggregate(query).limit(1).next();
            if (!existing) return res.status(404).json({ message: "Pet not found" });
            const { _id, ...updates } = req.body;
            Object.assign(existing, updates);
            existing.dateModified = new Date();
            const saved = await repo.save(existing);
            return res.json(saved);
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** PUT /:id/:property — patch a single property */
    router.put("/:id/:property", jwtAuth, async (req, res) => {
        try {
            if (!req.user || !UserUtils.hasRoles(req.user, trustedRoles)) {
                return res.status(401).json({ message: "Unauthorized "});
            }
            const { id, property } = req.params;
            const query = [
                {
                    $match: {
                        $or: [{ uid: req.params.id }, { name: req.params.id }]
                    }
                },
                {
                    $sort: { version: -1 },
                },
            ];
            const existing = await repo.aggregate(query).limit(1).next();
            if (!existing) return res.status(404).json({ message: "Pet not found" });
            existing[property] = req.body;
            existing.dateModified = new Date();
            const saved = await repo.save(existing);
            return res.json(saved);
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** DELETE /:id — delete by uid */
    router.delete("/:id", jwtAuth, async (req, res) => {
        try {
            if (!req.user || !UserUtils.hasRoles(req.user, trustedRoles)) {
                return res.status(401).json({ message: "Unauthorized "});
            }
            const query = [
                {
                    $match: {
                        $or: [{ uid: req.params.id }, { name: req.params.id }]
                    }
                },
                {
                    $sort: { version: -1 },
                },
            ];
            const existing = await repo.aggregate(query).limit(1).next();
            if (!existing) return res.status(404).json({ message: "Pet not found" });
            await repo.deleteOne({ uid: existing.uid });
            return res.status(204).end();
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    /** DELETE / — truncate all pets */
    router.delete("/", jwtAuth, async (req, res) => {
        try {
            if (!req.user || !UserUtils.hasRoles(req.user, trustedRoles)) {
                return res.status(401).json({ message: "Unauthorized "});
            }
            const query = ModelUtils.buildSearchQuery(Pet, repo, req.params, req.query);
            await repo.deleteMany(query);
            return res.status(204).end();
        } catch(err) {
            return res.status(500).json(err);
        }
    });

    return router;
}
