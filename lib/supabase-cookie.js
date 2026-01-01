import supabase from "./supabase_client.js";

export async function checkCookieState(cookie) {
    // Validate cookie argument
    if (!cookie || cookie.toString().trim().length === 0) {
        return returnHandler(false, null, null, 'cookie argument is required', true);
    }

    try {
        const dbResponse = await supabase
            .from('user_cookies')
            .select()
            .eq('cookie_string', cookie);

        if (dbResponse.error) {
            console.error('Database error fetching cookie:', dbResponse.error);
            return returnHandler(false, null, null, 'internal error fetching the database: ' + dbResponse.error.message, true);
        } else if (dbResponse.data.length > 0) {
            const record = dbResponse.data[0];
            return returnHandler(true, record.record_id, record.is_verified, '', false);
        } else {
            return returnHandler(false, null, null, 'cookie not found', false);
        }
    } catch (error) {
        console.error('Unexpected error checking cookie:', error);
        return returnHandler(false, null, null, 'unexpected error fetching the database: ' + error, true);
    }
}

// Create a new cookie in the database
export async function createCookie(verified = false) {
    if (typeof verified !== 'boolean') {
        return returnHandler(false, null, null, 'the "verified" parameter must be a boolean', true);
    }

    try {
        const dbResponse = await supabase
            .from('user_cookies')
            .insert({ is_verified: verified })
            .select();

        if (dbResponse.error) {
            console.error('Database error creating cookie:', dbResponse.error);
            return returnHandler(false, null, null, 'internal error fetching the database: ' + dbResponse.error.message, true);
        }

        const record = dbResponse.data[0];
        return returnHandler(true, record.record_id, record.is_verified, record.cookie_string, false);
    } catch (error) {
        console.error('Unexpected error creating cookie:', error);
        return returnHandler(false, null, null, 'unexpected error fetching the database: ' + error, true);
    }
}


function returnHandler(success, id, verified, message = '', error) {
    return { success, id, verified, message, error };
}

