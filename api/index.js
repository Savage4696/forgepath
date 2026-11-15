import { handleRequest } from '../server/index.js';

export default async function handler(request, response) {
  return handleRequest(request, response);
}
