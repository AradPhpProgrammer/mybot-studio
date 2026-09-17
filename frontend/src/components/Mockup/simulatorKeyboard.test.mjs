import test from 'node:test';
import assert from 'node:assert/strict';
import { reduceDeliveredReplyKeyboard } from './simulatorKeyboard.mjs';
const reply=[[{text:'Menu'}]], inline=[[{text:'Next',callback_data:'next'}]];
const event=(source,markup)=>({keyboard_node_id:source,reply_markup:markup});
test('any inline clears an active reply; reply replaces reply',()=>{
 const first=reduceDeliveredReplyKeyboard(null,[event('X',{keyboard:reply})]);
 assert.deepEqual(first,{source:'X',buttons:reply});
 // Unified worker rule: any inline delivery removes the active reply keyboard.
 assert.deepEqual(reduceDeliveredReplyKeyboard(first,[event('Y',{inline_keyboard:inline})]),{source:null,buttons:[]});
 const second=reduceDeliveredReplyKeyboard(first,[event('Y',{keyboard:reply})]);
 assert.equal(second.source,'Y');
 assert.deepEqual(reduceDeliveredReplyKeyboard(second,[event('X',{inline_keyboard:inline})]),{source:null,buttons:[]});
});
test('inline with no active reply leaves nothing to clear; explicit removal clears',()=>{
 const first=reduceDeliveredReplyKeyboard(null,[{reply_markup:{keyboard:reply}}]);
 assert.deepEqual(first,{source:null,buttons:reply});
 assert.deepEqual(reduceDeliveredReplyKeyboard(first,[{reply_markup:{remove_keyboard:true}}]),{source:null,buttons:[]});
 assert.deepEqual(reduceDeliveredReplyKeyboard({source:null,buttons:[]},[event('Z',{inline_keyboard:inline})]),{source:null,buttons:[]});
});
