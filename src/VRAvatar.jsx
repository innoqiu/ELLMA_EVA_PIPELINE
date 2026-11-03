import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

export default function VRAvatar({frame,audience}) {
  const host=useRef(null),world=useRef(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    let renderer;
    try {renderer=new THREE.WebGLRenderer({antialias:true});} catch {setError('3D is unavailable in this browser. Please use Abstract view.');return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    host.current.appendChild(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#f1f5f9');
    const camera=new THREE.PerspectiveCamera(45,1,.01,200);
    const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,1.2);
    const reset=()=>{camera.position.set(4,3,6);controls.target.set(0,1,1.2);controls.update();};reset();
    scene.add(new THREE.HemisphereLight(0xffffff,0x667788,2.5));
    const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,6,4);scene.add(light);
    scene.add(new THREE.GridHelper(10,20,0xaabbcc,0xd9e1ea));
    const mesh=(geometry,color)=>{const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.65}));scene.add(m);return m;};
    const sphere=(r,c)=>mesh(new THREE.SphereGeometry(r,20,16),c);
    const bone=c=>mesh(new THREE.CylinderGeometry(.055,.065,1,12),c);
    const head=sphere(.14,0x6366f1),nose=sphere(.045,0x312e81),torso=mesh(new THREE.CylinderGeometry(.18,.14,.48,16),0xb3bfce);
    const arms=[0x087e8b,0xc76b13].map(c=>({hand:sphere(.07,c),elbow:sphere(.06,0xb3bfce),upper:bone(0xb3bfce),lower:bone(0xb3bfce)}));
    const legs=[bone(0xb3bfce),bone(0xb3bfce)];
    const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(),1.5,0x4f46e5,.16,.07);scene.add(arrow);
    const people=new THREE.Group();scene.add(people);
    const link=(m,a,b)=>{m.position.copy(a).add(b).multiplyScalar(.5);const d=b.clone().sub(a);m.scale.y=d.length();if(d.lengthSq())m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());};
    const disposeGroup=g=>{g.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});g.clear();};
    const update=(f,targets)=>{
      const p=new THREE.Vector3(...f.position);head.position.copy(p);
      const direction=f.head?new THREE.Vector3(...f.head).normalize():null;
      arrow.visible=!!direction;nose.visible=!!direction;
      if(direction){arrow.position.copy(p);arrow.setDirection(direction);nose.position.copy(p).addScaledVector(direction,.15);}
      torso.position.copy(p).add(new THREE.Vector3(0,-.43,0));
      arms.forEach((a,i)=>{const hand=f[i?'right':'left'];Object.values(a).forEach(m=>m.visible=!!hand);if(!hand)return;const h=new THREE.Vector3(...hand),shoulder=p.clone().add(new THREE.Vector3(i?.21:-.21,-.25,0)),elbow=shoulder.clone().lerp(h,.5).add(new THREE.Vector3(i?.08:-.08,-.13,-.08));a.hand.position.copy(h);a.elbow.position.copy(elbow);link(a.upper,shoulder,elbow);link(a.lower,elbow,h);});
      legs.forEach((m,i)=>link(m,p.clone().add(new THREE.Vector3(i?.1:-.1,-.68,0)),new THREE.Vector3(p.x+(i?.13:-.13),.08,p.z)));
      const key=JSON.stringify(targets);
      if(people.userData.key!==key){disposeGroup(people);people.userData.key=key;targets.forEach(t=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.12,16,12),new THREE.MeshStandardMaterial({color:0x94a3b8}));m.position.set(...t.position);people.add(m);const stand=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,Math.max(.01,t.position[1]),8),new THREE.MeshStandardMaterial({color:0xcbd5e1}));stand.position.set(t.position[0],t.position[1]/2,t.position[2]);people.add(stand);});}
      renderer.render(scene,camera);
    };
    const render=()=>renderer.render(scene,camera);controls.addEventListener('change',render);
    const resize=new ResizeObserver(()=>{if(!host.current)return;const w=host.current.clientWidth,h=host.current.clientHeight;renderer.setSize(w,h);camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();render();});resize.observe(host.current);
    world.current={update,reset};
    return()=>{world.current=null;resize.disconnect();controls.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});renderer.dispose();renderer.domElement.remove();};
  },[]);
  useEffect(()=>{world.current?.update(frame,audience);},[frame,audience]);
  return <section><div ref={host} role="img" aria-label="3D avatar replay" style={{height:440,width:'100%',borderRadius:12,overflow:'hidden'}}/>{error&&<p role="alert">{error}</p>}<div className="vr-tools"><button onClick={()=>world.current?.reset()}>Reset camera</button><span>Drag to orbit · Scroll to zoom · Right-drag to pan</span></div><p className="vr-note">Head and coloured hands follow JSON coordinates. Grey torso, legs and elbows are schematic estimates, not measured body posture. Purple arrow: head direction. Grey markers: audience.</p></section>;
}
