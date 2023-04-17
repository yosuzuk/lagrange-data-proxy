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

    try {
        const response = await axios.get(`https://rentry.co/api/raw/${id}`);

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

    console.log({
        csrftoken,
        key,
        text: `${event.body}`,
    });

    const bodyFormData = new FormData();
    bodyFormData.append('csrfmiddlewaretoken', csrftoken);
    bodyFormData.append('edit_code', key);
    bodyFormData.append('text', `${event.body}`);

    try {
        await axios({
            method: 'post',
            url: `https://rentry.co/api/edit/${id}`,
            data: bodyFormData,
            headers: {
                'Content-Type': 'multipart/form-data',
                Referer: 'https://rentry.co', // so weird... but taken from their official example
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
    // so weird... but taken from their official example
    return `${(await axios.get('https://rentry.co')).headers['set-cookie']}`.split('; ')[0]?.split('=')[1] ?? null;
}

export { handler };
