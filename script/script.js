/**
 * Created by siqi on 8/21/16.
 */

/* set up a basic THREE.js scene */

var scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(45,window.innerWidth/window.innerHeight,.1,1000),
    renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setClearColor(0x000000);
document.getElementById('gl-output').appendChild(renderer.domElement);

/* helper and camera */
var helper = new THREE.AxisHelper(200);
//scene.add(helper);

camera.position.set(200,0,200);
camera.lookAt(scene.position);
scene.add(camera);

/* Lighting */
var light = new THREE.DirectionalLight(0xffffff,1.5);
light.position.set(0,.5,1).normalize();
scene.add(light);


/* OrbitControl */
var orbitControl = new THREE.OrbitControls(camera),
    clock = new THREE.Clock();


/* Earth */
var EARTH = 6370,
    scaleRadius = d3.scaleLinear().domain([0,EARTH]).range([0,40]);

//Earth material
//Use ImageLoader class to import images for texture map, specular map, bump map etc.
var earthMat = new THREE.MeshPhongMaterial({color:0xaaaaaa});
var earthMesh = new THREE.Mesh(
    new THREE.SphereGeometry(scaleRadius(EARTH),64,64),
    earthMat
);
scene.add(earthMesh);

var loader = new THREE.TextureLoader();
loader.load('/data/earthmap1k_bw.jpg',function(texture){
    console.log('Texture map loaded');
    earthMat.map = texture;
    earthMat.needsUpdate = true;
});
loader.load('/data/earthbump1k.jpg',function(texture){
    earthMat.bumpMap = texture;
    earthMat.bumpScale = .5;
    earthMat.needsUpdate = true;
});
loader.load('/data/earthspec1k.jpg',function(texture){
    earthMat.specularMap = texture;
    earthMat.specular = new THREE.Color(0xcccccc);
    earthMat.shininess = 1;
    earthMat.needsUpdate = true;
});
loader.load('/data/earthlights1k.jpg',function(texture){
    earthMat.emissiveMap = texture;
    earthMat.emissive = new THREE.Color(0xffffff);
    earthMat.emissiveIntensity = .4;
    earthMat.needsUpdate = true;
});




/* render loop */
render();

function render(){
    renderer.render(scene,camera);
    requestAnimationFrame(render);

    //Updte orbit controls
    var delta = clock.getDelta();
    orbitControl.update(delta);

    earthMesh.rotation.y += .005;
}