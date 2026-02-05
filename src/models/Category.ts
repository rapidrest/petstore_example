///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { Column, Entity } from "typeorm";
import { DocDecorators, ModelDecorators, SimpleEntity } from "@composer-js/service-core";

const { Identifier } = ModelDecorators;
const { Description } = DocDecorators;

/**
 * @author <AUTHOR>
 */
@Description("")
export default class Category extends SimpleEntity {
    /**
     * 
     */
    @Description("")
    @Column()
    public name: string = "";

    constructor(other?: any) {
        super(other);
        
        if (other) {
            this.name = other.name !== undefined ? other.name.trim() : this.name;
        }
    }
}
