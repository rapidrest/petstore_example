///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz <caskater47@gmail.com>
///////////////////////////////////////////////////////////////////////////////
import { BasePushRoute, RouteDecorators } from "@rapidrest/service-core";
const { ApiRoute } = RouteDecorators;

@ApiRoute("/push")
export class PushRoute extends BasePushRoute {}