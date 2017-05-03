const THREE = require('three');
const OrbitControls = require('three-orbit-controls')(THREE);
import Framework from './framework'

var allScenes = [];
// used to animate the icosahedron
var programStartTime;

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

function getScene(sceneName) {
    for (var i = 0; i < allScenes.length; i++) {
        if (allScenes[i].name == sceneName) {
            return allScenes[i];
        }
    }
}

function timeIsOnBeat(framework, fraction) {
  var time = framework.audioContext.currentTime - framework.audioStartTime; // in seconds
  var divisor = (framework.songBPM == undefined) ? 120 : framework.songBPM;
  divisor = divisor/60;
  divisor = divisor/fraction;
  var epsilon = 0.02; 
  if (time % divisor < epsilon) {
    return true;
  } else {
    return false;
  }
}

function getNumScenes() {
  return allScenes.length;
}

function getSceneByIndex(sceneIndex) {
    return allScenes[sceneIndex];
}

function initializeAllScenes(framework) {
    programStartTime = Date.now();
    initializeIcosahedron(framework);
    initializeStarField(framework);
    initializeSpiral(framework);
    initializeGeomGeneration(framework);

    for (var i = 0; i < allScenes.length; i++) {
        allScenes[i].index = i;
    }
}

var tanh = Math.tanh || function tanh(x) {
    return (Math.exp(x) - Math.exp(-x)) / (Math.exp(x) + Math.exp(-x));
}; 
var cosh = Math.cosh || function cosh(x) {
    return (Math.exp(x) + Math.exp(-x)) / 2;
}; 
var sinh = Math.sinh || function sinh(x) {
    return (Math.exp(x) - Math.exp(-x)) / 2;
};

var xAxis = new THREE.Vector3(1,0,0);
var yAxis = new THREE.Vector3(0,1,0);
var zAxis = new THREE.Vector3(0,0,1);

function getRandomColor() {
  var colors = ["aqua","aquamarine","blue","blueviolet","cornflowerblue","cyan","deeppink","deepskyblue","dodgerblue","fuchsia","greenyellow","hotpink","lawngreen","lime","limegreen","magenta","orange","orchid","plum","powderblue","red","royalblue","skyblue","springgreen","turquoise","violet","yellow"];

  var random = getRandomInt(0, colors.length);
  return colors[random];
}

function getRandomGeometryShape() {
  var randomInt = getRandomInt(0, 3);
  switch (randomInt) {
    case 0: 
      return new THREE.OctahedronGeometry();
      break;
    case 1: 
      return new THREE.BoxGeometry( 1, 1, 1 );
      break;
    case 2: 
      return new THREE.IcosahedronGeometry();
      break;
  }
}

function getRandomMaterial() {
  var randomInt = getRandomInt(0, 3);
  switch (randomInt) {
    case 0: 
      return new THREE.MeshBasicMaterial( {color: getRandomColor()} );
      break;
    case 1: 
      return new THREE.MeshBasicMaterial( {color: getRandomColor(), wireframe: true} );
      break;
    case 2:
      return new THREE.MeshNormalMaterial();
      break;
  }
}

function initializeGeomGeneration(framework) {
  var camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000 );
  camera.position.set(5, 5, 5);
  camera.lookAt(new THREE.Vector3(0,0,0));

  var scene = new THREE.Scene();
  scene.background = new THREE.Color( 'whitesmoke' );
  scene.add(new THREE.AmbientLight(0x333333));

  var controls = new OrbitControls(camera, framework.renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = true;
  controls.target.set(0, 0, 0);
  controls.rotateSpeed = 0.3;
  controls.zoomSpeed = 1.0;
  controls.panSpeed = 2.0;

  var geomScene = {
        name: 'geoms',
        scene: scene,
        camera: camera,
        onUpdate: function(framework) {
          var offset = 100;
          if (framework.audioSourceBuffer.buffer != undefined) {
              var array =  new Uint8Array(framework.audioAnalyser.frequencyBinCount);
              framework.audioAnalyser.getByteFrequencyData(array);
              offset = getAverageVolume(array);

              // generate geometry to the beat
              if (timeIsOnBeat(framework, 4) && !framework.paused) {     
                for (var c = 0; c < framework.scene.children.length; c++) {
                  framework.scene.remove(framework.scene.getObjectByName("cube"+c));
                }
                for (var i = 0; i < offset/10; i++) {
                  var geometry =  getRandomGeometryShape();
                  geometry.translate(getRandomArbitrary(-15,16), getRandomArbitrary(-15,16), getRandomArbitrary(-15,16));
                  var material = getRandomMaterial();
                  var object = new THREE.Mesh( geometry, material );
                  var scale = 1; 
                  if (offset > 50) { 
                    scale = offset/50;
                  }
                  object.scale.set(scale, scale, scale);

                  // change pivot axis to object center
                  object.geometry.computeBoundingBox();

                  var boundingBox = object.geometry.boundingBox;

                  var position = new THREE.Vector3();
                  position.subVectors( boundingBox.max, boundingBox.min );
                  position.multiplyScalar( 0.5 );
                  position.add( boundingBox.min );
                  position.applyMatrix4( object.matrixWorld );

                  object.geometry.applyMatrix( 
                    new THREE.Matrix4()
                      .makeTranslation( 
                        -(position.x), 
                        -(position.y), 
                        -(position.z) 
                      ) 
                  );

                  object.geometry.verticesNeedUpdate = true;

                  object.position.x = position.x;
                  object.position.y = position.y;
                  object.position.z = position.z;

                  var cubeName = "cube" + i;
                  object.name = cubeName;
                  framework.scene.add(object);
                }
              } else if (timeIsOnBeat, 1) {
                for (var i = 0; i < framework.scene.children.length; i++) {
                  var object = framework.scene.getObjectByName("cube"+i);
                  if (object != undefined) {
                    var random = getRandomInt(0,3);
                    var num = i % 3;
                    if (num == 0) {
                      object.rotation.x += offset/2000;
                    } else if (num == 1) {
                      object.rotation.y += offset/2000;
                    } else if (num == 2) {
                      object.rotation.z += offset/2000;
                    }
                    if (random == 0){
                      object.scale.set(offset/100, offset/100, offset/100);
                    }
                  }
                }
              }
            } 
          }
    }

    allScenes.push(geomScene);
}

