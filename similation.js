/* ============================================================
   MEKÂNI AŞMA MOTORU — CINEMATIC SIMULATION ENGINE v2.0
   High-fidelity 2D canvas rendering with particle systems,
   volumetric lighting, dynamic weather, cinematic post-FX.
   ============================================================ */

// ========== GLOBAL STATE ==========
const GLOBAL = {
  stats:{wins:0,fails:0},
  init(){const s=localStorage.getItem('geoSimStats3');if(s)this.stats=JSON.parse(s);this.UI();},
  add(win){if(win)this.stats.wins++;else this.stats.fails++;localStorage.setItem('geoSimStats3',JSON.stringify(this.stats));this.UI();},
  reset(){this.stats={wins:0,fails:0};localStorage.setItem('geoSimStats3',JSON.stringify(this.stats));this.UI();},
  UI(){const t=this.stats.wins+this.stats.fails;const wp=t===0?50:(this.stats.wins/t*100);const dp=t===0?50:(this.stats.fails/t*100);const w=document.getElementById('dash-win');if(w){w.textContent=this.stats.wins;document.getElementById('sb-p').style.width=wp+'%';document.getElementById('sb-d').style.width=dp+'%';}}
};

// ========== AUDIO ==========
const AUDIO={
  ctx:null,
  init(){if(!this.ctx){try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}},
  rumble(dur,vol){this.init();if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();o.type='sawtooth';o.frequency.setValueAtTime(42,this.ctx.currentTime);o.frequency.exponentialRampToValueAtTime(12,this.ctx.currentTime+dur);f.type='lowpass';f.frequency.value=120;g.gain.setValueAtTime(vol*.45,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.008,this.ctx.currentTime+dur);o.connect(f);f.connect(g);g.connect(this.ctx.destination);o.start();o.stop(this.ctx.currentTime+dur);},
  alarm(){this.init();if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='square';o.frequency.setValueAtTime(620,this.ctx.currentTime);o.frequency.setValueAtTime(820,this.ctx.currentTime+.18);o.frequency.setValueAtTime(620,this.ctx.currentTime+.36);g.gain.setValueAtTime(.09,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.005,this.ctx.currentTime+1.1);o.connect(g);g.connect(this.ctx.destination);o.start();o.stop(this.ctx.currentTime+1.1);},
  click(){this.init();if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.setValueAtTime(880,this.ctx.currentTime);o.frequency.exponentialRampToValueAtTime(180,this.ctx.currentTime+.09);g.gain.setValueAtTime(.18,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.008,this.ctx.currentTime+.1);o.connect(g);g.connect(this.ctx.destination);o.start();o.stop(this.ctx.currentTime+.1);},
  wind(dur,vol){this.init();if(!this.ctx)return;const bs=this.ctx.sampleRate,bc=Math.floor(bs*dur);if(bc<=0)return;const bf=this.ctx.createBuffer(1,bc,bs),cd=bf.getChannelData(0);for(let i=0;i<bc;i++)cd[i]=(Math.random()*2-1)*0.22;const ns=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();ns.buffer=bf;f.type='lowpass';f.frequency.setValueAtTime(380,this.ctx.currentTime);f.frequency.linearRampToValueAtTime(800,this.ctx.currentTime+dur*.5);f.frequency.linearRampToValueAtTime(300,this.ctx.currentTime+dur);g.gain.setValueAtTime(0,this.ctx.currentTime);g.gain.linearRampToValueAtTime(vol,this.ctx.currentTime+dur*.2);g.gain.linearRampToValueAtTime(0,this.ctx.currentTime+dur);ns.connect(f);f.connect(g);g.connect(this.ctx.destination);ns.start();},
  zap(){this.init();if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(1200,this.ctx.currentTime);o.frequency.exponentialRampToValueAtTime(60,this.ctx.currentTime+.25);g.gain.setValueAtTime(.15,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.005,this.ctx.currentTime+.25);o.connect(g);g.connect(this.ctx.destination);o.start();o.stop(this.ctx.currentTime+.25);}
};

// ========== UTILITIES ==========
const util={
  tmrs:{},
  runTimer(id,modObj){
    if(this.tmrs[id])clearInterval(this.tmrs[id]);
    let l=130;const hud=document.getElementById(id+'-timer-hud');
    hud.classList.add('active');
    const rg=hud.querySelector('circle'),tx=hud.querySelector('.timer-val');
    this.tmrs[id]=setInterval(()=>{
      l--;tx.textContent=Math.ceil(l/10);
      rg.style.strokeDashoffset=188.4-(l/130)*188.4;
      if(l<=0){clearInterval(this.tmrs[id]);hud.classList.remove('active');modObj.end();}
    },100);
  },
  rand(a,b){return a+Math.random()*(b-a);},
  lerp(a,b,t){return a+(b-a)*t;},
  clamp(v,a,b){return Math.max(a,Math.min(b,v));},
  roundRect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();}
};

// ========== MODAL ==========
const MODAL={
  show(title,badge,bodyHTML,depScore,adaptScore,isWin){
    GLOBAL.add(isWin);
    document.getElementById('modal-overlay').classList.add('show');
    const bd=document.getElementById('m-badge');
    bd.innerHTML=badge;bd.style.color=isWin?'var(--cyan)':'var(--red)';
    document.getElementById('m-title').innerHTML=title;
    document.getElementById('m-theory').innerHTML=bodyHTML;
    document.getElementById('m-dep').innerHTML=`%${depScore}`;
    document.getElementById('m-ind').innerHTML=`%${adaptScore}`;
  }
};

// ========== MAIN SIM LOOP ==========
const SIM={
  tab:'kavram',gt:0,lt:Date.now(),loopActive:false,
  nav(t,btn){
    if(!document.getElementById('page-'+t))return;
    document.querySelectorAll('.tab-btn').forEach(e=>e.classList.remove('active'));
    document.querySelectorAll('.page').forEach(e=>e.classList.remove('active'));
    document.getElementById('page-'+t).classList.add('active');
    if(btn)btn.classList.add('active');
    this.tab=t;this.resize();AUDIO.click();
  },
  resize(){
    ['bina','tarim','erciyes','enerji','ulasim'].forEach(i=>{
      const c=document.getElementById('cv-'+i);
      if(c&&c.parentElement){
        const r=c.parentElement.getBoundingClientRect();
        c.width=r.width;c.height=r.height;
      }
    });
  },
  run(){
    if(!this.loopActive)this.loopActive=true;
    const nw=Date.now();this.gt+=(nw-this.lt)/1000;this.lt=nw;
    if(this.tab==='bina')B.draw();
    else if(this.tab==='ulasim')U.draw();
    else if(this.tab==='tarim')T.draw();
    else if(this.tab==='erciyes')E.draw();
    else if(this.tab==='enerji')EN.draw();
    requestAnimationFrame(()=>this.run());
  }
};

