///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
///////////////////////////////////////////////////////////////////////////////
import { DocDecorators } from "@composer-js/service-core";

const { Description } = DocDecorators;

/**
 * 
 *
 * @author <AUTHOR>
 */
@Description("")
export default class AuthToken {
    /**
     * 
     */
    @Description("")
    public token: string = "";

    constructor(other?: any) {
        if (other) {
            this.token = other.token !== undefined ? other.token : this.token;
        }
    }
}
