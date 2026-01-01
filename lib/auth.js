import supabase from "./supabase_client.js";

/**
 * Centralized authentication handler for cookie and password-based auth
 */
export class Auth {
    #req;
    #authHeader;
    #sessionCookie;

    /**
     * @param {Object} req - Express request object
     * @throws {Error} If req is not a valid object
     */
    constructor(req) {
        if (!req || typeof req !== 'object') {
            throw new Error('Auth constructor requires a valid request object');
        }
        this.#req = req;
        this.#authHeader = req.headers?.authorization || null;
        this.#sessionCookie = req.cookies?.['__Host-session'] || null;
    }

    /**
     * Check if Authorization header exists
     * @private
     * @returns {boolean}
     */
    #hasAuthHeader() {
        return !!this.#authHeader;
    }

    /**
     * Check if session cookie exists
     * @private
     * @returns {boolean}
     */
    #hasCookie() {
        return !!this.#sessionCookie;
    }

    /**
     * Verify if password in Authorization header matches expected password
     * @private
     * @returns {boolean}
     */
    #authHeaderPasswordMatch() {
        if (!this.#authHeader?.startsWith('Basic ')) {
            return false;
        }

        try {
            const encodedPassword = this.#authHeader.replace('Basic ', '');
            const expectedPassword = process.env.data_password;
            const decodedPassword = Buffer.from(encodedPassword, 'base64').toString();

            return decodedPassword === expectedPassword;
        } catch (error) {
            console.error('Error decoding auth header:', error);
            return false;
        }
    }

    /**
     * Check if cookie exists in database and is verified
     * @private
     * @returns {Promise<{found: boolean, verified: boolean, id: string|null}>}
     */
    async #isCookieVerified() {
        if (!this.#hasCookie()) {
            return { found: false, verified: false, id: null };
        }

        try {
            const dbResponse = await supabase
                .from('user_cookies')
                .select()
                .eq('cookie_string', this.#sessionCookie);

            if (dbResponse.error) {
                console.error('Database error checking cookie:', dbResponse.error);
                return { found: false, verified: false, id: null };
            }

            if (dbResponse.data.length > 0) {
                const record = dbResponse.data[0];
                return {
                    found: true,
                    verified: record.is_verified,
                    id: record.record_id
                };
            }

            return { found: false, verified: false, id: null };
        } catch (error) {
            console.error('Unexpected error checking cookie:', error);
            return { found: false, verified: false, id: null };
        }
    }

    /**
     * Create a new verified cookie in the database
     * @private
     * @returns {Promise<{success: boolean, cookie: string|null, id: string|null}>}
     */
    async #createCookie() {
        try {
            const dbResponse = await supabase
                .from('user_cookies')
                .insert({ is_verified: true })
                .select();

            if (dbResponse.error) {
                console.error('Database error creating cookie:', dbResponse.error);
                return { success: false, cookie: null, id: null };
            }

            const record = dbResponse.data[0];
            return {
                success: true,
                cookie: record.cookie_string,
                id: record.record_id
            };
        } catch (error) {
            console.error('Unexpected error creating cookie:', error);
            return { success: false, cookie: null, id: null };
        }
    }

    /**
     * Main verification method
     * Checks Authorization header first, then cookie as fallback
     * @returns {Promise<{verified: boolean, reason: string, newCookie: string|null}>}
     */
    async isVerified() {
        // Check Authorization header first
        if (this.#hasAuthHeader()) {
            if (!this.#authHeader.startsWith('Basic ')) {
                return {
                    verified: false,
                    reason: 'Invalid Authorization pattern',
                    newCookie: null
                };
            }

            if (!this.#authHeaderPasswordMatch()) {
                return {
                    verified: false,
                    reason: 'Password does not match',
                    newCookie: null
                };
            }

            // Password matched, create new cookie
            const cookieResult = await this.#createCookie();
            return {
                verified: true,
                reason: 'Authorization header verified',
                newCookie: cookieResult.success ? cookieResult.cookie : null
            };
        }

        // Fall back to cookie verification
        if (!this.#hasCookie()) {
            return {
                verified: false,
                reason: 'No Authorization header or session cookie found',
                newCookie: null
            };
        }

        const cookieCheck = await this.#isCookieVerified();

        if (!cookieCheck.found) {
            return {
                verified: false,
                reason: 'Session cookie not found',
                newCookie: null
            };
        }

        if (!cookieCheck.verified) {
            return {
                verified: false,
                reason: 'Session cookie is not verified',
                newCookie: null
            };
        }

        return {
            verified: true,
            reason: 'Session cookie verified',
            newCookie: null
        };
    }
}