// ============================================================
// 1. BİNA — CINEMATIC EARTHQUAKE SIMULATION
// ============================================================
const B={
  act:false,st:0,floors:[],parts:[],dust:[],cracks:[],def:0,dead:false,
  camShake:{x:0,y:0},stars:[],windows:[],rubble:[],
  initOnce:false,
  init(){
    this.stars=Array.from({length:180},()=>({x:Math.random(),y:Math.random()*.55,r:Math.random()*1.4+.3,s:Math.random()*.6+.3,p:Math.random()*6.28}));
    this.initOnce=true;
  },
  val(){return{
    z:document.getElementById('b-zemin').value,
    su:+document.getElementById('b-su').value/100,
    t:document.getElementById('b-temel').value,
    m:document.getElementById('b-malz').value,
    k:+document.getElementById('b-kat').value,
    col:+document.getElementById('b-col').value,
    sid:+document.getElementById('b-siddet').value/10
  };},
  build(){
    if(!this.initOnce)this.init();
    this.act=false;this.st=0;this.parts=[];this.dust=[];this.cracks=[];this.rubble=[];this.dead=false;
    document.getElementById('b-status').innerHTML="◆ SİSTEM STABİL / SİSMOGRAF HAZIR";
    document.getElementById('b-crt').classList.remove('active');
    clearInterval(util.tmrs['b']);
    document.getElementById('b-timer-hud').classList.remove('active');
    const v=this.val();
    this.floors=[];
    for(let i=0;i<v.k;i++)this.floors[i]={y:-i*52,vy:0,dk:false,t:0,vx:0,damage:0};
    this.windows=[];
    for(let i=0;i<v.k;i++){const row=[];for(let j=0;j<6;j++)row.push(Math.random()>.35);this.windows.push(row);}
    const M={celik:130,beton:70,kerpi:8}[v.m];
    const Z={kaya:110,orta:55,kum:8}[v.z];
    const T={izolator:115,kazik:65,standart:12}[v.t];
    this.def=Math.max(5,(M*.3+Z*.2+T*.5)+(v.col*2.2)-(v.su*32)-(v.k*4));
  },
  play(){
    this.act=true;this.st=0;AUDIO.alarm();
    setTimeout(()=>AUDIO.rumble(13,this.val().sid/10),400);
    document.getElementById('b-crt').classList.add('active');
    document.getElementById('b-status').innerHTML=`<span style='color:var(--red)'>◆ KIRILMA — S DALGASI GELİYOR!</span>`;
    util.runTimer('b',this);
  },
  end(){
    this.act=false;
    document.getElementById('b-crt').classList.remove('active');
    document.getElementById('b-status').innerHTML="◆ SİSMOGRAFİK ANALİZ TAMAMLANDI";
    const v=this.val();
    const isW=!this.dead;
    const rs=this.dead?10:Math.max(0,this.def-Math.pow(v.sid-4,1.5)*5);
    MODAL.show(
      isW?"YAPISAL ZAFER":"ENKAZ YIĞINI",
      isW?"Teknolojik Direnç":"Doğal Yıkım",
      isW?`<strong>${v.col}cm kolonlar</strong>, güçlü zemin ve esnek mühendislik sayesinde yapı ${v.sid.toFixed(1)} büyüklüğündeki depreme dayandı. Sismik izolatörler enerjiyi emdi, mekânın sınırı aşıldı. <strong>(Possibilizm)</strong>`
      :`Fay enerjisi (${v.sid.toFixed(1)} Mw) yanlış projelendirildi. Yeraltı suyu sıvılaşması (%${Math.round(v.su*100)}) kolonları (${v.col}cm) kopardı. Bina iskambil gibi çöktü. <strong>(Determinizm)</strong>`,
      Math.round(100-rs),Math.round(rs),isW
    );
  },
  drawSky(c,W,H,t){
    // Deep twilight sky gradient
    const g=c.createLinearGradient(0,0,0,H*.8);
    g.addColorStop(0,'#020617');
    g.addColorStop(.4,'#0f1629');
    g.addColorStop(.75,'#1e1e3a');
    g.addColorStop(1,'#3a1a2e');
    c.fillStyle=g;c.fillRect(0,0,W,H);
    // Stars (twinkling)
    this.stars.forEach(s=>{
      const o=(Math.sin(t*s.s+s.p)+1)*.4+.2;
      c.globalAlpha=o;c.fillStyle='#fff';
      c.beginPath();c.arc(s.x*W,s.y*H,s.r,0,6.28);c.fill();
    });
    c.globalAlpha=1;
    // Distant city glow on horizon
    const cg=c.createLinearGradient(0,H*.55,0,H*.75);
    cg.addColorStop(0,'rgba(251,146,60,0)');
    cg.addColorStop(1,'rgba(251,146,60,0.12)');
    c.fillStyle=cg;c.fillRect(0,H*.55,W,H*.2);
    // Moon
    const mx=W*.82,my=H*.15;
    const mg=c.createRadialGradient(mx,my,0,mx,my,80);
    mg.addColorStop(0,'rgba(226,232,240,0.9)');
    mg.addColorStop(.3,'rgba(186,230,253,0.4)');
    mg.addColorStop(1,'rgba(186,230,253,0)');
    c.fillStyle=mg;c.beginPath();c.arc(mx,my,80,0,6.28);c.fill();
    c.fillStyle='#e8eef5';c.beginPath();c.arc(mx,my,22,0,6.28);c.fill();
    c.fillStyle='rgba(100,116,139,0.3)';c.beginPath();c.arc(mx-5,my-3,4,0,6.28);c.fill();c.beginPath();c.arc(mx+8,my+6,3,0,6.28);c.fill();
    // Mountain silhouette layers (parallax)
    c.fillStyle='rgba(15,23,42,0.6)';c.beginPath();c.moveTo(0,H*.65);
    for(let i=0;i<=10;i++){const x=W*i/10;const y=H*(.45+Math.sin(i*1.3)*.08+Math.cos(i*.7)*.05);c.lineTo(x,y);}
    c.lineTo(W,H*.8);c.lineTo(0,H*.8);c.closePath();c.fill();
    c.fillStyle='rgba(30,41,59,0.7)';c.beginPath();c.moveTo(0,H*.78);
    for(let i=0;i<=12;i++){const x=W*i/12;const y=H*(.58+Math.sin(i*.9+1)*.06);c.lineTo(x,y);}
    c.lineTo(W,H*.8);c.lineTo(0,H*.8);c.closePath();c.fill();
  },
  drawGround(c,W,H,v,t){
    const gy=H*.8;
    const colors={kaya:['#1e293b','#0f172a'],orta:['#3a2510','#1a1008'],kum:['#a67435','#6b4a20']};
    const [c1,c2]=colors[v.z];
    const gg=c.createLinearGradient(0,gy,0,H);
    gg.addColorStop(0,c1);gg.addColorStop(1,c2);
    c.fillStyle=gg;c.fillRect(0,gy,W,H-gy);
    // Ground texture / cracks
    if(v.z==='kaya'){
      c.strokeStyle='rgba(255,255,255,0.04)';c.lineWidth=1;
      for(let i=0;i<15;i++){c.beginPath();c.moveTo(Math.random()*W,gy+Math.random()*(H-gy));c.lineTo(Math.random()*W,gy+Math.random()*(H-gy));c.stroke();}
    } else if(v.z==='kum'){
      // Sand dunes texture
      for(let i=0;i<8;i++){
        c.fillStyle='rgba(255,220,150,0.05)';
        c.beginPath();c.ellipse(W*i/8+50,gy+20+i*8,40,5,0,0,6.28);c.fill();
      }
    }
    // Water table
    if(v.su>0.15){
      const wy=H-(H-gy)*v.su*.9;
      const wg=c.createLinearGradient(0,wy,0,H);
      wg.addColorStop(0,`rgba(14,165,233,${.15+v.su*.35})`);
      wg.addColorStop(1,`rgba(14,165,233,${.4+v.su*.3})`);
      c.fillStyle=wg;c.fillRect(0,wy,W,H-wy);
      // Water line shimmer
      c.strokeStyle=`rgba(125,211,252,${.3+v.su*.3})`;c.lineWidth=1.5;
      c.beginPath();
      for(let x=0;x<W;x+=6){const yy=wy+Math.sin(x*.04+t*2)*1.5;if(x===0)c.moveTo(x,yy);else c.lineTo(x,yy);}
      c.stroke();
    }
    // Seismic wave rings during quake
    if(this.act && !this.dead){
      const atk=Math.pow((v.sid-4),1.5)*10;
      for(let i=0;i<3;i++){
        const rad=((t*120+i*80)%(W*.6));
        const op=1-rad/(W*.6);
        c.strokeStyle=`rgba(244,63,94,${op*atk/100})`;c.lineWidth=2;
        c.beginPath();c.ellipse(W/2,gy,rad,rad*.25,0,0,6.28);c.stroke();
      }
    }
    // Ground fissures after collapse
    if(this.dead){
      c.strokeStyle='rgba(0,0,0,0.9)';c.lineWidth=3;
      [[.35,.2],[.5,.3],[.65,.18]].forEach(([sx,w])=>{
        c.beginPath();c.moveTo(W*sx,gy);
        let y=gy;
        for(let s=0;s<8;s++){y+=(H-gy)/8;c.lineTo(W*(sx+(Math.random()-.5)*.06),y);}
        c.stroke();
      });
    }
  },
  draw(){
    const cv=document.getElementById('cv-bina');if(!cv)return;
    const c=cv.getContext('2d'),W=cv.width,H=cv.height;if(!W)return;
    const t=SIM.gt,v=this.val();
    c.clearRect(0,0,W,H);

    // Camera shake
    if(this.act&&!this.dead){
      const intens=(v.sid-4)*(v.t==='izolator'?.15:1);
      this.camShake.x=Math.sin(t*32)*intens*3;
      this.camShake.y=Math.cos(t*28)*intens*1.5;
    } else {this.camShake.x*=.9;this.camShake.y*=.9;}

    c.save();c.translate(this.camShake.x,this.camShake.y);
    this.drawSky(c,W,H,t);
    this.drawGround(c,W,H,v,t);
    c.restore();

    // Update quake state
    let liqDrop=0;
    if(this.act && !this.dead){
      const atk=Math.pow((v.sid-4),1.5)*10;
      this.st+=(atk/this.def)*0.2;
      if(this.st>100){this.dead=true;this.st=100;AUDIO.rumble(1.5,2.2);AUDIO.rumble(2,1.5);}
      if(v.z==='kum' && v.su>0.35)liqDrop=(this.st/100)*45*v.su;
    }

    // Update HUD readout
    const pga=this.act?((v.sid-4)*0.15*(v.t==='izolator'?.3:1)).toFixed(2):'0.00';
    const ro=document.getElementById('b-readout');
    if(ro)ro.innerHTML=`EPC: <span class="val">N42.5</span><br>DEPTH: <span class="val">18KM</span><br>PGA: <span class="val">${pga}g</span><br>DMG: <span class="val" style="color:${this.st>60?'var(--red)':this.st>30?'var(--yellow)':'var(--emerald)'}">${Math.round(this.st)}%</span>`;

    const gy=H*.8;
    const sway=(this.act&&!this.dead)?Math.sin(t*35)*(v.sid-4)*(v.t==='izolator'?0.18:(v.z==='kum'?1.9:1.1)):0;
    const swayY=(this.act&&v.z==='kum')?Math.cos(t*22)*(v.sid-4)*.55:0;

    c.save();c.translate(sway,swayY);

    // Building geometry
    const bwMax=Math.min(380,W*.45);
    const bw=bwMax;
    const bx=W/2-bw/2;
    const floorH=Math.min(52,(H*.6)/v.k);
    const totalH=v.k*floorH;
    const cw=v.col;
    let tY=gy+liqDrop;

    // ============== FOUNDATION ==============
    // Isolator platform (glowing)
    if(v.t==='izolator'){
      // Base plate
      c.fillStyle='#0a1929';c.fillRect(bx-18,tY,bw+36,18);
      // Neon glow line
      c.shadowBlur=20;c.shadowColor=this.act?'#f43f5e':'#0ea5e9';
      c.fillStyle=this.act?'rgba(244,63,94,0.6)':'rgba(14,165,233,0.55)';
      c.fillRect(bx-15,tY+6,bw+30,4);c.shadowBlur=0;
      // LRB bearings
      for(let i=0;i<5;i++){
        const px=bx+20+i*((bw-40)/4);
        // Top plate
        c.fillStyle='#475569';c.fillRect(px-16,tY+2,32,3);
        // Rubber layers (alternating)
        for(let lr=0;lr<4;lr++){
          c.fillStyle=lr%2===0?'#1e293b':'#334155';
          c.fillRect(px-14,tY+5+lr*2,28,2);
        }
        // Bottom plate
        c.fillStyle='#475569';c.fillRect(px-16,tY+14,32,3);
        // Lead core dot
        c.fillStyle='#fbbf24';c.beginPath();c.arc(px,tY+9.5,2,0,6.28);c.fill();
      }
      tY-=18;
    } else if(v.t==='kazik'){
      // Pile foundation visible below ground
      for(let i=0;i<5;i++){
        const px=bx+20+i*((bw-40)/4);
        c.fillStyle='#334155';c.fillRect(px-3,tY,6,H-tY);
        c.fillStyle='rgba(0,0,0,0.3)';c.fillRect(px-1,tY,2,H-tY);
      }
      c.fillStyle='#1e293b';c.fillRect(bx-10,tY-8,bw+20,10);
    } else {
      // Standard foundation
      c.fillStyle='#1e293b';c.fillRect(bx-8,tY-12,bw+16,12);
      c.fillStyle='rgba(0,0,0,0.4)';c.fillRect(bx-8,tY-2,bw+16,2);
    }

    // ============== BUILDING ==============
    c.translate(W/2,tY);

    for(let i=0;i<v.k;i++){
      const fl=this.floors[i];
      if(this.dead){
        if(!fl.dk){
          fl.dk=true;fl.vy=2+Math.random()*5;fl.vx=(Math.random()-.5)*3;
          // Spawn debris
          for(let d=0;d<10;d++)this.parts.push({x:Math.random()*bw-bw/2,y:fl.y,vx:(Math.random()-.5)*18,vy:-4-Math.random()*8,r:Math.random()>.5,rot:0,vr:(Math.random()-.5)*.4,size:3+Math.random()*5,life:1});
          // Dust
          for(let d=0;d<8;d++)this.dust.push({x:Math.random()*bw-bw/2,y:fl.y,vx:(Math.random()-.5)*6,vy:-1-Math.random()*2,r:15+Math.random()*20,life:1,op:.4});
        }
        fl.vy+=1.3;fl.y+=fl.vy;fl.x=(fl.x||0)+fl.vx;fl.vx*=.96;
        const rest=i===0?0:this.floors[i-1].y-floorH+4;
        if(fl.y>=rest){fl.y=rest;fl.vy=0;fl.t=(Math.random()-.5)*0.18;}
      } else {
        const ht=(i+1)/v.k;
        fl.t=sway*.004*ht*(v.m==='celik'?1.9:1);
        fl.x=0;
      }

      c.save();c.translate(-bw/2+(fl.x||0),fl.y);c.rotate(fl.t);

      // Floor slab (bottom)
      c.fillStyle='#1e293b';c.fillRect(-2,0,bw+4,6);
      c.fillStyle='rgba(0,0,0,0.4)';c.fillRect(-2,6,bw+4,2);

      // Room interior shadow
      c.fillStyle='rgba(3,7,18,0.92)';c.fillRect(0,-floorH,bw,floorH);

      // Lit windows (atmospheric warm glow)
      if(!this.dead){
        const winRow=this.windows[i]||[];
        const wnum=6;const ww=(bw-24)/wnum-4;
        for(let w=0;w<wnum;w++){
          const wx=12+w*(ww+4);
          const lit=winRow[w] && (!this.act || Math.sin(t*25+i*3+w*1.7)>-.2);
          if(lit){
            const flicker=.7+Math.sin(t*3+i+w)*.15;
            // Glow behind window
            c.shadowBlur=14;c.shadowColor=`rgba(251,191,36,${flicker*.7})`;
            c.fillStyle=`rgba(251,191,36,${flicker*.8})`;
            c.fillRect(wx,-floorH+8,ww,floorH-18);
            c.shadowBlur=0;
            // Window frame highlight
            c.fillStyle=`rgba(254,243,199,${flicker*.9})`;
            c.fillRect(wx+1,-floorH+9,ww-2,2);
            // Silhouette (random)
            if((w+i*3)%7===0){
              c.fillStyle='rgba(0,0,0,.4)';
              c.fillRect(wx+ww*.3,-floorH+14,ww*.2,floorH-30);
            }
          } else {
            c.fillStyle='rgba(2,6,23,0.85)';
            c.fillRect(wx,-floorH+8,ww,floorH-18);
          }
          // Window reflection
          c.strokeStyle='rgba(100,116,139,0.3)';c.lineWidth=1;
          c.strokeRect(wx,-floorH+8,ww,floorH-18);
        }
      } else {
        // Broken windows
        c.fillStyle='#000';c.fillRect(4,-floorH+4,bw-8,floorH-10);
        c.strokeStyle='#64748b';c.lineWidth=1;
        for(let w=0;w<6;w++){c.beginPath();c.moveTo(Math.random()*bw,-floorH+Math.random()*floorH);c.lineTo(Math.random()*bw,-floorH+Math.random()*floorH);c.stroke();}
      }

      // Columns (5 columns per floor)
      for(let w=0;w<5;w++){
        const cX=w*(bw/4);
        const isRed=this.st>65 && w!==0 && w!==4;
        const isBroken=this.dead && w!==0 && w!==4;
        if(isBroken){
          c.fillStyle='#334155';c.fillRect(cX-cw/2,-25,cw,15);
          // Exposed rebar
          for(let rb=0;rb<3;rb++){
            c.strokeStyle='#94a3b8';c.lineWidth=1.5;
            c.beginPath();c.moveTo(cX-cw/3+rb*cw/3,-25);c.lineTo(cX-cw/3+rb*cw/3+(Math.random()-.5)*4,-12);c.stroke();
          }
        } else {
          let col=v.m==='celik'?'#94a3b8':(v.m==='beton'?'#cbd5e1':'#b45309');
          if(isRed)col='#ef4444';
          c.fillStyle=col;
          if(isRed){c.shadowBlur=12;c.shadowColor='#ef4444';}
          c.fillRect(cX-cw/2,-floorH,cw,floorH);
          c.shadowBlur=0;
          // Column highlight
          c.fillStyle='rgba(255,255,255,0.12)';
          c.fillRect(cX-cw/2+1,-floorH,2,floorH);
          // Column shadow
          c.fillStyle='rgba(0,0,0,0.25)';
          c.fillRect(cX+cw/2-2,-floorH,2,floorH);
        }
      }

      // Crack overlay on building
      if(this.st>25 && !this.dead){
        c.strokeStyle=`rgba(0,0,0,${this.st/120})`;c.lineWidth=1.5;
        c.beginPath();c.moveTo(bw*.2+i*3,-floorH+5);c.lineTo(bw*.35+i*2,-floorH/2);c.lineTo(bw*.25,-5);c.stroke();
        if(this.st>55){c.beginPath();c.moveTo(bw*.7,-floorH+8);c.lineTo(bw*.6,-floorH/2);c.lineTo(bw*.75,-5);c.stroke();}
      }

      c.restore();
    }

    // Roof detail (antenna, AC units)
    if(!this.dead){
      const rY=this.floors[v.k-1].y-floorH;
      c.fillStyle='#475569';c.fillRect(-bw/2+20,rY-12,40,12);
      c.fillStyle='#64748b';c.fillRect(-bw/2+bw-60,rY-8,30,8);
      // Antenna
      c.strokeStyle='#64748b';c.lineWidth=2;
      c.beginPath();c.moveTo(-10,rY);c.lineTo(-10,rY-35);c.stroke();
      c.fillStyle='#ef4444';c.beginPath();c.arc(-10,rY-35,3,0,6.28);c.fill();
    }

    c.restore();

    // ============== PARTICLES ==============
    // Debris with rotation
    for(let i=this.parts.length-1;i>=0;i--){
      const p=this.parts[i];
      p.vy+=.55;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;p.life-=.008;
      const px=W/2+p.x, py=tY+p.y;
      c.save();c.translate(px,py);c.rotate(p.rot);
      if(p.r){
        c.fillStyle=`rgba(250,204,21,${p.life})`;c.shadowBlur=10;c.shadowColor='#facc15';
        c.fillRect(-2,-2,4,4);c.shadowBlur=0;
      } else {
        c.fillStyle=`rgba(100,116,139,${p.life})`;
        c.fillRect(-p.size/2,-p.size/2,p.size,p.size);
        c.fillStyle=`rgba(0,0,0,${p.life*.4})`;
        c.fillRect(-p.size/2,p.size/4,p.size,p.size/4);
      }
      c.restore();
      if(py>H || p.life<=0)this.parts.splice(i,1);
    }

    // Dust clouds (volumetric)
    for(let i=this.dust.length-1;i>=0;i--){
      const p=this.dust[i];
      p.vy+=.05;p.y+=p.vy;p.x+=p.vx;p.r+=.4;p.life-=.008;p.op*=.992;
      const g=c.createRadialGradient(W/2+p.x,tY+p.y,0,W/2+p.x,tY+p.y,p.r);
      g.addColorStop(0,`rgba(180,160,140,${p.op*p.life})`);
      g.addColorStop(.6,`rgba(140,120,100,${p.op*p.life*.5})`);
      g.addColorStop(1,'rgba(140,120,100,0)');
      c.fillStyle=g;c.beginPath();c.arc(W/2+p.x,tY+p.y,p.r,0,6.28);c.fill();
      if(p.life<=0)this.dust.splice(i,1);
    }

    // Atmospheric dust particles during shake
    if(this.act && !this.dead && Math.random()>.7){
      for(let i=0;i<2;i++){
        this.dust.push({x:(Math.random()-.5)*bw*.8,y:-Math.random()*totalH,vx:(Math.random()-.5)*2,vy:-.2,r:3+Math.random()*5,life:.6,op:.25});
      }
    }

    // Post-FX: chromatic aberration on heavy damage (subtle red overlay)
    if(this.act && this.st>60 && !this.dead){
      c.fillStyle=`rgba(244,63,94,${.04+Math.sin(t*10)*.03})`;c.fillRect(0,0,W,H);
    }
  }
};

