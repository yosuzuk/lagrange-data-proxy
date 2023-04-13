import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import axios from 'axios';

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    try {
        switch (event.httpMethod) {
            case 'GET': {
                return getMapResponse(event);
            }
            case 'OPTIONS': {
                return { statusCode: 200, headers: getCorsHeaders(event) };
            }
            default: {
                return { statusCode: 400, body: 'Bad request' };
            }
        }
    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: `Unexpected error (${e})` };
    }
}

async function getMapResponse(event: HandlerEvent) {
    const id = event.queryStringParameters?.map;
    if (!id) {
        return { statusCode: 400 };
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
        return { statusCode: 500, body: `Failed to load map data (${e})` };
    }
}

function getCorsHeaders(event: HandlerEvent) {
    const allowedOrigins: string[] = [
        'https://lagrange-data.netlify.app',
        'https://yosuzuk.github.io',
        'http://localhost',
    ];

    const allowedOrigin = allowedOrigins.filter(allowedOrigin => allowedOrigin === (event.headers.origin ?? ''))[0];
    if (!allowedOrigin) {
        throw new Error('Unknown origin');
    }

    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };
}

export { handler };
