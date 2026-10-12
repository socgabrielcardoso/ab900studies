(function ab900App(){
"use strict";
const D=window.AB900_DATA;
if(!D){document.getElementById("app").textContent="Não foi possível carregar as lições.";return}
const root=document.getElementById("app"), KEY="ab900quest.v2";
const initial={version:2,completed:{},scores:{},memory:{},history:[],notes:{},coins:0,hearts:5,streak:0,lastStudy:"",shields:0,owned:["base"],equipped:"base",audio:true,motion:true,phrase:false,createdAt:new Date().toISOString()};
let s;
try{const saved=JSON.parse(localStorage.getItem(KEY)||"null");s=saved&&saved.version===2?{...initial,...saved}:structuredClone(initial)}catch{s=structuredClone(initial)}
for(const k of ["completed","scores","memory","notes"])if(!s[k]||typeof s[k]!=="object"||Array.isArray(s[k]))s[k]={};
if(!Array.isArray(s.history))s.history=[];
if(!Array.isArray(s.owned))s.owned=["base"];
const ui={view:"journey",day:1,search:"",filter:"all",session:null,modal:"",shaderFrame:0,timerId:null,toastId:0};
const F=D.phases, getDay=n=>D.days.find(d=>d.day===n), getCard=id=>D.cards.find(c=>c.id===id);
const safe=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch{notify("Armazenamento cheio: exporte seus dados.")}};
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const dayDiff=(a,b)=>Math.round((Date.parse(b+"T12:00:00Z")-Date.parse(a+"T12:00:00Z"))/86400000);
const displayStreak=()=>{if(!s.lastStudy)return 0;const d=dayDiff(s.lastStudy,today());return d>1&&!(d===2&&s.shields>0)?0:(s.streak||0)};
const shuffled=a=>{let b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
const done=(day,phase)=>!!s.completed[day+"-"+phase];
const finishedDay=day=>F.every((_,p)=>done(day,p));
const currDay=()=>D.days.find(d=>!finishedDay(d.day))?.day||30;
const canStart=(day,phase)=>phase?done(day,phase-1):day===1||finishedDay(day-1);
const progress=()=>Object.keys(s.completed).filter(k=>s.completed[k]).length;
const rank=()=>{const p=progress();return p>=90?"Mestre dos Agentes":p>=66?"Arquiteto de Copilot":p>=36?"Guardião de Governança":p>=15?"Admin M365":"Aprendiz do Tenant"};
const domainCards=id=>D.cards.filter(c=>c.domain===id);
const cardHistory=id=>s.history.filter(h=>h.id===id);
const reviewedCards=id=>new Set(s.history.filter(h=>h.domain===id).map(h=>h.id)).size;
const dAccuracy=id=>{const a=s.history.filter(h=>h.domain===id);return a.length?Math.round(a.filter(h=>h.ok).length/a.length*100):0};
const readiness=()=>Math.round(D.domains.reduce((z,d)=>{const coverage=reviewedCards(d.id)/domainCards(d.id).length;const accurate=dAccuracy(d.id)/100;const w=d.id==="m365"?.325:d.id==="govern"?.375:.30;return z+w*(coverage*accurate*.8+(progress()/90)*.2)},0)*100);
const hearts=()=>Math.max(0,Math.min(5,Number(s.hearts)||0));
const mentor=day=>D.mentors[getDay(day).mentor];
const formatNum=n=>new Intl.NumberFormat("pt-BR").format(n);
const activeSkins={
 base:{icon:"🤖",name:"Avatar Nexus",cost:0,desc:"Sua identidade de administrador."},
 visor:{icon:"🥽",name:"Visor Holográfico",cost:120,desc:"Guilherme no modo realidade aumentada."},
 camila:{icon:"👩🏽‍🚀",name:"Camila Neon",cost:140,desc:"A guardiã futurista dos dados."},
 commander:{icon:"🦾",name:"Comandante Cibernético",cost:230,desc:"Visual de líder das operações."},
 sovereign:{icon:"👑",name:"Mestre dos Agentes",cost:400,desc:"A skin lendária da orquestração."}
};
function markStudy(){
 const t=today();if(s.lastStudy===t)return;
 if(s.lastStudy){
  const diff=dayDiff(s.lastStudy,t);
  if(diff===1)s.streak=(s.streak||0)+1;
  else if(diff>1){if(diff===2&&s.shields>0){s.shields--;s.streak=(s.streak||0)+1;notify("🧊 Bloqueio de Prompt ativado: ofensiva preservada!")}else s.streak=1}
  else if(diff<0)s.streak=1;
 }else s.streak=1;
 s.lastStudy=t;
 s.hearts=Math.min(5,hearts()+1);
 save();
}
const record=(card,ok,day)=>{
 markStudy();
 s.history.push({id:card.id,domain:card.domain,ok,at:Date.now(),day});
 if(s.history.length>2400)s.history=s.history.slice(-2000);
 const old=s.memory[card.id]||{box:0,lapses:0};
 const box=ok?Math.min(5,(old.box||0)+1):0;
 const interval=[1,1,2,4,7,14][box];
 s.memory[card.id]={box,lapses:(old.lapses||0)+(ok?0:1),nextDay:Math.min(30,day+interval),nextAt:Date.now()+interval*86400000};
 if(!ok)s.hearts=Math.max(0,hearts()-1);
 save();
};
function dueCards(day,exclude=[]){
 return D.cards.filter(c=>c.day<day&&!exclude.includes(c.id)&&s.memory[c.id]&&(s.memory[c.id].nextDay<=day||s.memory[c.id].nextAt<=Date.now()))
 .sort((a,b)=>(s.memory[b.id].lapses||0)-(s.memory[a.id].lapses||0)||s.memory[a.id].nextDay-s.memory[b.id].nextDay);
}
function chooseReview(day,exclude=[]){
 const due=dueCards(day,exclude);if(due.length)return due[0];
 const prev=D.cards.filter(c=>c.day<day&&!exclude.includes(c.id));
 return prev.length?prev[Math.floor(Math.random()*prev.length)]:null;
}
function getChoices(card){
 const peers=D.cards.filter(c=>c.id!==card.id&&c.day===card.day);
 const others=D.cards.filter(c=>c.id!==card.id&&c.domain===card.domain&&!peers.includes(c));
 const distractors=[...shuffled(peers),...shuffled(others)].filter((v,i,a)=>a.findIndex(x=>x.term===v.term)===i).slice(0,3);
 return shuffled([card,...distractors]).map(c=>c.term);
}
function makeQuestion(card,variant=0){
 const starters=[
 "🚨 Incidente Nexus: ","🧑🏻‍💻 Guilherme recebeu o ticket: ","👩🏽‍🚀 Camila está investigando: ",
 "🏢 O Chefe quer uma decisão: ","⚡ Alerta no tenant: "
 ];
 return {card,description:starters[(card.day+variant)%starters.length]+card.scene,options:getChoices(card)};
}
function sectionName(key){return ({journey:"Sua jornada",practice:"Arena de treino",glossary:"Glossário de IA",notes:"Notas de campo",shop:"Loja de Tokens",insights:"Painel de prontidão"})[key]||"Academia AB-900"}
function iconFor(){if(s.equipped==="base")return progress()>=90?"👑":progress()>=66?"🤖":progress()>=36?"🛡️":progress()>=15?"🧑🏻‍💻":"🐣";return activeSkins[s.equipped]?.icon||"🤖"}
function nav(){
 const items=[["journey","🗺️","Minha jornada"],["practice","⚔️","Arena de treino"],["glossary","📚","Glossário"],["notes","📝","Minhas notas"],["shop","🛍️","Loja de IA"],["insights","📊","Meu desempenho"]];
 return `<aside class="sidebar"><a class="brand" href="#" data-action="go" data-view="journey" aria-label="Página inicial AB-900"><span class="brand-icon">🤖</span><span><strong>AB<span>900</span> Quest</strong><small>AI ACADEMY</small></span></a><nav class="nav" aria-label="Navegação">${items.map(([id,emo,label])=>`<button class="nav-btn ${ui.view===id?"active":""}" data-action="go" data-view="${id}" ${ui.view===id?'aria-current="page"':""}><span class="nav-emoji">${emo}</span><span class="nav-name">${label}</span></button>`).join("")}</nav><div class="nav-bottom"><div class="mentor-mini"><span class="face">👩🏽‍🚀</span><div><strong>DICA DA CAMILA</strong><p>Copilot não cria permissões. Ele pode revelar onde elas estão amplas demais.</p></div></div><div class="nav-footer">Projeto de estudos independente · v1.0</div></div></aside>`
}
function topbar(){
 return `<header class="topbar"><div><span class="eyebrow">SEU QG DE APRENDIZAGEM</span><h2 class="top-title">${sectionName(ui.view)}</h2></div><div class="top-actions"><div class="pill" title="Dias consecutivos de estudo"><span class="icon">🔥</span><span class="fire">${displayStreak()}</span></div><div class="pill" title="AITokens"><span class="icon">🪙</span><span class="token">${formatNum(s.coins||0)}</span></div><div class="pill hearts" title="Vidas disponíveis"><span class="icon">💗</span><span class="heart">${hearts()}/5</span></div><button class="avatar-pill" data-action="go" data-view="insights" aria-label="Abrir desempenho">${iconFor()}</button></div></header>`
}
function hero(){
 const day=currDay(),n=progress(),pct=Math.round(n/90*100);
 return `<section class="hero" aria-label="Progresso da academia"><canvas class="hero-shader" aria-hidden="true"></canvas><div class="hero-copy"><span class="hero-badge">✦ ${rank()} · 30 DIAS · 90 FASES</span><h1>Domine a IA.<br><em>Governe o futuro.</em></h1><p>Esqueça os textões. Resolva incidentes, desbloqueie agentes e evolua até ser o mestre da administração Microsoft 365.</p><div class="btn-group"><button class="btn primary" data-action="open-day" data-day="${day}">🚀 ${n?"Continuar missão":"Começar jornada"} <span aria-hidden="true">→</span></button><button class="btn outline small" data-action="go" data-view="practice">⚔️ Revisão inteligente</button></div></div><div class="hero-robot"><div class="robot-orbit"></div><span class="robot-head">${iconFor()}</span></div></section><div class="stats-strip"><div class="stat-card"><span class="stat-icon">🎯</span><div><small>Prontidão para IA*</small><strong>${readiness()}%</strong></div></div><div class="stat-card"><span class="stat-icon">🧩</span><div><small>Fases concluídas</small><strong>${n}/90</strong></div></div><div class="stat-card"><span class="stat-icon">📅</span><div><small>Dia da jornada</small><strong>${day}/30</strong></div></div><div class="stat-card"><span class="stat-icon">⚡</span><div><small>Progresso mensal</small><strong>${pct}%</strong></div></div></div>`
}
function mapMarkup(){
 let prev="";
 return `<div class="panel map-panel"><div class="map-header"><div class="panel-title"><h3>🗺️ Trilha dos 30 dias</h3><small>${progress()}/90 fases</small></div><div class="bar"><i style="width:${progress()/90*100}%"></i></div></div><div class="journey-path">`+D.days.map(d=>{
 const n=F.filter((_,p)=>done(d.day,p)).length,locked=!canStart(d.day,0);
 const domain=d.domain;
 let head="";
 if(domain!==prev){prev=domain;const obj=D.domains.find(x=>x.id===domain);head=`<div class="domain-head"><span>${obj.icon} ${obj.name}</span><span class="domain-tag">${obj.weight} da prova</span></div>`}
 return head+`<button type="button" class="day-node ${ui.day===d.day?"selected":""} ${locked?"locked":""} ${n===3?"done":""} ${!locked&&n<3?"active":""}" data-action="open-day" data-day="${d.day}" aria-label="Dia ${d.day}, ${safe(d.title)}, ${n} de 3 fases completas"><span class="node-bubble">${n===3?"✅":locked?"🔒":d.icon}</span><span class="node-info"><span class="node-label">DIA ${String(d.day).padStart(2,"0")} · ${n===3?"CONCLUÍDO":locked?"BLOQUEADO":"EM JOGO"}</span><strong>${safe(d.title)}</strong><small>${n===3?"Todas as missões concluídas":locked?"Desbloqueie ao vencer o dia anterior":n+" de 3 fases desbloqueadas"}</small></span><span class="node-dots">${F.map((_,p)=>`<i class="node-dot ${done(d.day,p)?"cleared":""}"></i>`).join("")}</span><span class="node-go">›</span></button>`
 }).join("")+"</div></div>"
}
function mentorPanel(){
 const d=getDay(ui.day),m=mentor(ui.day);
 return `<div class="panel mentor-panel"><div class="panel-title"><h3>🗣️ Seus mentores</h3><small>CASOS DA NEXUS</small></div><div class="mentor-head"><div class="mentor-avatar">${m.icon}</div><div><h3>${m.name}</h3><p>${m.role}</p></div></div><div class="speech">${safe(d.story)}</div><div class="mini-progress"><div class="progress-labels"><span>Domínio do tema</span><strong>${Math.round(F.filter((_,p)=>done(d.day,p)).length/3*100)}%</strong></div><div class="bar pink"><i style="width:${F.filter((_,p)=>done(d.day,p)).length/3*100}%"></i></div></div></div>`
}
function detailPanel(){
 const d=getDay(ui.day);return `<div class="panel detail-panel"><div class="detail-head"><div class="detail-icon">${d.icon}</div><div><span class="eyebrow">OPERAÇÃO ${String(d.day).padStart(2,"0")}</span><h3>${safe(d.title)}</h3></div></div><p>${safe(d.story)}</p><div class="stage-list">${F.map((f,p)=>{const blocked=!canStart(d.day,p),completed=done(d.day,p);return `<button class="stage-row ${completed?"passed":""}" data-action="start" data-day="${d.day}" data-phase="${p}" ${blocked?"disabled":""}><span class="stage-icon">${completed?"✅":blocked?"🔒":f.icon}</span><span><strong>Fase ${p+1} · ${f.title}</strong><small>${completed?"Revisitar e praticar":f.short}</small></span><span class="stage-state">${completed?"✓":blocked?"🔐":"›"}</span></button>`}).join("")}</div></div>`
}
function journey(){
 return hero()+`<div class="section-top"><div><h2>🪐 Seu universo de missões</h2><p>Cada dia: aprender → aplicar → decidir. O mapa avança com suas vitórias.</p></div><span class="domain-tag">3 fases por dia</span></div><div class="dashboard-grid">${mapMarkup()}<div style="display:grid;gap:17px">${mentorPanel()}${detailPanel()}<div class="rewards-banner"><span>🎁</span><div><strong>Recompensas e evolução</strong><p>Ganhe até 135 AITokens por dia, mantenha sua ofensiva e equipe skins exclusivas.</p></div></div><p class="tiny-text">*Prontidão é um indicador didático interno, não uma estimativa oficial de nota da Microsoft.</p></div></div>`
}
function practice(){
 const n=dueCards(currDay()+1).length;return `<div class="view-header"><span class="eyebrow">⚔️ TREINAMENTO ADAPTATIVO</span><h1>Arena da Memória</h1><p>Seus erros são transformados em novos incidentes corporativos. Revisar é como aplicar patches na sua memória.</p></div><div class="stats-strip"><div class="stat-card"><span class="stat-icon">🧠</span><div><small>Conceitos vistos</small><strong>${new Set(s.history.map(x=>x.id)).size}/120</strong></div></div><div class="stat-card"><span class="stat-icon">🔁</span><div><small>Revisões prontas</small><strong>${n}</strong></div></div><div class="stat-card"><span class="stat-icon">🔥</span><div><small>Ofensiva</small><strong>${displayStreak()} dias</strong></div></div><div class="stat-card"><span class="stat-icon">🧊</span><div><small>Bloqueios de Prompt</small><strong>${s.shields||0}</strong></div></div></div><div class="view-grid"><div class="info-card"><span class="big-emoji">🔁</span><h3>Revisão espaçada</h3><p>5 casos priorizando questões erradas e conceitos que precisam de reforço.</p><button class="btn primary" data-action="review">Começar revisão →</button></div><div class="info-card"><span class="big-emoji">🏁</span><h3>Simulado AB-900</h3><p>20 situações, 15 minutos, cobrindo as três áreas do exame. Questões autorais.</p><button class="btn cyan" data-action="mock">Iniciar simulado →</button></div><div class="info-card"><span class="big-emoji">🎓</span><h3>Missão final</h3><p>Depois das 90 fases, refaça os pontos fracos até atingir domínio consistente.</p><button class="btn outline" data-action="go" data-view="insights">Ver minha prontidão →</button></div></div><div class="rewards-banner"><span>💡</span><div><strong>O segredo não é decorar, é distinguir.</strong><p>O mesmo objetivo pode aparecer em cenários diferentes. Compare Purview, SharePoint, Entra e Copilot até decidir sem hesitação.</p></div></div>`
}
function filteredCards(){
 const q=ui.search.trim().toLocaleLowerCase("pt-BR");return D.cards.filter(c=>(ui.filter==="all"||c.domain===ui.filter)&&[c.term,c.meaning,c.scene].join(" ").toLocaleLowerCase("pt-BR").includes(q));
}
function glossaryItems(){
 const list=filteredCards();return list.length?list.map(c=>`<article class="glossary-card"><div class="term-top"><strong>${safe(c.term)}</strong><small>DIA ${c.day}</small></div><p>${safe(c.meaning)}</p></article>`).join(""):`<div class="empty-state"><span>🔍</span>Nenhum conceito encontrado.</div>`;
}
function glossary(){
 return `<div class="view-header"><span class="eyebrow">📚 CONHECIMENTO EM PÍLULAS</span><h1>Dicionário de batalha</h1><p>120 termos essenciais da AB-900, com linguagem curta e foco nas decisões da prova.</p></div><input class="searchbox" type="search" aria-label="Buscar conceitos" placeholder="🔍 Busque: Purview, Graph, agentes, MFA..." id="search-glossary" value="${safe(ui.search)}"><div class="btn-group" style="margin:0 0 20px">${[["all","Todos"],...D.domains.map(d=>[d.id,d.icon+" "+d.name])].map(([id,name])=>`<button class="toggle ${ui.filter===id?"on":""}" data-action="filter" data-filter="${id}">${name}</button>`).join("")}</div><div class="cards-list" id="glossary-results">${glossaryItems()}</div>`;
}
function notes(){
 return `<div class="view-header"><span class="eyebrow">📝 OBSIDIAN-LIKE STUDY VAULT</span><h1>Suas notas de campo</h1><p>Escreva suas próprias explicações. As notas ficam no navegador e podem ser exportadas em um backup JSON.</p></div><div class="split-row" style="margin:0 0 18px"><span class="tiny-text">💾 Salvamento automático local</span><button class="btn small outline" data-action="export">⬇️ Exportar progresso + notas</button></div><div class="note-grid">${D.days.map(d=>`<div class="note-card"><h3>${d.icon} Dia ${String(d.day).padStart(2,"0")} · ${safe(d.title)}</h3><textarea class="field" data-note="${d.day}" aria-label="Notas do dia ${d.day}" maxlength="4000" placeholder="O que eu aprendi? O que ainda confundo?">${safe(s.notes[d.day]||"")}</textarea></div>`).join("")}</div>`;
}
function shop(){
 const extras=[{id:"shield",icon:"🧊",name:"Bloqueio de Prompt",cost:85,desc:"Protege sua ofensiva após um dia sem estudo (uso automático)."}, {id:"heart",icon:"💗",name:"Memória Extra",cost:50,desc:"Restaura até 3 vidas usadas nos desafios."}, {id:"quote",icon:"💬",name:"Protocolo Confiança",cost:75,desc:"Desbloqueia uma mensagem exclusiva de motivação estratégica."}];
 const items=[...Object.entries(activeSkins).filter(([id])=>id!=="base").map(([id,x])=>({...x,id})),...extras];
 return `<div class="view-header"><span class="eyebrow">🪙 ECONOMIA DE IA</span><h1>Loja de AITokens</h1><p>Seus esforços viram skins e recursos. Somente moedas virtuais, sem compras ou pagamentos reais.</p></div><div class="rewards-banner" style="margin:0 0 22px"><span>🪙</span><div><strong>Saldo disponível: ${formatNum(s.coins||0)} AITokens</strong><p>Fase 1: +30 · Fase 2: +45 · Fase 3: +60. Repetições não geram moedas.</p></div></div><div class="view-grid">${items.map(item=>{
 const owned=s.owned.includes(item.id),equipped=s.equipped===item.id,consumable=["shield","heart"].includes(item.id),buy=consumable||!owned;
 return `<article class="info-card ${owned&&!consumable?"owned":""}"><span class="big-emoji">${item.icon}</span><h3>${item.name}</h3><p>${item.desc}</p><span class="price">🪙 ${item.cost} tokens</span><button class="btn ${equipped?"outline":owned&&!consumable?"cyan":"primary"} block" data-action="${buy?"buy":"equip"}" data-item="${item.id}" ${buy&&(s.coins||0)<item.cost?"disabled":""}>${equipped?"✓ Equipado":buy?"Adquirir":"Equipar skin"}</button></article>`}).join("")}</div>`;
}
function domainMeters(){
 return D.domains.map(d=>{
 const coverage=Math.round(reviewedCards(d.id)/domainCards(d.id).length*100),acc=dAccuracy(d.id);
 return `<div class="meter"><div class="meter-title"><span>${d.icon} ${d.name}</span><strong>${acc}%</strong></div><div class="progress-labels"><span>Precisão das respostas</span><span>${coverage}% dos conceitos vistos · ${d.weight}</span></div><div class="bar"><i style="width:${acc}%"></i></div></div>`
 }).join("");
}
function insights(){
 const badges=[["🌱","Primeira fase",progress()>=1],["🛡️","Guardião dos dados",D.days.slice(9,21).some(d=>finishedDay(d.day))],["🔥","3 dias de ofensiva",displayStreak()>=3],["💎","7 dias de ofensiva",displayStreak()>=7],["🏆","90 fases completas",progress()===90],["🧠","100 conceitos vistos",new Set(s.history.map(x=>x.id)).size>=100]];
 const total=s.history.length,accuracy=total?Math.round(s.history.filter(h=>h.ok).length/total*100):0;
 return `<div class="view-header"><span class="eyebrow">📊 COPILOT ANALYTICS SIMULADO</span><h1>Central de prontidão</h1><p>Aqui estão suas métricas reais dentro do treinamento. Elas não representam pontuação oficial nem acesso ao tenant Microsoft.</p></div><div class="stats-strip"><div class="stat-card"><span class="stat-icon">🎯</span><div><small>Prontidão didática</small><strong>${readiness()}%</strong></div></div><div class="stat-card"><span class="stat-icon">📍</span><div><small>Precisão global</small><strong>${accuracy}%</strong></div></div><div class="stat-card"><span class="stat-icon">📚</span><div><small>Respostas registradas</small><strong>${total}</strong></div></div><div class="stat-card"><span class="stat-icon">✅</span><div><small>Fases completas</small><strong>${progress()}/90</strong></div></div></div><div class="analytics-layout"><section class="panel"><div class="panel-title"><h3>🧬 Desempenho por domínio</h3><small>Pesos oficiais</small></div>${domainMeters()}<p class="tiny-text">Sua prontidão combina cobertura de termos, acertos e fases concluídas, não prevê nota de exame.</p></section><section class="panel"><div class="panel-title"><h3>🏅 Conquistas desbloqueadas</h3><small>${badges.filter(x=>x[2]).length}/${badges.length}</small></div><div class="achievement-grid">${badges.map(([i,n,yes])=>`<div class="achievement ${yes?"unlocked":""}"><span>${i}</span><strong>${n}</strong></div>`).join("")}</div></section><section class="panel"><div class="panel-title"><h3>📋 Últimas atividades</h3><small>${Math.min(total,7)} registros</small></div><div class="record-list">${s.history.slice(-7).reverse().map(h=>{const c=getCard(h.id);return `<div class="record"><span>${h.ok?"✅":"🔁"} ${safe(c?.term||"Conceito")}</span><span>${h.ok?"Acerto":"Revisar"}</span></div>`}).join("")||'<p class="muted">Comece sua primeira fase para ver resultados.</p>'}</div></section><section class="panel"><div class="panel-title"><h3>⚙️ Sua academia</h3><small>Privacidade</small></div><div class="btn-group"><button class="toggle ${s.audio?"on":""}" data-action="audio">🔊 Sons ${s.audio?"ligados":"desligados"}</button><button class="toggle ${s.motion?"on":""}" data-action="motion">✨ Efeitos ${s.motion?"ligados":"reduzidos"}</button></div><p class="tiny-text">O progresso é salvo apenas neste navegador. Não há login, sincronização em nuvem ou acesso a dados Microsoft. Faça backup antes de trocar de dispositivo.</p><div class="btn-group"><button class="btn small cyan" data-action="export">⬇️ Exportar backup</button><button class="btn small outline" data-action="import">⬆️ Importar backup</button><button class="btn small danger" data-action="reset">Redefinir dados</button></div><input hidden type="file" id="import-file" accept="application/json,.json"><p class="warning">🔒 Não escreva senhas, tokens ou informações confidenciais reais nas anotações.</p></section></div><div class="section-top"><h2>🔗 Fontes oficiais para conferir</h2></div><div class="cards-list">${D.sources.map(x=>`<div class="glossary-card"><strong>${safe(x.label)}</strong><p style="margin-top:8px"><a href="${safe(x.url)}" target="_blank" rel="noopener noreferrer">Abrir documentação Microsoft ↗</a></p></div>`).join("")}</div><p class="fineprint">AB-900 Quest é independente e não afiliada à Microsoft. Verifique o guia atualizado antes do exame. Matriz indicada para 14/10/2026.</p>`;
}
function startShader(){
 cancelAnimationFrame(ui.shaderFrame);
 const canvas=root.querySelector(".hero-shader");
 if(!canvas||!s.motion||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 let gl;try{gl=canvas.getContext("webgl",{alpha:true,powerPreference:"low-power"})}catch{return}
 if(!gl)return;
 const vert="attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
 const frag="precision mediump float;uniform vec2 r;uniform float t;void main(){vec2 uv=gl_FragCoord.xy/r.xy;vec2 p=(uv-.5)*vec2(r.x/r.y,1.);float a=sin(p.x*3.+t*.48)*cos(p.y*4.-t*.42);float b=sin(length(p-vec2(.3*sin(t*.2),0.))*9.-t);vec3 c=mix(vec3(.12,.07,.32),vec3(.08,.39,.55),smoothstep(-.5,.9,a+b*.5));float bloom=exp(-5.*length(p-vec2(.38,.1)))*.36;c+=vec3(.4,.25,.6)*bloom;gl_FragColor=vec4(c,.93);}";
 const shader=(type,src)=>{let x=gl.createShader(type);gl.shaderSource(x,src);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw Error("Shader unavailable");return x};
 let program;
 try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vert));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return}catch{return}
 const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);gl.useProgram(program);
 const loc=gl.getAttribLocation(program,"a");gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 const resolution=gl.getUniformLocation(program,"r"),tm=gl.getUniformLocation(program,"t");let last=0;
 function frame(ms){if(!canvas.isConnected)return;if(ms-last>44){last=ms;const width=Math.max(1,Math.floor(canvas.clientWidth*.65)),height=Math.max(1,Math.floor(canvas.clientHeight*.65));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height)}gl.uniform2f(resolution,width,height);gl.uniform1f(tm,ms*.001);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}ui.shaderFrame=requestAnimationFrame(frame)}
 ui.shaderFrame=requestAnimationFrame(frame);
}
function paint(){
 cancelAnimationFrame(ui.shaderFrame);
 root.innerHTML=`<div class="shell">${nav()}<div class="main-area" id="main">${topbar()}${ui.view==="journey"?journey():ui.view==="practice"?practice():ui.view==="glossary"?glossary():ui.view==="notes"?notes():ui.view==="shop"?shop():insights()}</div></div>${ui.session?sessionMarkup():""}`;
 if(ui.view==="journey")startShader();
}
function openDay(day){ui.day=Number(day);ui.view="journey";paint();const panel=root.querySelector(".detail-panel");if(panel&&window.innerWidth<901)panel.scrollIntoView({behavior:s.motion?"smooth":"auto",block:"nearest"})}
function startStage(day,phase){
 day=Number(day);phase=Number(phase);
 if(!canStart(day,phase)){notify("🔒 Conclua a fase anterior para liberar esta missão.");return}
 const cards=getDay(day).cards;
 const base=shuffled(cards);
 if(phase===0){
  const review=chooseReview(day,base.map(x=>x.id));
  ui.session={kind:"stage",day,phase,step:0,total:4+(review?1:0),matched:[],pick:null,review,reviewDone:!review,definitions:shuffled(base),terms:shuffled(base),correct:0,attempts:0,feedback:null,result:null};
 }else{
  const exclude=base.map(c=>c.id);const one=chooseReview(day,exclude);
  if(one)base.push(one);
  if(phase===2){const second=chooseReview(day,[...exclude,one?.id].filter(Boolean));if(second)base.push(second);else base.push(shuffled(cards)[0])}
  while(base.length< (phase===1?5:6))base.push(shuffled(cards)[0]);
  const questions=shuffled(base).map((c,i)=>makeQuestion(c,phase+i));
  ui.session={kind:"stage",day,phase,questions,step:0,correct:0,attempts:0,feedback:null,result:null,seconds:phase===2?90:null};
 }
 paint();if(phase===2)beginTimer();
}
function startReview(mock=false){
 let cards;
 if(mock){
  const groups=D.domains.map(d=>shuffled(domainCards(d.id)).slice(0,d.id==="m365"?7:d.id==="govern"?8:5));
  cards=shuffled(groups.flat());
 }else{
  cards=dueCards(Math.max(currDay(),2)).slice(0,5);
  const seen=shuffled(D.cards.filter(c=>s.history.some(h=>h.id===c.id)&&!cards.some(x=>x.id===c.id)));
  cards=[...cards,...seen].slice(0,5);
  if(cards.length<5)cards=[...cards,...shuffled(D.cards.filter(c=>!cards.some(x=>x.id===c.id)))].slice(0,5);
 }
 ui.session={kind:mock?"mock":"review",day:currDay(),phase:mock?2:1,questions:cards.map((c,i)=>makeQuestion(c,i+8)),step:0,correct:0,attempts:0,feedback:null,result:null,seconds:mock?900:null};
 paint();if(mock)beginTimer();
}
function beginTimer(){
 clearInterval(ui.timerId);
 if(!ui.session||ui.session.seconds==null)return;
 ui.timerId=setInterval(()=>{
  const sess=ui.session;if(!sess||sess.result){clearInterval(ui.timerId);return}
  sess.seconds=Math.max(0,sess.seconds-1);
  const t=root.querySelector("#clock");if(t){t.textContent=formatTime(sess.seconds);t.classList.toggle("low",sess.seconds<16)}
  if(sess.seconds<=0)finishSession(true);
 },1000);
}
const formatTime=x=>`${Math.floor(x/60)}:${String(x%60).padStart(2,"0")}`;
function questionMarkup(q,index,len){
 const sess=ui.session,feedback=sess.feedback;
 return `<div class="exercise-head"><div class="progress-tracks">${Array.from({length:len},(_,i)=>`<span class="track ${i<index?"done":i===index?"now":""}"></span>`).join("")}</div><div class="exercise-meta"><span>Questão ${index+1} de ${len} · ${getDay(q.card.day).icon} Dia ${q.card.day}</span>${sess.seconds!=null?`<span class="timer" id="clock">⏱ ${formatTime(sess.seconds)}</span>`:"<span>🧠 Pense antes de responder</span>"}</div></div><h3 class="question-title">${safe(q.description)}</h3><p class="question-hint">Qual recurso, conceito ou controle resolve esse cenário?</p><div class="answer-list">${q.options.map((opt,i)=>`<button class="answer ${feedback?(opt===q.card.term?"correct":feedback.choice===i&&!feedback.ok?"wrong":""):""}" data-action="answer" data-index="${i}" ${feedback?"disabled":""}><span class="key">${i+1}</span><span>${safe(opt)}</span></button>`).join("")}</div>${feedback?`<div class="feedback ${feedback.ok?"ok":"bad"}"><strong>${feedback.ok?"✅ Correto! + conhecimento":"👩🏽‍🚀 Camila: precisamos revisar isso"}</strong><div>${safe(q.card.meaning)}</div></div>`:""}<div class="exercise-footer"><small>${feedback?"Resposta registrada na memória de estudo.":"Teclas 1–4 para responder."}</small>${feedback?`<button class="btn primary" data-action="next">${index===len-1?"Ver resultado":"Próxima →"}</button>`:""}</div>`;
}
function matchMarkup(){
 const e=ui.session,remaining=e.terms.filter(x=>!e.matched.includes(x.id));
 if(!e.reviewDone){
  const q=makeQuestion(e.review,3);
  e.activeReview=e.activeReview||q;
  return questionMarkup(e.activeReview,0,e.total);
 }
 return `<div class="exercise-head"><div class="progress-tracks">${Array.from({length:e.total},(_,i)=>`<span class="track ${i<e.step?"done":i===e.step?"now":""}"></span>`).join("")}</div><div class="exercise-meta"><span>${e.matched.length}/4 pares conectados</span><span>🧠 Fase de vocabulário</span></div></div><h3 class="question-title">🔗 Conecte os pares</h3><p class="question-hint">Selecione um termo à esquerda e sua função à direita. A Camila ajuda quando há dúvidas.</p><div class="match-grid"><div class="match-column">${e.terms.map(c=>`<button class="match-tile ${e.pick===c.id?"picked":""} ${e.matched.includes(c.id)?"matched":""}" data-action="pick-term" data-id="${c.id}" ${e.matched.includes(c.id)?"disabled":""}>${safe(c.term)}</button>`).join("")}</div><div class="match-column">${e.definitions.map(c=>`<button class="match-tile definition ${e.matched.includes(c.id)?"matched":""}" data-action="pick-definition" data-id="${c.id}" ${e.matched.includes(c.id)||!e.pick?"disabled":""}>${safe(c.meaning)}</button>`).join("")}</div></div>${e.feedback?`<div class="feedback ${e.feedback.ok?"ok":"bad"}">${e.feedback.ok?"✨ Par correto!":`👩🏽‍🚀 Dica: ${safe(e.feedback.tip)}`}</div>`:""}<div class="exercise-footer"><small>Restam ${remaining.length} pares</small><span class="tiny-text">Primeiro o nome, depois a definição.</span></div>`;
}
function sessionMarkup(){
 const e=ui.session;if(!e)return "";
 const label=e.kind==="stage"?F[e.phase].title:e.kind==="mock"?"Simulado AB-900":"Revisão inteligente";
 const icon=e.kind==="stage"?F[e.phase].icon:e.kind==="mock"?"🏁":"🔁";
 return `<div class="overlay" role="dialog" aria-modal="true" aria-label="${safe(label)}"><div class="modal ${e.phase===0&&!e.result?"wide":""}"><button class="modal-close" data-action="close" aria-label="Fechar desafio">×</button><div class="modal-top"><span class="em">${icon}</span><div><small>${e.kind==="stage"?`DIA ${e.day} · FASE ${e.phase+1}`:"ARENA DE TREINO"}</small><h2>${safe(label)}</h2></div></div>${e.result?resultMarkup(e):e.kind==="stage"&&e.phase===0?matchMarkup():questionMarkup(e.questions[e.step],e.step,e.questions.length)}</div></div>`;
}
function resultMarkup(e){
 const r=e.result;
 return `<div class="results"><div class="trophy">${r.pass?"🏆":"🛡️"}</div><h2>${r.pass?"Missão cumprida!":"Missão precisa de reforço"}</h2><p>${r.pass?"Guilherme respira aliviado. Camila aprovou sua decisão. Sua patente: ${rank()}.": "Nada de decorar no escuro: revise as dicas e tente de novo. O conhecimento se constrói."}</p><div class="result-score"><span>🎯 Precisão</span><strong>${r.percent}%</strong><span>${r.correct}/${r.total} acertos</span></div>${r.reward?`<p style="font-size:16px;color:var(--yellow)">🪙 +${r.reward} AITokens conquistados!</p>`:""}${r.timeout?'<p class="warning">⏱ O tempo acabou; respostas restantes foram contadas como não respondidas.</p>':""}<div class="btn-group"><button class="btn primary" data-action="close">${r.pass?"Voltar à jornada":"Fechar e revisar"}</button>${e.kind==="stage"?`<button class="btn outline" data-action="retry">🔁 Repetir fase</button>`:`<button class="btn outline" data-action="${e.kind==="mock"?"mock":"review"}">🔁 Novo treino</button>`}</div></div>`;
}
function finishSession(timeout=false){
 const e=ui.session;if(!e||e.result)return;
 clearInterval(ui.timerId);ui.timerId=null;
 const total=e.kind==="stage"&&e.phase===0?e.total:e.questions.length;
 const correct=e.correct;
 const percent=Math.round(correct/Math.max(total,e.attempts)*100);
 const pass=percent>=70&&!timeout;
 let reward=0;
 if(pass&&e.kind==="stage"){
  const key=e.day+"-"+e.phase;
  if(!done(e.day,e.phase)){
   s.completed[key]=true;reward=[30,45,60][e.phase];
   s.coins=Math.max(0,(s.coins||0)+reward);
   if(e.phase===2)notify("📈 Dia "+e.day+" concluído! "+Math.round(progress()/90*100)+"% da trilha concluída.");
   if(e.day===30&&e.phase===2)notify("🏆 Jornada completa! Agora consolide nos simulados.");
  }
  s.scores[key]=Math.max(s.scores[key]||0,percent);
  save();
 }
 e.result={pass,percent,correct,total,reward,timeout};
 if(pass){celebrate();beep(true)}else beep(false);
 paint();
}
function chooseAnswer(index){
 const e=ui.session;if(!e||e.result||e.feedback)return;
 const review=e.kind==="stage"&&e.phase===0&&!e.reviewDone;
 const q=review?e.activeReview:e.questions[e.step];if(!q)return;
 const ok=q.options[index]===q.card.term;
 e.correct+=Number(ok);e.attempts++;
 record(q.card,ok,e.day);e.feedback={ok,choice:index};
 beep(ok);if(ok)celebrate(15);else shake();
 paint();
}
function nextQuestion(){
 const e=ui.session;if(!e||!e.feedback)return;
 if(e.kind==="stage"&&e.phase===0&&!e.reviewDone){e.reviewDone=true;e.step=1;e.feedback=null;paint();return}
 e.step++;e.feedback=null;
 if((e.kind==="stage"&&e.phase===0&&e.matched.length>=4)||(e.questions&&e.step>=e.questions.length)){finishSession();return}
 paint();
}
function matchPick(id,side){
 const e=ui.session;if(!e||e.result||e.phase!==0||!e.reviewDone)return;
 if(side==="term"){e.pick=id;e.feedback=null;paint();return}
 if(!e.pick)return;
 const card=getCard(e.pick),ok=id===e.pick;
 e.attempts++;record(card,ok,e.day);
 if(ok){e.correct++;e.matched.push(id);e.step++;e.pick=null;e.feedback={ok:true};beep(true);celebrate(10)}
 else {e.feedback={ok:false,tip:card.meaning};e.pick=null;beep(false);shake()}
 if(e.matched.length===4){finishSession();return}
 paint();
}
function buy(id){
 const items={...activeSkins,shield:{cost:85},heart:{cost:50},quote:{cost:75}};
 const item=items[id];if(!item)return;
 const owned=s.owned.includes(id);
 if(id==="quote"&&s.phrase){notify("Protocolo já desbloqueado.");return}
 if(id!=="heart"&&id!=="shield"&&owned){s.equipped=id;save();paint();return}
 if((s.coins||0)<item.cost){notify("🪙 Tokens insuficientes.");return}
 if(id==="heart"&&hearts()===5){notify("💗 Suas vidas já estão completas.");return}
 s.coins-=item.cost;
 if(id==="shield")s.shields=(s.shields||0)+1;
 else if(id==="heart")s.hearts=Math.min(5,hearts()+3);
 else if(id==="quote"){s.phrase=true;s.owned.push(id);notify("💬 Poder sem controle não é liderança. Domine a si mesmo antes do tenant.")}
 else {s.owned.push(id);s.equipped=id}
 save();beep(true);celebrate();paint();
}
function exportData(){
 const blob=new Blob([JSON.stringify(s,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="ab900quest-backup-"+today()+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
 notify("⬇️ Backup exportado.");
}
function importData(file){
 if(!file||file.size>1000000){notify("Arquivo inválido ou muito grande (máximo 1 MB).");return}
 const reader=new FileReader();
 reader.onload=()=>{
  try{
   const data=JSON.parse(String(reader.result));
   if(data.version!==2||!data.completed||!data.history||!Array.isArray(data.history))throw Error("Formato inválido");
   if(!confirm("Substituir o progresso local pelo backup selecionado?"))return;
   s={...structuredClone(initial),...data};
   for(const k of ["completed","scores","memory","notes"])if(!s[k]||typeof s[k]!=="object"||Array.isArray(s[k]))s[k]={};
   s.history=s.history.slice(-2400).filter(h=>h&&typeof h.id==="string"&&typeof h.ok==="boolean");
   s.owned=Array.isArray(s.owned)?s.owned.filter(x=>Object.keys(activeSkins).includes(x)||x==="quote"):["base"];
   if(!activeSkins[s.equipped])s.equipped="base";
   s.coins=Math.max(0,Math.min(100000,Number(s.coins)||0));s.hearts=Math.max(0,Math.min(5,Number(s.hearts)||0));
   save();ui.session=null;ui.view="insights";paint();notify("✅ Backup importado com sucesso.");
  }catch{notify("Não foi possível validar esse arquivo JSON.")}
 };
 reader.readAsText(file);
}
function reset(){
 if(!confirm("Apagar TODAS as fases, tokens, notas e históricos deste navegador? Esta ação não pode ser desfeita sem backup."))return;
 localStorage.removeItem(KEY);s=structuredClone(initial);ui.session=null;ui.day=1;ui.view="journey";paint();notify("Dados locais redefinidos.");
}
function notify(text){
 const item=document.createElement("div");item.className="toast";item.textContent=text;
 let wrap=document.querySelector(".toast-wrap");if(!wrap){wrap=document.createElement("div");wrap.className="toast-wrap";document.body.appendChild(wrap)}
 wrap.appendChild(item);setTimeout(()=>{item.remove();if(!wrap.children.length)wrap.remove()},3200);
}
function celebrate(count=42){
 if(!s.motion||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 const colors=["#ff8bbb","#65edcb","#9b8aff","#ffe179","#5ec5ff"];
 for(let i=0;i<count;i++){
  const b=document.createElement("span");b.className="confetti-bit";b.style.left=(27+Math.random()*47)+"vw";b.style.top=(18+Math.random()*31)+"vh";b.style.background=colors[i%colors.length];b.style.setProperty("--dx",(Math.random()*600-300)+"px");b.style.setProperty("--dy",(Math.random()*420-50)+"px");b.style.animationDelay=Math.random()*.14+"s";document.body.appendChild(b);setTimeout(()=>b.remove(),1300);
 }
}
function shake(){const modal=root.querySelector(".modal");if(modal){modal.classList.add("shake");setTimeout(()=>modal.classList.remove("shake"),390)}}
let audioCtx;
function beep(ok){
 if(!s.audio)return;
 try{
  audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain(),now=audioCtx.currentTime;
  osc.type=ok?"sine":"triangle";osc.frequency.setValueAtTime(ok?650:210,now);osc.frequency.exponentialRampToValueAtTime(ok?1000:140,now+.12);
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.08,now+.01);gain.gain.exponentialRampToValueAtTime(.0001,now+.21);
  osc.connect(gain).connect(audioCtx.destination);osc.start(now);osc.stop(now+.22);
 }catch{}
}
function closeSession(){clearInterval(ui.timerId);ui.timerId=null;ui.session=null;ui.view="journey";ui.day=currDay();paint()}
root.addEventListener("click",event=>{
 const el=event.target.closest("[data-action]");if(!el||!root.contains(el))return;
 if(el.matches("a"))event.preventDefault();
 const action=el.dataset.action;
 if(action==="go"){ui.view=el.dataset.view;ui.session=null;paint();window.scrollTo({top:0,behavior:"instant"})}
 else if(action==="open-day")openDay(el.dataset.day);
 else if(action==="start")startStage(el.dataset.day,el.dataset.phase);
 else if(action==="close")closeSession();
 else if(action==="answer")chooseAnswer(Number(el.dataset.index));
 else if(action==="next")nextQuestion();
 else if(action==="pick-term")matchPick(el.dataset.id,"term");
 else if(action==="pick-definition")matchPick(el.dataset.id,"definition");
 else if(action==="review")startReview(false);
 else if(action==="mock")startReview(true);
 else if(action==="retry"){const {day,phase}=ui.session;startStage(day,phase)}
 else if(action==="filter"){ui.filter=el.dataset.filter;paint()}
 else if(action==="buy")buy(el.dataset.item);
 else if(action==="equip"){s.equipped=el.dataset.item;save();paint()}
 else if(action==="export")exportData();
 else if(action==="import")root.querySelector("#import-file")?.click();
 else if(action==="reset")reset();
 else if(action==="audio"){s.audio=!s.audio;save();paint()}
 else if(action==="motion"){s.motion=!s.motion;save();paint()}
});
root.addEventListener("input",event=>{
 const e=event.target;if(e.dataset.note){s.notes[e.dataset.note]=e.value;save()}
 if(e.id==="search-glossary"){ui.search=e.value;const list=root.querySelector("#glossary-results");if(list)list.innerHTML=glossaryItems()}
});
root.addEventListener("change",event=>{if(event.target.id==="import-file")importData(event.target.files?.[0])});
document.addEventListener("keydown",e=>{
 const sess=ui.session;if(!sess||e.target.closest("input,textarea"))return;
 if(e.key==="Escape"){closeSession();return}
 if(sess.result)return;
 if(e.key==="Enter"&&sess.feedback){e.preventDefault();nextQuestion();return}
 if(["1","2","3","4"].includes(e.key)&&(sess.kind!=="stage"||sess.phase!==0||!sess.reviewDone)&&!sess.feedback){e.preventDefault();chooseAnswer(Number(e.key)-1)}
});
ui.day=currDay();paint();
if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("/sw.js").catch(()=>{});
})();