// ============================================================
// 2. TARIM — BIOSPHERE / WEATHER SIMULATION
// ============================================================
const T={
  act:false,tmp:22,wnd:10,rn:30,plants:[],rain:[],snow:[],leaves:[],bees:[],
  heatWave:0,
  val(){return{
    sys:document.getElementById('t-sys').value,
    tpr:+document.getElementById('t-toprak').value
  };},
  initPlants(){
    this.plants=[];
    const n=18;
    for(let i=0;i<n;i++)this.plants.push({
      x:i/n+Math.random()*.02,
      h:.9+Math.random()*.3,
      p:Math.random()*6.28,
      leaves:3+Math.floor(Math.random()*2),
      fruit:Math.random()>.4,
      row:Math.floor(i/6)
    });
    this.rain=[];for(let i=0;i<80;i++)this.rain.push({x:Math.random(),y:Math.random(),s:.6+Math.random()*.5});
    this.snow=[];for(let i=0;i<60;i++)this.snow.push({x:Math.random(),y:Math.random(),r:Math.random()*2+.5,s:Math.random()*.4+.15,d:(Math.random()-.5)*.004});
    this.leaves=[];
    this.bees=[];for(let i=0;i<4;i++)this.bees.push({x:Math.random(),y:.5+Math.random()*.2,p:Math.random()*6.28});
  },
  upd(){
    this.act=false;
    document.getElementById('t-crt').classList.remove('active');
    document.getElementById('t-status').textContent="◆ DENGELİ BÜYÜME";
    clearInterval(util.tmrs['t']);
    document.getElementById('t-timer-hud').classList.remove('active');
    if(this.plants.length===0)this.initPlants();
  },
  setTemp(v){this.tmp=+v;},
  setWind(v){this.wnd=+v;},
  setRain(v){this.rn=+v;},
  play(){
    this.act=true;AUDIO.wind(13,.3+this.wnd/400);
    document.getElementById('t-crt').classList.add('active');
    document.getElementById('t-status').innerHTML="<span style='color:var(--yellow)'>◆ İKLİM SİMÜLASYONU DEVREDE</span>";
    util.runTimer('t',this);
  },
  end(){
    this.act=false;
    document.getElementById('t-crt').classList.remove('active');
    const v=this.val();let isW=false;
    if(v.sys==='hydro')isW=true;
    else if(v.sys==='sera'&&this.tmp>-5&&this.wnd<100)isW=true;
    else if(v.sys==='acik'&&this.tmp>5&&this.tmp<35&&this.wnd<50&&v.tpr>40)isW=true;
    document.getElementById('t-status').textContent=isW?"◆ SAĞLIKLI HASAT":"◆ MAHSÜL YOK OLDU";
    MODAL.show(
      isW?"HASAT BAŞARILI":"MAHSUL HELAK OLDU",
      isW?"Teknolojik Ziraat":"İklime Bağımlılık",
      isW?`<strong>${v.sys==='hydro'?'Hidroponik tesis':v.sys==='sera'?'Cam sera':'Açık tarla'}</strong> teknolojisi rüzgar (${this.wnd}km/h) ve ${this.tmp}°C ısıya rağmen hasatı güvence altına aldı. Kapalı sistem doğanın kuralını yendi. <strong>(Possibilizm)</strong>`
      :`Rüzgar (${this.wnd}km/h) ve ${this.tmp}°C ekstrem sıcaklık tarlayı kavurdu. Açık tarla modeli doğanın hışmına dayanamaz. <strong>(Determinizm)</strong>`,
      isW?20:90,isW?80:10,isW
    );
  },
  drawOutdoorSky(c,W,H,t){
    const g=c.createLinearGradient(0,0,0,H*.7);
    if(this.tmp>35){
      g.addColorStop(0,'#7c2d12');g.addColorStop(.4,'#ea580c');g.addColorStop(.85,'#fbbf24');g.addColorStop(1,'#fed7aa');
      // Sun
      const sx=W*.78,sy=H*.18;
      const sg=c.createRadialGradient(sx,sy,0,sx,sy,120);
      sg.addColorStop(0,'rgba(254,240,138,1)');
      sg.addColorStop(.3,'rgba(251,146,60,.7)');
      sg.addColorStop(1,'rgba(251,146,60,0)');
      c.fillStyle=g;c.fillRect(0,0,W,H*.7);
      c.fillStyle=sg;c.beginPath();c.arc(sx,sy,120,0,6.28);c.fill();
      c.fillStyle='#fef3c7';c.beginPath();c.arc(sx,sy,36,0,6.28);c.fill();
      // Heat shimmer
      this.heatWave+=.02;
      for(let i=0;i<6;i++){
        const x=W*(.1+i*.15);
        c.strokeStyle='rgba(251,146,60,0.12)';c.lineWidth=2;
        c.beginPath();
        for(let j=0;j<H*.4;j+=4){
          const wave=Math.sin(j*.1+this.heatWave+i)*3;
          if(j===0)c.moveTo(x+wave,j);else c.lineTo(x+wave,j);
        }
        c.stroke();
      }
    } else if(this.tmp<0){
      g.addColorStop(0,'#0c1e3a');g.addColorStop(.5,'#1e3a5f');g.addColorStop(1,'#64748b');
      c.fillStyle=g;c.fillRect(0,0,W,H*.7);
      // Pale sun/overcast
      c.fillStyle='rgba(226,232,240,0.4)';
      c.beginPath();c.arc(W*.8,H*.2,40,0,6.28);c.fill();
    } else {
      g.addColorStop(0,'#0ea5e9');g.addColorStop(.5,'#38bdf8');g.addColorStop(1,'#bae6fd');
      c.fillStyle=g;c.fillRect(0,0,W,H*.7);
      // Warm sun
      const sx=W*.8,sy=H*.18;
      const sg=c.createRadialGradient(sx,sy,0,sx,sy,90);
      sg.addColorStop(0,'rgba(254,240,138,.95)');
      sg.addColorStop(1,'rgba(254,240,138,0)');
      c.fillStyle=sg;c.beginPath();c.arc(sx,sy,90,0,6.28);c.fill();
      c.fillStyle='#fef9c3';c.beginPath();c.arc(sx,sy,28,0,6.28);c.fill();
      // Clouds
      for(let i=0;i<4;i++){
        const cx=(i*W*.3+t*8)%(W+200)-100;
        const cy=H*.12+i*15;
        c.fillStyle='rgba(255,255,255,0.4)';
        for(let j=0;j<5;j++){
          c.beginPath();c.arc(cx+j*25,cy+Math.sin(j)*5,18+j%2*4,0,6.28);c.fill();
        }
      }
    }
    // Distant tree line
    c.fillStyle='rgba(6,78,59,0.5)';
    c.beginPath();c.moveTo(0,H*.68);
    for(let x=0;x<=W;x+=22){
      const h=6+Math.sin(x*.02)*4+Math.cos(x*.05)*3;
      c.lineTo(x,H*.68-h);c.lineTo(x+11,H*.68-h-4);
    }
    c.lineTo(W,H*.72);c.lineTo(0,H*.72);c.closePath();c.fill();
  },
  draw(){
    const cv=document.getElementById('cv-tarim');if(!cv)return;
    const c=cv.getContext('2d'),W=cv.width,H=cv.height;if(!W)return;
    const t=SIM.gt,v=this.val();
    c.clearRect(0,0,W,H);
    if(this.plants.length===0)this.initPlants();

    const isDead=(this.tmp>40||this.tmp<-10)&&v.sys==='acik';
    const gY=H*.72;

    // ============== HYDROPONIC FACILITY ==============
    if(v.sys==='hydro'){
      // Dark metallic interior
      const bg=c.createLinearGradient(0,0,0,H);
      bg.addColorStop(0,'#050b18');bg.addColorStop(1,'#0a1628');
      c.fillStyle=bg;c.fillRect(0,0,W,H);
      // Ceiling structure
      c.fillStyle='#1e293b';c.fillRect(0,0,W,30);
      for(let i=0;i<W;i+=60){c.fillStyle='#0f172a';c.fillRect(i,30,40,6);}
      // LED grow lights (purple/pink)
      for(let row=0;row<3;row++){
        const ly=50+row*((H-180)/3);
        // Light strip
        const lg=c.createLinearGradient(0,ly-5,0,ly+80);
        lg.addColorStop(0,'rgba(236,72,153,0.5)');
        lg.addColorStop(.3,'rgba(139,92,246,0.25)');
        lg.addColorStop(1,'rgba(139,92,246,0)');
        c.fillStyle=lg;c.fillRect(0,ly-5,W,90);
        // LED dots
        for(let i=20;i<W;i+=24){
          const br=.7+Math.sin(t*2.5+i*.1+row)*.25;
          c.shadowBlur=16;c.shadowColor='#ec4899';
          c.fillStyle=`rgba(236,72,153,${br})`;
          c.beginPath();c.arc(i,ly,3.5,0,6.28);c.fill();
          c.shadowBlur=0;
          c.fillStyle=`rgba(255,255,255,${br*.8})`;
          c.beginPath();c.arc(i,ly,1.2,0,6.28);c.fill();
        }
        // Shelving
        c.fillStyle='rgba(148,163,184,0.15)';c.fillRect(0,ly+60,W,3);
      }
      // Water tanks at bottom
      const tY=H-100;
      c.fillStyle='#020617';c.fillRect(0,tY,W,100);
      c.fillStyle='#0a1628';c.fillRect(10,tY+5,W-20,90);
      // Water surface with animation
      const wg=c.createLinearGradient(0,tY+10,0,tY+70);
      wg.addColorStop(0,'rgba(14,165,233,0.4)');
      wg.addColorStop(1,'rgba(14,165,233,0.15)');
      c.fillStyle=wg;c.fillRect(12,tY+10,W-24,60);
      // Water ripples
      c.strokeStyle='rgba(125,211,252,0.5)';c.lineWidth=1;
      c.beginPath();
      for(let x=0;x<W;x+=4){const y=tY+10+Math.sin(x*.08+t*2)*2;if(x===0)c.moveTo(x,y);else c.lineTo(x,y);}
      c.stroke();
      // Bubbles
      for(let i=0;i<12;i++){
        const bx=(i*W/12+30)%W;
        const by=tY+70-((t*20+i*30)%60);
        c.fillStyle='rgba(186,230,253,0.6)';
        c.beginPath();c.arc(bx,by,1.5+Math.sin(i+t)*.8,0,6.28);c.fill();
      }

      // Plants in rows
      this.plants.forEach((p,idx)=>{
        const row=idx%3;
        const ly=30+row*((H-180)/3);
        const baseY=ly+60;
        const px=(p.x*W);
        // Pot
        c.fillStyle='#334155';util.roundRect(c,px-10,baseY-5,20,14,2);c.fill();
        // Sway
        const sw=Math.sin(t*1.5+p.p)*2;
        // Stem
        c.strokeStyle='#10b981';c.lineWidth=3;c.lineCap='round';
        c.beginPath();c.moveTo(px,baseY);c.quadraticCurveTo(px+sw,baseY-15,px+sw,baseY-35);c.stroke();
        // Leaves with glow
        for(let lf=0;lf<p.leaves;lf++){
          const ly2=baseY-10-lf*8;
          c.shadowBlur=8;c.shadowColor='#34d399';
          c.fillStyle='#34d399';
          c.beginPath();c.ellipse(px-10+sw*.5,ly2,12,5,-.4,0,6.28);c.fill();
          c.fillStyle='#10b981';
          c.beginPath();c.ellipse(px+10+sw*.5,ly2,12,5,.4,0,6.28);c.fill();
          c.shadowBlur=0;
        }
        // Fruits
        if(p.fruit){
          c.shadowBlur=10;c.shadowColor='#ef4444';
          c.fillStyle='#ef4444';
          c.beginPath();c.arc(px+sw,baseY-38,4,0,6.28);c.fill();
          c.shadowBlur=0;
          c.fillStyle='rgba(255,255,255,0.5)';
          c.beginPath();c.arc(px+sw-1.5,baseY-39.5,1,0,6.28);c.fill();
        }
        // Water drip
        if(Math.random()>.96){
          const dy=ly+2+Math.random()*40;
          c.fillStyle='rgba(125,211,252,0.8)';
          c.beginPath();c.arc(px,dy,1.5,0,6.28);c.fill();
        }
      });

      // Status label at bottom
      c.fillStyle='rgba(2,6,23,0.8)';util.roundRect(c,W*.5-180,H-30,360,22,4);c.fill();
      c.font='bold 11px JetBrains Mono';c.fillStyle='#34d399';c.textAlign='center';
      c.fillText('◆ HYDROPONIK TESİS — %100 İKLİMDEN BAĞIMSIZ',W/2,H-15);

    // ============== SERA / OPEN FIELD ==============
    } else {
      this.drawOutdoorSky(c,W,H,t);

      // Ground
      const tg=c.createLinearGradient(0,gY,0,H);
      if(this.tmp>35){tg.addColorStop(0,'#78350f');tg.addColorStop(1,'#451a03');}
      else if(this.tmp<0){tg.addColorStop(0,'#e0f2fe');tg.addColorStop(1,'#94a3b8');}
      else {tg.addColorStop(0,v.tpr>60?'#15803d':'#78716c');tg.addColorStop(.5,'#451a03');tg.addColorStop(1,'#1c1917');}
      c.fillStyle=tg;c.fillRect(0,gY,W,H-gY);

      // Tilled furrows
      if(v.sys==='acik' && this.tmp>=0){
        c.strokeStyle='rgba(0,0,0,0.25)';c.lineWidth=2;
        for(let r=0;r<4;r++){
          const ry=gY+10+r*((H-gY-10)/4);
          c.beginPath();
          for(let x=0;x<=W;x+=6){const yy=ry+Math.sin(x*.05+r)*1.5;if(x===0)c.moveTo(x,yy);else c.lineTo(x,yy);}
          c.stroke();
        }
      }

      // Drought cracks
      if(this.tmp>35){
        c.strokeStyle='rgba(0,0,0,0.45)';c.lineWidth=1.5;
        for(let i=0;i<10;i++){
          const sx=Math.random()*W,sy=gY+Math.random()*(H-gY);
          c.beginPath();c.moveTo(sx,sy);
          for(let s=0;s<4;s++){c.lineTo(sx+(Math.random()-.5)*40,sy+(Math.random()-.5)*30);}
          c.stroke();
        }
      }
      // Snow accumulation
      if(this.tmp<0){
        c.fillStyle='rgba(255,255,255,0.9)';c.fillRect(0,gY,W,10);
        // Snow drifts
        for(let i=0;i<8;i++){
          c.beginPath();c.ellipse(W*i/8,gY+8,40+Math.random()*30,6,0,0,6.28);c.fill();
        }
      }

      // Plants
      this.plants.forEach((p,idx)=>{
        const px=p.x*W;
        const ph=isDead?8:(this.tmp>35?p.h*18:(this.tmp<0&&v.sys!=='sera'?p.h*20:p.h*55*(v.tpr/100+.3)));
        let sw=0;
        if(v.sys==='acik')sw=Math.sin(t*(1+this.wnd/80)+p.p)*(this.wnd*.3);
        else if(v.sys==='sera')sw=Math.sin(t*.8+p.p)*1.5;

        // Stem
        if(isDead){
          c.strokeStyle='#451a03';c.lineWidth=2;
          c.beginPath();c.moveTo(px,gY);c.quadraticCurveTo(px+sw*.8,gY-ph*.5,px+sw*2,gY-ph);c.stroke();
        } else {
          c.strokeStyle=this.tmp>35?'#a16207':(this.tmp<0&&v.sys!=='sera'?'#64748b':'#16a34a');
          c.lineWidth=3+p.h*1.5;c.lineCap='round';
          c.beginPath();c.moveTo(px,gY);
          c.quadraticCurveTo(px+sw*.5,gY-ph*.5,px+sw,gY-ph);c.stroke();
        }

        if(!isDead){
          // Leaves
          for(let lf=1;lf<=p.leaves;lf++){
            const ly=gY-(ph*lf/(p.leaves+.5));
            const leafSw=sw*(lf/p.leaves);
            const leafCol=this.tmp>35?'#ca8a04':(this.tmp<0&&v.sys!=='sera'?'#94a3b8':'#22c55e');
            c.fillStyle=leafCol;
            c.beginPath();c.ellipse(px-12+leafSw,ly,14,6,-.35,0,6.28);c.fill();
            c.fillStyle=this.tmp>35?'#a16207':(this.tmp<0&&v.sys!=='sera'?'#64748b':'#16a34a');
            c.beginPath();c.ellipse(px+12+leafSw,ly,14,6,.35,0,6.28);c.fill();
            // Leaf highlight
            c.fillStyle='rgba(255,255,255,0.15)';
            c.beginPath();c.ellipse(px-10+leafSw,ly-1,10,3,-.35,0,6.28);c.fill();
          }
          // Fruit
          if(p.fruit && this.tmp<40 && (this.tmp>0||v.sys==='sera')){
            c.shadowBlur=8;c.shadowColor='#ef4444';
            const fc=['#ef4444','#facc15','#a855f7'][idx%3];
            c.fillStyle=fc;
            c.beginPath();c.arc(px+sw,gY-ph-4,5,0,6.28);c.fill();
            c.shadowBlur=0;
            c.fillStyle='rgba(255,255,255,0.5)';
            c.beginPath();c.arc(px+sw-1.5,gY-ph-5,1.5,0,6.28);c.fill();
          }
          // Snow on plants
          if(this.tmp<0 && v.sys!=='sera'){
            c.fillStyle='rgba(255,255,255,0.85)';
            for(let lf=1;lf<=p.leaves;lf++){
              const ly=gY-(ph*lf/(p.leaves+.5));
              c.beginPath();c.ellipse(px-10+sw*(lf/p.leaves),ly-6,7,2,-.35,0,6.28);c.fill();
            }
          }
        } else {
          // Dead leaves
          c.fillStyle='#78350f';
          c.beginPath();c.arc(px+sw*2,gY-ph,3,0,6.28);c.fill();
        }
      });

      // Greenhouse glass structure
      if(v.sys==='sera'){
        // Main dome
        c.fillStyle='rgba(186,230,253,0.15)';
        c.beginPath();
        c.moveTo(20,gY);c.lineTo(W*.15,gY-H*.3);c.lineTo(W-W*.15,gY-H*.3);c.lineTo(W-20,gY);
        c.closePath();c.fill();
        // Roof (triangular)
        c.fillStyle='rgba(186,230,253,0.2)';
        c.beginPath();
        c.moveTo(W*.15,gY-H*.3);c.lineTo(W/2,gY-H*.45);c.lineTo(W-W*.15,gY-H*.3);
        c.closePath();c.fill();
        // Glass reflections (highlights)
        c.strokeStyle='rgba(255,255,255,0.5)';c.lineWidth=2;
        c.beginPath();
        c.moveTo(20,gY);c.lineTo(W*.15,gY-H*.3);c.lineTo(W/2,gY-H*.45);c.lineTo(W-W*.15,gY-H*.3);c.lineTo(W-20,gY);
        c.stroke();
        // Frame verticals
        c.strokeStyle='rgba(148,163,184,0.5)';c.lineWidth=3;
        for(let i=1;i<6;i++){
          const frac=i/6;
          const bx=20+(W-40)*frac;
          let tx,ty;
          if(frac<=.15){tx=W*.15;ty=gY-H*.3;}
          else if(frac<=.5){const p=(frac-.15)/.35;tx=W*.15+(W/2-W*.15)*p;ty=gY-H*.3-H*.15*p;}
          else if(frac<=.85){const p=(frac-.5)/.35;tx=W/2+(W-W*.15-W/2)*p;ty=gY-H*.45+H*.15*p;}
          else {tx=W-W*.15;ty=gY-H*.3;}
          c.beginPath();c.moveTo(bx,gY);c.lineTo(tx,ty);c.stroke();
        }
        // Horizontal beams
        c.strokeStyle='rgba(148,163,184,0.35)';c.lineWidth=1.5;
        for(let h=0;h<3;h++){
          const hy=gY-H*.08-h*H*.08;
          c.beginPath();c.moveTo(20,hy);c.lineTo(W-20,hy);c.stroke();
        }
        // Glint animation
        const glintX=(t*80)%(W+100)-50;
        c.strokeStyle=`rgba(255,255,255,${.4+Math.sin(t*3)*.2})`;c.lineWidth=4;
        c.beginPath();c.moveTo(glintX,gY-H*.2);c.lineTo(glintX+30,gY-H*.25);c.stroke();
      }

      // Rain
      if(this.rn>15 && this.tmp>=0){
        this.rain.forEach(r=>{
          r.y+=.008*(r.s+this.rn/30);r.x-=.002;
          if(r.y>1){r.y=0;r.x=Math.random();}
          if(r.x<0)r.x=1;
          const rx=r.x*W,ry=r.y*H;
          if(ry<gY){
            c.strokeStyle=`rgba(125,211,252,${.4+r.s*.3})`;c.lineWidth=1.3;
            c.beginPath();c.moveTo(rx,ry);c.lineTo(rx-2,ry+10+this.wnd/20);c.stroke();
          }
        });
        // Rain splashes on ground
        if(Math.random()>.5){
          for(let i=0;i<3;i++){
            const sx=Math.random()*W;
            c.fillStyle='rgba(125,211,252,0.5)';
            c.beginPath();c.ellipse(sx,gY+2,3,1,0,0,6.28);c.fill();
          }
        }
      }

      // Snow
      if(this.tmp<3){
        this.snow.forEach(s=>{
          s.y+=s.s*.003;s.x+=s.d;if(s.y>1){s.y=0;s.x=Math.random();}
          const sx=s.x*W,sy=s.y*H;
          if(sy<gY){
            c.fillStyle='rgba(255,255,255,0.9)';
            c.beginPath();c.arc(sx,sy,s.r,0,6.28);c.fill();
          }
        });
      }

      // Bees / butterflies in normal conditions
      if(this.tmp>10 && this.tmp<32 && v.sys==='acik'){
        this.bees.forEach((b,i)=>{
          b.x=(b.x+.0015)%1;
          const bx=b.x*W,by=(b.y+Math.sin(t*3+b.p)*.03)*H;
          c.fillStyle='#facc15';
          c.beginPath();c.ellipse(bx,by,3,2,0,0,6.28);c.fill();
          c.strokeStyle='rgba(0,0,0,0.5)';c.lineWidth=.5;
          c.beginPath();c.moveTo(bx-2,by);c.lineTo(bx+2,by);c.stroke();
          // Wings
          c.fillStyle=`rgba(255,255,255,${.5+Math.sin(t*30+i)*.3})`;
          c.beginPath();c.ellipse(bx,by-2,3,1.5,0,0,6.28);c.fill();
        });
      }

      // Wind lines visualization
      if(this.wnd>40 && v.sys!=='sera'){
        c.strokeStyle=`rgba(255,255,255,${.1+this.wnd/400})`;c.lineWidth=1;
        for(let i=0;i<8;i++){
          const wy=H*.2+i*H*.06;
          const wx=(t*this.wnd*3+i*100)%(W+200)-100;
          c.beginPath();c.moveTo(wx,wy);c.quadraticCurveTo(wx+30,wy-3,wx+60,wy);c.stroke();
        }
      }

      // Status overlay
      const msg=this.tmp>40?'⚠ KURAKLIK':(this.tmp<-5?'⚠ DON':(this.wnd>80?'⚠ FIRTINA':'◆ NORMAL SEZON'));
      const msgCol=this.tmp>40?'#fb923c':(this.tmp<-5?'#60a5fa':(this.wnd>80?'#facc15':'#34d399'));
      c.fillStyle='rgba(2,6,23,0.75)';util.roundRect(c,W*.5-80,8,160,20,4);c.fill();
      c.font='bold 11px JetBrains Mono';c.fillStyle=msgCol;c.textAlign='center';
      c.fillText(msg,W/2,22);
    }

    // Update HUD
    const humidity=v.sys==='hydro'?80:Math.max(10,70-Math.abs(this.tmp-20)-this.rn/4);
    const growthStatus=isDead?'CRITICAL':v.sys==='hydro'?'OPTIMAL':(this.tmp>35||this.tmp<-5?'STRESS':'OK');
    const ro=document.getElementById('t-readout');
    if(ro)ro.innerHTML=`TEMP: <span class="val">${this.tmp}°C</span><br>HUM: <span class="val">${Math.round(humidity)}%</span><br>WIND: <span class="val">${this.wnd}km/h</span><br>GROWTH: <span class="val" style="color:${growthStatus==='OPTIMAL'?'#34d399':growthStatus==='STRESS'?'#facc15':growthStatus==='CRITICAL'?'#ef4444':'#38bdf8'}">${growthStatus}</span>`;
  }
};

