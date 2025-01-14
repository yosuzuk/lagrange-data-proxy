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

    const rentryAuth = process.env.SECRET_RAW_ACCESS_CODE ?? '';
    if (!rentryAuth) {
        return { statusCode: 401, body: 'Missing access code', headers: getCorsHeaders(event) };
    }

    const csrftoken = await getCsrfToken();
    if (!csrftoken) {
        return { statusCode: 500, body: 'failed to extract token', headers: getCorsHeaders(event) };
    }

    try {
        const response = await axios.post(`https://rentry.co/api/raw/${id}`, {
            headers: {
                'Referer': 'https://rentry.co',
                'Cookie': `csrftoken=${csrftoken};`,
                'rentry-auth': rentryAuth,
            },
            data: {
                'csrfmiddlewaretoken': csrftoken,
            },
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
        await axios({
            method: 'post',
            url: `https://rentry.co/api/edit/${id}`,
            data: {
                'csrfmiddlewaretoken': csrftoken,
                'edit_code': key,
                'text': `${event.body}`,
            },
            headers: {
                Cookie: `csrftoken=${csrftoken};`,
                Referer: 'https://rentry.co',
            },
        });

        return { statusCode: 200, headers: getCorsHeaders(event) };

    } catch (e) {
        return { statusCode: 500, body: `Failed to save map data (${e})`, headers: getCorsHeaders(event) };
    }
}

function getCorsHeaders(event: HandlerEvent) {
    const allowedOrigins: string[] = [
        'https://lagrange-data.netlify.app',
        'https://yosuzuk.github.io',
        'http://localhost:3000',
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
