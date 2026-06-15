///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { Router } from "express";
import { DataSource } from "typeorm";
import { ModelUtils } from "@composer-js/service-core/dist/lib/models/ModelUtils.js";
import Pet from "../models/Pet.js";

export function createPetRouter(passportInstance: any, _config: any, dataSource: DataSource): Router {
    const router = Router();
    const repo = dataSource.getMongoRepository(Pet);
    const jwtAuth = passportInstance.authenticate("jwt", { session: false });

    /** HEAD / — return count in Content-Length (no auth required) */
    router.head("/", async (_req, res) => {
        try {
            const query = ModelUtils.buildSearchQuery(Pet, repo, _req.params, _req.query);
            const count = await repo.count(query);
            res.setHeader("Content-Length", count.toString());
            res.status(200).end();
        } catch {
            res.status(500).end();
        }
    });

    /** POST / — create one or many pets */
    router.post("/", jwtAuth, async (req, res) => {
        try {
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
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    /** GET / — find all pets (no auth required) */
    router.get("/", async (_req, res) => {
        try {
            const query = ModelUtils.buildSearchQuery(Pet, repo, _req.params, _req.query);
            const pets = await repo.find(query);
            return res.json(pets);
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    /** GET /:id — find pet by uid (no auth required) */
    router.get("/:id", async (req, res) => {
        try {
            const pet = await repo.findOne({ where: { uid: req.params.id } });
            if (!pet) return res.status(404).json({ message: "Pet not found" });
            return res.json(pet);
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    /** PUT /:id — full update */
    router.put("/:id", jwtAuth, async (req, res) => {
        try {
            const existing = await repo.findOne({ where: { uid: req.params.id } });
            if (!existing) return res.status(404).json({ message: "Pet not found" });
            const { _id, ...updates } = req.body;
            Object.assign(existing, updates);
            existing.dateModified = new Date();
            const saved = await repo.save(existing);
            return res.json(saved);
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    /** PUT /:id/:property — patch a single property */
    router.put("/:id/:property", jwtAuth, async (req, res) => {
        try {
            const { id, property } = req.params;
            const existing = await repo.findOne({ where: { uid: id } });
            if (!existing) return res.status(404).json({ message: "Pet not found" });
            (existing as any)[property] = req.body;
            existing.dateModified = new Date();
            const saved = await repo.save(existing);
            return res.json(saved);
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    /** DELETE /:id — delete by uid */
    router.delete("/:id", jwtAuth, async (req, res) => {
        try {
            const existing = await repo.findOne({ where: { uid: req.params.id } });
            if (!existing) return res.status(404).json({ message: "Pet not found" });
            await repo.deleteOne({ uid: req.params.id });
            return res.status(204).end();
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    /** DELETE / — truncate all pets */
    router.delete("/", jwtAuth, async (_req, res) => {
        try {
            const query = ModelUtils.buildSearchQuery(Pet, repo, _req.params, _req.query);
            await repo.deleteMany(query);
            return res.status(204).end();
        } catch {
            return res.status(500).json({ message: "Internal server error" });
        }
    });

    return router;
}
