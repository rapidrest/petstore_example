///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////

export default class AuthToken {
    public token: string = "";

    constructor(other?: any) {
        if (other) {
            this.token = "token" in other ? other.token : this.token;
        }
    }
}
