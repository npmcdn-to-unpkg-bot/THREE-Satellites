/**
 * Created by siqi on 8/21/16.
 */

/* set up a basic THREE.js scene */

var scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(45,window.innerWidth/window.innerHeight,.1,10000),
    renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setClearColor(0x000000);
document.getElementById('gl-output').appendChild(renderer.domElement);

/* helper and camera */
var helper = new THREE.AxisHelper(200);
//scene.add(helper);

camera.position.set(200,100,200);
camera.lookAt(scene.position);
scene.add(camera);

/* Lighting */
var light = new THREE.DirectionalLight(0xffffff,1.5);
light.position.set(0,.5,1).normalize();
scene.add(light);


/* OrbitControl */
var orbitControl = new THREE.OrbitControls(camera),
    clock = new THREE.Clock();


/* Scales and constants */
var EARTH = 6370,
    speed = 10000, //ratio between real time and animation time
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
    earthMat.emissiveIntensity = .2;
    earthMat.needsUpdate = true;
});

//Orbits
var orbitGroup = new THREE.Object3D();
scene.add(orbitGroup);

//Sphere distance guide
var gridMaterial = new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true,transparent:true,opacity:.05});
var gridMesh = new THREE.Mesh(
    new THREE.SphereGeometry(400,32,32),
    gridMaterial
);
scene.add(gridMesh);

//Raycaster
var raycaster = new THREE.Raycaster(),
    mouse = new THREE.Vector2();

document.addEventListener('mousemove',onMousemove);
document.addEventListener('mousedown',onMousedown);

function onMousemove(event){
    mouse.x = event.clientX/window.innerWidth*2-1;
    mouse.y = 1-event.clientY/window.innerHeight*2;

    //compute distance between ray and center of scene
    //raycaster.setFromCamera(mouse,camera);
    //gridMesh.geometry = new THREE.SphereGeometry(raycaster.ray.distanceToPoint(scene.position),32,32);
}
function onMousedown(event){
    raycaster.setFromCamera(mouse,camera);
    var intersects = raycaster.intersectObjects(orbitGroup.children);
    console.log(intersects);
}


/* Load in data */
d3.csv('/data/UCS_Satellite_Database_7-1-16.csv',parse,dataLoaded);


/* render loop */
render();

function dataLoaded(err,rows){
    //Keplerian model of an orbit: https://en.wikipedia.org/wiki/Orbit_modeling
    //from spline to line: view-source:http://threejs.org/examples/webgl_lines_splines.html
    var lineMaterial = d3.map(),
        spriteMaterial = new THREE.SpriteMaterial({
            opacity:.5,
            color:0xffffff,
            transparent:true,
            blending:THREE.AdditiveBlending,
            map:getSatelliteTexture(),
            useScreenCoordinates:false
        });

    var orbitTypes = d3.nest().key(function(d){return d.orbitClass})
        .map(rows,d3.map)
        .keys()
        .forEach(function(key,i,arr){
           lineMaterial.set(key,new THREE.LineBasicMaterial({color:0xccccff,linewidth:1,opacity:.01,transparent:true,blending:THREE.AdditiveBlending,visible:false}))
        });

    //var lineMaterial = new THREE.LineBasicMaterial({color:0x6666ff,linewidth:1,opacity:.1,transparent:true,blending:THREE.AdditiveBlending    });

    rows.forEach(generateSpline);
    rows.forEach(generateLine);

    function generateSpline(e){
        var points = []; // array of Vector3
        var _a = e.semiMajor, //semi-major axis
            _e = e.eccentricity,
            r; //distance between earth core and satellite

        for(var theta = 0; theta <= Math.PI*2; theta += Math.PI/90){

            //theta = 0 -> perigee -> positive X axis
            r = thetaToR(theta,_a,_e);

            points.push(new THREE.Vector3(
                scaleRadius(r * Math.cos(theta)),
                0,
                scaleRadius(r * Math.sin(theta))
            ));

        }

        e.spline = new THREE.Spline(points);
    }

    function generateLine(e){
        var spl = e.spline;
        var n_sub = 1,
            geometry = new THREE.Geometry(),
            segments = spl.points.length * n_sub;

        for(var i=0; i<=segments; i++){
            var position = spl.getPoint(i/segments);

            geometry.vertices[i] = new THREE.Vector3(position.x,position.y,position.z);
        }


        var orbit = new THREE.Object3D();

        //Add a line to represent orbit
        var line = new THREE.Line(geometry, lineMaterial.get(e.orbitClass));
        orbit.add(line);

        //Add a particle to represent dot
        var sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(5,5,5);
        //Compute initial sprite position (theta = 0)
        var _r = thetaToR(0, e.semiMajor, e.eccentricity);
        sprite.position.set(
            scaleRadius(_r * Math.cos(0)),
            0,
            scaleRadius(_r * Math.sin(0))
        );
        orbit.add(sprite);

        //Rotate GEO orbits so that satellite is at correct longitude
        //Plane of incline
        if(e.orbitClass == 'GEO' && e.lng != undefined){
            orbit.rotation.y = e.lng/Math.PI;
        }else{
            orbit.rotation.y = Math.random()*Math.PI*2;
        }
        orbit.rotation.z = e.inclination*Math.PI/180 * (Math.random() >.5?1:-1);
        orbit.period = e.period*60;
        orbit.semiMajor = e.semiMajor;
        orbit.eccentricity = e.eccentricity;
        orbit.theta = 0;
        orbitGroup.add(orbit);
    }

}

