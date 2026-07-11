///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz <caskater47@gmail.com>
///////////////////////////////////////////////////////////////////////////////
import { ReactService } from "@rapidrest/react";
import { RepoUtils } from "@rapidrest/service-core";
import Pet from "../models/Pet.js";
import { ObjectDecorators } from "@rapidrest/core";
const { Inject } = ObjectDecorators;

/**
 * Provides DI-compatible server side fetching of data/props for the React app
 * www's pets page. 
 * 
 * @author Jean-Philippe Steinmetz <caskater47@gmail.com>
 */
@ReactService("/pets")
export default class PetsService {
    @Inject(RepoUtils, { name: Pet.name, args: [Pet] })
    private petRepo?: RepoUtils<Pet>;

    public async fetchProps(): Promise<any> {
        return { pets: await this.petRepo?.find({}) };
    }
}