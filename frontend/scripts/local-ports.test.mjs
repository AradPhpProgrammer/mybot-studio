import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../vite.config.js';
test('local dev ports and both API/media route to the backend',()=>{
 assert.equal(config.server.port,23568);
 assert.equal(config.server.strictPort,true);
 for(const route of ['/api','/media']) assert.equal(config.server.proxy[route].target,'http://127.0.0.1:23567');
});
