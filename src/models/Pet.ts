///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import { Entity, Column } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import Category from "./Category.js";
import Tag from "./Tag.js";

export enum PetStatus {
    AVAILABLE = "available",
    ADOPTED = "adopted",
}

@Entity()
export default class Pet extends BaseEntity {
    @Column()
    public category: Category | undefined = undefined;

    @Column()
    public name: string = "";

    @Column()
    public photoUrls: string[] = [];

    @Column()
    public tags: Tag[] = [];

    @Column()
    public status: PetStatus = PetStatus.AVAILABLE;

    constructor(other?: any) {
        super(other);

        if (other) {
            this.category = "category" in other ? other.category : this.category;
            this.name = "name" in other ? other.name : this.name;
            this.photoUrls = "photoUrls" in other ? other.photoUrls : this.photoUrls;
            this.tags = "tags" in other ? other.tags : this.tags;
            this.status = "status" in other ? other.status : this.status;
        }
    }
}