// ============================================================
// 3. ERCİYES — MOUNTAIN RESORT SIMULATION
// ============================================================
const E={
  act:false,parts:[],flakes:[],skiers:[],stars:[],initOnce:false,
  val(){return{
    p:+document.getElementById('e-pres').value,
    tur:+document.getElementById('e-turist').value,
    w:+document.getElementById('e-warm').value
  };},
  init(){
    this.stars=Array.from({length:150},()=>({x:Math.random(),y:Math.random()*.5,r:Math.random()*1.3+.2,s:Math.random()*.5+.25,p:Math.random()*6.28}));
    this.flakes=[];for(let i=0;i<140;i++)this.flakes.push({x:Math.random(),y:Math.random(),r:.5+Math.random()*2,s:.2+Math.random()*.5,d:(Math.random()-.5)*.003});
    this.skiers=[];for(let i=0;i<8;i++)this.skiers.push({p:Math.random(),s:.5+Math.random()*.5,track:Math.floor(Math.random()*3),col:['#ef4444','#3b82f6','#f59e0b','#8b5cf6'][Math.floor(Math.random()*4)]});
    this.initOnce=true;
  },
  upd(){
    this.act=false;this.parts=[];
    clearInterval(util.tmrs['e']);
    document.getElementById('e-timer-hud').classList.remove('active');
    document.getElementById('e-crt').classList.remove('active');
    document.getElementById('e-status').textContent="◆ DAĞ ZİRVESİ STABİL";
    if(!this.initOnce)this.init();
  },
  play(){
    this.act=true;AUDIO.wind(13,.4);
    document.getElementById('e-crt').classList.add('active');
    document.getElementById('e-status').innerHTML="<span style='color:#fb7185'>◆ KÜRESEL ISINMA VURUYOR</span>";
    util.runTimer('e',this);
  },
  end(){
    this.act=false;document.getElementById('e-crt').classList.remove('active');
    const v=this.val();const isW=v.p>v.w*12||v.w<2;
    document.getElementById('e-status').textContent=isW?"◆ TURİZM KURTARILDI":"◆ KAR BİTTİ";
    MODAL.show(
      isW?"TURİZM YÜKSELİYOR":"KAR BİTTİ / TURİZM ÇÖKTÜ",
      isW?"Yapay Doğa":"Isınma Faciası",
      isW?`<strong>+${v.w}°C</strong> küresel ısınmaya rağmen <strong>${v.p} Bar</strong> basınçlı kar topları dağı beyaza boğdu. ${v.tur}k kayakçı dağı devirdi. <strong>(Possibilizm)</strong>`
      :`+${v.w}°C atmosfer ısınması makine basıncını (${v.p} Bar) yendi. Pist çıplak, teleferikler boş. <strong>(Determinizm)</strong>`,
      isW?30:95,isW?70:5,isW
    );
  },
  drawSky(c,W,H,t,warmth){
    const g=c.createLinearGradient(0,0,0,H*.75);
    // Color shifts with warming
    const w=util.clamp(warmth/10,0,1);
    const r1=Math.round(8+w*30), g1=Math.round(14+w*24), b1=Math.round(40-w*20);
    const r2=Math.round(30+w*80), g2=Math.round(58+w*50), b2=Math.round(110-w*60);
    g.addColorStop(0,`rgb(${r1},${g1},${b1})`);
    g.addColorStop(.5,`rgb(${r1+10},${g1+20},${b1+20})`);
    g.addColorStop(1,`rgb(${r2},${g2},${b2})`);
    c.fillStyle=g;c.fillRect(0,0,W,H);
    // Aurora or warmth haze
    if(warmth<3){
      // Aurora
      c.save();
      for(let i=0;i<3;i++){
        const ag=c.createLinearGradient(0,H*.1,0,H*.45);
        ag.addColorStop(0,'rgba(52,211,153,0)');
        ag.addColorStop(.4,`rgba(52,211,153,${.15+Math.sin(t*.5+i)*.08})`);
        ag.addColorStop(.6,`rgba(139,92,246,${.12+Math.sin(t*.4+i+1)*.06})`);
        ag.addColorStop(1,'rgba(52,211,153,0)');
        c.fillStyle=ag;c.globalCompositeOperation='screen';
        c.beginPath();
        c.moveTo(0,H*.1+i*15);
        for(let x=0;x<=W;x+=20){const y=H*.1+i*15+Math.sin(x*.01+t*.3+i)*20;c.lineTo(x,y);}
        c.lineTo(W,H*.45);c.lineTo(0,H*.45);c.closePath();c.fill();
      }
      c.restore();
    }
    // Stars (dim when warm)
    c.globalAlpha=1-w*.5;
    this.stars.forEach(s=>{
      const o=(Math.sin(t*s.s+s.p)+1)*.4+.2;
      c.globalAlpha=o*(1-w*.5);c.fillStyle='#fff';
      c.beginPath();c.arc(s.x*W,s.y*H,s.r,0,6.28);c.fill();
    });
    c.globalAlpha=1;
    // Moon (more orange when warming)
    const mx=W*.82,my=H*.13;
    const mg=c.createRadialGradient(mx,my,0,mx,my,70);
    mg.addColorStop(0,`rgba(${220+w*30},${215-w*50},${180-w*80},0.9)`);
    mg.addColorStop(.3,`rgba(${220+w*30},${215-w*50},${180-w*80},0.3)`);
    mg.addColorStop(1,'rgba(220,215,180,0)');
    c.fillStyle=mg;c.beginPath();c.arc(mx,my,70,0,6.28);c.fill();
    c.fillStyle=`rgb(${232+w*20},${228-w*30},${200-w*50})`;
    c.beginPath();c.arc(mx,my,18,0,6.28);c.fill();
  },
  draw(){
    const cv=document.getElementById('cv-erciyes');if(!cv)return;
    const c=cv.getContext('2d'),W=cv.width,H=cv.height;if(!W)return;
    const t=SIM.gt,v=this.val();
    c.clearRect(0,0,W,H);
    if(!this.initOnce)this.init();

    this.drawSky(c,W,H,t,v.w);

    // Snow line calculation
    let snowLevel=H*.3;
    if(v.w>0)snowLevel+=v.w*22;
    if(v.p>0)snowLevel-=v.p*2.5;
    snowLevel=util.clamp(snowLevel,H*.1,H*.85);
    const peakY=H*.08;

    // ============== MOUNTAIN LAYERS ==============
    // Far mountains
    c.fillStyle='rgba(30,41,59,0.5)';
    c.beginPath();c.moveTo(0,H*.85);
    c.lineTo(W*.12,H*.55);c.lineTo(W*.22,H*.62);c.lineTo(W*.35,H*.45);c.lineTo(W*.5,H*.5);
    c.lineTo(W*.65,H*.4);c.lineTo(W*.8,H*.55);c.lineTo(W*.92,H*.48);c.lineTo(W,H*.6);
    c.lineTo(W,H*.85);c.closePath();c.fill();

    // Main mountain (Erciyes)
    const mtnG=c.createLinearGradient(0,peakY,0,H);
    mtnG.addColorStop(0,'#78716c');
    mtnG.addColorStop(.3,'#57534e');
    mtnG.addColorStop(1,'#292524');
    c.fillStyle=mtnG;
    c.beginPath();c.moveTo(0,H);
    c.lineTo(0,H*.72);c.lineTo(W*.1,H*.6);c.lineTo(W*.22,H*.45);
    c.lineTo(W*.38,H*.25);c.lineTo(W*.5,peakY);
    c.lineTo(W*.62,H*.22);c.lineTo(W*.78,H*.42);c.lineTo(W*.9,H*.55);c.lineTo(W,H*.7);
    c.lineTo(W,H);c.closePath();c.fill();

    // Snow caps
    if(snowLevel<H*.8){
      c.save();
      c.beginPath();c.rect(0,0,W,snowLevel);c.clip();
      // Snow on mountain silhouette
      const snowG=c.createLinearGradient(0,peakY,0,snowLevel);
      snowG.addColorStop(0,'#ffffff');
      snowG.addColorStop(.7,'#e0f2fe');
      snowG.addColorStop(1,'#bae6fd');
      c.fillStyle=snowG;
      c.beginPath();c.moveTo(0,H);
      c.lineTo(0,H*.72);c.lineTo(W*.1,H*.6);c.lineTo(W*.22,H*.45);
      c.lineTo(W*.38,H*.25);c.lineTo(W*.5,peakY);
      c.lineTo(W*.62,H*.22);c.lineTo(W*.78,H*.42);c.lineTo(W*.9,H*.55);c.lineTo(W,H*.7);
      c.lineTo(W,H);c.closePath();c.fill();
      c.restore();
      // Snow sparkles
      for(let i=0;i<20;i++){
        const sx=Math.random()*W,sy=snowLevel*.3+Math.random()*snowLevel*.6;
        const sp=(Math.sin(t*3+i)+1)*.4;
        c.fillStyle=`rgba(255,255,255,${sp})`;
        c.shadowBlur=6;c.shadowColor='#fff';
        c.beginPath();c.arc(sx,sy,1+sp,0,6.28);c.fill();
        c.shadowBlur=0;
      }
    }

    // Rock exposure (when warm)
    if(v.w>3){
      c.fillStyle=`rgba(120,113,108,${Math.min(v.w/10,.7)})`;
      c.beginPath();c.moveTo(W*.35,H*.35);c.lineTo(W*.4,H*.3);c.lineTo(W*.45,H*.4);c.closePath();c.fill();
      c.beginPath();c.moveTo(W*.55,H*.28);c.lineTo(W*.6,H*.22);c.lineTo(W*.65,H*.35);c.closePath();c.fill();
    }

    // ============== SLOPE & LODGE ==============
    // Base lodge
    const lodgeY=H*.78,lodgeX=W*.12;
    c.fillStyle='#3f2817';
    util.roundRect(c,lodgeX,lodgeY,80,H*.12,3);c.fill();
    // Roof (snowy)
    c.fillStyle='#1c1917';
    c.beginPath();c.moveTo(lodgeX-5,lodgeY);c.lineTo(lodgeX+40,lodgeY-18);c.lineTo(lodgeX+85,lodgeY);c.closePath();c.fill();
    if(snowLevel<H*.8){
      c.fillStyle='#fff';
      c.beginPath();c.moveTo(lodgeX-5,lodgeY);c.lineTo(lodgeX+40,lodgeY-18);c.lineTo(lodgeX+85,lodgeY);c.closePath();c.fill();
      c.fillStyle='#3f2817';
      c.beginPath();c.moveTo(lodgeX-3,lodgeY+1);c.lineTo(lodgeX+40,lodgeY-14);c.lineTo(lodgeX+83,lodgeY+1);c.closePath();c.fill();
    }
    // Windows glowing
    c.shadowBlur=12;c.shadowColor='#fbbf24';
    c.fillStyle='rgba(251,191,36,0.85)';
    c.fillRect(lodgeX+8,lodgeY+10,14,14);
    c.fillRect(lodgeX+32,lodgeY+10,14,14);
    c.fillRect(lodgeX+56,lodgeY+10,14,14);
    c.shadowBlur=0;
    // Smoke from chimney
    for(let i=0;i<3;i++){
      const sx=lodgeX+40+Math.sin((t+i)*.5)*8,sy=lodgeY-18-i*15-(t*5)%40;
      c.fillStyle=`rgba(180,180,180,${.5-i*.15})`;
      c.beginPath();c.arc(sx,sy,8+i*3,0,6.28);c.fill();
    }

    // ============== SKI LIFT ==============
    // Towers
    const towerPoints=[[W*.22,H*.58],[W*.35,H*.42],[W*.5,H*.18]];
    // Cable
    c.strokeStyle='rgba(100,116,139,0.8)';c.lineWidth=1.5;
    c.beginPath();c.moveTo(W*.12,H*.78);
    towerPoints.forEach(p=>c.lineTo(p[0],p[1]));
    c.stroke();
    // Support cables (sag)
    c.strokeStyle='rgba(180,180,180,0.5)';c.lineWidth=.8;
    c.beginPath();c.moveTo(W*.12,H*.78+2);
    towerPoints.forEach((p,i)=>{
      const prev=i===0?[W*.12,H*.78]:towerPoints[i-1];
      const midX=(prev[0]+p[0])/2,midY=(prev[1]+p[1])/2+4;
      c.quadraticCurveTo(midX,midY,p[0],p[1]+2);
    });
    c.stroke();
    // Towers
    towerPoints.forEach(p=>{
      c.strokeStyle='#475569';c.lineWidth=3;
      c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(p[0],p[1]+60);c.stroke();
      c.fillStyle='#64748b';c.fillRect(p[0]-8,p[1]-4,16,6);
    });
    // Gondolas
    for(let i=0;i<3;i++){
      const prog=((t*.1+i*.35)%1);
      let gx,gy;
      if(prog<.5){
        const p=prog*2;
        const p1=[W*.12,H*.78],p2=towerPoints[0];
        gx=p1[0]+(p2[0]-p1[0])*p;gy=p1[1]+(p2[1]-p1[1])*p+2;
      } else if(prog<.8){
        const p=(prog-.5)/.3;
        const p1=towerPoints[0],p2=towerPoints[1];
        gx=p1[0]+(p2[0]-p1[0])*p;gy=p1[1]+(p2[1]-p1[1])*p+2;
      } else {
        const p=(prog-.8)/.2;
        const p1=towerPoints[1],p2=towerPoints[2];
        gx=p1[0]+(p2[0]-p1[0])*p;gy=p1[1]+(p2[1]-p1[1])*p+2;
      }
      // Gondola cabin
      c.fillStyle='#ef4444';
      util.roundRect(c,gx-9,gy+4,18,13,2);c.fill();
      c.fillStyle='#fbbf24';
      c.fillRect(gx-7,gy+6,14,4);
      c.strokeStyle='#1e293b';c.lineWidth=1.5;
      c.beginPath();c.moveTo(gx,gy);c.lineTo(gx,gy+4);c.stroke();
    }

    // ============== SKIERS ON SLOPE ==============
    if(snowLevel<H*.7){
      this.skiers.forEach((sk,i)=>{
        sk.p=(sk.p+.0015*sk.s)%1;
        const trackY=[.4,.5,.6][sk.track];
        const sx=W*(.25+sk.p*.7);
        const sy=H*(.3+trackY*.4)+Math.sin(sk.p*8)*3;
        // Trail
        c.strokeStyle='rgba(255,255,255,0.6)';c.lineWidth=2;
        c.beginPath();c.moveTo(sx-30,sy+4);c.lineTo(sx-2,sy+4);c.stroke();
        // Body
        c.fillStyle=sk.col;
        c.beginPath();c.arc(sx,sy-4,2.5,0,6.28);c.fill();
        c.fillRect(sx-2,sy-2,4,5);
        // Skis
        c.strokeStyle='#1e293b';c.lineWidth=1.8;c.lineCap='round';
        c.beginPath();c.moveTo(sx-6,sy+4);c.lineTo(sx+7,sy+4);c.stroke();
        // Poles
        c.strokeStyle='#94a3b8';c.lineWidth=1;
        c.beginPath();c.moveTo(sx-3,sy);c.lineTo(sx-5,sy+5);c.stroke();
      });
    }

    // ============== SNOW CANNONS ==============
    if(v.p>0){
      const cCount=Math.min(Math.floor(v.p/15)+1,5);
      for(let ci=0;ci<cCount;ci++){
        const cx=W*.15+ci*(W*.14);
        const cy=H*.82;
        // Base / tripod
        c.fillStyle='#475569';
        c.fillRect(cx-10,cy+4,20,8);
        c.strokeStyle='#334155';c.lineWidth=2;
        c.beginPath();c.moveTo(cx-12,cy+20);c.lineTo(cx,cy+8);c.lineTo(cx+12,cy+20);c.stroke();
        // Fan housing
        c.fillStyle='#1e293b';
        c.beginPath();c.arc(cx,cy-2,10,0,6.28);c.fill();
        // Rotating fan
        c.strokeStyle='#64748b';c.lineWidth=1.5;
        for(let b=0;b<4;b++){
          const a=t*8+b/4*6.28;
          c.beginPath();c.moveTo(cx,cy-2);c.lineTo(cx+Math.cos(a)*8,cy-2+Math.sin(a)*8);c.stroke();
        }
        c.fillStyle='#fbbf24';c.beginPath();c.arc(cx,cy-2,2,0,6.28);c.fill();
        // Spray particles
        const emit=Math.floor(v.p/25)+1;
        for(let sp=0;sp<emit;sp++){
          this.parts.push({x:cx,y:cy-2,vx:2+Math.random()*3,vy:-4-Math.random()*4,life:1,size:2+Math.random()*2});
        }
      }
    }

    // Update particles (snow spray)
    for(let i=this.parts.length-1;i>=0;i--){
      const p=this.parts[i];
      p.vy+=.14;p.x+=p.vx;p.y+=p.vy;p.life-=.015;
      c.shadowBlur=8;c.shadowColor='#fff';
      c.fillStyle=`rgba(255,255,255,${p.life})`;
      c.beginPath();c.arc(p.x,p.y,p.size,0,6.28);c.fill();
      c.shadowBlur=0;
      if(p.life<=0||p.y>H)this.parts.splice(i,1);
    }

    // Falling natural snow
    if(v.w<4 && snowLevel<H*.7){
      this.flakes.forEach(f=>{
        f.y+=f.s*.003;f.x+=f.d;if(f.y>1){f.y=0;f.x=Math.random();}
        const fx=f.x*W,fy=f.y*H;
        c.fillStyle=`rgba(255,255,255,${.6+f.r/5})`;
        c.beginPath();c.arc(fx,fy,f.r,0,6.28);c.fill();
      });
    }

    // Warming heat haze
    if(v.w>4){
      c.fillStyle=`rgba(251,146,60,${.04+Math.sin(t*2)*.03})`;
      c.fillRect(0,0,W,H);
    }

    // Update HUD
    const alt=Math.round(3016-snowLevel/H*1200);
    const temp=Math.round(-12+v.w*3);
    const snowDepth=Math.max(0,Math.round(85-v.w*12+v.p*.8));
    const ro=document.getElementById('e-readout');
    if(ro)ro.innerHTML=`ALT: <span class="val">${alt}m</span><br>TEMP: <span class="val">${temp}°C</span><br>SNOW: <span class="val">${snowDepth}cm</span><br>GUESTS: <span class="val">${v.tur}k</span>`;

    // Status
    const msg=v.w>6&&v.p<30?'⚠ KAR BİTTİ':'◆ PİSTLER AÇIK';
    const msgCol=v.w>6&&v.p<30?'#ef4444':'#34d399';
    c.fillStyle='rgba(2,6,23,0.75)';util.roundRect(c,W*.5-90,H-32,180,22,4);c.fill();
    c.font='bold 11px JetBrains Mono';c.fillStyle=msgCol;c.textAlign='center';
    c.fillText(msg,W/2,H-17);
  }
};

