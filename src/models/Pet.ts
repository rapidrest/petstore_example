///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { Column, Entity, Index } from "typeorm";
import { BaseMongoEntity, DocDecorators, ModelDecorators } from "@composer-js/service-core";
import Category from "./Category";
import Tag from "./Tag";

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
            this.category = other.category !== undefined ? other.category : this.category;
            this.name = other.name !== undefined ? other.name.trim() : this.name;
            this.photoUrls = other.photoUrls !== undefined ? other.photoUrls : this.photoUrls;
            this.tags = other.tags !== undefined ? other.tags : this.tags;
            this.status = other.status !== undefined ? other.status : this.status;
        }
    }
}