var uid = 0;

function parse(d){
    var _perigee = +d['Perigee (km)'],
        _apogee = +d['Apogee (km)'],
        _a = (_perigee + _apogee + EARTH*2)/ 2,
        eccentricity = (_apogee - _perigee)/(_apogee + _perigee + EARTH*2);

    return {
        uid:uid++,
        name:d['Name of Satellite, Alternate Names'],
        country:d['Country/Org of UN Registry'],
        countryOperator:d['Country of Operator/Owner'],
        operator:d['Operator/Owner'],
        purpose:d['Purpose'],
        orbitClass:d['Class of Orbit'],
        lng:d['Longitude of GEO (degrees)']?+d['Longitude of GEO (degrees)']:undefined,
        perigee:_perigee,
        apogee:_apogee,
        semiMajor:_a,
        eccentricity:eccentricity,
        inclination:+d['Inclination (degrees)'],
        period:+d['Period (minutes)']*60
    }
}

function render(){
    renderer.render(scene,camera);
    requestAnimationFrame(render);

    //Updte orbit controls
    var delta = clock.getDelta();
    orbitControl.update(delta);

    earthMesh.rotation.y += delta/(24*3600)*Math.PI*2*speed;

    //Update satellite locations
    orbitGroup.children.forEach(function(orbit,i){
        orbit.theta -= delta/orbit.period*Math.PI*2*speed;
        orbit.r = thetaToR(orbit.theta, orbit.semiMajor,orbit.eccentricity);
        orbit.children[1].position.set(
            scaleRadius(orbit.r * Math.cos(orbit.theta)),
            0,
            scaleRadius(orbit.r * Math.sin(orbit.theta))
        )
    });

    //Object picking
    raycaster.setFromCamera(mouse,camera);
    var intersects = raycaster.intersectObjects(scene.children);

}

function getSatelliteTexture(){
    var canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    var context = canvas.getContext('2d');
    var gradient = context.createRadialGradient(
        canvas.width / 2, canvas.height / 2,
        0,
        canvas.width / 2, canvas.height / 2,
        canvas.width / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(150,210,240,1)');
    gradient.addColorStop(0.5, 'rgba(64,0,0,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,1)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function thetaToR(theta,_a,_e){
    return _a*(1- Math.pow(_e,2))/(1 + Math.cos(theta)*_e);
}
