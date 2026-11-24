/* Netlify Function: online tournaments (stored in Netlify Blobs). Logic lives in ../lib/api-core.mjs */
import { getStore } from '@netlify/blobs';
import { handle } from '../lib/api-core.mjs';

export default async (req) => handle(req, getStore('tournaments', { consistency: 'strong' }));

export const config = { path: ['/api/t', '/api/t/:id'] };
