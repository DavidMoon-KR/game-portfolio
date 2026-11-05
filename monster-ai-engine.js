(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MonsterDemo=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const defaults={patrol:110,active:235,sight:170,extendedSight:520,npcSpeed:105,playerSpeed:180,damage:12,cooldownScale:1};
  const labels={IDLE:'대기',PATROL:'순찰',CHASE:'추격',ATTACK:'스킬 사용',STUN:'기절',RETURN:'복귀',DEAD:'사망',REMOVED:'제거 완료'};
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function create(options={}){
    let cfg={...defaults,...options},time=0,seed=17,events=[],effects=[],player,npc,mode='LOOP',xp=0,kills=0,playerCD={attack:0,stun:0,dot:0};
    const origin={x:470,y:320},waypoints=[{x:410,y:260},{x:530,y:260},{x:530,y:380},{x:410,y:380}];
    const skills=[{name:'근접 타격',range:62,cd:1.5,mp:0,sp:4,mult:1},{name:'마력 탄환',range:165,cd:3.5,mp:8,sp:0,mult:.8},{name:'충격파',range:95,cd:5,mp:5,sp:8,mult:1.6}];
    function log(text){events.unshift({time,text});events=events.slice(0,40);}
    function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
    function setState(state,reason){if(npc.state!==state){npc.state=state;log(labels[state]+' · '+reason);}}
    function reset(){time=0;seed=17;events=[];effects=[];xp=0;kills=0;playerCD={attack:0,stun:0,dot:0};player={x:110,y:320,hp:160,maxHP:160};npc={...origin,hp:160,maxHP:160,mp:80,sp:100,state:'IDLE',target:false,selected:null,next:0,cooldowns:[0,0,0],stun:0,invincible:0,dots:[],waypoint:0,wait:0,goal:null,deadAt:null,rewarded:false};log('준비 완료 · 방향키로 탐지 범위에 진입하세요.');}
    function move(entity,goal,speed,dt,stop=0){const epsilon=1e-6;let d=distance(entity,goal);if(d<=stop+epsilon){if(stop<=1){entity.x=goal.x;entity.y=goal.y;}return true;}const budget=Math.max(0,speed*dt),remaining=Math.max(0,d-stop);if(budget+epsilon>=remaining){const travel=stop<=1?d:remaining;entity.x+=(goal.x-entity.x)/d*travel;entity.y+=(goal.y-entity.y)/d*travel;return true;}entity.x+=(goal.x-entity.x)/d*budget;entity.y+=(goal.y-entity.y)/d*budget;entity.x=Math.max(18,Math.min(982,entity.x));entity.y=Math.max(18,Math.min(622,entity.y));return false;}
    function damage(amount,source='player'){if(npc.state==='DEAD'||npc.state==='REMOVED')return false;if(npc.state==='RETURN'){npc.hp=npc.maxHP;log('복귀 중 · HP 초기화를 유지합니다.');return false;}if(!npc.target&&source==='player'){npc.target=true;log('피격으로 타겟 선정 · 탐지 범위 확장');}if(npc.invincible>0){log('무적 상태 · 스탯 피해 차단');return false;}npc.hp=Math.max(0,npc.hp-amount);effects.push({x:npc.x,y:npc.y,kind:'hit',ttl:.35,max:.35,text:'−'+amount});if(npc.hp<=0)die(source);return true;}
    function die(source){if(npc.rewarded)return;npc.rewarded=true;npc.target=false;npc.selected=null;npc.dots=[];npc.deadAt=time;setState('DEAD','충돌·추가 피격 해제');kills++;if(source==='player'){xp+=50;log('경험치 +50 · 아이템 드롭');}else log('아이템 드롭 · 플레이어 외 원인은 경험치 없음');}
    function action(kind){if(player.hp<=0){log('플레이어가 쓰러졌습니다. 다시 시작하세요.');return;}if(playerCD[kind]>0)return;const ranges={attack:140,stun:170,dot:170};if(!ranges[kind])return;if(npc.state==='DEAD'||npc.state==='REMOVED')return;if(distance(player,npc)>=ranges[kind]){log('플레이어 스킬 사거리 밖');return;}playerCD[kind]=kind==='attack'?.45:kind==='stun'?5:4;effects.push({x:player.x,y:player.y,range:ranges[kind],kind:'player',ttl:.28,max:.28});if(kind==='attack')damage(18);if(kind==='stun'){if(npc.state==='RETURN'){log('복귀 중 · 효과 적용 제외');return;}if(!npc.target)npc.target=true;npc.stun=3;setState('STUN','기절 3초 · 재적용 시 시간 갱신');}if(kind==='dot'){if(npc.state==='RETURN')return;if(!npc.target)npc.target=true;npc.dots.push({remaining:5,timer:0});log('지속 피해 · 0.5초마다 4 피해, 총 5회');}}
    function returnHome(reason){npc.target=false;npc.selected=null;npc.goal=null;npc.hp=npc.maxHP;npc.dots=[];setState('RETURN',reason+' · 타겟 해제·탐지 초기화·HP 회복');}
    function update(dt,input={}){dt=Math.max(0,Math.min(.05,dt));time+=dt;effects.forEach(e=>e.ttl-=dt);effects=effects.filter(e=>e.ttl>0);for(const k in playerCD)playerCD[k]=Math.max(0,playerCD[k]-dt);
      if(player.hp>0){let dx=(input.right?1:0)-(input.left?1:0),dy=(input.down?1:0)-(input.up?1:0),len=Math.hypot(dx,dy);if(len)move(player,{x:player.x+dx/len*1000,y:player.y+dy/len*1000},cfg.playerSpeed,dt);}
      npc.cooldowns=npc.cooldowns.map(c=>Math.max(0,c-dt));npc.stun=Math.max(0,npc.stun-dt);npc.invincible=Math.max(0,npc.invincible-dt);
      if(npc.state==='REMOVED')return;if(npc.state==='DEAD'){if(time-npc.deadAt>=2.5)setState('REMOVED','제거 대기 2.5초 종료');return;}
      for(const dot of npc.dots){dot.timer+=dt;while(dot.timer>=.5&&dot.remaining>0&&npc.hp>0){dot.timer-=.5;dot.remaining--;damage(4);}}npc.dots=npc.dots.filter(d=>d.remaining>0);if(npc.hp<=0)return;
      if(npc.stun>0){setState('STUN','기절 지속 중');return;}
      if(npc.state==='RETURN'){npc.hp=npc.maxHP;if(move(npc,origin,cfg.npcSpeed*1.3,dt,1)){npc.x=origin.x;npc.y=origin.y;npc.goal=null;npc.waypoint=0;npc.wait=.6;setState('IDLE','시작 지점 도착 · 순찰 경로 초기화');}return;}
      const fromHome=distance(npc,origin);if(npc.target&&fromHome>cfg.active){returnHome('활동 범위 이탈');return;}if(!npc.target&&fromHome>cfg.patrol){returnHome('순찰 범위 이탈');return;}
      if(player.hp<=0){if(npc.target){returnHome('플레이어 전투 불능');return;}}
      else if(!npc.target&&distance(npc,player)<=cfg.sight){npc.target=true;log('타겟 탐지 · 탐지 범위 '+cfg.sight+' → '+cfg.extendedSight);}
      else if(npc.target&&distance(npc,player)>cfg.extendedSight){returnHome('확장 탐지 범위 이탈');return;}
      if(npc.target){if(npc.selected===null){for(let n=0;n<3;n++){let i=(npc.next+n)%3,sk=skills[i];if(npc.cooldowns[i]<=0&&npc.mp>=sk.mp&&npc.sp>=sk.sp){npc.selected=i;break;}}}
        const i=npc.selected,sk=i===null?null:skills[i];if(sk&&distance(npc,player)<sk.range){setState('ATTACK',sk.name);npc.mp-=sk.mp;npc.sp-=sk.sp;npc.cooldowns[i]=sk.cd*cfg.cooldownScale;npc.next=(i+1)%3;npc.selected=null;player.hp=Math.max(0,player.hp-Math.round(cfg.damage*sk.mult));effects.push({x:npc.x,y:npc.y,range:sk.range,kind:'enemy',ttl:.35,max:.35,text:sk.name});log(sk.name+' · 피해 '+Math.round(cfg.damage*sk.mult));}
        else if(npc.state==='ATTACK'){setState('CHASE','다음 스킬 준비');}
        else{setState('CHASE',sk?'선정 스킬 사거리까지 이동':'쿨타임·자원 대기');move(npc,player,cfg.npcSpeed,dt,sk?Math.max(22,sk.range-5):56);}return;}
      npc.selected=null;if(mode==='STATIC'){setState('IDLE','비순찰');return;}setState('PATROL',mode==='RANDOM'?'랜덤 순찰':'루프 순찰');npc.wait=Math.max(0,npc.wait-dt);if(npc.wait>0)return;
      if(mode==='RANDOM'&&!npc.goal){let candidate;for(let attempt=0;attempt<16;attempt++){let theta=random()*Math.PI*2,r=Math.sqrt(random())*cfg.patrol*.85;candidate={x:origin.x+Math.cos(theta)*r,y:origin.y+Math.sin(theta)*r};if(distance(npc,candidate)>=Math.min(18,cfg.patrol*.25))break;}npc.goal=candidate;log('새 랜덤 순찰 좌표 · '+Math.round(candidate.x)+', '+Math.round(candidate.y));}
      const goal=mode==='RANDOM'?npc.goal:waypoints[npc.waypoint];if(move(npc,goal,cfg.npcSpeed*.65,dt,1)){npc.wait=.8;const arrived=npc.waypoint;npc.waypoint=(npc.waypoint+1)%waypoints.length;npc.goal=null;log(mode==='RANDOM'?'랜덤 순찰 지점 도착 · 0.8초 대기 후 새 좌표 선정':'순찰 지점 '+(arrived+1)+' 도착 · 다음 지점 '+(npc.waypoint+1));}
    }
    function configure(values){cfg={...cfg,...values};cfg.extendedSight=Math.max(cfg.extendedSight,cfg.sight);if(values.patrol!==undefined){const offset=Math.min(60,cfg.patrol*.55);[[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([x,y],i)=>{waypoints[i].x=origin.x+x*offset;waypoints[i].y=origin.y+y*offset;});npc.goal=null;npc.waypoint=0;npc.wait=0;}}
    function setMode(value){if(!['STATIC','RANDOM','LOOP'].includes(value))return;mode=value;npc.goal=null;npc.wait=0;log('순찰 모드 변경 · '+value);}
    function snapshot(){return{cfg,player,npc,mode,time,origin,waypoints,events,effects,skills,playerCD,xp,kills,labels,distance:distance(player,npc),homeDistance:distance(npc,origin)};}
    reset();return{update,action,reset,setMode,configure,snapshot,damage,testInvincible(){npc.invincible=5;log('무적 효과 5초 · 재적용 시 갱신');},refill(){npc.mp=80;npc.sp=100;log('시연 조작 · MP/SP 회복');},displace(){npc.x=origin.x+(npc.target?cfg.active:cfg.patrol)+12;npc.y=origin.y;log('시연 조작 · 현재 상태의 범위 밖으로 NPC 이동');},healPlayer(){player.hp=player.maxHP;log('시연 조작 · 플레이어 HP 회복');}};
  }
  return{create,defaults,labels,distance};
});
