///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import Order from "../models/Order.js";
import { CRUDRoute, RepoUtils } from "@rapidrest/service-core";
import { getApp } from "../lib/startup.js";

class OrderRoute extends CRUDRoute<Order> {
    get modelClass(): any {
        return Order;
    }
    protected repoUtilsClass: any = RepoUtils<Order>;
}

const g = globalThis as any;

export async function getOrderCRUDRoute(): Promise<OrderRoute> {
    if (!g._orderCRUDRoute) {
        const { objectFactory } = await getApp();
        g._orderCRUDRoute = await objectFactory.newInstance(OrderRoute, { name: "default" });
    }
    return g._orderCRUDRoute;
}
