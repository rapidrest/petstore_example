///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import {
    RouteDecorators,
    CRUDRoute
} from "@rapidrest/service-core";
import Pet from "../models/Pet.js";

const {
    Model,
    ApiRoute,
} = RouteDecorators;

/**
 * Handles all REST API requests for the endpoint `/pet`.
 * 
 * @author <AUTHOR>
 */
@Model(Pet)
@ApiRoute("/pet")
export default class PetRoute extends CRUDRoute<Pet> {
}
