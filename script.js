// ═══════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════
let DB = { players:[], games:[], tournaments:[], leagues:[] };
const SAVE_KEY = 'pt_v3';
function save(){ localStorage.setItem(SAVE_KEY, JSON.stringify(DB)); }
function load(){
  try { const d=localStorage.getItem(SAVE_KEY); if(d) DB=JSON.parse(d); } catch(e){}
  if(!DB.players) DB.players=[];
  if(!DB.games) DB.games=[];
  if(!DB.tournaments) DB.tournaments=[];
  if(!DB.leagues) DB.leagues=[];
}
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

// ═══════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════
let darkMode = false;
function loadTheme(){
  darkMode = localStorage.getItem('pt_dark')==='1';
  applyTheme();
}
function toggleTheme(){
  darkMode=!darkMode;
  localStorage.setItem('pt_dark', darkMode?'1':'0');
  applyTheme();
}
function applyTheme(){
  document.documentElement.setAttribute('data-theme', darkMode?'dark':'light');
  document.getElementById('theme-toggle').textContent = darkMode?'☀️':'🌙';
}

// ═══════════════════════════════════════════
// NAV
// ═══════════════════════════════════════════
let curPage='home';
const pages=['home','stats','history','settings'];
function showPage(p){
  curPage=p;
  document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));
  document.getElementById('pg-'+p).classList.add('active');
  document.querySelectorAll('nav button').forEach((b,i)=>b.classList.toggle('active',pages[i]===p));
  ({home:renderHome,stats:renderStats,history:renderHistory,settings:renderSettings})[p]();
}

// ═══════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════
let _toastT;
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(_toastT); _toastT=setTimeout(()=>t.classList.remove('show'),2200);
}

// ═══════════════════════════════════════════
// MODAL HELPERS
// ═══════════════════════════════════════════
function openM(id){ document.getElementById('ov-'+id).classList.add('open'); }
function closeM(id){ document.getElementById('ov-'+id).classList.remove('open'); }
function mEl(id){ return document.getElementById('m-'+id); }
// Close on backdrop click
document.querySelectorAll('.overlay').forEach(ov=>{
  ov.addEventListener('click', e=>{ if(e.target===ov){ const id=ov.id.replace('ov-',''); closeM(id); } });
});

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
const pName = id => { const p=DB.players.find(x=>x.id===id); return p?p.name:'?'; };
const ini = name => name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
const fmtDate = ts => new Date(ts).toLocaleDateString(undefined,{month:'short',day:'numeric'});
const fmtDateLong = ts => new Date(ts).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});

function playerGames(pid, limit, filter){
  let g = DB.games.filter(g=>g.p1===pid||g.p2===pid);
  if(filter==='quick') g=g.filter(x=>x.type==='game');
  else if(filter && filter.startsWith('t:')) g=g.filter(x=>x.tournamentId===filter.slice(2));
  else if(filter && filter.startsWith('l:')) g=g.filter(x=>x.leagueId===filter.slice(2));
  g.sort((a,b)=>b.date-a.date);
  if(limit) g=g.slice(0,limit);
  return g;
}
function playerStats(pid, limit, filter){
  const g=playerGames(pid,limit,filter);
  let wins=0,losses=0,pf=0,pa=0;
  g.forEach(game=>{
    const my=game.p1===pid?game.s1:game.s2, op=game.p1===pid?game.s2:game.s1;
    pf+=my; pa+=op;
    if(my>op) wins++; else losses++;
  });
  const tot=wins+losses;
  return {wins,losses,total:tot,winRate:tot?Math.round(wins/tot*100):0,
    avgFor:tot?(pf/tot).toFixed(1):'0.0',avgAg:tot?(pa/tot).toFixed(1):'0.0',pf,pa};
}
function playerStreak(pid){
  return DB.games.filter(g=>g.p1===pid||g.p2===pid)
    .sort((a,b)=>b.date-a.date).slice(0,8)
    .map(g=>{ const my=g.p1===pid?g.s1:g.s2,op=g.p1===pid?g.s2:g.s1; return my>op?'w':'l'; });
}
function h2h(p1,p2){
  const g=DB.games.filter(g=>(g.p1===p1&&g.p2===p2)||(g.p1===p2&&g.p2===p1));
  let w1=0,w2=0;
  g.forEach(game=>{ const my=game.p1===p1?game.s1:game.s2,op=game.p1===p1?game.s2:game.s1; if(my>op)w1++;else w2++; });
  return {games:g.length,w1,w2};
}
function avatarHtml(name,lg=''){
  return `<div class="avatar ${lg}">${ini(name)}</div>`;
}
function streakHtml(arr){
  return `<div class="streak">${arr.map(r=>`<span class="${r}"></span>`).join('')}</div>`;
}

// ═══════════════════════════════════════════
// PLAYER SEARCH WIDGET
// ═══════════════════════════════════════════
function playerSearchWidget(containerId, selected, maxSelect, onToggle){
  const c=document.getElementById(containerId);
  if(!c) return;
  const q=(c.querySelector('.ps-input')||{value:''}).value.toLowerCase();
  const filtered=DB.players.filter(p=>p.name.toLowerCase().includes(q));
  const selArr=Array.isArray(selected)?selected:[selected].filter(Boolean);
  c.innerHTML=`
    <div class="input-search mb8" style="margin-bottom:8px">
      <input class="input ps-input" placeholder="Search players…" value="${q}"
        oninput="playerSearchWidget('${containerId}',selectedPlayers_${containerId},${maxSelect},${onToggle})">
    </div>
    <div class="player-grid">
      ${filtered.length?filtered.map(p=>{
        const sel=selArr.includes(p.id);
        const order=selArr.indexOf(p.id)+1;
        return `<button class="p-chip${sel?' selected':''}" onclick="togglePS_${containerId}('${p.id}')">
          ${p.name}
          ${sel&&maxSelect>2?`<span class="p-chip-num">${order}</span>`:''}
        </button>`;
      }).join(''):'<div style="color:var(--muted);font-size:13px;grid-column:span 2;padding:8px">No players found</div>'}
    </div>
  `;
}

