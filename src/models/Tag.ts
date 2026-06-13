///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////

export default class Tag {
    public name: string = "";

    constructor(other?: any) {
        if (other) {
            this.name = "name" in other ? other.name.trim() : this.name;
        }
    }
}
