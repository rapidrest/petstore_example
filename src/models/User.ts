///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { Entity, Column, Index } from "typeorm";
import { Identifier } from "@composer-js/service-core/dist/types/decorators/ModelDecorators.js";
import { BaseEntity } from "./BaseEntity.js";

export enum UserStatus {
    OFFLINE = "OFFLINE",
    ONLINE = "ONLINE",
}

@Entity("users")
export default class User extends BaseEntity {
    @Index()
    @Column('string')
    @Identifier
    public name: string = "";

    @Column('string')
    public firstName: string | undefined = undefined;

    @Column('string')
    public lastName: string | undefined = undefined;

    @Column('string')
    public email: string = "";

    @Column('string')
    public password: string = "";

    @Column('string')
    public phone: string | undefined = undefined;

    @Column('string')
    public userStatus: UserStatus = UserStatus.OFFLINE;

    @Column('array')
    public roles: string[] = [];

    constructor(other?: any) {
        super(other);
        if (other) {
            this.name = "name" in other ? other.name.trim() : this.name;
            this.firstName = "firstName" in other ? other.firstName?.trim() : this.firstName;
            this.lastName = "lastName" in other ? other.lastName?.trim() : this.lastName;
            this.email = "email" in other ? other.email.trim() : this.email;
            this.password = "password" in other ? other.password.trim() : this.password;
            this.phone = "phone" in other ? other.phone?.trim() : this.phone;
            this.userStatus = "userStatus" in other ? other.userStatus : this.userStatus;
            this.roles = "roles" in other ? other.roles : this.roles;
        }
    }
}