// ============================================================
// 4. ENERJİ — CYBERPUNK CITY POWER GRID
// ============================================================
const EN={
  act:false,fails:false,buildings:[],windows:[],rain:[],lightningT:0,
  initOnce:false,cars:[],
  val(){return{
    src:document.getElementById('en-src').value,
    ai:document.getElementById('en-ai').value,
    b:+document.getElementById('en-bat').value,
    k:+document.getElementById('en-kablo').value
  };},
  init(){
    this.buildings=[];
    let x=0;
    while(x<1){
      const w=.04+Math.random()*.06;
      const h=.35+Math.random()*.45;
      this.buildings.push({x,w,h,type:Math.random()>.5?'tower':'block',roof:Math.random()>.5,ad:Math.random()>.6});
      x+=w+.002;
    }
    this.windows=this.buildings.map(b=>{
      const rows=Math.floor(b.h*50), cols=Math.floor(b.w*60);
      return Array.from({length:rows},()=>Array.from({length:Math.max(2,cols)},()=>Math.random()>.25));
    });
    this.rain=[];for(let i=0;i<120;i++)this.rain.push({x:Math.random(),y:Math.random(),s:.5+Math.random()*.5});
    this.cars=[];for(let i=0;i<5;i++)this.cars.push({x:Math.random(),s:.0008+Math.random()*.0006,dir:Math.random()>.5?1:-1,col:['#ef4444','#facc15','#38bdf8','#fff'][Math.floor(Math.random()*4)]});
    this.initOnce=true;
  },
  upd(){
    this.act=false;this.fails=false;
    clearInterval(util.tmrs['en']);
    document.getElementById('en-timer-hud').classList.remove('active');
    document.getElementById('en-crt').classList.remove('active');
    document.getElementById('en-status').textContent="◆ ŞEBEKE ÇEVRİMİÇİ";
    if(!this.initOnce)this.init();
  },
  play(){
    this.act=true;AUDIO.alarm();
    setTimeout(()=>AUDIO.wind(13,1.1),400);
    document.getElementById('en-crt').classList.add('active');
    document.getElementById('en-status').innerHTML="<span style='color:#fb7185'>◆ SÜPER HÜCRE FIRTINASI</span>";
    util.runTimer('en',this);
  },
  end(){
    this.act=false;document.getElementById('en-crt').classList.remove('active');
    const v=this.val();
    const isW=v.src==='clean'&&v.ai==='on'&&v.k>40;
    document.getElementById('en-status').innerHTML=isW?"◆ KORUMA BAŞARILI":"<span style='color:var(--red)'>◆ BLACKOUT</span>";
    MODAL.show(
      isW?"ŞEBEKE DİRENDİ":"BLACKOUT",
      isW?"Yapay Zeka Zaferi":"Fosil Çöküş",
      isW?`<strong>%${v.k} kalite</strong> süper kablolar ve <strong>Smart Grid</strong> sayesinde metropol fırtınanın ortasında bile ışıl ışıl. <strong>${v.b} MWh</strong> batarya yedeklemesi devrede. <strong>(Possibilizm)</strong>`
      :`Fırtına zayıf iletkenleri (%${v.k} kalite) paçavra gibi kopardı. Tüm metropol karanlığa gömüldü. Fosil yakıt merkezi santral tek noktadan çöktü. <strong>(Determinizm)</strong>`,
      isW?10:100,isW?90:0,isW
    );
  },
  draw(){
    const cv=document.getElementById('cv-enerji');if(!cv)return;
    const c=cv.getContext('2d'),W=cv.width,H=cv.height;if(!W)return;
    const t=SIM.gt,v=this.val();
    c.clearRect(0,0,W,H);
    if(!this.initOnce)this.init();

    this.fails=this.act && (v.k<40||v.ai==='off'||(v.src==='coal'&&v.b<100));

    // ============== SKY / STORM ==============
    const sg=c.createLinearGradient(0,0,0,H);
    if(this.act){
      sg.addColorStop(0,'#020617');sg.addColorStop(.5,'#0f1629');sg.addColorStop(1,'#1e1b4b');
    } else {
      sg.addColorStop(0,'#0c0a24');sg.addColorStop(.5,'#1e1b4b');sg.addColorStop(.8,'#4c1d95');sg.addColorStop(1,'#831843');
    }
    c.fillStyle=sg;c.fillRect(0,0,W,H);

    // Storm clouds
    if(this.act){
      for(let i=0;i<6;i++){
        const cx=(i*W/6+t*15)%(W+200)-100;
        const cy=H*.08+i*12;
        c.fillStyle='rgba(15,23,42,0.8)';
        for(let j=0;j<6;j++){
          c.beginPath();c.arc(cx+j*32,cy+Math.sin(j)*6,25+j%2*5,0,6.28);c.fill();
        }
      }
    } else {
      // Stars
      for(let i=0;i<60;i++){
        const sx=(i*73)%W,sy=(i*41)%(H*.35);
        const o=(Math.sin(t*1.5+i)+1)*.3+.1;
        c.fillStyle=`rgba(255,255,255,${o})`;
        c.beginPath();c.arc(sx,sy,1,0,6.28);c.fill();
      }
      // Distant moon
      c.fillStyle='rgba(251,146,60,0.3)';
      c.beginPath();c.arc(W*.85,H*.15,22,0,6.28);c.fill();
    }

    // Lightning flashes
    if(this.act && Math.random()>.94){
      this.lightningT=1;AUDIO.zap();
    }
    if(this.lightningT>0){
      c.fillStyle=`rgba(186,230,253,${this.lightningT*.6})`;c.fillRect(0,0,W,H);
      // Lightning bolt
      c.strokeStyle=`rgba(255,255,255,${this.lightningT})`;c.lineWidth=3;
      c.shadowBlur=30;c.shadowColor='#bae6fd';
      c.beginPath();
      const lx=W*(.2+Math.random()*.6);
      c.moveTo(lx,0);
      let cy=0;
      while(cy<H*.4){
        cy+=20+Math.random()*30;
        c.lineTo(lx+(Math.random()-.5)*40,cy);
      }
      c.stroke();c.shadowBlur=0;
      this.lightningT-=.08;
    }

    // ============== POWER SOURCE (LEFT) ==============
    c.save();
    const srcX=W*.15,srcY=H*.7;
    if(v.src==='clean'){
      // Wind turbines (3)
      for(let ti=0;ti<3;ti++){
        const tx=W*.05+ti*W*.05;
        const ty=H*.35+ti*15;
        // Pillar
        c.fillStyle='#e2e8f0';
        c.beginPath();
        c.moveTo(tx-2,srcY);c.lineTo(tx+2,srcY);c.lineTo(tx+4,ty);c.lineTo(tx-4,ty);c.closePath();c.fill();
        // Nacelle
        c.fillStyle='#cbd5e1';
        util.roundRect(c,tx-8,ty-6,16,10,2);c.fill();
        // Blades
        c.save();c.translate(tx,ty-1);c.rotate(t*(this.act?6:2)+ti*2);
        c.fillStyle='#f1f5f9';
        for(let b=0;b<3;b++){
          c.save();c.rotate(b*2.09);
          c.beginPath();c.moveTo(-3,-2);c.lineTo(3,-2);c.lineTo(1,-70);c.lineTo(-1,-70);c.closePath();c.fill();
          c.restore();
        }
        // Hub
        c.fillStyle='#64748b';c.beginPath();c.arc(0,0,4,0,6.28);c.fill();
        c.restore();
      }
      // Solar panels
      for(let i=0;i<4;i++){
        const px=W*.02+i*22,py=srcY+5;
        c.fillStyle='#020617';
        c.beginPath();c.moveTo(px,py);c.lineTo(px+18,py);c.lineTo(px+22,py+15);c.lineTo(px+4,py+15);c.closePath();c.fill();
        // Cells
        c.strokeStyle='rgba(56,189,248,0.5)';c.lineWidth=.5;
        for(let r=0;r<3;r++){for(let cc=0;cc<3;cc++){
          c.strokeRect(px+4+cc*5,py+2+r*4,4,3);
        }}
        // Glow
        c.fillStyle=`rgba(56,189,248,${.2+Math.sin(t*3+i)*.1})`;
        c.beginPath();c.moveTo(px,py);c.lineTo(px+18,py);c.lineTo(px+22,py+15);c.lineTo(px+4,py+15);c.closePath();c.fill();
      }
    } else {
      // Coal plant
      c.fillStyle='#1e293b';
      util.roundRect(c,W*.02,H*.5,W*.16,H*.35,4);c.fill();
      // Chimneys
      for(let ch=0;ch<3;ch++){
        const cx=W*.035+ch*W*.055;
        c.fillStyle='#0f172a';c.fillRect(cx,H*.35,W*.03,H*.2);
        c.fillStyle='#ef4444';c.fillRect(cx,H*.35,W*.03,3);
        // Smoke
        for(let s=0;s<4;s++){
          const sy=H*.35-10-s*18-(t*20)%60;
          const sx=cx+W*.015+Math.sin((t+s+ch)*.5)*5;
          c.fillStyle=`rgba(55,65,81,${.6-s*.12})`;
          c.beginPath();c.arc(sx,sy,10+s*4,0,6.28);c.fill();
        }
      }
      // Lit windows
      for(let r=0;r<4;r++){
        for(let cc=0;cc<3;cc++){
          const wx=W*.03+cc*W*.05,wy=H*.55+r*30;
          const lit=this.act?Math.sin(t*8+r+cc)>.4:true;
          c.shadowBlur=lit?8:0;c.shadowColor='#fbbf24';
          c.fillStyle=lit?'rgba(251,191,36,0.85)':'rgba(15,23,42,0.8)';
          c.fillRect(wx,wy,W*.03,15);c.shadowBlur=0;
        }
      }
    }
    c.restore();

    // ============== POWER LINES / PYLONS ==============
    const pylons=[[W*.22,H*.5],[W*.35,H*.48],[W*.48,H*.52]];
    pylons.forEach(p=>{
      c.strokeStyle='#334155';c.lineWidth=2.5;
      c.beginPath();c.moveTo(p[0],H*.85);c.lineTo(p[0],p[1]);c.stroke();
      // Cross arms
      c.beginPath();c.moveTo(p[0]-10,p[1]+5);c.lineTo(p[0]+10,p[1]+5);c.stroke();
      c.beginPath();c.moveTo(p[0]-14,p[1]+14);c.lineTo(p[0]+14,p[1]+14);c.stroke();
      // Insulators
      c.fillStyle='#94a3b8';
      c.beginPath();c.arc(p[0]-10,p[1]+7,2,0,6.28);c.fill();
      c.beginPath();c.arc(p[0]+10,p[1]+7,2,0,6.28);c.fill();
    });
    // Cables between pylons
    const cableCol=v.k>70?'#34d399':(v.k>40?'#facc15':'#ef4444');
    c.strokeStyle=cableCol;c.lineWidth=1.5;
    c.shadowBlur=this.fails?0:10;c.shadowColor=cableCol;
    const cablePoints=[[W*.15,H*.7]].concat(pylons.map(p=>[p[0],p[1]+7])).concat([[W*.6,H*.55]]);
    for(let ln=0;ln<3;ln++){
      c.beginPath();
      cablePoints.forEach((p,i)=>{
        const py=p[1]+ln*7;
        if(i===0)c.moveTo(p[0],py);
        else {
          const prev=cablePoints[i-1];
          const sag=this.fails?20:10;
          c.quadraticCurveTo((prev[0]+p[0])/2,Math.max(prev[1]+ln*7,py)+sag+Math.sin(t*3+ln)*2,p[0],py);
        }
      });
      c.stroke();
    }
    c.shadowBlur=0;

    // Energy pulse flowing along cable
    if(!this.fails){
      for(let i=0;i<5;i++){
        const prog=((t*.3+i*.2)%1);
        const segIdx=Math.floor(prog*(cablePoints.length-1));
        const segT=prog*(cablePoints.length-1)-segIdx;
        const p1=cablePoints[segIdx],p2=cablePoints[segIdx+1];
        if(!p1||!p2)continue;
        const px=p1[0]+(p2[0]-p1[0])*segT;
        const py=p1[1]+(p2[1]-p1[1])*segT+8;
        c.shadowBlur=14;c.shadowColor=cableCol;
        c.fillStyle=cableCol;
        c.beginPath();c.arc(px,py,2.5,0,6.28);c.fill();
        c.shadowBlur=0;
      }
    }

    // Sparks from broken cables
    if(this.fails && Math.random()>.5){
      const pi=Math.floor(Math.random()*pylons.length);
      const p=pylons[pi];
      for(let s=0;s<4;s++){
        c.shadowBlur=15;c.shadowColor='#fbbf24';
        c.fillStyle='#fbbf24';
        c.fillRect(p[0]+(Math.random()-.5)*20,p[1]+7+(Math.random()-.5)*10,3,3);
        c.shadowBlur=0;
      }
    }

    // ============== CITY SKYLINE (RIGHT) ==============
    const cityStartX=W*.55;
    const cityW=W-cityStartX;
    const gy=H*.9;

    // Rain (behind buildings)
    if(this.act){
      this.rain.forEach(r=>{
        r.y+=.012*r.s;r.x-=.002;
        if(r.y>1){r.y=0;r.x=Math.random();}
        if(r.x<0)r.x=1;
        const rx=cityStartX+r.x*cityW,ry=r.y*H;
        c.strokeStyle='rgba(186,230,253,0.35)';c.lineWidth=1;
        c.beginPath();c.moveTo(rx,ry);c.lineTo(rx-3,ry+12);c.stroke();
      });
    }

    // Draw each building
    this.buildings.forEach((b,bi)=>{
      const bx=cityStartX+b.x*cityW;
      const bw=b.w*cityW;
      const bh=b.h*H*.55;
      const by=gy-bh;
      // Building body
      const bgrad=c.createLinearGradient(bx,by,bx+bw,by);
      bgrad.addColorStop(0,this.fails?'#020617':'#0f172a');
      bgrad.addColorStop(.5,this.fails?'#0a0e1a':'#1e293b');
      bgrad.addColorStop(1,this.fails?'#020617':'#0f172a');
      c.fillStyle=bgrad;c.fillRect(bx,by,bw,bh);
      // Building edge highlight
      c.fillStyle=this.fails?'rgba(30,41,59,0.5)':'rgba(56,189,248,0.15)';
      c.fillRect(bx,by,2,bh);
      c.fillStyle='rgba(0,0,0,0.35)';
      c.fillRect(bx+bw-2,by,2,bh);
      // Windows (grid)
      const wArr=this.windows[bi];
      const rows=wArr.length, cols=wArr[0].length;
      const wwidth=(bw-8)/cols-1;
      const wheight=(bh-8)/rows-1;
      for(let r=0;r<rows;r++){
        for(let co=0;co<cols;co++){
          const wx=bx+4+co*(wwidth+1);
          const wy=by+4+r*(wheight+1);
          let lit=wArr[r][co];
          if(this.fails)lit=Math.sin(t*20+r+co+bi)>.8;
          if(lit){
            const fl=.7+Math.sin(t*2+r*1.3+co*.7+bi)*.2;
            const col=bi%4===0?`rgba(56,189,248,${fl})`:bi%4===1?`rgba(251,191,36,${fl})`:bi%4===2?`rgba(236,72,153,${fl})`:`rgba(52,211,153,${fl})`;
            c.fillStyle=col;c.fillRect(wx,wy,wwidth,wheight);
            // glow
            if(wwidth>3){
              c.shadowBlur=6;c.shadowColor=col;
              c.fillRect(wx,wy,wwidth,wheight);c.shadowBlur=0;
            }
          } else {
            c.fillStyle='rgba(2,6,23,0.9)';c.fillRect(wx,wy,wwidth,wheight);
          }
        }
      }
      // Antenna/spire
      if(b.type==='tower'){
        c.strokeStyle='#64748b';c.lineWidth=1.5;
        c.beginPath();c.moveTo(bx+bw/2,by);c.lineTo(bx+bw/2,by-20);c.stroke();
        c.shadowBlur=8;c.shadowColor='#ef4444';
        c.fillStyle=Math.sin(t*4)>0?'#ef4444':'#7f1d1d';
        c.beginPath();c.arc(bx+bw/2,by-20,2.5,0,6.28);c.fill();
        c.shadowBlur=0;
      }
      // Holographic ad sign
      if(b.ad && !this.fails && bh>80){
        const adColors=['#ec4899','#06b6d4','#f59e0b'];
        const col=adColors[bi%3];
        c.shadowBlur=15;c.shadowColor=col;
        c.fillStyle=`${col}`;
        c.fillRect(bx+bw*.2,by+bh*.25,bw*.6,8);
        c.shadowBlur=0;
        c.fillStyle='rgba(0,0,0,0.5)';
        c.fillRect(bx+bw*.25,by+bh*.27,bw*.5,4);
      }
    });

    // Offline overlay
    if(this.fails){
      c.fillStyle='rgba(239,68,68,0.05)';c.fillRect(cityStartX,0,cityW,H);
      c.shadowBlur=25;c.shadowColor='#ef4444';
      c.font='bold 48px Orbitron';c.fillStyle='#ef4444';c.textAlign='center';
      c.fillText('OFFLINE',cityStartX+cityW/2,H*.4);c.shadowBlur=0;
    }

    // Ground reflection (wet)
    if(this.act){
      const rg=c.createLinearGradient(0,gy,0,H);
      rg.addColorStop(0,'rgba(30,41,59,0.6)');
      rg.addColorStop(1,'rgba(2,6,23,0.9)');
      c.fillStyle=rg;c.fillRect(0,gy,W,H-gy);
      // Reflective shimmer
      c.fillStyle='rgba(56,189,248,0.05)';
      for(let i=0;i<20;i++){
        const rx=Math.random()*W;
        c.fillRect(rx,gy+Math.random()*(H-gy),2,1);
      }
    } else {
      c.fillStyle='#0a0e1a';c.fillRect(0,gy,W,H-gy);
    }

    // Flying cars/drones
    if(!this.fails){
      this.cars.forEach((car,i)=>{
        car.x=(car.x+car.s*car.dir+1)%1;
        const cx=car.x*W, cy=H*.2+i*25;
        c.shadowBlur=10;c.shadowColor=car.col;
        c.fillStyle=car.col;
        c.fillRect(cx-4,cy,8,2);c.shadowBlur=0;
        // Light trail
        c.strokeStyle=`${car.col}99`;c.lineWidth=1;
        c.beginPath();c.moveTo(cx-4,cy+1);c.lineTo(cx-4-car.dir*15,cy+1);c.stroke();
      });
    }

    // Update HUD
    const load=this.fails?0:Math.round(500+v.b*.5+(v.k/100)*300);
    const freq=this.fails?(45+Math.random()*5).toFixed(1):'50.0';
    const status=this.fails?'BLACKOUT':v.src==='clean'?'GREEN':'AMBER';
    const statCol=this.fails?'#ef4444':status==='GREEN'?'#34d399':'#facc15';
    const ro=document.getElementById('en-readout');
    if(ro)ro.innerHTML=`LOAD: <span class="val">${load} MW</span><br>FREQ: <span class="val">${freq} Hz</span><br>BAT: <span class="val">${v.b} MWh</span><br>STATUS: <span class="val" style="color:${statCol}">${status}</span>`;
  }
};

