///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import {
    RouteDecorators,
    DocDecorators,
    CRUDRoute,
} from "@rapidrest/service-core";
import Order from "../models/Order.js";

const { Description } = DocDecorators;
const {
    Model,
    ApiRoute,
} = RouteDecorators;

/**
 * Handles all REST API requests for the endpoint `/store/order`.
 * 
 * @author <AUTHOR>
 */
@Description("Handles all REST API requests for the endpoint `/store/order`.")
@Model(Order)
@ApiRoute("/store/order")
export default class OrderRoute extends CRUDRoute<Order> {
}