function createSpiralGeometryWithNoise(noiseLevel) {
  var geometry = new THREE.Geometry();
  // sphere spiral
  var sz = 16, cxy = 100, cz = cxy * sz;
  var hxy = Math.PI / cxy, hz = Math.PI / cz;
  var r = 10;
  for (var i = -cz; i < cz; i++) {
      var lxy = i * hxy;
      var lz = i * hz;
      var rxy = r / Math.cosh(lz);
      var x = rxy * Math.cos(lxy);
      var y = rxy * Math.sin(lxy) + getRandomArbitrary(0, noiseLevel);
      var z = r * Math.tanh(lz) + getRandomArbitrary(0, noiseLevel);
      geometry.vertices.push(new THREE.Vector3(x, y, z));
  }
  return geometry;
}

function initializeSpiral(framework) {
  var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 2000 );
  camera.position.set(-100, 0, 0);
  camera.lookAt(new THREE.Vector3(0,0,0));
  var controls = new OrbitControls(camera, framework.renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = true;
  controls.target.set(0, 0, 0);
  controls.rotateSpeed = 0.3;
  controls.zoomSpeed = 1.0;
  controls.panSpeed = 2.0;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.add(new THREE.AmbientLight(0x333333));
  
  var numSpirals = 60; 

  var offset = 0.5;
  for (var s = 0; s < numSpirals; s++) {
    var randomInt = getRandomInt(0, 2);
    var geometry; 
    if (randomInt == 0) {
      geometry = createSpiralGeometryWithNoise(0.3);
    } else {
      geometry = createSpiralGeometryWithNoise(0);
    }
    geometry.scale(offset, offset, offset);
    offset += 0.05;

    var obj = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: getRandomColor()}));
    var spiralName = "spiral" + s;
    obj.name = spiralName;
    scene.add(obj);
  }

  var spiralScene = {
        name: 'spiral',
        scene: scene,
        camera: camera,
        onUpdate: function(framework) {
            if (framework.audioSourceBuffer.buffer != undefined) {
              var array =  new Uint8Array(framework.audioAnalyser.frequencyBinCount);
              framework.audioAnalyser.getByteFrequencyData(array);
              var volume = getAverageVolume(array);
              var step = Math.round(array.length / numSpirals);

              //Iterate through the bars and add noise
              for (var i = 0; i < numSpirals; i++) {
                var spiralName = "spiral" + i;
                var spiral = framework.scene.getObjectByName(spiralName);

                var value = array[i * step] / 4;
                value = value < 1 ? 1 : value;
                spiral.rotation.z += value/100;
                spiral.geometry.verticesNeedUpdate = true;
                if (timeIsOnBeat(framework, 10)) {
                  var scale = 1; 
                  if (volume > 50) { 
                    scale = volume/50;
                  }
                  spiral.scale.set(scale, scale, scale);
                }
              }
            } else {
              for (var i = 0; i < numSpirals; i++) {
                var spiralName = "spiral" + i;
                var spiral = framework.scene.getObjectByName(spiralName);
                spiral.rotation.z += 0.05;
                spiral.geometry.verticesNeedUpdate = true;
                //spiral.material.color.setStyle(getRandomColor());
              }
            }
        }
    }

    allScenes.push(spiralScene);
}

