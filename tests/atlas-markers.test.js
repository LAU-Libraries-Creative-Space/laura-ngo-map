import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {clusterStep,worldUnitsForPixels,updateClusterBadges,drawClusterBadge} from '../app-source/assets/atlas-markers.js';
import {nearestProjectedPin} from '../app-source/assets/pin-interaction.js';

// Exercise the exact bundled Three.js camera, transforms and marker meshes,
// without starting a browser or replacing its WebGL rendering with a mock.
const source=fs.readFileSync(new URL('../app-source/assets/Atlas-DHQNhZ1H.js',import.meta.url),'utf8');
const engine=source.slice(0,source.indexOf('function iu({')).replace(/^import[^\n]*\n/gm,'');
const THREE=new Function('var e=()=>{},t=()=>{},n={},r=()=>({}),i=()=>{},a=()=>{},o=()=>{},s=()=>{},c=()=>{},l=value=>value;\n'+engine+'\nreturn {Vector3:K,PerspectiveCamera:Ia,Group:Vn,Mesh:mi,PlaneGeometry:Vi,MeshBasicMaterial:ni};')();

test('Zoom hysteresis prevents cluster counts and anchors from oscillating',()=>{
 let step=.07;for(const distance of [189,191,188,194,185,201,208]){step=clusterStep(distance,step);assert.equal(step,.07);}
 step=clusterStep(210,step);assert.equal(step,.16);
 for(const distance of [190,180,173])assert.equal(clusterStep(distance,step),.16);
 assert.equal(clusterStep(170,step),.07);
 assert.equal(clusterStep(35),.003);assert.equal(clusterStep(520),.16);
});

test('A count badge stays at the exact pin head through 720 orbit, pan and zoom frames',()=>{
 const camera=new THREE.PerspectiveCamera(38,390/700,1,1000),group=new THREE.Group();
 group.position.set(12,8,-15);
 const badge=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial());badge.position.y=7.5;group.add(badge);
 const marker={badge,badgePixels:36,point:new THREE.Vector3(12,15.5,-15),viewPoint:new THREE.Vector3()};
 for(let frame=0;frame<720;frame++){
  const angle=frame/100,distance=90+frame%240;
  camera.position.set(Math.sin(angle)*distance,100+frame%50,Math.cos(angle)*distance);
  camera.lookAt(frame%15,0,-frame%8);camera.updateMatrixWorld(true);
  updateClusterBadges([marker],camera,700);group.updateMatrixWorld(true);
  const center=badge.getWorldPosition(new THREE.Vector3()).project(camera),head=marker.point.clone().project(camera);
  assert.ok(center.distanceTo(head)<1e-10,'The badge moved away from its pin head');
  assert.ok(badge.quaternion.angleTo(camera.quaternion)<1e-7,'Count badge no longer faces the camera');
  const depth=-marker.point.clone().applyMatrix4(camera.matrixWorldInverse).z;
  const pixels=badge.scale.x*700/(2*depth*Math.tan(camera.fov*Math.PI/360));
  assert.ok(Math.abs(pixels-36)<1e-9,'Count badge changed its screen size');
 }
 badge.geometry.dispose();badge.material.dispose();
});

test('Pin-head hit areas remain selectable at phone and desktop aspect ratios',()=>{
 const ngo=[{id:139}],head=new THREE.Vector3(10,12,-5);
 for(const [width,height]of [[320,560],[390,700],[768,820],[1440,720]]){
  const camera=new THREE.PerspectiveCamera(38,width/height,1,1000);camera.position.set(80,180,140);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
  const p=head.clone().project(camera),x=(p.x*.5+.5)*width,y=(-p.y*.5+.5)*height;
  const points=[{x,y,visible:true,items:ngo}];
  assert.equal(nearestProjectedPin(points,x+18,y+3,width<760?30:22),ngo);
  assert.equal(nearestProjectedPin(points,x+45,y+45,30),null);
 }
});

test('Billboard scaling rejects invalid viewports and hides badges behind the camera',()=>{
 assert.equal(worldUnitsForPixels(100,38,0,36),0);assert.equal(worldUnitsForPixels(-100,38,700,36),0);
 const camera=new THREE.PerspectiveCamera(38,1,1,1000);camera.updateMatrixWorld(true);
 const badge={visible:true,quaternion:camera.quaternion.clone(),scale:new THREE.Vector3(1,1,1)};
 updateClusterBadges([{badge,point:new THREE.Vector3(0,0,10),viewPoint:new THREE.Vector3(),badgePixels:36}],camera,700);
 assert.equal(badge.visible,false);
});

test('Cluster textures contain the count only and are generated independently of foundation names',()=>{
 const calls=[],context={clearRect(){},beginPath(){},arc(){},fill(){},stroke(){},fillText(...args){calls.push(args)}};
 drawClusterBadge(context,12);assert.deepEqual(calls,[["12",64,66.56]]);
});

test('Map integration has no visible name overlays, frozen projections or 30fps cap',()=>{
 assert.ok(!source.includes('atlas-pin-label'));
 assert.ok(!source.includes('className: `atlas-hover`'));
 assert.ok(!source.includes('e.el.style.left'));
 assert.ok(!source.includes('r - L < 30'));
 assert.ok(source.includes('n.update(delta);l.updateMatrixWorld(true)'));
 assert.ok(source.includes('updateClusterBadges(oe.list,l,F.viewportHeight)'));
 assert.ok(source.indexOf('if(head)return head')<source.indexOf('raycaster.setFromCamera',source.indexOf('function pickPin(event)')));
 assert.ok(source.includes('t.shadowMap.autoUpdate = false'));
});
