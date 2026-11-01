import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const source=readFileSync(new URL("../sw.js",import.meta.url),"utf8");

function worker({online=false}={}){
 const listeners={},stored=new Map(),writes=[];
 const caches={
  match:async request=>stored.get(typeof request==="string"?request:request.url),
  open:async()=>({
   put:async(request,response)=>{writes.push(request.url);stored.set(request.url,response)},
   addAll:async()=>{}
  }),
  keys:async()=>[],delete:async()=>true
 };
 const self={
  location:{origin:"https://academy.example"},
  addEventListener:(type,handler)=>{listeners[type]=handler},
  skipWaiting(){},clients:{claim(){}}
 };
 const fetch=async()=>{
  if(!online)throw new Error("offline");
  return {ok:true,clone(){return {ok:true}}};
 };
 runInNewContext(source,{self,caches,fetch,URL,Response});
 function request(path,{mode="no-cors",method="GET"}={}){
  let response;
  listeners.fetch({
   request:{url:new URL(path,self.location.origin).href,mode,method},
   respondWith(value){response=value}
  });
  return response;
 }
 return {request,stored,writes};
}

test("offline JS and CSS never receive the cached HTML page",async()=>{
 const w=worker();
 w.stored.set("/index.html",{type:"html"});
 for(const path of ["/missing.js","/src/styles.css"]){
  const response=await w.request(path);
  assert.equal(response.type,"error");
  assert.equal(response.status,0);
 }
});

test("offline navigation falls back to the cached application shell",async()=>{
 const w=worker(),shell={type:"html"};
 w.stored.set("/index.html",shell);
 assert.equal(await w.request("/offline-page",{mode:"navigate"}),shell);
});

test("cached assets remain available while offline",async()=>{
 const w=worker(),asset={type:"text/css"};
 w.stored.set("https://academy.example/src/styles.css",asset);
 assert.equal(await w.request("/src/styles.css"),asset);
});

test("query variants do not create unlimited shell cache entries",async()=>{
 const w=worker({online:true});
 await w.request("/src/app.js?version=123");
 assert.deepEqual(w.writes,[]);
 await w.request("/src/app.js");
 assert.equal(w.writes.length,1);
});

test("external and non-GET requests are never intercepted",()=>{
 const w=worker();
 assert.equal(w.request("https://elsewhere.example/file.js"),undefined);
 assert.equal(w.request("/src/app.js",{method:"POST"}),undefined);
});
