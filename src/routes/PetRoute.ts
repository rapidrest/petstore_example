///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import {
    RouteDecorators,
    DocDecorators,
    ModelRoute,
    RepoUtils,
    UpdateObject
} from "@composer-js/service-core";
import { Response as XResponse, Request as XRequest } from "express";
import Pet from "../models/Pet";
import { JWTUser, ObjectDecorators} from "@composer-js/core";

const { Description, Returns, Summary, TypeInfo } = DocDecorators;
const { Init } = ObjectDecorators;
const {
    Auth,
    Delete,
    Get,
    Head,
    Model,
    Query,
    Param,
    Post,
    Put,
    Request,
    Response,
    Route,
    Validate
} = RouteDecorators;
const AuthUser = RouteDecorators.User;

/**
 * Handles all REST API requests for the endpoint `/pet`.
 * 
 * @author <AUTHOR>
 */
@Model(Pet)
@Route("/pet")
class PetRoute extends ModelRoute<Pet> {
    protected repoUtilsClass: any = RepoUtils;

    @Summary("Count Pets")
    @Description("Returns the total count of Pets in the datastore based on the given criteria "
        + "in the header as `Content-Length`.")
    @Returns([Object])
    @Head()
    private async count(
        @Param() params: any,
        @Query() query: any,
        @Response res: XResponse,
        @AuthUser user: JWTUser
    ): Promise<any> {
        return super.doCount({ params, query, res, user });
    }

    public async validateCreate(obj: Partial<Pet> | Partial<Pet>[], @AuthUser user: JWTUser) {
        return super.doValidate(obj, { user });
    }

    /**
     * Create a new Pet.
     */
    @Summary("Create Pet")
    @Description("Create a new Pet.")
    @Returns([Pet])
    @Auth(["jwt"])
    @Post()
    @Validate("validateCreate")
    private async create(obj: Pet | Pet[], @Request req: XRequest, @AuthUser user: JWTUser): Promise<Pet | Array<Pet>> {
        return super.doCreate(obj, { user, req });
    }

    /**
     * Deletes the Pet
     */
    @Summary("Delete pet by ID")
    @Description("Deletes the pet from the service.")
    @Returns([null])
    @Auth(["jwt"])
    @Delete("/:id")
    private async delete(@Param("id") id: string, @Request req: XRequest, @AuthUser user: JWTUser): Promise<void> {
        return super.doDelete(id, { user, req });
    }

    /**
     * Returns all Pets from the system that the user has access to
     */
    @Summary("Find All Pets")
    @Description("Returns all Pets from the system that the user has access to.")
    @Returns([[Array, Pet]])
    @Get()
    private async findAll(@Param() params: any, @Query() query: any, @AuthUser user: JWTUser): Promise<Array<Pet>> {
        return super.doFindAll({ params, query, user });
    }

    /**
     * Returns a single Pet from the system that the user has access to
     */
    @Summary("Find pet by ID")
    @Description("Returns a single Pet from the system that the user has access to.")
    @Returns([Pet])
    @Get("/:id")
    private async findById(@Param("id") id: string, @Query() query: any, @AuthUser user: JWTUser): Promise<Pet | null> {
        return super.doFindById(id, { query, user });
    }

    @Summary("Truncate Pets")
    @Description("Deletes all Pets from the datastore that the user has access to.")
    @Returns([null])
    @Auth(["jwt"])
    @Delete()
    public async truncate(
        @Param() params: any,
        @Query() query: any,
        @AuthUser user: JWTUser
    ): Promise<void> {
        return super.doTruncate({ params, query, user });
    }

    public async validateUpdate(@Param("id") id: string, obj: UpdateObject<Pet>, @AuthUser user: JWTUser) {
        return super.doValidate(obj, { user });
    }

    /**
     * Updates a single Pet
     */
    @Summary("Update pet by ID")
    @Description("Updates a single Pet.")
    @Returns([Pet])
    @Auth(["jwt"])
    @Put("/:id")
    @Validate("validateUpdate")
    private async update(@Param("id") id: string, obj: UpdateObject<Pet>, @Request req: XRequest, @AuthUser user: JWTUser): Promise<Pet> {
        return super.doUpdate(id, obj, { user });
    }

    @Summary("Update pet by ID and property")
    @Put(":id/:property")
    @Description("Updates a single property of an existing pet.")
    @TypeInfo([Object])
    @Returns([Pet])
    protected updateProperty(
        @Param("id") id: string,
        @Param("property") propertyName: string,
        obj: any,
        @AuthUser user: JWTUser
    ): Promise<Pet> {
        return super.doUpdateProperty(id, propertyName, obj, { user });
    }
}

export default PetRoute;
