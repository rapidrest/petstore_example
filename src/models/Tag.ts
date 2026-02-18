///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { Column, Entity, Index } from "typeorm";
import { BaseMongoEntity, DocDecorators, ModelDecorators } from "@composer-js/service-core";

const { Identifier } = ModelDecorators;
const { Description } = DocDecorators;

/**
 * 
 *
 * @author <AUTHOR>
 */
@Description("")
export default class Tag {
    /**
     * 
     */
    @Description("")
    @Column()
    public name: string = "";

    constructor(other?: any) {
        if (other) {
            this.name = "name" in other ? other.name.trim() : this.name;
        }
    }
}
