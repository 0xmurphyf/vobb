const http=require('http'),url=require('url'),fs=require('fs'),path=require('path');
const characters=[
  {id:'1001',name:'Adaptive Stalker',faction:'TRANSCENDENT',rarity:'R',baseHp:850,baseAtk:160,baseDef:140,baseWis:180,baseAgi:180,evolution:0,gender:'Unknown',skill:{name:'REWRITE',description:'Adapt enemy strength'},passive:{name:'Neural Sync',description:'+5% AGI per turn'},description:'Adapts to enemy patterns in real-time.'},
  {id:'1002',name:'Steadfast',faction:'PURIST',rarity:'R',baseHp:1200,baseAtk:150,baseDef:180,baseWis:90,baseAgi:100,evolution:0,gender:'M',skill:{name:'HOLD THE LINE',description:'Team DEF +20%, taunt'},passive:{name:'Iron Will',description:'DEF +40% when HP < 30%'},description:'Will not move. Will not fall.'},
  {id:'1003',name:'Fungal Lurker',faction:'WILD',rarity:'R',baseHp:800,baseAtk:160,baseDef:100,baseWis:120,baseAgi:180,evolution:0,gender:'None',skill:{name:'PACK HUNT',description:'All allies focus one target'},passive:{name:'Regeneration',description:'Heal 3% HP per turn'},description:'Life finds a way.'},
  {id:'1004',name:'Void Pearl',faction:'UNKNOWN',rarity:'R',baseHp:750,baseAtk:140,baseDef:90,baseWis:160,baseAgi:150,evolution:0,gender:'Unknown',skill:{name:'SYNCHRONIZE',description:'Copy enemy buff to ally'},passive:{name:'Unpredictable',description:'20% chance random buff'},description:'Reality bends around it.'},
  {id:'1005',name:'Chrome Reaper',faction:'CYBERIST',rarity:'R',baseHp:800,baseAtk:220,baseDef:100,baseWis:110,baseAgi:200,evolution:0,gender:'None',skill:{name:'SYSTEM OVERRIDE',description:'Team Skill Proc +30%'},passive:{name:'Overclock',description:'ATK +10%, HP drain'},description:'Overclocked beyond safe limits.'},
];
let instances=[];
const stages=[
  {stageId:'1_1',chapter:1,number:1,name:'Abandoned Lab',staminaCost:6,difficulty:1,enemies:[{name:'Feral Slime',faction:'WILD',level:1,hp:300,atk:50,def:30,wis:20,agi:40}]},
  {stageId:'1_2',chapter:1,number:2,name:'Tunnel Rats',staminaCost:6,difficulty:1,enemies:[{name:'Pack Wolf',faction:'WILD',level:2,hp:400,atk:70,def:40,wis:30,agi:60}]},
  {stageId:'1_3',chapter:1,number:3,name:'Broken Signal',staminaCost:8,difficulty:2,enemies:[{name:'Signal Wraith',faction:'UNKNOWN',level:3,hp:500,atk:90,def:50,wis:40,agi:80}]},
  {stageId:'1_4',chapter:1,number:4,name:'Outpost Defense',staminaCost:8,difficulty:2,enemies:[{name:'Raider',faction:'PURIST',level:4,hp:600,atk:100,def:60,wis:40,agi:70}]},
  {stageId:'1_5',chapter:1,number:5,name:'The Threshold',staminaCost:10,difficulty:3,enemies:[{name:'Transcendent Aspirant',faction:'TRANSCENDENT',level:5,hp:800,atk:130,def:70,wis:50,agi:90}]},
  {stageId:'2_1',chapter:2,number:1,name:'Neon Wastes',staminaCost:10,difficulty:3,enemies:[{name:'Scrap Bot',faction:'CYBERIST',level:6,hp:700,atk:110,def:80,wis:50,agi:90}]},
  {stageId:'2_2',chapter:2,number:2,name:'Fungal Depths',staminaCost:12,difficulty:4,enemies:[{name:'Spore Beast',faction:'WILD',level:7,hp:900,atk:120,def:70,wis:60,agi:100}]},
  {stageId:'2_3',chapter:2,number:3,name:'Void Rift',staminaCost:12,difficulty:4,enemies:[{name:'Void Stalker',faction:'UNKNOWN',level:8,hp:1000,atk:140,def:80,wis:70,agi:110}]},
  {stageId:'2_4',chapter:2,number:4,name:'Last Bastion',staminaCost:14,difficulty:5,enemies:[{name:'Purist Guardian',faction:'PURIST',level:9,hp:1200,atk:150,def:100,wis:70,agi:100}]},
  {stageId:'2_5',chapter:2,number:5,name:'The Core',staminaCost:16,difficulty:5,enemies:[{name:'Cyber Overlord',faction:'CYBERIST',level:10,hp:1500,atk:180,def:110,wis:80,agi:120}]},
];
let pityCounters={};
const gachaPool={id:'pool1',name:'The Awakening',active:true};
const FC={TRANSCENDENT:{c:['PURIST','WILD'],b:['UNKNOWN','CYBERIST']},PURIST:{c:['CYBERIST','UNKNOWN'],b:['TRANSCENDENT','WILD']},WILD:{c:['PURIST','UNKNOWN'],b:['TRANSCENDENT','CYBERIST']},UNKNOWN:{c:['TRANSCENDENT','CYBERIST'],b:['PURIST','WILD']},CYBERIST:{c:['TRANSCENDENT','WILD'],b:['PURIST','UNKNOWN']}};
function m32(s){let S=s|0;return()=>{S=(S+0x6d2b79f5)|0;let t=Math.imul(S^(S>>>15),1|S);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
function cs(b,l,s){const m=1+(s-1)*0.05;return{hp:Math.round(b.baseHp*(1+(l-1)*.1)*m),atk:Math.round(b.baseAtk*(1+(l-1)*.1)*m),def:Math.round(b.baseDef*(1+(l-1)*.08)*m),wis:Math.round(b.baseWis*(1+(l-1)*.08)*m),agi:Math.round(b.baseAgi*(1+(l-1)*.08)*m)}}
function send(r,d,s=200){r.writeHead(s,{'Content-Type':'application/json'});r.end(JSON.stringify(d))}
const srv=http.createServer((req,res)=>{
  const p=url.parse(req.url,true);let b='';let pp=p.pathname||'/';
  req.on('data',c=>b+=c);
  req.on('end',()=>{let pd={};try{pd=b?JSON.parse(b):{}}catch{}
    if(req.method==='GET'&&!pp.startsWith('/api')){try{const fp=path.join(__dirname,pp==='/'?'/index.html':pp);const c=fs.readFileSync(fp);const ext=path.extname(fp).slice(1);const t={html:'text/html;charset=utf-8',js:'application/javascript',css:'text/css',png:'image/png',jpg:'image/jpeg',svg:'image/svg+xml',ico:'image/x-icon'};res.writeHead(200,{'Content-Type':t[ext]||'text/plain'});res.end(c)}catch{res.writeHead(404);res.end('NF')}return}
    const api=pp.replace('/api','');
    try{
      if(api==='/auth/guest'&&req.method==='POST')return send(res,{accessToken:'t_'+Date.now(),refreshToken:'r_'+Date.now(),player:{id:'p1',name:pd.playerName||'Hunter',level:1,currencies:[{type:'gold',amount:1000},{type:'gems',amount:500},{type:'stamina',amount:100}]},user:{id:'u1',username:'guest_'+Date.now().toString(36),guest:true}});
      if(api==='/player/me'&&req.method==='GET')return send(res,{name:'Hunter',level:1,currencies:[{type:'gold',amount:1000},{type:'gems',amount:500},{type:'stamina',amount:100}]});
      if(api==='/characters'&&req.method==='GET')return send(res,characters);
      if(api==='/characters/mine'&&req.method==='GET')return send(res,instances);
      if(api.match(/\/characters\/.+\/levelup/)&&req.method==='POST'){const id=api.split('/')[2];const i=instances.find(x=>x.id===id);if(!i)return send(res,{error:'not_found'},404);i.level=(i.level||1)+1;const c=characters.find(x=>x.id===i.characterId);Object.assign(i,cs(c,i.level,i.star));return send(res,{success:true,newLevel:i.level,stats:i})}
      if(api==='/stages'&&req.method==='GET')return send(res,stages);
      if(api==='/battle/start'&&req.method==='POST'){
        const st=s=>stages.find(x=>x.stageId===s);const stage=st(pd.stageId);if(!stage)return send(res,{error:'not_found'},404);
        const bid='B-'+Date.now().toString(36).toUpperCase();const seed=Math.floor(Math.random()*2147483647);const rng=m32(seed);
        const pu=instances.slice(0,5).map(i=>{const c=characters.find(x=>x.id===i.characterId);return{id:i.id,name:c.name,faction:c.faction,rarity:c.rarity,level:i.level||1,star:i.star||1,skillLevel:1,hp:i.currentHp||c.baseHp,atk:i.currentAtk||c.baseAtk,def:i.currentDef||c.baseDef,wis:i.currentWis||c.baseWis,agi:i.currentAgi||c.baseAgi,curHp:i.currentHp||c.baseHp,maxHp:i.currentHp||c.baseHp,isAlive:true}});
        const eu=stage.enemies.map((e,i)=>({id:'e'+i,name:e.name,faction:e.faction,rarity:'N',level:e.level,star:1,skillLevel:1,hp:e.hp,atk:e.atk,def:e.def,wis:e.wis,agi:e.agi,curHp:e.hp,maxHp:e.hp,isAlive:true}));
        const ev=[];let turn=0,status='defeat';
        while(turn<50){turn++;const order=[...pu,...eu].filter(u=>u.isAlive).sort((a,b)=>b.agi-a.agi);
          for(const a of order){if(!a.isAlive)continue;const tg=(a.id.startsWith('e')?pu:eu).filter(u=>u.isAlive);if(!tg.length)break;const t=tg[Math.floor(rng()*tg.length)];
            const fc=FC[a.faction];let fm=1;if(fc?.c.includes(t.faction))fm=1.25;else if(fc?.b.includes(t.faction))fm=0.8;
            const dmg=Math.max(1,Math.round((a.atk-t.def*.5)*fm*(rng()<.1?1.5:1)*(.9+rng()*.2)));
            t.curHp=Math.max(0,t.curHp-dmg);
            if(!t.curHp){t.isAlive=false;ev.push({turn,type:'death',target:t.name,description:t.name+' defeated!',isCrit:false,isMiss:false,isSkill:false,factionRelation:'neutral'})}
            ev.push({turn,type:'attack',attacker:a.name,target:t.name,damage:dmg,isCrit:false,isMiss:false,isSkill:false,factionRelation:fm>1?'counter':fm<1?'countered':'neutral',description:a.name+' deals '+dmg+' to '+t.name})}
          if(!pu.some(u=>u.isAlive)){status='defeat';break}
          if(!eu.some(u=>u.isAlive)){status='victory';break}}
        return send(res,{status,turnCount:turn,events:ev,battleId:bid,seed,engineVersion:'0.1.0',rewards:status==='victory'?{exp:100+turn*10,gold:50+turn*5,items:[]}:null,playerTeam:pu,enemyTeam:eu})
      }
      if(api==='/gacha'&&req.method==='GET')return send(res,[{...gachaPool,items:characters.map(c=>({characterId:c.id,characterName:c.name,rarity:c.rarity,faction:c.faction,weight:25,guaranteedSr:true}))}]);
      if(api==='/gacha/pity'&&req.method==='GET'){if(!pityCounters[api])pityCounters[api]={count:0,guaranteedSr:10,guaranteedSsr:100};return send(res,pityCounters[api])}
      if(api==='/gacha/pull'&&req.method==='POST'){
        const pc=pd.pullType==='multi'?10:1;const cost=pd.pullType==='multi'?2700:300;
        if(!pityCounters[api])pityCounters[api]={count:0,guaranteedSr:10,guaranteedSsr:100};const pity=pityCounters[api];
        const results=[];const rng=m32(Date.now());
        for(let i=0;i<pc;i++){pity.count++;const r=rng();let rarity='N';
          if(pity.count>=100){rarity='SSR';pity.count=0}else if(r<.01){rarity='SSR';pity.count=0}else if(r<.25)rarity='R';
          const c=characters[Math.floor(rng()*characters.length)];const st=cs(c,1,1);const iid='inst_'+Date.now()+'_'+i;
          instances.push({id:iid,characterId:c.id,level:1,star:1,skillLevel:1,...st});
          results.push({instanceId:iid,characterId:c.id,name:c.name,faction:c.faction,rarity:c.rarity,gender:c.gender,evolution:c.evolution,level:1,star:1,currentHp:st.hp,currentAtk:st.atk,currentDef:st.def,currentWis:st.wis,currentAgi:st.agi,totalExp:c.totalExp,description:c.description,skill:c.skill,passive:c.passive})}
        return send(res,{results,gemsSpent:cost,newPityCount:pity.count})}
      if(api==='/formations'&&req.method==='GET')return send(res,[]);
      if(api==='/formations'&&req.method==='POST')return send(res,{id:'f1',...pd});
      send(res,{error:'not_found',api},404)
    }catch(e){send(res,{error:'server',message:e.message},500)}
  })
});
srv.listen(3003,'0.0.0.0',()=>console.log('Mock on :3003'));
