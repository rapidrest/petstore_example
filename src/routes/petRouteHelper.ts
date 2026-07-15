///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import Pet from "../models/Pet.js";
import { CRUDRoute, RepoUtils } from "@rapidrest/service-core";
import { getApp } from "../lib/startup.js";

class PetRoute extends CRUDRoute<Pet> {
    get modelClass(): any {
        return Pet;
    }
    protected repoUtilsClass: any = RepoUtils<Pet>;
}

const g = globalThis as any;

export async function getPetCRUDRoute(): Promise<PetRoute> {
    if (!g._petCRUDRoute) {
        const { objectFactory } = await getApp();
        g._petCRUDRoute = await objectFactory.newInstance(PetRoute, { name: "default" });
    }
    return g._petCRUDRoute;
}
