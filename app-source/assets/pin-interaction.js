// A tap keeps the marker found on pointer-down, even if camera damping moves it.
export function attachPinInteraction(canvas,{pick,select,setActive=()=>{},documentTarget=canvas.ownerDocument,now=()=>Date.now()}){
  const pointers=new Set();let gesture=null;
  function down(event){
    if(event.button!==undefined&&event.button!==0)return;
    pointers.add(event.pointerId);
    if(pointers.size!==1){if(gesture)gesture.cancelled=true;return;}
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,time:now(),limit:event.pointerType==='touch'?12:7,items:pick(event),cancelled:false};
    setActive(true);
  }
  function move(event){if(gesture&&event.pointerId===gesture.id&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>gesture.limit)gesture.cancelled=true;}
  function finish(event,cancelled=false){
    pointers.delete(event.pointerId);
    if(!gesture)return;
    if(event.pointerId===gesture.id){
      const tap=gesture;gesture=null;setActive(false);
      if(!cancelled&&!tap.cancelled&&pointers.size===0&&now()-tap.time<1200&&Math.hypot(event.clientX-tap.x,event.clientY-tap.y)<=tap.limit&&tap.items?.length)select(tap.items);
    }
    if(pointers.size===0){gesture=null;setActive(false);}
  }
  const up=event=>finish(event),cancel=event=>finish(event,true);
  canvas.addEventListener('pointerdown',down,true);
  documentTarget.addEventListener('pointermove',move,true);
  documentTarget.addEventListener('pointerup',up,true);
  documentTarget.addEventListener('pointercancel',cancel,true);
  return ()=>{canvas.removeEventListener('pointerdown',down,true);documentTarget.removeEventListener('pointermove',move,true);documentTarget.removeEventListener('pointerup',up,true);documentTarget.removeEventListener('pointercancel',cancel,true);pointers.clear();gesture=null;setActive(false);};
}
export function nearestProjectedPin(points,x,y,radius){
  let match=null,best=radius;
  for(const point of points){if(!point.visible)continue;const distance=Math.hypot(x-point.x,y-point.y);if(distance<best){match=point.items;best=distance;}}
  return match;
}
