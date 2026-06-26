///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import Order from "../models/Order.js";
import { ModelRoute, RepoUtils } from "@rapidrest/service-core";
import { getApp } from "../lib/startup.js";

class OrderRoute extends ModelRoute<Order> {
    get modelClass(): any {
        return Order;
    }
    protected repoUtilsClass: any = RepoUtils<Order>;
}

const g = globalThis as any;

export async function getOrderModelRoute(): Promise<OrderRoute> {
    if (!g._orderModelRoute) {
        const { objectFactory } = await getApp();
        g._orderModelRoute = await objectFactory.newInstance(OrderRoute, { name: "default" });
    }
    return g._orderModelRoute;
}