// ============================================================
// 5. ULAŞIM — MOUNTAIN ROAD / AVALANCHE
// ============================================================
const U={
  act:false,crsh:0,cars:[],avalanche:[],snowPile:0,stars:[],flakes:[],initOnce:false,
  val(){return{
    y:document.getElementById('u-yol').value,
    b:document.getElementById('u-beton').value,
    s:+document.getElementById('u-serit').value,
    c:+document.getElementById('u-cig').value
  };},
  init(){
    this.stars=Array.from({length:120},()=>({x:Math.random(),y:Math.random()*.5,r:Math.random()*1.2+.2,s:Math.random()*.4+.2,p:Math.random()*6.28}));
    this.flakes=[];for(let i=0;i<80;i++)this.flakes.push({x:Math.random(),y:Math.random(),r:.4+Math.random()*1.5,s:.1+Math.random()*.3,d:(Math.random()-.5)*.004});
    this.initOnce=true;
  },
  upd(){
    this.act=false;this.crsh=0;this.cars=[];this.avalanche=[];this.snowPile=0;
    clearInterval(util.tmrs['u']);
    document.getElementById('u-timer-hud').classList.remove('active');
    document.getElementById('u-crt').classList.remove('active');
    document.getElementById('u-status').innerHTML="◆ TRAFİK AKICI";
    if(!this.initOnce)this.init();
  },
  play(){
    this.act=true;AUDIO.alarm();
    setTimeout(()=>AUDIO.rumble(13,1.8),400);
    document.getElementById('u-crt').classList.add('active');
    document.getElementById('u-status').innerHTML="<span style='color:#ef4444'>◆ ÇIĞ ALARMI - KIRMIZI</span>";
    util.runTimer('u',this);
  },
  end(){
    this.act=false;document.getElementById('u-crt').classList.remove('active');
    const v=this.val();
    let isW=v.y==='tunel';
    if(isW && v.c>150 && v.b==='c15')isW=false;
    document.getElementById('u-status').innerHTML=isW?"◆ KORİDOR GÜVENLİ":"<span style='color:var(--red)'>◆ YOLLAR KAPANDI</span>";
    MODAL.show(
      isW?"VİYADÜK ZAFERİ":"LOJİSTİK ÇÖKÜŞÜ",
      isW?"Limitler Aşıldı":"Dağ Kazandı",
      isW?`<strong>${v.c*1000} ton</strong> çığ kütlesine rağmen tünel mimarisi ${v.s} şeritli trafiği hiç aksatmadı. Kuru liman bağlantısı hiç kesilmedi. <strong>(Possibilizm)</strong>`
      :`Dağdan kopan <strong>${v.c*1000} ton</strong> kar-kaya kütlesi ${v.y==='tunel'?'C15 kalitesiz betonu patlattı':'geleneksel virajlı yolu kapattı'}. Zincirleme kaza! <strong>(Determinizm)</strong>`,
      isW?15:95,isW?85:5,isW
    );
  },
  draw(){
    const cv=document.getElementById('cv-ulasim');if(!cv)return;
    const c=cv.getContext('2d'),W=cv.width,H=cv.height;if(!W)return;
    const t=SIM.gt,v=this.val();
    c.clearRect(0,0,W,H);
    if(!this.initOnce)this.init();

    // ============== SKY ==============
    const sg=c.createLinearGradient(0,0,0,H*.7);
    sg.addColorStop(0,'#020617');
    sg.addColorStop(.4,'#0c1629');
    sg.addColorStop(.8,'#1e3a5f');
    sg.addColorStop(1,'#4a5568');
    c.fillStyle=sg;c.fillRect(0,0,W,H*.7);

    // Stars
    this.stars.forEach(s=>{
      const o=(Math.sin(t*s.s+s.p)+1)*.3+.2;
      c.globalAlpha=o;c.fillStyle='#fff';
      c.beginPath();c.arc(s.x*W,s.y*H,s.r,0,6.28);c.fill();
    });
    c.globalAlpha=1;

    // Moon
    const mx=W*.8,my=H*.14;
    const mg=c.createRadialGradient(mx,my,0,mx,my,80);
    mg.addColorStop(0,'rgba(226,232,240,0.6)');
    mg.addColorStop(1,'rgba(186,230,253,0)');
    c.fillStyle=mg;c.beginPath();c.arc(mx,my,80,0,6.28);c.fill();
    c.fillStyle='#e0f2fe';c.beginPath();c.arc(mx,my,18,0,6.28);c.fill();

    // ============== MOUNTAIN LAYERS (PARALLAX) ==============
    // Far back
    c.fillStyle='rgba(15,23,42,0.8)';
    c.beginPath();c.moveTo(0,H);
    c.lineTo(0,H*.55);c.lineTo(W*.2,H*.35);c.lineTo(W*.4,H*.45);c.lineTo(W*.6,H*.3);
    c.lineTo(W*.8,H*.4);c.lineTo(W,H*.5);c.lineTo(W,H);c.closePath();c.fill();
    // Middle
    c.fillStyle='rgba(30,41,59,0.9)';
    c.beginPath();c.moveTo(0,H);
    c.lineTo(0,H*.7);c.lineTo(W*.15,H*.5);c.lineTo(W*.3,H*.55);c.lineTo(W*.5,H*.4);
    c.lineTo(W*.7,H*.5);c.lineTo(W*.85,H*.45);c.lineTo(W,H*.6);c.lineTo(W,H);c.closePath();c.fill();
    // Snow caps far
    c.fillStyle='rgba(226,232,240,0.7)';
    c.beginPath();c.moveTo(W*.45,H*.43);c.lineTo(W*.5,H*.4);c.lineTo(W*.55,H*.44);
    c.lineTo(W*.52,H*.42);c.lineTo(W*.5,H*.41);c.lineTo(W*.48,H*.42);c.closePath();c.fill();
    c.beginPath();c.moveTo(W*.65,H*.48);c.lineTo(W*.7,H*.44);c.lineTo(W*.75,H*.49);c.closePath();c.fill();

    // ============== SNOW MIST ==============
    this.flakes.forEach(f=>{
      f.y+=f.s*.003;f.x+=f.d;if(f.y>1){f.y=0;f.x=Math.random();}
      c.fillStyle=`rgba(255,255,255,${.4+f.r/4})`;
      c.beginPath();c.arc(f.x*W,f.y*H,f.r,0,6.28);c.fill();
    });

    // ============== TRAFFIC LIGHT ==============
    const tlx=40,tly=30;
    c.fillStyle='#334155';c.fillRect(tlx+15,tly+95,8,H-tly-95);
    c.fillStyle='#1e293b';util.roundRect(c,tlx,tly,40,90,4);c.fill();
    c.fillStyle='#000';c.fillRect(tlx+3,tly+3,34,84);
    // Red light
    const isRed=this.act;
    c.shadowBlur=isRed?20:0;c.shadowColor='#ef4444';
    c.fillStyle=isRed?'#ef4444':'#3f1f23';
    c.beginPath();c.arc(tlx+20,tly+18,10,0,6.28);c.fill();
    if(isRed){c.fillStyle='rgba(255,200,200,0.8)';c.beginPath();c.arc(tlx+18,tly+16,3,0,6.28);c.fill();}
    c.shadowBlur=0;
    // Yellow
    c.fillStyle='#3b301a';c.beginPath();c.arc(tlx+20,tly+44,10,0,6.28);c.fill();
    // Green
    c.shadowBlur=!isRed?20:0;c.shadowColor='#10b981';
    c.fillStyle=!isRed?'#10b981':'#14331d';
    c.beginPath();c.arc(tlx+20,tly+70,10,0,6.28);c.fill();
    if(!isRed){c.fillStyle='rgba(200,255,200,0.8)';c.beginPath();c.arc(tlx+18,tly+68,3,0,6.28);c.fill();}
    c.shadowBlur=0;

    // ============== ROAD / TUNNEL ==============
    const fails=this.act && ((v.y==='gelenek'&&this.crsh>20) || (v.y==='tunel'&&v.c>150&&v.b==='c15'&&this.crsh>60));
    const avalancheX=W*.55;

    if(v.y==='tunel'){
      // TUNNEL SYSTEM
      // Mountain face
      c.fillStyle='#292524';c.fillRect(0,H*.55,W,H*.45);
      // Tunnel entrance
      const tnlX=W*.5,tnlY=H*.72,tnlW=140+v.s*28,tnlH=110;
      // Arch opening (gradient into blackness)
      const arG=c.createRadialGradient(tnlX,tnlY,0,tnlX,tnlY,tnlW);
      arG.addColorStop(0,'#000');
      arG.addColorStop(.4,'#0a0a0a');
      arG.addColorStop(.8,'#1c1917');
      arG.addColorStop(1,'#292524');
      c.fillStyle=arG;
      c.beginPath();c.ellipse(tnlX,tnlY,tnlW,tnlH,0,Math.PI,0,true);c.fillRect(tnlX-tnlW,tnlY,tnlW*2,50);c.fill();
      // Real ellipse
      c.fillStyle='#000';
      c.beginPath();c.ellipse(tnlX,tnlY,tnlW,tnlH,0,Math.PI,0,true);c.fill();
      // Tunnel lights inside
      for(let li=0;li<7;li++){
        const lx=tnlX-tnlW*.8+li*(tnlW*1.6/7);
        const ly=tnlY-tnlH+15;
        c.shadowBlur=12;c.shadowColor='#fbbf24';
        c.fillStyle=`rgba(251,191,36,${.7+Math.sin(t*2+li)*.15})`;
        c.beginPath();c.arc(lx,ly,2.5,0,6.28);c.fill();
        c.shadowBlur=0;
      }
      // Arch rim
      const archCol=v.b==='c80'?'#0ea5e9':(v.b==='c30'?'#94a3b8':'#57534e');
      c.strokeStyle=archCol;c.lineWidth=v.b==='c80'?6:4;
      c.shadowBlur=v.b==='c80'?18:0;c.shadowColor='#0ea5e9';
      c.beginPath();c.ellipse(tnlX,tnlY,tnlW,tnlH,0,Math.PI,0,true);c.stroke();
      c.shadowBlur=0;
      // Safety strip rim
      c.strokeStyle='rgba(250,204,21,0.6)';c.lineWidth=2;
      c.beginPath();c.ellipse(tnlX,tnlY,tnlW+6,tnlH+4,0,Math.PI,0,true);c.stroke();
      // Cracks on failure
      if(fails && v.b==='c15'){
        c.strokeStyle='#ef4444';c.lineWidth=4;c.shadowBlur=15;c.shadowColor='#ef4444';
        c.beginPath();c.moveTo(tnlX-tnlW*.6,tnlY-tnlH*.3);
        c.lineTo(tnlX-tnlW*.3,tnlY-tnlH*.8);c.lineTo(tnlX,tnlY-tnlH+10);c.stroke();
        c.beginPath();c.moveTo(tnlX+tnlW*.5,tnlY-tnlH*.4);
        c.lineTo(tnlX+tnlW*.3,tnlY-tnlH*.7);c.stroke();
        c.shadowBlur=0;
      }
      // Approach road
      c.fillStyle='#1c1917';c.fillRect(0,tnlY,tnlX-tnlW+20,tnlH);
      c.fillRect(tnlX+tnlW-20,tnlY,W-(tnlX+tnlW-20),tnlH);
      // Road lanes
      const roadY=tnlY+tnlH*.4;
      c.strokeStyle='rgba(250,204,21,0.8)';c.lineWidth=2;c.setLineDash([20,20]);
      for(let ln=1;ln<v.s;ln++){
        const ly=tnlY+5+ln*(tnlH/v.s)*.7;
        c.beginPath();c.moveTo(0,ly);c.lineTo(tnlX-tnlW+20,ly);c.stroke();
        c.beginPath();c.moveTo(tnlX+tnlW-20,ly);c.lineTo(W,ly);c.stroke();
      }
      c.setLineDash([]);

    } else {
      // MOUNTAIN ROAD (winding)
      // Draw road surface as wide curve
      const rH=H*.12;
      c.strokeStyle='#1c1917';c.lineWidth=v.s*22+20;c.lineCap='round';c.lineJoin='round';
      c.beginPath();
      c.moveTo(-20,H*.92);
      c.bezierCurveTo(W*.25,H*.78,W*.35,H*.55,W*.5,H*.5);
      c.bezierCurveTo(W*.65,H*.55,W*.75,H*.78,W+20,H*.92);
      c.stroke();
      // Asphalt highlight
      c.strokeStyle='#44403c';c.lineWidth=v.s*22+16;
      c.stroke();
      // Guard rail / edge lines
      c.strokeStyle='rgba(250,204,21,0.9)';c.lineWidth=2;c.setLineDash([16,14]);
      c.beginPath();
      c.moveTo(-20,H*.92);
      c.bezierCurveTo(W*.25,H*.78,W*.35,H*.55,W*.5,H*.5);
      c.bezierCurveTo(W*.65,H*.55,W*.75,H*.78,W+20,H*.92);
      c.stroke();
      c.setLineDash([]);
      // Road blocked
      if(fails){
        // Snow pile
        c.fillStyle='#f1f5f9';c.shadowBlur=20;c.shadowColor='#fff';
        c.beginPath();c.ellipse(avalancheX,H*.55,90,40,0,0,6.28);c.fill();
        c.shadowBlur=0;
        // Debris rocks
        c.fillStyle='#44403c';
        for(let r=0;r<8;r++){
          c.beginPath();c.arc(avalancheX+(Math.random()-.5)*120,H*.52+Math.random()*25,6+Math.random()*8,0,6.28);c.fill();
        }
      }
    }

    // Spawn cars
    if(!fails && Math.random()<v.s*.06 && (!isRed || Math.random()>.92)){
      this.cars.push({
        x:-30,
        lane:Math.floor(Math.random()*v.s),
        v:2.5+Math.random()*2,
        col:['#dc2626','#facc15','#2563eb','#ffffff','#0891b2'][Math.floor(Math.random()*5)],
        headlight:true
      });
    }

    // Update & draw cars
    for(let i=this.cars.length-1;i>=0;i--){
      const cr=this.cars[i];
      let canMove=true;
      if(fails){
        if(v.y==='tunel' && cr.x>W*.5-120)canMove=false;
        else if(v.y==='gelenek' && cr.x>avalancheX-70 && cr.x<avalancheX+30)canMove=false;
      }
      for(let j=0;j<this.cars.length;j++){
        if(i!==j && this.cars[j].lane===cr.lane && this.cars[j].x>cr.x && this.cars[j].x-cr.x<40)canMove=false;
      }
      if(canMove)cr.x+=cr.v;
      let cy;
      if(v.y==='tunel'){
        cy=H*.72+cr.lane*14+8;
        // Skip inside unbroken tunnel
        if(cr.x>W*.5-(140+v.s*28)+20 && cr.x<W*.5+(140+v.s*28)-20 && !fails)continue;
      } else {
        const p=cr.x/W;
        // Follow road curve
        if(p<.5){
          const pp=p*2;
          cy=H*.92-(H*.92-H*.5)*pp;
        } else {
          const pp=(p-.5)*2;
          cy=H*.5+(H*.92-H*.5)*pp;
        }
        cy+=cr.lane*10-(v.s*5);
      }
      // Car body with shadow
      c.fillStyle='rgba(0,0,0,0.5)';
      util.roundRect(c,cr.x+1,cy+10,26,3,2);c.fill();
      // Body
      c.fillStyle=cr.col;
      util.roundRect(c,cr.x,cy,25,10,3);c.fill();
      // Windshield
      c.fillStyle='rgba(14,165,233,0.4)';
      util.roundRect(c,cr.x+14,cy+1.5,7,3,1);c.fill();
      // Wheels
      c.fillStyle='#111';
      c.beginPath();c.arc(cr.x+6,cy+10,2,0,6.28);c.fill();
      c.beginPath();c.arc(cr.x+19,cy+10,2,0,6.28);c.fill();
      // Taillights
      c.shadowBlur=canMove?4:14;c.shadowColor='#ef4444';
      c.fillStyle='#ef4444';c.fillRect(cr.x,cy+2,2,6);c.shadowBlur=0;
      // Headlights + beam
      c.shadowBlur=14;c.shadowColor='#fef3c7';
      c.fillStyle='#fefce8';c.fillRect(cr.x+23,cy+2,2,6);
      c.shadowBlur=0;
      // Light beam
      if(cr.headlight){
        const bg=c.createLinearGradient(cr.x+24,cy+5,cr.x+60,cy+5);
        bg.addColorStop(0,'rgba(254,252,232,0.5)');
        bg.addColorStop(1,'rgba(254,252,232,0)');
        c.fillStyle=bg;
        c.beginPath();c.moveTo(cr.x+24,cy+2);c.lineTo(cr.x+60,cy-4);c.lineTo(cr.x+60,cy+14);c.lineTo(cr.x+24,cy+8);c.closePath();c.fill();
      }
      if(cr.x>W+30)this.cars.splice(i,1);
    }

    // Update HUD
    const flow=fails?0:(this.cars.length>0?Math.round(85+Math.random()*15):90);
    const alert=fails?'RED':this.act?'AMBER':'GREEN';
    const alertCol=alert==='RED'?'#ef4444':alert==='AMBER'?'#facc15':'#34d399';
    const ro=document.getElementById('u-readout');
    if(ro)ro.innerHTML=`FLOW: <span class="val">${flow}%</span><br>CARS: <span class="val">${this.cars.length}</span><br>LANES: <span class="val">${v.s}</span><br>ALERT: <span class="val" style="color:${alertCol}">${alert}</span>`;

    // ============== AVALANCHE ==============
    if(this.act){
      this.crsh+=2.2;
      const mass=v.c;
      // Emit snow/debris
      if(this.avalanche.length<Math.floor(mass*.6)){
        for(let i=0;i<3;i++)this.avalanche.push({
          x:W*.45+Math.random()*W*.15,
          y:-20-Math.random()*100,
          vx:(Math.random()-.5)*2,
          vy:2+Math.random()*3,
          r:6+Math.random()*(mass*.12),
          rock:Math.random()>.7,
          rot:0,vr:(Math.random()-.5)*.1
        });
      }
      // Update
      for(let i=this.avalanche.length-1;i>=0;i--){
        const p=this.avalanche[i];
        p.vy+=.15;p.y+=p.vy;p.x+=p.vx;p.rot+=p.vr;
        if(p.rock){
          c.save();c.translate(p.x,p.y);c.rotate(p.rot);
          c.fillStyle='#44403c';
          c.beginPath();c.arc(0,0,p.r*.7,0,6.28);c.fill();
          c.fillStyle='rgba(0,0,0,0.3)';
          c.beginPath();c.arc(p.r/3,p.r/3,p.r*.3,0,6.28);c.fill();
          c.restore();
        } else {
          c.shadowBlur=8;c.shadowColor='rgba(255,255,255,0.8)';
          c.fillStyle='rgba(241,245,249,0.9)';
          c.beginPath();c.arc(p.x,p.y,p.r,0,6.28);c.fill();
          c.shadowBlur=0;
        }
        if(p.y>H+30)this.avalanche.splice(i,1);
      }
      // Snow dust at impact
      if(fails){
        for(let i=0;i<5;i++){
          const dx=avalancheX+(Math.random()-.5)*200,dy=H*.55+(Math.random()-.5)*30;
          c.fillStyle=`rgba(255,255,255,${.15+Math.random()*.2})`;
          c.beginPath();c.arc(dx,dy,15+Math.random()*20,0,6.28);c.fill();
        }
      }
    }
  }
};

