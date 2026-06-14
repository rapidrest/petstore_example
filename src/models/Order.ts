///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import "reflect-metadata";
import { Entity, Column } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";

export enum OrderStatus {
    PLACED = "PLACED",
    APPROVED = "APPROVED",
    DELIVERED = "DELIVERED",
}

@Entity()
export default class Order extends BaseEntity {
    @Column()
    public petId: string = "";

    @Column()
    public quantity: number = 0;

    @Column()
    public shipDate: Date = new Date();

    @Column()
    public status: OrderStatus = OrderStatus.PLACED;

    @Column()
    public complete: boolean = false;

    constructor(other?: any) {
        super(other);

        if (other) {
            this.petId = "petId" in other ? other.petId : this.petId;
            this.quantity = "quantity" in other ? other.quantity : this.quantity;
            this.shipDate = "shipDate" in other ? new Date(other.shipDate) : this.shipDate;
            this.status = "status" in other ? other.status : this.status;
            this.complete = "complete" in other ? other.complete : this.complete;
        }
    }
}