function initializeIcosahedron(framework) {
	var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
    var controls = new OrbitControls(camera, framework.renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = true;
    controls.target.set(0, 0, 0);
    controls.rotateSpeed = 0.3;
    controls.zoomSpeed = 1.0;
    controls.panSpeed = 2.0;

    var icosahedronMaterial = new THREE.ShaderMaterial({
      uniforms: {
          time: { // Check the Three.JS documentation for the different allowed types and values
            type: "f", 
            value: Date.now()
          },
          noiseStrength: {
            type: "f",
            value: 2.0
          }, 
          numOctaves: {
            type: "f",
            value: 3
          },
          audioScale: {
            type: "f",
            value: 1
          }
        },
        vertexShader: require('./shaders/my-vert.glsl'),
        fragmentShader: require('./shaders/my-frag.glsl')
      });

    // initialize icosahedron object
    var guiFields = {
      icosahedronDetail: 3, 
      noiseStrength: 2.0,
      numOctaves: 3
    }

    var icosahedronGeometry = new THREE.IcosahedronGeometry(1, guiFields.icosahedronDetail);

    var texturedIcosahedron = new THREE.Mesh(icosahedronGeometry, icosahedronMaterial);
    texturedIcosahedron.scale.set(20,20,20);
    scene.add(texturedIcosahedron);

    // set camera position
    camera.position.set(1, 1, -100);
    camera.lookAt(new THREE.Vector3(0,0,0));

    var icosahedronScene = {
        name: 'icosahedron',
        scene: scene,
        camera: camera,
        onUpdate: function(framework) {
            icosahedronMaterial.uniforms.time.value = Date.now() - programStartTime;
            if (framework.audioSourceBuffer.buffer != undefined) {
              var array =  new Uint8Array(framework.audioAnalyser.frequencyBinCount);
              framework.audioAnalyser.getByteFrequencyData(array);
              var average = getAverageVolume(array)

              //console.log('VOLUME:' + average); //here's the volume
              var newNoiseStrength = mapVolumeToNoiseStrength(average); 
              //console.log(newNoiseStrength);
              icosahedronMaterial.uniforms.noiseStrength.value = newNoiseStrength;

            }
            icosahedronMaterial.needsUpdate = true;
        }
    }

    allScenes.push(icosahedronScene);
}

function initializeStarField() {
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

    var randomPoints = [];
    for ( var i = 0; i < 100; i ++ ) {
        randomPoints.push(
            new THREE.Vector3(Math.random() * 200 - 100, Math.random() * 200 - 100, Math.random() * 200 - 100)
        );
    }
    var spline = new THREE.SplineCurve3(randomPoints);
    var camPosIndex = 0;

    for (var i = 0; i < 400; i++) {
      var b = new THREE.Mesh(
        new THREE.BoxGeometry(1,1,1),
        new THREE.MeshBasicMaterial({color: "#EEEDDD"})
      );
      
      b.position.x = -300 + Math.random() * 600;
      b.position.y = -300 + Math.random() * 600;  
      b.position.z = -300 + Math.random() * 600;
      
      scene.add(b);
    }

    camera.position.z = 5;

    var starfieldScene = {
        name: 'starfield',
        scene: scene,
        camera: camera,
        onUpdate: function(framework) {
            camPosIndex++;
            if (camPosIndex > 10000) {
                camPosIndex = 0;
            }
            var offset = 0;
            if (framework.audioSourceBuffer.buffer != undefined) {
                var array =  new Uint8Array(framework.audioAnalyser.frequencyBinCount);
                framework.audioAnalyser.getByteFrequencyData(array);
                offset = getAverageVolume(array);
            }

            var camPos = spline.getPoint(camPosIndex / 10000);

            framework.camera.position.x = camPos.x + offset;
            framework.camera.position.y = camPos.y + offset;
            framework.camera.position.z = camPos.z + offset;

            framework.camera.lookAt(spline.getPoint((camPosIndex+1) / 10000));
        }
    }

    allScenes.push(starfieldScene);
}

function getAverageVolume(array) {
      var values = 0;
      var average;

      var length = array.length;

      // get all the frequency amplitudes
      for (var i = 0; i < length; i++) {
          values += array[i];
      }

      average = values / length;
      return average;
}

function mapVolumeToNoiseStrength(vol) {
  // map range from 0 -> 150 to 4 -> 1
  var result = vol / 150 * (1 - 4) + 4;
  return result;
}

export default {
  initializeAllScenes: initializeAllScenes,
  getScene: getScene,
  getSceneByIndex: getSceneByIndex,
  getNumScenes: getNumScenes,
  getRandomInt: getRandomInt
}
