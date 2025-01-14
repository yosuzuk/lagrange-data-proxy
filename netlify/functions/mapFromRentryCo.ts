import axios from 'axios';
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    try {
        switch (event.httpMethod) {
            case 'GET': {
                return loadMap(event);
            }
            case 'PUT': {
                return saveMap(event);
            }
            case 'OPTIONS': {
                return { statusCode: 200, headers: getCorsHeaders(event) };
            }
            default: {
                return { statusCode: 400, body: 'Bad request', headers: getCorsHeaders(event) };
            }
        }
    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: `Unexpected error (${e})`, headers: getCorsHeaders(event) };
    }
}

async function loadMap(event: HandlerEvent) {
    const id = event.queryStringParameters?.map;
    if (!id) {
        return { statusCode: 400, headers: getCorsHeaders(event) };
    }

    const rentryAuth = process.env.RENTRY_AUTH ?? '';
    if (!rentryAuth) {
        return { statusCode: 401, body: 'Missing auth code for Rentry API', headers: getCorsHeaders(event) };
    }

    const csrftoken = await getCsrfToken();
    if (!csrftoken) {
        return { statusCode: 500, body: 'failed to extract token', headers: getCorsHeaders(event) };
    }

    try {
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://rentry.co',
            'Cookie': `csrftoken=${csrftoken};`,
            'rentry-auth': rentryAuth,
        };

        const data = {
            'csrfmiddlewaretoken': csrftoken,
        };

        const response = await axios.post(`https://rentry.co/api/raw/${id}`, data, {
            headers,
            withCredentials: true,
        });

        const mapData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        if (typeof mapData.content !== 'string') {
            return {
                statusCode: 500,
                body: 'No data'
            };
        }

        return { statusCode: 200, headers: { 'Content-Type': 'text/plain', ...getCorsHeaders(event) }, body: mapData.content };
    } catch (e) {
        return { statusCode: 500, body: `Failed to load map data (${e})`, headers: getCorsHeaders(event) };
    }
}

async function saveMap(event: HandlerEvent) {
    const { map: id, key } = event.queryStringParameters ?? {};
    if (!id || !key) {
        return { statusCode: 400, headers: getCorsHeaders(event) };
    }

    const csrftoken = await getCsrfToken();
    if (!csrftoken) {
        return { statusCode: 500, body: 'failed to extract token', headers: getCorsHeaders(event) };
    }

    try {
        const headers = {
            Cookie: `csrftoken=${csrftoken};`,
            Referer: 'https://rentry.co',
        };

        const data = {
            'csrfmiddlewaretoken': csrftoken,
            'edit_code': key,
            'text': `${event.body}`,
        };

        await axios.post(`https://rentry.co/api/edit/${id}`, data, {
            headers,
            withCredentials: true,
        });

        return { statusCode: 200, headers: getCorsHeaders(event) };

    } catch (e) {
        return { statusCode: 500, body: `Failed to save map data (${e})`, headers: getCorsHeaders(event) };
    }
}

function getCorsHeaders(event: HandlerEvent) {
    const allowedOrigins: string[] = [
        ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
        'https://lagrange-data.netlify.app',
        'https://yosuzuk.github.io',
    ];

    const allowedOrigin = allowedOrigins.filter(allowedOrigin => allowedOrigin === (event.headers.origin ?? ''))[0];
    if (!allowedOrigin) {
        throw new Error('Unknown origin');
    }

    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS'
    };
}

async function getCsrfToken() {
    return `${(await axios.get('https://rentry.co')).headers['set-cookie']}`.split('; ')[0]?.split('=')[1] ?? null;
}

export { handler };
