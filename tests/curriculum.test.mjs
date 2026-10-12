import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const ctx={window:{}};
runInNewContext(readFileSync("src/content.js","utf8"),ctx);
const {days,cards,domains,phases,sources}=ctx.window.AB900_DATA;
test("30 days, 90 stages, and at least 120 cards",()=>{
 assert.equal(days.length,30);
 assert.equal(phases.length,3);
 assert.equal(cards.length,120);
 assert.equal(days.reduce((n,d)=>n+d.cards.length*phases.length,0),360);
});
test("days and card identifiers are unique and sequential",()=>{
 assert.equal(new Set(days.map(d=>d.day)).size,30);
 assert.equal(new Set(cards.map(c=>c.id)).size,120);
 days.forEach((d,i)=>{assert.equal(d.day,i+1);assert.equal(d.cards.length,4);d.cards.forEach(c=>assert.equal(c.day,d.day))});
});
test("every case has short explanation and decision scenario",()=>{
 cards.forEach(c=>{
  assert.ok(c.term.length>=3&&c.term.length<100,c.id);
  assert.ok(c.meaning.length>=24&&c.meaning.length<260,c.id);
  assert.ok(c.scene.length>=25&&c.scene.length<240,c.id);
  assert.ok(["m365","govern","agents"].includes(c.domain));
 });
});
test("exam domain coverage and sources remain valid",()=>{
 assert.equal(domains.length,3);
 const count=Object.fromEntries(domains.map(d=>[d.id,cards.filter(c=>c.domain===d.id).length]));
 assert.equal(count.m365,36);
 assert.equal(count.govern,48);
 assert.equal(count.agents,36);
 assert.ok(sources.some(s=>s.url.includes("learn.microsoft.com")));
});
test("site has no third-party scripts or public auth secrets",()=>{
 const html=readFileSync("index.html","utf8");
 const app=readFileSync("src/app.js","utf8");
 const csp=readFileSync("vercel.json","utf8");
 assert.ok(html.includes('lang="pt-BR"'));
 assert.ok(html.includes("src/app.js"));
 assert.ok(!/<script[^>]+src="https?:/i.test(html));
 assert.ok(app.includes("localStorage"));
 assert.ok(app.includes("dueCards"));
 assert.ok(app.includes("getContext(\"webgl\""));
 assert.ok(csp.includes("Content-Security-Policy"));
});