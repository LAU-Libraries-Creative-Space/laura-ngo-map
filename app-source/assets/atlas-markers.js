// Keep clustering stable around zoom boundaries instead of rebuilding on jitter.
const STEPS=[.003,.025,.07,.16];
const LIMITS=[65,120,190];
export function clusterStep(distance,previous){
  let level=STEPS.indexOf(previous);
  if(level<0)return STEPS[distance>190?3:distance>120?2:distance>65?1:0];
  while(level<3&&distance>LIMITS[level]*1.1)level++;
  while(level>0&&distance<LIMITS[level-1]*.9)level--;
  return STEPS[level];
}
export function worldUnitsForPixels(viewDepth,fovDegrees,viewportHeight,pixels){
  if(!(viewDepth>0&&viewportHeight>0))return 0;
  return 2*viewDepth*Math.tan(fovDegrees*Math.PI/360)*pixels/viewportHeight;
}
export function updateClusterBadges(markers,camera,viewportHeight){
  for(const marker of markers){
    if(!marker.badge)continue;
    marker.viewPoint.copy(marker.point).applyMatrix4(camera.matrixWorldInverse);
    const depth=-marker.viewPoint.z;
    marker.badge.visible=depth>camera.near&&depth<camera.far;
    if(!marker.badge.visible)continue;
    marker.badge.quaternion.copy(camera.quaternion);
    marker.badge.scale.setScalar(worldUnitsForPixels(depth,camera.fov,viewportHeight,marker.badgePixels));
  }
}
export function drawClusterBadge(context,count,size=128){
  context.clearRect(0,0,size,size);
  context.beginPath();context.arc(size/2,size/2,size*.42,0,Math.PI*2);
  context.fillStyle='#345b48';context.fill();
  context.lineWidth=size*.035;context.strokeStyle='#f1f6df';context.stroke();
  context.fillStyle='#ffffff';context.font=`600 ${Math.round(size*.39)}px Arial,sans-serif`;
  context.textAlign='center';context.textBaseline='middle';context.fillText(String(count),size/2,size*.52);
}
