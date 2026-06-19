///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import {
    RouteDecorators,
    DocDecorators,
    ModelRoute,
    RepoUtils,
    UpdateObject,
    HttpResponse,
    HttpRequest,
    ApiErrors,
    ApiErrorMessages,
    ModelUtils,
    BaseEntity
} from "@rapidrest/service-core";
import Pet from "../models/Pet.js";
import { ApiError, JWTUser, ObjectDecorators} from "@rapidrest/core";

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
        @Response res: HttpResponse,
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
    private async create(obj: Pet | Pet[], @Request req: HttpRequest, @AuthUser user: JWTUser): Promise<Pet | Array<Pet>> {
        if (!this.repoUtils || !this.repoUtils.repo) {
            throw new ApiError(ApiErrors.INTERNAL_ERROR, 500, ApiErrorMessages.INTERNAL_ERROR);
        }

        // Instantiate the object if not already done
        const clazz: any = this.repoUtils.getClassType(obj);
        const newObj: Pet = new clazz(obj); // obj instanceof clazz ? (obj as Pet) : this.repoUtils.instantiateObject(obj, clazz);

        // Make sure an existing object doesn't already exist with the same identifiers
        // const ids: any[] = [];
        // const idProps: string[] = ModelUtils.getIdPropertyNames(clazz);
        // for (const prop of idProps) {
        //     // Skip `productUid` as it is considered a compound key
        //     if (prop === "productUid") continue;
        //     const val: string = (newObj as any)[prop];
        //     if (val) {
        //         ids.push(val);
        //     }
        // }
        // const query: any = ModelUtils.buildIdSearchQuery(this.repoUtils.repo, clazz, ids, undefined, (newObj as any).productUid);
        // const count: number = await this.repoUtils.repo.count(query);
        // if (!this.modelClass.trackChanges && count > 0) {
        //     throw new ApiError(ApiErrors.IDENTIFIER_EXISTS, 400, ApiErrorMessages.IDENTIFIER_EXISTS);
        // }

        // Override the date and version fields with their defaults
        if (newObj instanceof BaseEntity) {
            newObj.dateCreated = new Date();
            newObj.dateModified = new Date();
            // newObj.version = count;
        }

        // Are we tracking multiple versions for this object?
        if (newObj instanceof BaseEntity && (this.repoUtils as any).modelClass.trackChanges === 0) {
            (newObj as any).version = 0;
        }

        // HAX We shouldn't be casting obj to any here but this is the only way to get it to compile since T
        // extends BaseEntity.
        // const result: Pet = this.repoUtils.instantiateObject(await this.repoUtils.repo.save(newObj));
        const result: Pet = new clazz(await this.repoUtils.repo.save(newObj));

        return result;
    }

    /**
     * Deletes the Pet
     */
    @Summary("Delete pet by ID")
    @Description("Deletes the pet from the service.")
    @Returns([null])
    @Auth(["jwt"])
    @Delete("/:id")
    private async delete(@Param("id") id: string, @Request req: HttpRequest, @AuthUser user: JWTUser): Promise<void> {
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
    private async update(@Param("id") id: string, obj: UpdateObject<Pet>, @Request req: HttpRequest, @AuthUser user: JWTUser): Promise<Pet> {
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
