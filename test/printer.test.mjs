import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dots, printerAction, printerAvailable, validateAnswers} from '../printer.mjs';
const answer=(name,choice)=>({name,type:'choice',choice,confidence:.8});
test('printer eligibility respects occupancy and pet inventory limits',()=>{
  assert.equal(printerAvailable('a',[],new Date(2000).toISOString(),1000),false);
  assert.equal(printerAvailable('a',[],null,1000),true);
  const dots=Array.from({length:3},()=>({pet_id:'a',item_type:'dot'}));
  assert.equal(printerAvailable('a',dots,null,1000),false);
  assert.equal(printerAvailable('b',dots,null,1000),true);
  assert.equal(printerAvailable('a',Array.from({length:12},()=>({pet_id:'a',item_type:'food'})),null,1000),false);
});
test('only offered decisions and known figures are accepted',()=>{
  assert.equal(validateAnswers([answer('action','use_printer'),answer('dot',dots[0].value)],[printerAction]).dot,'pink_dot');
  assert.throws(()=>validateAnswers([answer('action','use_printer'),answer('dot','unknown')],[printerAction]));
  assert.throws(()=>validateAnswers([answer('action','use_printer'),answer('dot','pink_dot')],[]));
  assert.equal(validateAnswers([answer('action','explore'),answer('dot','unknown')],[{value:'explore'}]).dot,null);
});