// ============================================================
// BOOTSTRAP
// ============================================================
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click',e=>SIM.nav(btn.dataset.tab,btn));
});

// Bina controls
document.getElementById('b-play').addEventListener('click',()=>B.play());
document.getElementById('b-reset').addEventListener('click',()=>B.build());
['b-zemin','b-temel','b-malz'].forEach(id=>document.getElementById(id).addEventListener('change',()=>B.build()));
['b-su','b-kat','b-col'].forEach(id=>{
  const el=document.getElementById(id);
  const rv=document.getElementById('rv-'+(id.replace('b-','b')));
  const pre=id==='b-su'?'%':(id==='b-col'?'cm':'');
  if(rv)rv.textContent=(id==='b-su'?'%'+el.value:(id==='b-col'?el.value+'cm':el.value));
  el.addEventListener('input',()=>{
    const rv2=document.getElementById('rv-b'+(id==='b-su'?'su':id==='b-kat'?'kat':'col'));
    if(rv2)rv2.textContent=id==='b-su'?'%'+el.value:(id==='b-col'?el.value+'cm':el.value);
    B.build();
  });
});
document.getElementById('b-siddet').addEventListener('input',e=>{document.getElementById('rv-bsid').textContent=(e.target.value/10).toFixed(1)+' Mw';});

