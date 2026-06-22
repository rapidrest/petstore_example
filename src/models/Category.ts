///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { DocDecorators, PersistenceDecorators, SimpleEntity } from "@rapidrest/service-core";
const { Column } = PersistenceDecorators;
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
            this.name = "name" in  other ? other.name.trim() : this.name;
        }
    }
}
