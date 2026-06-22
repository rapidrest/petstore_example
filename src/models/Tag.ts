///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { DocDecorators, PersistenceDecorators } from "@rapidrest/service-core";
const { Column } = PersistenceDecorators;
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
