import Trello from 'trello';
import { readFile } from 'fs/promises';
import json5 from 'json5';
import type { TrelloRequestParams, TrelloRESTFunction, TrelloRequestFunction, TrelloRequestResponse } from '../types.js';
import debug from 'debug';
import { getUniversalClient } from '../client.js';

export * from '../index.js';

const info = debug('af/trello#node:info');

let client: Trello | null = null;
async function waitUntilLoaded(): Promise<void> {
  if (client) return;
  const token = json5.parse(
    (await readFile('/Users/aultac/.trello/token.js'))
    .toString()
    .replace(/module\.exports += +/,'')
    .replace(';','')
  );
  if (typeof token.devKey !== 'string') {
    throw new Error('Trello Fail: token file does not have devKey');
  }
  if (typeof token.token !== 'string') {
    throw new Error('Trello Fail: token file does not have token');
  }
  client = new Trello(token.devKey, token.token);
};


//-----------------------------------------------------------------
// Trello client keeps the token locally in order to make requests
async function authorize(): Promise<void> {
  await waitUntilLoaded();
}

async function deauthorize(): Promise<void> {
  await waitUntilLoaded();
  client = null;
};


const request: TrelloRequestFunction = async (method, path, params) => {
  await waitUntilLoaded();
  try {
    const url = '/1'+path; // API has /1 on the front
    return client!.makeRequest(method, url, params);
  } catch(e: any) {
    if (e && e.response) delete e.respone;
    throw e;
  }
}

const get: TrelloRESTFunction = async (path,params) => request('get', path, params);
const put: TrelloRESTFunction = async (path,params) => request('put', path, params);
const post: TrelloRESTFunction = async (path,params) => request('post', path, params);

const _client = getUniversalClient({
  waitUntilLoaded,
  authorize,
  deauthorize,
  request,
  get,
  put,
  post
});
export function getClient() { return _client; }

