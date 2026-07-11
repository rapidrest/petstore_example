///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz <caskater47@gmail.com>
///////////////////////////////////////////////////////////////////////////////
import { AccessControlListMongo, BaseACLRoute, RouteDecorators } from "@rapidrest/service-core";
const { Model, ApiRoute } = RouteDecorators;

@Model(AccessControlListMongo)
@ApiRoute("/acls")
export class ACLRoute extends BaseACLRoute<AccessControlListMongo> {}