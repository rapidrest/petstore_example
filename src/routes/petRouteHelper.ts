///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import Pet from "../models/Pet.js";
import { ModelRoute, RepoUtils } from "@rapidrest/service-core";
import { getApp } from "../lib/startup.js";

class PetRoute extends ModelRoute<Pet> {
    get modelClass(): any {
        return Pet;
    }
    protected repoUtilsClass: any = RepoUtils<Pet>;
}

const g = globalThis as any;

export async function getPetModelRoute(): Promise<PetRoute> {
    if (!g._petModelRoute) {
        const { objectFactory } = await getApp();
        g._petModelRoute = await objectFactory.newInstance(PetRoute, { name: "default" });
    }
    return g._petModelRoute;
}