// ═══════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════
function renderHome(){
  const el=document.getElementById('pg-home');
  const hasPl=DB.players.length>=2;
  const recentGames=DB.games.slice().sort((a,b)=>b.date-a.date).slice(0,5);
  const sorted=DB.players.map(p=>({p,s:playerStats(p.id)}))
    .sort((a,b)=>b.s.winRate-a.s.winRate||b.s.wins-a.s.wins);

  el.innerHTML=`
    <div class="section-label">Quick Start</div>
    <div class="card">
      ${!hasPl?`<div class="empty" style="padding:16px 0"><span class="empty-ico">👤</span><p>Add at least 2 players in Settings</p></div>`:`
        <div class="btn-row">
          <button class="btn btn-primary flex-1" onclick="startGameSetup()">⚡ Quick Game</button>
          <button class="btn btn-secondary flex-1" onclick="startTournamentSetup()">🏆 Tournament</button>
        </div>
        <button class="btn btn-secondary btn-full mt-8" onclick="startLeagueSetup()">🥇 League</button>
      `}
    </div>

    ${recentGames.length?`
    <div class="section-label">Recent Games</div>
    <div class="card">
      ${recentGames.map(g=>{
        const w=g.s1>g.s2?g.p1:g.p2;
        return `<div class="hist-item">
          <div class="hist-info">
            <div class="hist-match">${pName(g.p1)} vs ${pName(g.p2)}</div>
            <div class="hist-sub">${fmtDate(g.date)} · <span style="color:var(--win)">${pName(w)} won</span>
              ${g.type==='tournament'?'· <span class="chip chip-warn" style="font-size:10px">Tourn.</span>':''}
              ${g.type==='league'?'· <span class="chip chip-accent" style="font-size:10px">League</span>':''}
            </div>
          </div>
          <div class="hist-score ${g.s1>g.s2?'bm-winner':'bm-loser'}">${g.s1}–${g.s2}</div>
        </div>`;
      }).join('')}
    </div>`:''}

    ${sorted.length?`
    <div class="section-label">Leaderboard</div>
    <div class="card">
      ${sorted.map((item,i)=>{
        const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`;
        return `<div class="lb-item" onclick="openPlayerDetail('${item.p.id}')">
          <span class="lb-rank">${medal}</span>
          ${avatarHtml(item.p.name)}
          <div class="lb-info">
            <div class="lb-name">${item.p.name}</div>
            <div class="lb-sub">${item.s.wins}W ${item.s.losses}L · ${item.s.total} games</div>
            <div class="win-bar"><div class="win-bar-fill" style="width:${item.s.winRate}%"></div></div>
          </div>
          <div class="lb-pct" style="color:${item.s.winRate>=60?'var(--win)':item.s.winRate<=40?'var(--lose)':'var(--text)'}">${item.s.winRate}%</div>
        </div>`;
      }).join('')}
    </div>`:''}
  `;
}

// ═══════════════════════════════════════════
// GAME SETUP
// ═══════════════════════════════════════════
let gSetup={p1:null,p2:null};
window.selectedPlayers_game_p1=null;
window.selectedPlayers_game_p2=null;

function startGameSetup(){
  gSetup={p1:null,p2:null};
  mEl('game').innerHTML=`
    <div class="modal-handle"></div>
    <div class="modal-header">
      <div class="modal-title">Quick Game</div>
      <button class="close-btn" onclick="closeM('game')">✕</button>
    </div>
    <div class="card-label">Player 1</div>
    <div id="gp1-wrap"></div>
    <div class="card-label" style="margin-top:10px">Player 2</div>
    <div id="gp2-wrap"></div>
    <div class="btn-row mt-12">
      <button class="btn btn-secondary flex-1" onclick="closeM('game')">Cancel</button>
      <button class="btn btn-primary flex-1" onclick="launchGame()">Start Game</button>
    </div>
  `;
  openM('game');
  // Setup search widgets
  window.selectedPlayers_game_p1=null;
  window.selectedPlayers_game_p2=null;
  window.togglePS_gp1_wrap=function(id){
    gSetup.p1=id; window.selectedPlayers_game_p1=id;
    playerSearchWidget('gp1-wrap',[id],1,'window.togglePS_gp1_wrap');
  };
  window.togglePS_gp2_wrap=function(id){
    gSetup.p2=id; window.selectedPlayers_game_p2=id;
    playerSearchWidget('gp2-wrap',[id],1,'window.togglePS_gp2_wrap');
  };
  playerSearchWidget('gp1-wrap',[],1,'window.togglePS_gp1_wrap');
  playerSearchWidget('gp2-wrap',[],1,'window.togglePS_gp2_wrap');
}

function launchGame(){
  if(!gSetup.p1||!gSetup.p2){toast('Select both players');return;}
  if(gSetup.p1===gSetup.p2){toast('Pick different players');return;}
  closeM('game');
  openScoringModal(gSetup.p1,gSetup.p2,'game',null,null,()=>{refreshCurrent();});
}

// ═══════════════════════════════════════════
// SCORING MODAL
// ═══════════════════════════════════════════
let SC={p1:null,p2:null,s1:0,s2:0,type:'game',tid:null,lid:null,onFinish:null,hist:[]};

function openScoringModal(p1,p2,type,tid,lid,onFinish){
  SC={p1,p2,s1:0,s2:0,type,tid,lid,onFinish,hist:[]};
  renderScoringUI();
  openM('scoring');
}

function renderScoringUI(){
  mEl('scoring').innerHTML=`
    <div class="modal-handle"></div>
    <div class="modal-header">
      <div class="modal-title">Live Score</div>
      <button class="close-btn" onclick="if(confirm('Abandon this game?'))closeM('scoring')">✕</button>
    </div>
    <div class="scoreboard-wrap">
      <div class="scoreboard">
        <div class="sc-col">
          <div class="sc-name">${pName(SC.p1)}</div>
          <span class="sc-num" id="sc-n1">${SC.s1}</span>
          <div class="sc-btns">
            <button class="sc-btn" onclick="addPt(1,1)">+1</button>
            <button class="sc-btn minus" onclick="addPt(1,-1)">−1</button>
          </div>
        </div>
        <div class="sc-vs">:</div>
        <div class="sc-col">
          <div class="sc-name">${pName(SC.p2)}</div>
          <span class="sc-num" id="sc-n2">${SC.s2}</span>
          <div class="sc-btns">
            <button class="sc-btn" onclick="addPt(2,1)">+1</button>
            <button class="sc-btn minus" onclick="addPt(2,-1)">−1</button>
          </div>
        </div>
      </div>
      <div style="text-align:center;margin:6px 0">
        <button class="btn btn-secondary btn-sm" onclick="undoPt()">↩ Undo</button>
      </div>
    </div>
    <hr class="divider">
    <div class="card-label">Or enter final score directly</div>
    <div class="score-edit-row" style="margin-bottom:12px">
      <input type="number" id="man-s1" min="0" placeholder="0" class="input" style="width:70px;text-align:center;font-family:'DM Mono',monospace;font-size:22px">
      <span style="color:var(--muted);font-size:18px;padding:0 4px">–</span>
      <input type="number" id="man-s2" min="0" placeholder="0" class="input" style="width:70px;text-align:center;font-family:'DM Mono',monospace;font-size:22px">
      <button class="btn btn-secondary btn-sm" onclick="applyManual()">Set</button>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary flex-1" onclick="if(confirm('Abandon?'))closeM('scoring')">Abandon</button>
      <button class="btn btn-primary flex-1" onclick="finishGame()">✔ Save Game</button>
    </div>
  `;
}

function addPt(pl,d){
  SC.hist.push({s1:SC.s1,s2:SC.s2});
  if(pl===1) SC.s1=Math.max(0,SC.s1+d);
  else SC.s2=Math.max(0,SC.s2+d);
  const el=document.getElementById('sc-n'+(pl));
  el.textContent=pl===1?SC.s1:SC.s2;
  el.classList.add('bump');
  setTimeout(()=>el.classList.remove('bump'),120);
}
function undoPt(){
  if(!SC.hist.length) return;
  const p=SC.hist.pop(); SC.s1=p.s1; SC.s2=p.s2;
  document.getElementById('sc-n1').textContent=SC.s1;
  document.getElementById('sc-n2').textContent=SC.s2;
}
function applyManual(){
  const v1=parseInt(document.getElementById('man-s1').value);
  const v2=parseInt(document.getElementById('man-s2').value);
  if(isNaN(v1)||isNaN(v2)){toast('Enter both scores');return;}
  SC.hist.push({s1:SC.s1,s2:SC.s2}); SC.s1=v1; SC.s2=v2;
  document.getElementById('sc-n1').textContent=v1;
  document.getElementById('sc-n2').textContent=v2;
}
function finishGame(){
  if(SC.s1===0&&SC.s2===0){toast('Score is 0–0');return;}
  if(SC.s1===SC.s2){toast('No draws allowed');return;}
  const game={
    id:uid(), p1:SC.p1, p2:SC.p2, s1:SC.s1, s2:SC.s2,
    date:Date.now(), type:SC.type,
    tournamentId:SC.tid||null, leagueId:SC.lid||null
  };
  DB.games.push(game); save();
  closeM('scoring');
  toast(pName(SC.s1>SC.s2?SC.p1:SC.p2)+' wins!');
  if(SC.onFinish) SC.onFinish(game);
}
function refreshCurrent(){ ({home:renderHome,stats:renderStats,history:renderHistory,settings:renderSettings})[curPage](); }

// ═══════════════════════════════════════════
// EDIT SCORE
// ═══════════════════════════════════════════
function openEditScore(gameId){
  const g=DB.games.find(x=>x.id===gameId);
  if(!g) return;
  mEl('edit-score').innerHTML=`
    <div class="modal-handle"></div>
    <div class="modal-header">
      <div class="modal-title">Edit Score</div>
      <button class="close-btn" onclick="closeM('edit-score')">✕</button>
    </div>
    <div style="text-align:center;margin-bottom:14px;font-size:14px;color:var(--muted)">${pName(g.p1)} vs ${pName(g.p2)}</div>
    <div class="score-edit-row" style="justify-content:center;margin-bottom:16px">
      <div style="text-align:center">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${pName(g.p1)}</div>
        <input type="number" id="es-s1" value="${g.s1}" min="0" class="input" style="width:80px;text-align:center;font-family:'DM Mono',monospace;font-size:26px">
      </div>
      <span style="color:var(--muted);font-size:22px;align-self:flex-end;padding-bottom:6px">–</span>
      <div style="text-align:center">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${pName(g.p2)}</div>
        <input type="number" id="es-s2" value="${g.s2}" min="0" class="input" style="width:80px;text-align:center;font-family:'DM Mono',monospace;font-size:26px">
      </div>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary flex-1" onclick="closeM('edit-score')">Cancel</button>
      <button class="btn btn-primary flex-1" onclick="saveEditedScore('${gameId}')">Save</button>
    </div>
  `;
  openM('edit-score');
}
function saveEditedScore(id){
  const g=DB.games.find(x=>x.id===id);
  const s1=parseInt(document.getElementById('es-s1').value);
  const s2=parseInt(document.getElementById('es-s2').value);
  if(isNaN(s1)||isNaN(s2)){toast('Enter valid scores');return;}
  if(s1===s2){toast('No draws');return;}
  g.s1=s1; g.s2=s2; save();
  closeM('edit-score'); toast('Score updated');
  refreshCurrent();
}

// ═══════════════════════════════════════════
// TOURNAMENT SETUP
// ═══════════════════════════════════════════
let tSetup={name:'',format:'semi',selected:[]};

function startTournamentSetup(){
  tSetup={name:'',format:'semi',selected:[]};
  window.selectedPlayers_tourn=[];
  window.togglePS_t_wrap=function(id){
    const arr=window.selectedPlayers_tourn;
    const idx=arr.indexOf(id);
    if(idx>=0) arr.splice(idx,1); else arr.push(id);
    tSetup.selected=[...arr];
    playerSearchWidget('t-wrap',arr,999,'window.togglePS_t_wrap');
  };
  renderTournSetupModal();
  openM('tournament');
}

function renderTournSetupModal(){
  mEl('tournament').innerHTML=`
    <div class="modal-handle"></div>
    <div class="modal-header">
      <div class="modal-title">New Tournament</div>
      <button class="close-btn" onclick="closeM('tournament')">✕</button>
    </div>
    <div class="field">
      <label>Name</label>
      <input class="input" id="t-name" placeholder="Round 1…" value="${tSetup.name}" oninput="tSetup.name=this.value">
    </div>
    <div class="field">
      <label>Format</label>
      <select class="input" id="t-fmt" onchange="tSetup.format=this.value">
        <option value="semi" ${tSetup.format==='semi'?'selected':''}>Semi-finals (½) — 2 semis + final</option>
        <option value="quarter" ${tSetup.format==='quarter'?'selected':''}>Quarter-finals (¼) — 4 QF + 2 SF + final</option>
        <option value="eighth" ${tSetup.format==='eighth'?'selected':''}>1/8 Finals — 8 + 4 QF + 2 SF + final</option>
      </select>
    </div>
    <div class="card-label">Select Players</div>
    <div id="t-wrap"></div>
    <div style="color:var(--muted);font-size:12px;margin-bottom:12px">Needs: ½→3+, ¼→4+, 1/8→5+</div>
    <div class="btn-row">
      <button class="btn btn-secondary flex-1" onclick="closeM('tournament')">Cancel</button>
      <button class="btn btn-primary flex-1" onclick="launchTournament()">Create</button>
    </div>
  `;
  playerSearchWidget('t-wrap',tSetup.selected,999,'window.togglePS_t_wrap');
}

function launchTournament(){
  tSetup.name=document.getElementById('t-name').value.trim()||'Tournament';
  tSetup.format=document.getElementById('t-fmt').value;
  const min={semi:3,quarter:4,eighth:5}[tSetup.format];
  if(tSetup.selected.length<min){toast(`Need at least ${min} players`);return;}
  const t=buildTournament(tSetup.name,tSetup.format,tSetup.selected);
  DB.tournaments.push(t); save();
  closeM('tournament');
  openTournamentPlay(t.id);
}

function buildTournament(name,format,participants){
  const sh=[...participants].sort(()=>Math.random()-.5);
  let rounds=[];
  if(format==='semi'){
    const semis=[{p1:sh[0],p2:sh[1],status:'pending',gameId:null}];
    semis.push(sh[3]?{p1:sh[2],p2:sh[3],status:'pending',gameId:null}:{p1:sh[2],p2:null,status:'bye',gameId:null});
    rounds=[{name:'Semi-finals',matches:semis},{name:'Final',matches:[{p1:null,p2:null,status:'pending',gameId:null}]}];
  } else if(format==='quarter'){
    const qf=Array.from({length:4},(_,i)=>({p1:sh[i*2]||null,p2:sh[i*2+1]||null,status:sh[i*2+1]?'pending':'bye',gameId:null}));
    rounds=[
      {name:'Quarter-finals',matches:qf},
      {name:'Semi-finals',matches:[{p1:null,p2:null,status:'pending',gameId:null},{p1:null,p2:null,status:'pending',gameId:null}]},
      {name:'Final',matches:[{p1:null,p2:null,status:'pending',gameId:null}]}
    ];
  } else {
    const r1=Array.from({length:8},(_,i)=>({p1:sh[i*2]||null,p2:sh[i*2+1]||null,status:sh[i*2+1]?'pending':'bye',gameId:null}));
    rounds=[
      {name:'1/8 Finals',matches:r1},
      {name:'Quarter-finals',matches:Array.from({length:4},()=>({p1:null,p2:null,status:'pending',gameId:null}))},
      {name:'Semi-finals',matches:[{p1:null,p2:null,status:'pending',gameId:null},{p1:null,p2:null,status:'pending',gameId:null}]},
      {name:'Final',matches:[{p1:null,p2:null,status:'pending',gameId:null}]}
    ];
  }
  return {id:uid(),name,format,date:Date.now(),participants,rounds,status:'active',winner:null};
}

function openTournamentPlay(tid){
  const t=DB.tournaments.find(x=>x.id===tid);
  if(!t) return;
  renderTournPlayModal(t);
  openM('tourn-play');
}

function renderTournPlayModal(t){
  let html=`<div class="modal-handle"></div>
    <div class="modal-header">
      <div><div class="modal-title">${t.name}</div><div class="text-sm text-muted">${fmtDateLong(t.date)}</div></div>
      <button class="close-btn" onclick="closeM('tourn-play');refreshCurrent()">✕</button>
    </div>`;
  if(t.status==='done'&&t.winner){
    html+=`<div class="winner-banner"><div class="wb-title">🏆 Champion</div><div class="wb-name">${pName(t.winner)}</div></div>`;
  }
  t.rounds.forEach((round,ri)=>{
    html+=`<div class="bracket-round"><div class="bracket-round-title">${round.name}</div>`;
    round.matches.forEach((match,mi)=>{
      html+=`<div class="bracket-match">`;
      if(match.status==='bye'){
        html+=`<div style="color:var(--muted);font-size:13px">${pName(match.p1)} — BYE (advances)</div>`;
      } else if(!match.p1||!match.p2){
        html+=`<div style="color:var(--muted2);font-size:13px">Waiting for previous results…</div>`;
      } else if(match.status==='done'){
        const game=DB.games.find(g=>g.id===match.gameId);
        if(game){
          const w=game.s1>game.s2?game.p1:game.p2;
          html+=`
            <div class="bm-row">
              <span class="bm-player ${game.p1===w?'bm-winner':'bm-loser'}">${pName(game.p1)}</span>
              <span class="bm-score ${game.p1===w?'bm-winner':'bm-loser'}">${game.s1}</span>
            </div>
            <div class="bm-row">
              <span class="bm-player ${game.p2===w?'bm-winner':'bm-loser'}">${pName(game.p2)}</span>
              <span class="bm-score ${game.p2===w?'bm-winner':'bm-loser'}">${game.s2}</span>
            </div>`;
        }
      } else if(match.p1&&match.p2){
        html+=`<div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px">${pName(match.p1)} vs ${pName(match.p2)}</span>
          <button class="btn btn-primary btn-sm" onclick="playTournMatch('${t.id}',${ri},${mi})">Play ▶</button>
        </div>`;
      }
      html+=`</div>`;
    });
    html+=`</div>`;
  });
  mEl('tourn-play').innerHTML=html;
}

function playTournMatch(tid,ri,mi){
  const t=DB.tournaments.find(x=>x.id===tid);
  const match=t.rounds[ri].matches[mi];
  openScoringModal(match.p1,match.p2,'tournament',tid,null,(game)=>{
    match.status='done'; match.gameId=game.id;
    advanceTournament(t,ri,mi);
    save(); renderTournPlayModal(t);
  });
}

function advanceTournament(t,ri){
  const round=t.rounds[ri];
  if(!round.matches.every(m=>m.status==='done'||m.status==='bye')) return;
  const winners=round.matches.map(m=>{
    if(m.status==='bye') return m.p1;
    const g=DB.games.find(g=>g.id===m.gameId);
    return g?(g.s1>g.s2?g.p1:g.p2):null;
  }).filter(Boolean);
  const next=t.rounds[ri+1];
  if(!next){ t.status='done'; t.winner=winners[0]; return; }
  next.matches.forEach((m,i)=>{
    m.p1=winners[i*2]||null; m.p2=winners[i*2+1]||null;
    if(m.p1&&!m.p2) m.status='bye';
    else if(m.p1&&m.p2) m.status='pending';
  });
  next.matches.forEach((m,i)=>{ if(m.status==='bye') advanceTournament(t,ri+1); });
}

// ═══════════════════════════════════════════
// LEAGUE SETUP
// ═══════════════════════════════════════════
let lSetup={name:'',selected:[]};

function startLeagueSetup(){
  lSetup={name:'',selected:[]};
  window.selectedPlayers_league=[];
  window.togglePS_l_wrap=function(id){
    const arr=window.selectedPlayers_league;
    const idx=arr.indexOf(id);
    if(idx>=0) arr.splice(idx,1); else arr.push(id);
    lSetup.selected=[...arr];
    playerSearchWidget('l-wrap',arr,999,'window.togglePS_l_wrap');
    const cnt=document.getElementById('l-player-count');
    if(cnt) cnt.textContent=arr.length+' players selected, '+(arr.length*(arr.length-1))+' games total (each pair plays twice)';
  };
  renderLeagueSetupModal();
  openM('league');
}

function renderLeagueSetupModal(){
  mEl('league').innerHTML=`
    <div class="modal-handle"></div>
    <div class="modal-header">
      <div class="modal-title">New League</div>
      <button class="close-btn" onclick="closeM('league')">✕</button>
    </div>
    <div class="field">
      <label>League Name</label>
      <input class="input" id="l-name" placeholder="Season 1…" oninput="lSetup.name=this.value">
    </div>
    <div class="card-label">Select Players (min 3)</div>
    <div id="l-wrap"></div>
    <div id="l-player-count" style="font-size:12px;color:var(--muted);margin-bottom:12px">Select at least 3 players</div>
    <div class="btn-row">
      <button class="btn btn-secondary flex-1" onclick="closeM('league')">Cancel</button>
      <button class="btn btn-primary flex-1" onclick="launchLeague()">Create League</button>
    </div>
  `;
  playerSearchWidget('l-wrap',lSetup.selected,999,'window.togglePS_l_wrap');
}

function launchLeague(){
  lSetup.name=document.getElementById('l-name').value.trim()||'League';
  if(lSetup.selected.length<3){toast('Need at least 3 players');return;}
  const league=buildLeague(lSetup.name,lSetup.selected);
  DB.leagues.push(league); save();
  closeM('league');
  openLeaguePlay(league.id);
}

function buildLeague(name,participants){
  // Generate all pairs, each plays twice
  const fixtures=[];
  for(let i=0;i<participants.length;i++){
    for(let j=0;j<participants.length;j++){
      if(i!==j) fixtures.push({p1:participants[i],p2:participants[j],gameId:null,status:'pending'});
    }
  }
  // Shuffle fixtures
  fixtures.sort(()=>Math.random()-.5);
  return {id:uid(),name,date:Date.now(),participants,fixtures,status:'active'};
}

function openLeaguePlay(lid){
  const l=DB.leagues.find(x=>x.id===lid);
  if(!l) return;
  renderLeaguePlayModal(l);
  openM('league-play');
}

function renderLeaguePlayModal(l){
  const table=calcLeagueTable(l);
  const pending=l.fixtures.filter(f=>f.status==='pending');
  const done=l.fixtures.filter(f=>f.status==='done');
  const allDone=pending.length===0;
  if(allDone&&l.status==='active'){l.status='done';save();}

  let html=`<div class="modal-handle"></div>
    <div class="modal-header">
      <div><div class="modal-title">${l.name}</div><div class="text-sm text-muted">${fmtDateLong(l.date)} · ${l.participants.length} players</div></div>
      <button class="close-btn" onclick="closeM('league-play');refreshCurrent()">✕</button>
    </div>`;

  if(allDone&&table[0]){
    html+=`<div class="winner-banner"><div class="wb-title">🥇 League Winner</div><div class="wb-name">${pName(table[0].pid)}</div></div>`;
  }

  // League Table
  html+=`<div class="card-label">Standings</div>
    <div style="overflow-x:auto;margin-bottom:12px">
    <table class="league-table">
      <thead><tr>
        <th style="padding-left:4px">#</th><th style="text-align:left">Player</th>
        <th>G</th><th>W</th><th>L</th><th>+pts</th><th>−pts</th><th>Pts</th>
      </tr></thead>
      <tbody>
        ${table.map((row,i)=>`<tr>
          <td class="rank">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</td>
          <td style="font-weight:600;font-size:13px">${pName(row.pid)}</td>
          <td class="mono">${row.played}</td>
          <td class="mono" style="color:var(--win)">${row.wins}</td>
          <td class="mono" style="color:var(--lose)">${row.losses}</td>
          <td class="mono">${row.pf}</td>
          <td class="mono">${row.pa}</td>
          <td class="pts">${row.pts}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;

  // Pending fixtures
  if(pending.length){
    html+=`<div class="card-label">Upcoming Fixtures (${pending.length})</div>`;
    pending.slice(0,20).forEach((f,fi)=>{
      const realIdx=l.fixtures.indexOf(f);
      html+=`<div class="league-match-card">
        <div class="lm-row">
          <span style="font-size:13px;font-weight:500">${pName(f.p1)} vs ${pName(f.p2)}</span>
          <button class="btn btn-primary btn-xs" onclick="playLeagueFixture('${l.id}',${realIdx})">Play ▶</button>
        </div>
      </div>`;
    });
  }

  // Completed
  if(done.length){
    html+=`<div class="card-label" style="margin-top:8px">Completed (${done.length})</div>`;
    done.slice().reverse().slice(0,30).forEach(f=>{
      const g=DB.games.find(x=>x.id===f.gameId);
      if(!g) return;
      const w=g.s1>g.s2?g.p1:g.p2;
      html+=`<div class="league-match-card">
        <div class="lm-row">
          <div>
            <div class="lm-row" style="gap:6px">
              <span style="font-size:12px;color:${g.p1===w?'var(--win)':'var(--muted)'};font-weight:${g.p1===w?700:400}">${pName(g.p1)}</span>
              <span class="lm-score">${g.s1}–${g.s2}</span>
              <span style="font-size:12px;color:${g.p2===w?'var(--win)':'var(--muted)'};font-weight:${g.p2===w?700:400}">${pName(g.p2)}</span>
            </div>
            <div style="font-size:11px;color:var(--muted)">${fmtDate(g.date)}</div>
          </div>
          <button class="btn btn-secondary btn-xs" onclick="closeM('league-play');openEditScore('${g.id}');setTimeout(()=>openLeaguePlay('${l.id}'),500)">Edit</button>
        </div>
      </div>`;
    });
  }

  mEl('league-play').innerHTML=html;
}

function calcLeagueTable(l){
  const rows={};
  l.participants.forEach(pid=>{rows[pid]={pid,played:0,wins:0,losses:0,pf:0,pa:0,pts:0};});
  l.fixtures.filter(f=>f.status==='done').forEach(f=>{
    const g=DB.games.find(x=>x.id===f.gameId); if(!g) return;
    const r1=rows[g.p1],r2=rows[g.p2];
    if(!r1||!r2) return;
    r1.played++; r2.played++;
    r1.pf+=g.s1; r1.pa+=g.s2; r2.pf+=g.s2; r2.pa+=g.s1;
    if(g.s1>g.s2){r1.wins++;r1.pts+=3;r2.losses++;}
    else{r2.wins++;r2.pts+=3;r1.losses++;}
  });
  return Object.values(rows).sort((a,b)=>b.pts-a.pts||b.wins-a.wins||(b.pf-b.pa)-(a.pf-a.pa)||b.pf-a.pf);
}

function playLeagueFixture(lid,fi){
  const l=DB.leagues.find(x=>x.id===lid);
  const fix=l.fixtures[fi];
  openScoringModal(fix.p1,fix.p2,'league',null,lid,(game)=>{
    fix.gameId=game.id; fix.status='done';
    save(); renderLeaguePlayModal(l);
  });
}

// ═══════════════════════════════════════════
// STATS PAGE
// ═══════════════════════════════════════════
let statsTab='leaderboard', statsLimit=null, statsFilter='all', statsCompare=[];

function renderStats(){
  const el=document.getElementById('pg-stats');

  // Build filter options
  const filterOpts=[['All Games','all'],['Quick Games','quick']];
  DB.tournaments.forEach(t=>filterOpts.push([t.name,'t:'+t.id]));
  DB.leagues.forEach(l=>filterOpts.push(['⚽ '+l.name,'l:'+l.id]));

  el.innerHTML=`
    <div class="page-title">Statistics</div>
    <div class="tabs">
      <button class="tab ${statsTab==='leaderboard'?'active':''}" onclick="setStatsTab('leaderboard')">Leaderboard</button>
      <button class="tab ${statsTab==='players'?'active':''}" onclick="setStatsTab('players')">Players</button>
      <button class="tab ${statsTab==='compare'?'active':''}" onclick="setStatsTab('compare')">Compare</button>
    </div>
    <div class="card-label">Filter by game type</div>
    <div class="filters">
      ${filterOpts.map(([l,v])=>`<button class="fchip${statsFilter===v?' active':''}" onclick="setStatsFilter('${v}')">${l}</button>`).join('')}
    </div>
    <div class="card-label">Game count</div>
    <div class="filters" style="margin-bottom:14px">
      ${[['All time',null],['Last 10',10],['Last 20',20],['Last 30',30],['Last 40',40],['Last 50',50]].map(([l,v])=>`
        <button class="fchip${statsLimit===v?' active':''}" onclick="setStatsLimit(${v})">${l}</button>
      `).join('')}
    </div>
    <div id="stats-body"></div>
  `;
  renderStatsBody();
}

function setStatsTab(t){ statsTab=t; renderStats(); }
function setStatsFilter(f){ statsFilter=f; renderStats(); }
function setStatsLimit(v){ statsLimit=v; renderStats(); }

function renderStatsBody(){
  const el=document.getElementById('stats-body');
  if(!el) return;
  if(!DB.players.length){ el.innerHTML=`<div class="empty"><span class="empty-ico">📊</span><p>Add players in Settings to see stats</p></div>`; return; }
  if(statsTab==='leaderboard') el.innerHTML=buildLeaderboard();
  else if(statsTab==='players') el.innerHTML=buildPlayersView();
  else el.innerHTML=buildCompareView();
}

function buildLeaderboard(){
  const sorted=DB.players
    .map(p=>({p,s:playerStats(p.id,statsLimit,statsFilter)}))
    .sort((a,b)=>b.s.winRate-a.s.winRate||b.s.wins-a.s.wins);
  if(sorted.every(x=>x.s.total===0)) return `<div class="empty"><span class="empty-ico">📊</span><p>No games found for this filter</p></div>`;
  return `<div class="card">${sorted.map((item,i)=>{
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`;
    const st=playerStreak(item.p.id);
    return `<div class="lb-item" onclick="openPlayerDetail('${item.p.id}')">
      <span class="lb-rank">${medal}</span>
      ${avatarHtml(item.p.name)}
      <div class="lb-info">
        <div class="lb-name">${item.p.name}</div>
        <div class="lb-sub">${item.s.wins}W ${item.s.losses}L · ${item.s.total}g · avg ${item.s.avgFor}pts</div>
        <div class="win-bar"><div class="win-bar-fill" style="width:${item.s.winRate}%"></div></div>
      </div>
      <div class="lb-pct" style="color:${item.s.winRate>=60?'var(--win)':item.s.winRate<=40?'var(--lose)':'var(--text)'}">${item.s.winRate}%</div>
    </div>`;
  }).join('')}</div>`;
}

function buildPlayersView(){
  return DB.players.map(p=>{
    const s=playerStats(p.id,statsLimit,statsFilter);
    const st=playerStreak(p.id);
    return `<div class="card" onclick="openPlayerDetail('${p.id}')">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        ${avatarHtml(p.name,'lg')}
        <div style="flex:1">
          <div style="font-size:16px;font-weight:700">${p.name}</div>
          ${streakHtml(st)}
        </div>
        <div class="lb-pct" style="color:${s.winRate>=60?'var(--win)':s.winRate<=40?'var(--lose)':'var(--text)'}">${s.winRate}%</div>
      </div>
      <div class="stat-row"><span class="stat-label">Games</span><span class="stat-val">${s.total}</span></div>
      <div class="stat-row"><span class="stat-label">Wins</span><span class="stat-val win">${s.wins}</span></div>
      <div class="stat-row"><span class="stat-label">Losses</span><span class="stat-val lose">${s.losses}</span></div>
      <div class="stat-row"><span class="stat-label">Avg scored</span><span class="stat-val">${s.avgFor}</span></div>
      <div class="stat-row"><span class="stat-label">Avg conceded</span><span class="stat-val">${s.avgAg}</span></div>
    </div>`;
  }).join('');
}

function buildCompareView(){
  if(DB.players.length<2) return `<div class="empty"><span class="empty-ico">⚖️</span><p>Need at least 2 players</p></div>`;

  // Player selection
  let html=`<div class="card"><div class="card-label">Select players to compare</div>
    <div class="player-grid">
      ${DB.players.map(p=>`<button class="p-chip${statsCompare.includes(p.id)?' selected':''}" onclick="toggleCmp('${p.id}',this)">${p.name}</button>`).join('')}
    </div></div>`;

  if(statsCompare.length===2){
    const [id1,id2]=statsCompare;
    const s1=playerStats(id1,statsLimit,statsFilter), s2=playerStats(id2,statsLimit,statsFilter);
    const hh=h2h(id1,id2);
    html+=`<div class="card">
      <div class="cmp-head">
        <div class="cmp-name">${pName(id1)}</div>
        <div class="cmp-vs">vs</div>
        <div class="cmp-name">${pName(id2)}</div>
      </div>
      ${[
        [s1.total,s2.total,'Games'],
        [s1.winRate+'%',s2.winRate+'%','Win Rate',s1.winRate,s2.winRate],
        [s1.wins,s2.wins,'Wins'],
        [s1.losses,s2.losses,'Losses','min'],
        [s1.avgFor,s2.avgFor,'Avg Scored',parseFloat(s1.avgFor),parseFloat(s2.avgFor)],
        [s1.avgAg,s2.avgAg,'Avg Conceded',parseFloat(s1.avgAg),parseFloat(s2.avgAg),'min'],
      ].map(([v1,v2,lbl,n1,n2,dir])=>{
        const _n1=n1!==undefined?n1:v1, _n2=n2!==undefined?n2:v2;
        const hi1=dir==='min'?_n1<_n2:_n1>_n2, hi2=dir==='min'?_n2<_n1:_n2>_n1;
        return `<div class="cmp-row">
          <div class="cmp-val${hi1?' hi':''}">${v1}</div>
          <div class="cmp-lbl">${lbl}</div>
          <div class="cmp-val${hi2?' hi':''}">${v2}</div>
        </div>`;
      }).join('')}
      <div class="h2h-box">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--accent)">Head-to-Head · ${hh.games} games</div>
        <div class="h2h-numbers">
          <div><div class="h2h-num${hh.w1>=hh.w2?' ':''}" style="color:${hh.w1>hh.w2?'var(--win)':hh.w1<hh.w2?'var(--lose)':'var(--text)'}">${hh.w1}</div><div class="h2h-who">${pName(id1)}</div></div>
          <div style="color:var(--muted);align-self:center">–</div>
          <div><div class="h2h-num" style="color:${hh.w2>hh.w1?'var(--win)':hh.w2<hh.w1?'var(--lose)':'var(--text)'}">${hh.w2}</div><div class="h2h-who">${pName(id2)}</div></div>
        </div>
      </div>
    </div>`;
  } else if(statsCompare.length>2){
    const cols=statsCompare.map(id=>({id,name:pName(id),s:playerStats(id,statsLimit,statsFilter)}));
    html+=`<div class="card" style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr>
        <th style="text-align:left;padding:6px 4px;border-bottom:1.5px solid var(--border);color:var(--muted);font-size:10px;font-weight:700;text-transform:uppercase">Stat</th>
        ${cols.map(c=>`<th style="text-align:center;padding:6px 4px;border-bottom:1.5px solid var(--border)">${c.name}</th>`).join('')}
      </tr></thead>
      <tbody>
        ${[
          ['Win %',c=>c.s.winRate+'%',c=>c.s.winRate,'max'],
          ['W/L',c=>`${c.s.wins}/${c.s.losses}`,c=>c.s.wins,'max'],
          ['Games',c=>c.s.total,c=>c.s.total,'max'],
          ['Avg+',c=>c.s.avgFor,c=>parseFloat(c.s.avgFor),'max'],
          ['Avg−',c=>c.s.avgAg,c=>parseFloat(c.s.avgAg),'min'],
        ].map(([label,fmt,val,dir])=>{
          const vals=cols.map(c=>val(c));
          const best=dir==='max'?Math.max(...vals):Math.min(...vals);
          return `<tr><td style="padding:7px 4px;color:var(--muted2);border-bottom:1px solid var(--border)">${label}</td>
            ${cols.map((c,i)=>`<td style="text-align:center;padding:7px 4px;border-bottom:1px solid var(--border);font-family:'DM Mono',monospace;font-weight:${vals[i]===best?700:400};color:${vals[i]===best?'var(--accent)':'var(--text)'}">${fmt(c)}</td>`).join('')}
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
  }
  return html;
}

function toggleCmp(id,btn){
  statsCompare=statsCompare.includes(id)?statsCompare.filter(x=>x!==id):[...statsCompare,id];
  btn.classList.toggle('selected',statsCompare.includes(id));
  document.getElementById('stats-body').innerHTML=buildCompareView();
}

// ═══════════════════════════════════════════
// PLAYER DETAIL MODAL
// ═══════════════════════════════════════════
function openPlayerDetail(pid){
  const p=DB.players.find(x=>x.id===pid);
  const s=playerStats(pid,statsLimit,statsFilter);
  const st=playerStreak(pid);
  const games=playerGames(pid,20,statsFilter);

  mEl('player-detail').innerHTML=`
    <div class="modal-handle"></div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      ${avatarHtml(p.name,'lg')}
      <div style="flex:1">
        <div style="font-size:20px;font-weight:800">${p.name}</div>
        ${streakHtml(st)}
        <div style="font-size:11px;color:var(--muted);margin-top:2px">Last ${st.length} games</div>
      </div>
      <button class="close-btn" onclick="closeM('player-detail')">✕</button>
    </div>
    <div class="card">
      <div class="stat-row"><span class="stat-label">Games played</span><span class="stat-val">${s.total}</span></div>
      <div class="stat-row"><span class="stat-label">Wins</span><span class="stat-val win">${s.wins}</span></div>
      <div class="stat-row"><span class="stat-label">Losses</span><span class="stat-val lose">${s.losses}</span></div>
      <div class="stat-row"><span class="stat-label">Win rate</span><span class="stat-val accent">${s.winRate}%</span></div>
      <div class="stat-row"><span class="stat-label">Avg points scored</span><span class="stat-val">${s.avgFor}</span></div>
      <div class="stat-row"><span class="stat-label">Avg points conceded</span><span class="stat-val">${s.avgAg}</span></div>
      <div class="stat-row"><span class="stat-label">Total points scored</span><span class="stat-val">${s.pf}</span></div>
    </div>
    <div class="card">
      <div class="card-label">Head-to-Head</div>
      ${DB.players.filter(x=>x.id!==pid).map(opp=>{
        const hh=h2h(pid,opp.id); if(!hh.games) return '';
        return `<div class="stat-row">
          <span class="stat-label">vs ${opp.name}</span>
          <span class="stat-val">${hh.w1}–${hh.w2} <span style="font-size:11px;color:var(--muted)">(${hh.games}g)</span></span>
        </div>`;
      }).join('')||'<div style="color:var(--muted);font-size:13px">No data yet</div>'}
    </div>
    <div class="card">
      <div class="card-label">Recent Games</div>
      ${games.length?games.map(g=>{
        const my=g.p1===pid?g.s1:g.s2, op=g.p1===pid?g.s2:g.s1;
        const opp=pName(g.p1===pid?g.p2:g.p1), won=my>op;
        return `<div class="hist-item">
          <div class="hist-info">
            <div class="hist-match">vs ${opp}</div>
            <div class="hist-sub">${fmtDate(g.date)} ${g.type==='tournament'?'· <span class="chip chip-warn" style="font-size:10px">Tourn</span>':g.type==='league'?'· <span class="chip chip-accent" style="font-size:10px">League</span>':''}</div>
          </div>
          <div class="hist-score" style="color:${won?'var(--win)':'var(--lose)'}">${my}–${op}</div>
        </div>`;
      }).join(''):`<div class="empty" style="padding:16px"><p>No games yet</p></div>`}
    </div>
  `;
  openM('player-detail');
}

// ═══════════════════════════════════════════
// HISTORY PAGE
// ═══════════════════════════════════════════
let histTab='games';

function renderHistory(){
  const el=document.getElementById('pg-history');
  el.innerHTML=`
    <div class="page-title">History</div>
    <div class="tabs">
      <button class="tab ${histTab==='games'?'active':''}" onclick="setHistTab('games')">Games</button>
      <button class="tab ${histTab==='tournaments'?'active':''}" onclick="setHistTab('tournaments')">Tournaments</button>
      <button class="tab ${histTab==='leagues'?'active':''}" onclick="setHistTab('leagues')">Leagues</button>
    </div>
    <div id="hist-body"></div>
  `;
  renderHistBody();
}

function setHistTab(t){ histTab=t; renderHistory(); }

function renderHistBody(){
  const el=document.getElementById('hist-body');
  if(!el) return;
  if(histTab==='games'){
    const games=DB.games.slice().sort((a,b)=>b.date-a.date);
    if(!games.length){ el.innerHTML=`<div class="empty"><span class="empty-ico">📋</span><p>No games yet</p></div>`; return; }
    let html='', lastDate='';
    games.forEach(g=>{
      const d=fmtDate(g.date);
      if(d!==lastDate){ html+=`<div class="card-label">${d}</div>`; lastDate=d; }
      const w=g.s1>g.s2?g.p1:g.p2;
      html+=`<div class="card" style="margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1">
            <div style="font-size:14px;font-weight:600">${pName(g.p1)} vs ${pName(g.p2)}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:1px">
              Winner: <span style="color:var(--win);font-weight:600">${pName(w)}</span>
              ${g.type==='tournament'?'&nbsp;<span class="chip chip-warn" style="font-size:10px">Tournament</span>':''}
              ${g.type==='league'?'&nbsp;<span class="chip chip-accent" style="font-size:10px">League</span>':''}
            </div>
          </div>
          <div style="text-align:right;display:flex;align-items:center;gap:8px">
            <div class="hist-score" style="color:var(--text)">${g.s1}–${g.s2}</div>
            <div style="display:flex;flex-direction:column;gap:3px">
              <button onclick="openEditScore('${g.id}')" style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;color:var(--text2)">✏️</button>
              <button onclick="deleteGame('${g.id}')" style="background:var(--lose-t);border:1px solid var(--lose);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;color:var(--lose)">🗑</button>
            </div>
          </div>
        </div>
      </div>`;
    });
    el.innerHTML=html;
  } else if(histTab==='tournaments'){
    if(!DB.tournaments.length){ el.innerHTML=`<div class="empty"><span class="empty-ico">🏆</span><p>No tournaments yet</p></div>`; return; }
    el.innerHTML=DB.tournaments.slice().sort((a,b)=>b.date-a.date).map(t=>`
      <div class="card" style="cursor:pointer" onclick="openTournamentPlay('${t.id}')">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-size:15px;font-weight:700">${t.name}</div>
            <div style="font-size:12px;color:var(--muted)">${fmtDateLong(t.date)} · ${t.participants.length} players</div>
            ${t.winner?`<div style="font-size:12px;color:var(--win);margin-top:2px;font-weight:600">🏆 ${pName(t.winner)}</div>`:''}
          </div>
          <span class="chip ${t.status==='done'?'chip-win':'chip-warn'}">${t.status==='done'?'Done':'Active'}</span>
        </div>
      </div>`).join('');
  } else {
    if(!DB.leagues.length){ el.innerHTML=`<div class="empty"><span class="empty-ico">🥇</span><p>No leagues yet</p></div>`; return; }
    el.innerHTML=DB.leagues.slice().sort((a,b)=>b.date-a.date).map(l=>{
      const table=calcLeagueTable(l);
      const done=l.fixtures.filter(f=>f.status==='done').length;
      return `<div class="card" style="cursor:pointer" onclick="openLeaguePlay('${l.id}')">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div>
            <div style="font-size:15px;font-weight:700">${l.name}</div>
            <div style="font-size:12px;color:var(--muted)">${fmtDateLong(l.date)} · ${l.participants.length} players · ${done}/${l.fixtures.length} games</div>
            ${l.status==='done'&&table[0]?`<div style="font-size:12px;color:var(--win);font-weight:600;margin-top:2px">🥇 ${pName(table[0].pid)}</div>`:''}
          </div>
          <span class="chip ${l.status==='done'?'chip-win':'chip-accent'}">${l.status==='done'?'Done':'Active'}</span>
        </div>
        ${table.slice(0,3).map((row,i)=>`
          <div style="display:flex;align-items:center;gap:6px;padding:3px 0">
            <span style="font-size:11px;color:var(--muted);width:12px">${i===0?'🥇':i===1?'🥈':'🥉'}</span>
            <span style="font-size:12px;font-weight:600">${pName(row.pid)}</span>
            <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--accent);margin-left:auto">${row.pts}pts</span>
          </div>`).join('')}
      </div>`;
    }).join('');
  }
}

function deleteGame(id){
  if(!confirm('Delete this game?')) return;
  DB.games=DB.games.filter(g=>g.id!==id); save();
  toast('Game deleted'); renderHistory();
}

// ═══════════════════════════════════════════
// SETTINGS PAGE
// ═══════════════════════════════════════════
function renderSettings(){
  const el=document.getElementById('pg-settings');
  el.innerHTML=`
    <div class="page-title">Settings</div>

    <div class="section-header"><h2>Players</h2>
      <button class="btn btn-primary btn-sm" onclick="addPlayerPrompt()">+ Add Player</button>
    </div>
    <div class="card" id="players-card">
      ${DB.players.length?DB.players.map(p=>`
        <div class="player-item" id="pi-${p.id}">
          ${avatarHtml(p.name)}
          <div class="player-info">
            <div class="pname" id="pn-${p.id}">${p.name}</div>
            <div class="psub">${playerStats(p.id).total} games</div>
          </div>
          <button onclick="editPlayerName('${p.id}')" style="background:none;border:none;cursor:pointer;padding:4px 6px;color:var(--muted);font-size:14px">✏️</button>
          <button onclick="deletePlayer('${p.id}')" style="background:none;border:none;cursor:pointer;padding:4px 6px;color:var(--muted);font-size:14px">🗑</button>
        </div>`).join('')
        :`<div style="color:var(--muted);font-size:13px;padding:8px 0">No players yet.</div>`}
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px">
      <h2 style="font-size:15px;font-weight:700">Appearance</h2>
    </div>
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-weight:600">Dark Mode</div>
          <div style="font-size:12px;color:var(--muted)">Switch to dark theme</div>
        </div>
        <button onclick="toggleTheme()" class="btn ${darkMode?'btn-primary':'btn-secondary'} btn-sm">${darkMode?'On ✓':'Off'}</button>
      </div>
    </div>

    <h2 style="font-size:15px;font-weight:700;margin-top:14px;margin-bottom:8px">Data</h2>
    <div class="card">
      <div class="stat-row"><span class="stat-label">Total Games</span><span class="stat-val">${DB.games.length}</span></div>
      <div class="stat-row"><span class="stat-label">Tournaments</span><span class="stat-val">${DB.tournaments.length}</span></div>
      <div class="stat-row"><span class="stat-label">Leagues</span><span class="stat-val">${DB.leagues.length}</span></div>
      <div class="stat-row"><span class="stat-label">Players</span><span class="stat-val">${DB.players.length}</span></div>
      <div class="btn-row" style="margin-top:12px">
        <button class="btn btn-secondary flex-1" onclick="exportData()">⬆ Export</button>
        <label class="btn btn-secondary flex-1" style="cursor:pointer;justify-content:center">
          ⬇ Import
          <input type="file" accept=".json" style="display:none" onchange="importData(event)">
        </label>
      </div>
      <button class="btn btn-danger btn-full" style="margin-top:8px" onclick="clearAll()">🗑 Clear All Data</button>
    </div>
  `;
}

function addPlayerPrompt(){
  const name=prompt('Player name:'); if(!name||!name.trim()) return;
  const n=name.trim();
  if(DB.players.find(p=>p.name.toLowerCase()===n.toLowerCase())){toast('Player already exists');return;}
  DB.players.push({id:uid(),name:n}); save();
  toast(n+' added!'); renderSettings();
}

function editPlayerName(id){
  const p=DB.players.find(x=>x.id===id);
  const item=document.getElementById('pi-'+id);
  const nameEl=document.getElementById('pn-'+id);
  // Replace name with inline edit
  nameEl.innerHTML=`
    <div class="edit-inline">
      <input class="input" id="edit-input-${id}" value="${p.name}" style="height:32px;padding:4px 8px"
        onkeydown="if(event.key==='Enter')savePlayerName('${id}');if(event.key==='Escape')renderSettings()">
      <button class="btn btn-primary btn-xs" onclick="savePlayerName('${id}')">Save</button>
      <button class="btn btn-secondary btn-xs" onclick="renderSettings()">✕</button>
    </div>
  `;
  document.getElementById('edit-input-'+id).focus();
}

function savePlayerName(id){
  const input=document.getElementById('edit-input-'+id);
  if(!input) return;
  const n=input.value.trim();
  if(!n){toast('Name cannot be empty');return;}
  if(DB.players.find(p=>p.id!==id&&p.name.toLowerCase()===n.toLowerCase())){toast('Name already used');return;}
  DB.players.find(x=>x.id===id).name=n; save();
  toast('Name updated'); renderSettings();
}

function deletePlayer(id){
  const p=DB.players.find(x=>x.id===id);
  if(!confirm(`Delete ${p.name}? Their game records remain.`)) return;
  DB.players=DB.players.filter(x=>x.id!==id); save();
  toast(p.name+' removed'); renderSettings();
}

function exportData(){
  const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='pingtrack-'+new Date().toISOString().slice(0,10)+'.json';
  a.click(); toast('Exported!');
}

function importData(e){
  const file=e.target.files[0]; if(!file) return;
  const r=new FileReader();
  r.onload=ev=>{
    try{
      const d=JSON.parse(ev.target.result);
      if(!d.players||!d.games) throw new Error();
      if(!confirm(`Replace all data?\n${d.players.length} players, ${d.games.length} games`)) return;
      DB=d; if(!DB.tournaments)DB.tournaments=[]; if(!DB.leagues)DB.leagues=[];
      save(); toast('Imported!'); renderSettings(); renderHome();
    }catch(err){toast('Invalid file');}
  };
  r.readAsText(file);
}

function clearAll(){
  if(!confirm('Delete ALL data? Cannot be undone.')) return;
  if(!confirm('Really sure?')) return;
  DB={players:[],games:[],tournaments:[],leagues:[]}; save();
  toast('Cleared'); renderSettings(); renderHome();
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
load(); loadTheme(); renderHome();