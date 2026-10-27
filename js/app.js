import {GameModel} from './engine.js';
import {GameRenderer} from './renderer.js';
import {GameInput} from './input.js';

const $=id=>document.getElementById(id);
const canvas=$('world'), shell=$('game'), model=new GameModel(), renderer=new GameRenderer(canvas);
const recordKey='vnutri-oxygen-record-v1';
let best=0, rafId=null, lastTime=null, visualTime=0, audio=null, soundEnabled=false;
const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
try{const raw=localStorage.getItem(recordKey);const value=Number(raw);if(raw!==null&&Number.isFinite(value)&&value>=0&&value<=1000000)best=Math.floor(value);}catch{$('storage-note').hidden=false;}
const timeLabel=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
const input=new GameInput({canvas,shell,buttons:[...document.querySelectorAll('[data-control]')],isRunning:()=>model.status==='running',onPause:()=>togglePause(),onRestart:()=>restart()});

function tone(frequency,duration=.09){
  if(!soundEnabled)return;
  try{
    audio??=new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==='suspended')void audio.resume().catch(()=>{});
    const oscillator=audio.createOscillator(),gain=audio.createGain();
    oscillator.type='sine';oscillator.frequency.value=frequency;
    gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
    oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+duration);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }catch{soundEnabled=false;updateSound();}
}
function updateSound(){$('sound').setAttribute('aria-pressed',String(soundEnabled));$('sound').setAttribute('aria-label',soundEnabled?'Выключить звук':'Включить звук');$('sound').title=soundEnabled?'Звук включён':'Звук выключен';}
function draw(){renderer.render(model,visualTime);}
function stopLoop(){if(rafId!==null)cancelAnimationFrame(rafId);rafId=null;lastTime=null;}
// Ambient motion and game physics share one loop, but keep separate clocks.
function needsFrames(){return !document.hidden&&model.status!=='paused'&&(model.status==='running'||!motionPreference.matches);}
function schedule(){if(rafId===null&&needsFrames())rafId=requestAnimationFrame(frame);}
function frame(timestamp){
  rafId=null;if(!needsFrames()){lastTime=null;return;}
  const dt=lastTime===null?0:Math.min(Math.max(0,(timestamp-lastTime)/1000),.05);lastTime=timestamp;
  if(!motionPreference.matches)visualTime+=dt;
  if(model.status==='running'){
    const previousCount=model.collectedCount;
    if(dt>0)model.update(dt,input.read());
    if(model.collectedCount>previousCount)tone(520+model.collectedCount*110);
    if(model.status==='won'||model.status==='lost'){
      input.clear();saveRecord();tone(model.status==='won'?880:180,.22);sync(true);
    }else sync(false);
  }
  draw();schedule();
}
function saveRecord(){if(model.score<=best)return;best=model.score;try{localStorage.setItem(recordKey,String(best));}catch{$('storage-note').hidden=false;}}
function setText(id,value){const element=$(id);if(element.textContent!==String(value))element.textContent=String(value);}
function sync(overlayChanged=true){
  shell.dataset.state=model.status;
  if($('cargo').dataset.count!==String(model.collectedCount)){$('cargo').innerHTML=`${model.collectedCount}<span> / 3</span>`;$('cargo').dataset.count=String(model.collectedCount);}
  document.querySelectorAll('.cargo-dots i').forEach((dot,i)=>dot.classList.toggle('filled',i<model.collectedCount));
  setText('score',model.score);setText('timer',timeLabel(model.elapsed));setText('record',best);
  const names={ready:'Готов к старту',running:'В пути',paused:'На паузе',won:'Доставлено',lost:'Новая попытка'};
  setText('state',names[model.status]);
  if($('message').textContent!==model.message)$('message').textContent=model.message;
  $('pause').disabled=!['running','paused'].includes(model.status);
  $('pause').setAttribute('aria-label',model.status==='paused'?'Продолжить игру':'Пауза');
  const pauseContent=model.status==='paused'?'▷<span>Далее</span>':'Ⅱ<span>Пауза</span>';
  if($('pause').innerHTML!==pauseContent)$('pause').innerHTML=pauseContent;
  if(!overlayChanged)return;
  $('overlay').hidden=model.status==='running';
  $('overlay-keys').hidden=model.status!=='ready';
  if(model.status==='ready')return;
  const content={
    paused:{icon:'Ⅱ',label:'ТАКТИЧЕСКАЯ ПАУЗА',title:'Маршрут подождёт.',copy:'Передохните. Положение Линзы, капсулы и время сохранены. Продолжайте, когда будете готовы.',action:'Продолжить маршрут'},
    won:{icon:'✓',label:'КИСЛОРОД ДОСТАВЛЕН',title:'Большое дело\nмаленького зонда.',copy:`Все три капсулы у мышцы. Время — ${timeLabel(model.elapsed)}, счёт — ${model.score}. В организме доставку кислорода обеспечивает кровоток.`,action:'Пройти ещё раз'},
    lost:{icon:'↻',label:'ПОПРОБУЕМ ЕЩЁ РАЗ',title:'Каждый маршрут —\nмаленькое открытие.',copy:'Линза попала в опасную зону внизу. Прыгайте ближе к краю платформы. Капсулы и стартовая точка восстановятся.',action:'Попробовать ещё'}
  }[model.status];
  if(content){$('overlay-icon').textContent=content.icon;$('overlay-label').textContent=content.label;$('overlay-title').innerText=content.title;$('overlay-copy').textContent=content.copy;$('start').textContent=content.action;}
}
function activate(){
  stopLoop();input.clear();
  if(model.status==='paused')model.resume();
  else{if(model.status!=='ready')model.reset();model.start();}
  sync();draw();canvas.focus({preventScroll:true});schedule();
}
function restart(){stopLoop();input.clear();model.reset();model.start();sync();draw();canvas.focus({preventScroll:true});schedule();}
function pause(){if(model.status!=='running')return;model.pause();stopLoop();input.clear();sync();draw();}
function togglePause(){if(model.status==='paused')activate();else pause();}
$('start').addEventListener('click',activate);
$('restart').addEventListener('click',restart);
$('pause').addEventListener('click',togglePause);
$('sound').addEventListener('click',()=>{soundEnabled=!soundEnabled;updateSound();if(soundEnabled)tone(660);canvas.focus({preventScroll:true});});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();stopLoop();input.clear();}else{lastTime=null;draw();schedule();}});
window.addEventListener('blur',()=>{input.clear();pause();});
window.addEventListener('resize',draw);
window.addEventListener('pagehide',()=>{pause();stopLoop();input.clear();});
window.addEventListener('pageshow',()=>{lastTime=null;draw();schedule();});
motionPreference.addEventListener('change',()=>{stopLoop();draw();schedule();});
sync();draw();schedule();

