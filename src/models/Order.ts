///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { BaseMongoEntity, DocDecorators, ModelDecorators, PersistenceDecorators } from "@rapidrest/service-core";
import Pet from "./Pet.js";
const { Column, Entity } = PersistenceDecorators;
const { DataStore, Protect, Reference } = ModelDecorators;
const { Description } = DocDecorators;

/**
 * Order Status
 */
export enum OrderStatus {
    PLACED = "PLACED",
    APPROVED = "APPROVED",
    DELIVERED = "DELIVERED",
}

/**
 * 
 *
 * @author <AUTHOR>
 */
@Description("")
@Entity({ collation: { locale: "en", strength: 2 }})
@DataStore("mongo")
@Description("")
@Protect(
    {
        uid: "Order",
        records: [
            {
                userOrRoleId: "anonymous",
                create: false,
                read: false,
                update: false,
                delete: false,
                special: false,
                full: false,
            },
            {
                userOrRoleId: ".*",
                create: true,
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
export default class Order extends BaseMongoEntity {
    /**
     * 
     */
    @Column()
    @Reference(Pet)
    public petId: string = "";

    /**
     * 
     */
    @Column()
    public quantity: number = 0;

    /**
     * 
     */
    @Column()
    public shipDate: Date = new Date();

    /**
     * Order Status
     */
    @Column()
    public status: OrderStatus = OrderStatus.PLACED;

    /**
     * 
     */
    @Column()
    public complete: boolean = false;

    constructor(other?: any) {
        super(other);
        
        if (other) {
            this.petId = "petId" in other ? other.petId : this.petId;
            this.quantity = "quantity" in other ? other.quantity : this.quantity;
            this.shipDate = "shipDate" in other ? other.shipDate : this.shipDate;
            this.status = "status" in other ? other.status : this.status;
            this.complete = "complete" in other ? other.complete : this.complete;
        }
    }
}