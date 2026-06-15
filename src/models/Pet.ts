///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import Category from "./Category.js";
import Tag from "./Tag.js";

export enum PetStatus {
    AVAILABLE = "available",
    ADOPTED = "adopted",
}

@Entity("pets")
export default class Pet extends BaseEntity {
    @Column('object')
    public category: Category | undefined = undefined;

    @Index()
    @Column('string')
    public name: string = "";

    @Column('array')
    public photoUrls: string[] = [];

    @Column('array')
    public tags: Tag[] = [];

    @Column('string')
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
