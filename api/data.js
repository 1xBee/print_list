import supabase from "../lib/supabase_client.js";
import { ApiResponse } from "../lib/api-response.js";

/**
 * Fetch inventory data based on query parameters
 */
async function getInventoryData(req) {
    let itemsQuery = req.query.items;
    let targetIds = [];

    if (itemsQuery) {
        try {
            itemsQuery = JSON.parse(itemsQuery);
            targetIds = itemsQuery.map(item => item.id);
        } catch (e) {
            console.error('Invalid items query format:', e);
        }
    }

    return await supabase.rpc('get_nested_inventory', { target_ids: targetIds });
}

/**
 * Success callback - send inventory data with optional cookie
 */
async function handleSuccess(req, res, newCookie) {
    const dbResponse = await getInventoryData(req);

    if (dbResponse.error) {
        console.error('Database error fetching inventory:', dbResponse.error);
    }

    res.status(200).json(dbResponse.data).end();
}

/**
 * Error callback - send 401 unauthorized
 */
function handleError(res, reason) {
    console.error('Authorization failed:', reason);
    res.status(401).json({ error: 'Unauthorized', reason }).end();
}

/**
 * Main API handler
 */
export default async function handler(req, res) {
    const apiResponse = new ApiResponse(req, res, handleSuccess, handleError);
    return await apiResponse.send();
}