///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { BaseMongoEntity, DocDecorators, ModelDecorators, PersistenceDecorators } from "@rapidrest/service-core";
import Category from "./Category.js";
import Tag from "./Tag.js";
const { Column, Entity, Index } = PersistenceDecorators;
const { Cache, DataStore, Identifier, Protect } = ModelDecorators;
const { Description } = DocDecorators;

export enum PetStatus {
    AVAILABLE = "available",
    ADOPTED = "adopted"
}

/**
 * 
 *
 * @author <AUTHOR>
 */
@Description("")
@Entity()
@DataStore("mongo")
@Protect(
    {
        uid: "Pet",
        records: [
            {
                userOrRoleId: "anonymous",
                create: false,
                read: true,
                update: false,
                delete: false,
                special: false,
                full: false,
            },
            {
                userOrRoleId: ".*",
                create: false,
                read: true,
                update: false,
                delete: false,
                special: false,
                full: false,
            }
        ]
    },
    true
)
@Cache()
export default class Pet extends BaseMongoEntity {
    /**
     * 
     */
    @Description("")
    @Column()
    public category: Category | undefined = undefined;

    /**
     * 
     */
    @Description("")
    @Identifier
    @Index()
    @Column()
    public name: string = "";

    /**
     * 
     */
    @Description("")
    @Column()
    public photoUrls: Array<string> = [];

    /**
     * 
     */
    @Description("")
    @Column()
    public tags: Array<Tag> = [];

    /**
     * pet status in the store
     */
    @Description("")
    @Column()
    public status: PetStatus = PetStatus.AVAILABLE;

    constructor(other?: any) {
        super(other);
        
        if (other) {
            this.category = "category" in other ? other.category : this.category;
            this.name = "name" in other ? other.name.trim() : this.name;
            this.photoUrls = "photoUrls" in other ? other.photoUrls : this.photoUrls;
            this.tags = "tags" in other ? other.tags : this.tags;
            this.status = "status" in other ? other.status : this.status;
        }
    }
}
