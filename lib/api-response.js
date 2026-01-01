import supabase from "../lib/supabase_client.js";

/**
 * Centralized API response handler
 * Manages authentication checks and sends appropriate responses
 */
export class ApiResponse {
    #req;
    #res;
    #onSuccess;
    #onError;

    /**
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} onSuccess - Callback when auth is verified (req, res, newCookie)
     * @param {Function} onError - Callback when auth fails (res, reason)
     */
    constructor(req, res, onSuccess, onError) {
        if (!req || !res || typeof onSuccess !== 'function' || typeof onError !== 'function') {
            throw new Error('ApiResponse requires req, res objects and onSuccess, onError callbacks');
        }
        this.#req = req;
        this.#res = res;
        this.#onSuccess = onSuccess;
        this.#onError = onError;
    }

    /**
     * Verify authorization and handle response
     * Sets Set-Cookie header if new cookie is provided
     */
    async send() {
        const { Auth } = await import('./auth.js');
        
        try {
            const auth = new Auth(this.#req);
            const authResult = await auth.isVerified();

            if (authResult.verified) {
                // Set cookie header if we have a new one
                if (authResult.newCookie) {
                    const setCookie = `__Host-session=${authResult.newCookie}; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; Secure; Path=/`;
                    this.#res.setHeader('Set-Cookie', setCookie);
                }
                return await this.#onSuccess(this.#req, this.#res, authResult.newCookie);
            } else {
                return this.#onError(this.#res, authResult.reason);
            }
        } catch (error) {
            console.error('Auth verification error:', error);
            return this.#onError(this.#res, 'Internal authentication error');
        }
    }
}
