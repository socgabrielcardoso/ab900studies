import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const code=readFileSync("src/app.js","utf8");
const content=readFileSync("src/content.js","utf8");
function harness(){
 const handlers={},storage={};
 const root={innerHTML:"",addEventListener(name,fn){handlers[name]=fn},querySelector(){return null},contains(){return true}};
 const doc={getElementById(){return root},addEventListener(){},querySelector(){return null},createElement(){return {children:[],appendChild(item){this.children.push(item)},remove(){},style:{}}},body:{appendChild(){}}};
 const localStorage={getItem(k){return storage[k]||null},setItem(k,v){storage[k]=v},removeItem(k){delete storage[k]}};
 const win={innerWidth:1200,scrollTo(){}};runInNewContext(content,{window:win});
 const fake={
  window:win,document:doc,localStorage,navigator:{},location:{protocol:"file:"},
  cancelAnimationFrame(){},matchMedia(){return {matches:true}},structuredClone:globalThis.structuredClone,
  setTimeout(){return 1},setInterval(){return 1},clearInterval(){},confirm(){return true},
  Intl,Date,Math,JSON,Number,String,Array,Object,Set,Blob
 };
 runInNewContext(code,fake);
 const click=(action,opts={})=>{
  const el={dataset:{action,...opts},matches(){return false}};
  handlers.click({target:{closest(){return el}},preventDefault(){}});
 };
 const saved=()=>JSON.parse(storage["ab900quest.v2"]||"{}");
 return {click,saved,root,data:win.AB900_DATA};
}
function answerCurrent(h,wrong=false){
 const active=h.data.cards.find(c=>h.root.innerHTML.includes(c.scene));
 assert.ok(active,"A question is visible");
 const choices=[...h.root.innerHTML.matchAll(/data-action="answer" data-index="(\d+)"[^>]*><span class="key">\d+<\/span><span>([^<]+)<\/span>/g)];
 assert.ok(choices.length>=4,"Four possible answers are available");
 const found=choices.find(([_,i,name])=>wrong?name!==active.term:name===active.term);
 assert.ok(found,"Answer choice can be identified");
 h.click("answer",{index:found[1]});
 h.click("next");
 return active.id;
}
test("first stage has interactive four-pair matching and persists rewards",()=>{
 const h=harness();
 assert.match(h.root.innerHTML,/Trilha dos 30 dias/);
 h.click("start",{day:"1",phase:"0"});
 assert.match(h.root.innerHTML,/Conecte os pares/);
 for(let i=1;i<=4;i++){h.click("pick-term",{id:"1-"+i});h.click("pick-definition",{id:"1-"+i})}
 assert.match(h.root.innerHTML,/Missão cumprida/);
 assert.equal(h.saved().completed["1-0"],true);
 assert.equal(h.saved().coins,30);
});
test("all three phases of day one unlock day two, mistakes enter spaced memory",()=>{
 const h=harness();
 h.click("start",{day:"1",phase:"0"});
 for(let i=1;i<=4;i++){h.click("pick-term",{id:"1-"+i});h.click("pick-definition",{id:"1-"+i})}
 h.click("close");
 h.click("start",{day:"1",phase:"1"});
 const missed=answerCurrent(h,true);
 for(let i=0;i<4;i++)answerCurrent(h);
 assert.match(h.root.innerHTML,/Missão cumprida/);
 assert.equal(h.saved().completed["1-1"],true);
 assert.ok(h.saved().memory[missed].lapses>=1);
 h.click("close");
 h.click("start",{day:"1",phase:"2"});
 for(let i=0;i<6;i++)answerCurrent(h);
 assert.equal(h.saved().completed["1-2"],true);
 assert.equal(h.saved().coins,135);
 h.click("close");
 h.click("start",{day:"2",phase:"0"});
 assert.match(h.root.innerHTML,/Questão 1 de 5/);
 assert.match(h.root.innerHTML,/Incidente Nexus|Guilherme recebeu|Camila está investigando|Chefe quer|Alerta no tenant/);
});
