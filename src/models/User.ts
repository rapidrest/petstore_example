///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import { Entity, Column } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";

export enum UserStatus {
    OFFLINE = "OFFLINE",
    ONLINE = "ONLINE",
}

@Entity()
export default class User extends BaseEntity {
    @Column()
    public name: string = "";

    @Column()
    public firstName: string | undefined = undefined;

    @Column()
    public lastName: string | undefined = undefined;

    @Column()
    public email: string = "";

    @Column()
    public password: string = "";

    @Column()
    public phone: string | undefined = undefined;

    @Column()
    public userStatus: UserStatus = UserStatus.OFFLINE;

    @Column()
    public roles: string[] = [];

    constructor(other?: any) {
        super(other);

        if (other) {
            this.name = "name" in other ? other.name : this.name;
            this.firstName = "firstName" in other ? other.firstName : this.firstName;
            this.lastName = "lastName" in other ? other.lastName : this.lastName;
            this.email = "email" in other ? other.email : this.email;
            this.password = "password" in other ? other.password : this.password;
            this.phone = "phone" in other ? other.phone : this.phone;
            this.userStatus = "userStatus" in other ? other.userStatus : this.userStatus;
            this.roles = "roles" in other ? other.roles : this.roles;
        }
    }
}
