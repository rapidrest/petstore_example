///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { Column, Entity, Index } from "typeorm";
import { BaseMongoEntity, DocDecorators, ModelDecorators } from "@composer-js/service-core";

const { Cache, DataStore, Identifier, Protect } = ModelDecorators;
const { Description } = DocDecorators;

export enum UserStatus {
    OFFLINE = "OFFLINE",
    ONLINE = "ONLINE"
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
        uid: "User",
        records: [
            {
                userOrRoleId: "anonymous",
                create: true,
                read: false,
                update: false,
                delete: false,
                special: false,
                full: false,
            },
            {
                userOrRoleId: ".*",
                create: false,
                read: false,
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
export default class User extends BaseMongoEntity {
    /**
     * 
     */
    @Description("")
    @Identifier
    @Index()
    @Column()
    public username: string = "";

    /**
     * 
     */
    @Description("")
    @Column()
    public firstName: string | undefined = undefined;

    /**
     * 
     */
    @Description("")
    @Column()
    public lastName: string | undefined = undefined;

    /**
     * 
     */
    @Description("")
    @Column()
    public email: string = "";

    /**
     * 
     */
    @Description("")
    @Column()
    public password: string = "";

    /**
     * 
     */
    @Description("")
    @Column()
    public phone: string | undefined = undefined;

    /**
     * User Status
     */
    @Description("")
    @Column()
    public userStatus: UserStatus = UserStatus.OFFLINE;

    constructor(other?: any) {
        super(other);
        
        if (other) {
            this.username = "username" in other ? other.username.trim() : this.username;
            this.firstName = "firstName" in other ? other.firstName.trim() : this.firstName;
            this.lastName = "lastName" in other ? other.lastName.trim() : this.lastName;
            this.email = "email" in other ? other.email.trim() : this.email;
            this.password = "password" in other ? other.password.trim() : this.password;
            this.phone = "phone" in other ? other.phone.trim() : this.phone;
            this.userStatus = "userStatus" in other ? other.userStatus : this.userStatus;
        }
    }
}
