///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import {
    RouteDecorators,
    DocDecorators,
    ModelRoute,
    RepoUtils,
    UpdateObject,
    HttpRequest,
    HttpResponse,
} from "@rapidrest/service-core";
import Order from "../models/Order.js";
import { JWTUser, ObjectDecorators} from "@rapidrest/core";

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
 * Handles all REST API requests for the endpoint `/store/order`.
 * 
 * @author <AUTHOR>
 */
@Description("Handles all REST API requests for the endpoint `/store/order`.")
@Model(Order)
@Route("/store/order")
class OrderRoute extends ModelRoute<Order> {
    protected repoUtilsClass: any = RepoUtils;

    @Summary("Count Orders")
    @Description("Returns the total count of Orders in the datastore based on the given criteria "
        + "in the header as `Content-Length`.")
    @Returns([Object])
    @Auth(["jwt"])
    @Head()
    private async count(
        @Param() params: any,
        @Query() query: any,
        @Response res: HttpResponse,
        @AuthUser user: JWTUser
    ): Promise<any> {
        return super.doCount({ params, query, res, user });
    }

    public async validateCreate(obj: Partial<Order> | Partial<Order>[], @AuthUser user: JWTUser) {
        return super.doValidate(obj, { user });
    }

    /**
     * Create a new Order.
     */
    @Summary("Create Order")
    @Description("Create a new Order.")
    @Returns([Order])
    @Auth(["jwt"])
    @Post()
    @Validate("validateCreate")
    private async create(obj: Order | Order[], @Request req: HttpRequest, @AuthUser user: JWTUser): Promise<Order | Array<Order>> {
        return super.doCreate(obj, { user, req });
    }

    /**
     * Deletes the Order
     */
    @Summary("Delete order by ID")
    @Description("Deletes the order from the service.")
    @Returns([null])
    @Auth(["jwt"])
    @Delete("/:id")
    private async delete(@Param("id") id: string, @Request req: HttpRequest, @AuthUser user: JWTUser): Promise<void> {
        return super.doDelete(id, { user, req });
    }

    /**
     * Returns all Orders from the system that the user has access to
     */
    @Summary("Find All Orders")
    @Description("Returns all Orders from the system that the user has access to.")
    @Returns([[Array, Order]])
    @Auth(["jwt"])
    @Get()
    private async findAll(@Param() params: any, @Query() query: any, @AuthUser user: JWTUser): Promise<Array<Order>> {
        return super.doFindAll({ params, query, user });
    }

    /**
     * Returns a single Order from the system that the user has access to
     */
    @Summary("Find order by ID")
    @Description("Returns a single Order from the system that the user has access to.")
    @Returns([Order])
    @Auth(["jwt"])
    @Get("/:id")
    private async findById(@Param("id") id: string, @Query() query: any, @AuthUser user: JWTUser): Promise<Order | null> {
        return super.doFindById(id, { query, user });
    }

    @Summary("Truncate Orders")
    @Description("Deletes all Orders from the datastore that the user has access to.")
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

    public async validateUpdate(@Param("id") id: string, obj: UpdateObject<Order>, @AuthUser user: JWTUser) {
        return super.doValidate(obj, { user });
    }

    /**
     * Updates a single Order
     */
    @Summary("Update order by ID")
    @Description("Updates a single Order.")
    @Returns([Order])
    @Auth(["jwt"])
    @Put("/:id")
    @Validate("validateUpdate")
    private async update(@Param("id") id: string, obj: UpdateObject<Order>, @Request req: HttpRequest, @AuthUser user: JWTUser): Promise<Order> {
        return super.doUpdate(id, obj, { user });
    }

    @Summary("Update order by ID and property")
    @Put(":id/:property")
    @Description("Updates a single property of an existing order.")
    @TypeInfo([Object])
    @Returns([Order])
    protected updateProperty(
        @Param("id") id: string,
        @Param("property") propertyName: string,
        obj: any,
        @AuthUser user: JWTUser
    ): Promise<Order> {
        return super.doUpdateProperty(id, propertyName, obj, { user });
    }
}

export default OrderRoute;
