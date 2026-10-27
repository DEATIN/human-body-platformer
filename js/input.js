const KEYS = {ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',KeyW:'jump',ArrowUp:'jump'};

export class GameInput {
  constructor({canvas,shell,buttons,isRunning,onPause,onRestart}) {
    Object.assign(this,{canvas,shell,buttons,isRunning,onPause,onRestart});
    this.keys=new Set(); this.pointers=new Map(); this.jumpQueued=false; this.disposers=[];
    this.listen(window,'keydown',event=>{
      if(!this.shell.contains(document.activeElement)) return;
      if(event.target instanceof HTMLElement && ['BUTTON','SUMMARY','INPUT','TEXTAREA'].includes(event.target.tagName)) return;
      if(['KeyP','Escape'].includes(event.code)){event.preventDefault();if(!event.repeat)this.onPause();return;}
      if(event.code==='KeyR'){event.preventDefault();if(!event.repeat)this.onRestart();return;}
      const action=KEYS[event.code]; if(!action || !this.isRunning())return;
      event.preventDefault(); if(action==='jump'&&!event.repeat)this.jumpQueued=true;
      this.keys.add(event.code);
    });
    this.listen(window,'keyup',event=>{if(KEYS[event.code])this.keys.delete(event.code);});
    buttons.forEach(button=>{
      this.listen(button,'pointerdown',event=>{
        if(!this.isRunning() || (event.pointerType==='mouse'&&event.button!==0))return;
        event.preventDefault(); button.setPointerCapture(event.pointerId);
        this.pointers.set(event.pointerId,{action:button.dataset.control,button});
        button.dataset.pressed='true';
        if(button.dataset.control==='jump')this.jumpQueued=true;
        this.canvas.focus({preventScroll:true});
      });
      const release=event=>{
        const held=this.pointers.get(event.pointerId);if(!held)return;
        this.pointers.delete(event.pointerId);
        held.button.dataset.pressed=String([...this.pointers.values()].some(p=>p.button===held.button));
      };
      ['pointerup','pointercancel','lostpointercapture'].forEach(type=>this.listen(button,type,release));
      this.listen(button,'contextmenu',event=>event.preventDefault());
    });
  }
  listen(target,event,callback){target.addEventListener(event,callback);this.disposers.push(()=>target.removeEventListener(event,callback));}
  read(){const actions=new Set([...this.keys].map(key=>KEYS[key]));this.pointers.forEach(p=>actions.add(p.action));const result={left:actions.has('left'),right:actions.has('right'),jump:actions.has('jump')||this.jumpQueued};this.jumpQueued=false;return result;}
  clear(){this.keys.clear();this.pointers.clear();this.jumpQueued=false;this.buttons.forEach(button=>{button.dataset.pressed='false';});}
  destroy(){this.clear();this.disposers.forEach(dispose=>dispose());this.disposers=[];}
}