// Tarım
document.getElementById('t-play').addEventListener('click',()=>T.play());
document.getElementById('t-reset').addEventListener('click',()=>T.upd());
document.getElementById('t-sys').addEventListener('change',()=>T.upd());
document.getElementById('t-toprak').addEventListener('input',e=>{document.getElementById('rv-ttoprak').textContent='%'+e.target.value;T.upd();});
document.getElementById('t-temp').addEventListener('input',e=>{document.getElementById('rv-ttemp').textContent=e.target.value+'°C';T.setTemp(e.target.value);});
document.getElementById('t-wind').addEventListener('input',e=>{document.getElementById('rv-twind').textContent=e.target.value+' km/h';T.setWind(e.target.value);});
document.getElementById('t-rain').addEventListener('input',e=>{document.getElementById('rv-train').textContent=e.target.value+'mm';T.setRain(e.target.value);});

// Erciyes
document.getElementById('e-play').addEventListener('click',()=>E.play());
document.getElementById('e-reset').addEventListener('click',()=>E.upd());
document.getElementById('e-pres').addEventListener('input',e=>{document.getElementById('rv-epres').textContent=e.target.value+' Bar';});
document.getElementById('e-turist').addEventListener('input',e=>{document.getElementById('rv-eturist').textContent=e.target.value+'k';});
document.getElementById('e-warm').addEventListener('input',e=>{document.getElementById('rv-ewarm').textContent='+'+e.target.value+'°C';});

// Enerji
document.getElementById('en-play').addEventListener('click',()=>EN.play());
document.getElementById('en-reset').addEventListener('click',()=>EN.upd());
document.getElementById('en-src').addEventListener('change',()=>EN.upd());
document.getElementById('en-ai').addEventListener('change',()=>EN.upd());
document.getElementById('en-bat').addEventListener('input',e=>{document.getElementById('rv-enbat').textContent=e.target.value+' MWh';});
document.getElementById('en-kablo').addEventListener('input',e=>{document.getElementById('rv-enkablo').textContent='%'+e.target.value;});

// Ulaşım
document.getElementById('u-play').addEventListener('click',()=>U.play());
document.getElementById('u-reset').addEventListener('click',()=>U.upd());
document.getElementById('u-yol').addEventListener('change',()=>U.upd());
document.getElementById('u-beton').addEventListener('change',()=>U.upd());
document.getElementById('u-serit').addEventListener('input',e=>{document.getElementById('rv-userit').textContent=e.target.value+' Şerit';U.upd();});
document.getElementById('u-cig').addEventListener('input',e=>{document.getElementById('rv-ucig').textContent=e.target.value+',000t';});

// Modal
document.getElementById('m-close').addEventListener('click',()=>{document.getElementById('modal-overlay').classList.remove('show');AUDIO.click();});
document.getElementById('modal-overlay').addEventListener('click',e=>{if(e.target.id==='modal-overlay')document.getElementById('modal-overlay').classList.remove('show');});

// Reset
document.getElementById('reset-btn').addEventListener('click',()=>GLOBAL.reset());

// Window events
window.addEventListener('resize',()=>SIM.resize());
window.addEventListener('load',()=>{
  if(SIM.loopActive)return;
  GLOBAL.init();SIM.resize();
  B.build();U.upd();T.upd();E.upd();EN.upd();
  SIM.run();
});

// If already loaded
if(document.readyState==='complete'||document.readyState==='interactive'){
  setTimeout(()=>{
    if(!SIM.loopActive){
      GLOBAL.init();SIM.resize();
      B.build();U.upd();T.upd();E.upd();EN.upd();
      SIM.run();
    }
  },100);
}