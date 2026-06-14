///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { ObjectIdColumn, Column } from "typeorm";
import { ObjectId } from "mongodb";
import { v4 as uuidv4 } from "uuid";

export abstract class BaseEntity {
    @ObjectIdColumn()
    _id: ObjectId = undefined as unknown as ObjectId;

    @Column()
    uid: string = uuidv4();

    @Column()
    dateCreated: Date = new Date();

    @Column()
    dateModified: Date = new Date();

    @Column()
    version: number = 0;

    constructor(other?: any) {
        if (other) {
            if (other._id) this._id = other._id;
            if (other.uid) this.uid = other.uid;
            if (other.dateCreated) this.dateCreated = new Date(other.dateCreated);
            if (other.dateModified) this.dateModified = new Date(other.dateModified);
            if (other.version !== undefined) this.version = other.version;
        }
    }
}
