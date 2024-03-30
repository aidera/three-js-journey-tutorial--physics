import * as THREE from 'three';
import CANNON from 'cannon';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import GUI from 'lil-gui';

/**
 * ------------
 * PRESETS
 * ------------ */
// Canvas
const canvas = document.getElementById('canvas');

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};
let aspectRatio = sizes.width / sizes.height;

// Animation
const clock = new THREE.Clock();
let previousTime = 0;

// GUI
const gui = new GUI();
const parameters = {
  createSphere: () => {
    createSphere(Math.random() * 0.5, {
      x: (Math.random() - 0.5) * 3,
      y: 3,
      z: (Math.random() - 0.5) * 3,
    });
  },
  createBox: () => {
    createBox(Math.random(), Math.random(), Math.random(), {
      x: (Math.random() - 0.5) * 3,
      y: 3,
      z: (Math.random() - 0.5) * 3,
    });
  },
  reset: () => {
    for (const object of objectsToUpdate) {
      // Remove body
      object.body.removeEventListener('collide', playHitSound);
      world.removeBody(object.body);

      // Remove mesh
      scene.remove(object.mesh);
    }
    objectsToUpdate.splice(0, objectsToUpdate.length);
  },
};
gui.add(parameters, 'createSphere');
gui.add(parameters, 'createBox');
gui.add(parameters, 'reset');

/**
 * ------------
 * SCENE
 * ------------ */
const scene = new THREE.Scene();

/**
 * ------------
 * OBJECTS
 * ------------ */

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader();
const cubeTextureLoader = new THREE.CubeTextureLoader();

const environmentMapTexture = cubeTextureLoader.load([
  '/textures/environmentMaps/0/px.png',
  '/textures/environmentMaps/0/nx.png',
  '/textures/environmentMaps/0/py.png',
  '/textures/environmentMaps/0/ny.png',
  '/textures/environmentMaps/0/pz.png',
  '/textures/environmentMaps/0/nz.png',
]);

// Materials
const material = new THREE.MeshStandardMaterial();

// Meshes
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({
    color: '#777777',
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture,
    envMapIntensity: 0.5,
  })
);
floor.receiveShadow = true;
floor.rotation.x = -Math.PI * 0.5;
scene.add(floor);

/**
 * ------------
 * PHYSICS
 * ------------ */
// World (like scene in mesh world)
const world = new CANNON.World();
world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.gravity.set(0, -9.02, 0);

// Material
const defaultMaterial = new CANNON.Material('default'); // inside just names, can be any text

const defaultContactMaterial = new CANNON.ContactMaterial( // What happened if plasticMaterial will contact with concreteMaterial? Order doesn't matter
  defaultMaterial,
  defaultMaterial,
  {
    friction: 0.1, // 0 friction is like an oil on the floor
    restitution: 0.7, // when the object jumps, what height it will reach
  }
);
world.addContactMaterial(defaultContactMaterial);
world.defaultContactMaterial = defaultContactMaterial;

// Floor
const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body();
floorBody.mass = 0;
floorBody.addShape(floorShape);
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5); // To be the same rotation as the mesh
world.addBody(floorBody);

/**
 * ------------
 * Sounds
 * ------------ */
const hitSound = new Audio('/sounds/hit.mp3');

const playHitSound = (collision) => {
  const impactStrength = collision.contact.getImpactVelocityAlongNormal();

  if (impactStrength > 1.5) {
    hitSound.volume = Math.random();
    hitSound.currentTime = 0;
    hitSound.play();
  }
};

/**
 * ------------
 * LIGHTS
 * ------------ */
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.camera.left = -7;
directionalLight.shadow.camera.top = 7;
directionalLight.shadow.camera.right = 7;
directionalLight.shadow.camera.bottom = -7;
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

/**
 * ------------
 * CAMERA
 * ------------ */
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(-3, 3, 3);
scene.add(camera);

/**
 * ------------
 * RENDER
 * ------------ */
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setSize(sizes.width, sizes.height);

/**
 * ------------
 * UTILS
 * ------------ */
// Resize
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  aspectRatio = sizes.width / sizes.height;

  camera.aspect = aspectRatio;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/** Sphere creation */
const objectsToUpdate = [];

// Outside of the function for optimization
const sphereGeometry = new THREE.SphereGeometry(1, 20, 20);
const sphereMaterial = new THREE.MeshStandardMaterial({
  metalness: 0.3,
  roughness: 0.4,
  envMap: environmentMapTexture,
  envMapIntensity: 0.5,
});

const createSphere = (radius, position) => {
  // Three.js mesh
  const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  mesh.castShadow = true;
  mesh.scale.set(radius, radius, radius);
  mesh.position.copy(position);
  scene.add(mesh);

  // Cannon.js body
  const shape = new CANNON.Sphere(radius);

  const body = new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(0, 3, 0),
    shape: shape,
  });
  body.position.copy(position);
  world.addBody(body);

  body.addEventListener('collide', playHitSound);

  // Save in objects to update
  objectsToUpdate.push({ mesh, body });
};

createSphere(0.5, { x: 0, y: 1, z: 0 });

/** Box creation */
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const boxMaterial = new THREE.MeshStandardMaterial({
  metalness: 0.3,
  roughness: 0.4,
  envMap: environmentMapTexture,
  envMapIntensity: 0.5,
});
const createBox = (width, height, depth, position) => {
  // Three.js mesh
  const mesh = new THREE.Mesh(boxGeometry, boxMaterial);
  mesh.scale.set(width, height, depth);
  mesh.castShadow = true;
  mesh.position.copy(position);
  scene.add(mesh);

  // Cannon.js body
  const shape = new CANNON.Box(
    new CANNON.Vec3(width * 0.5, height * 0.5, depth * 0.5)
  );

  const body = new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(0, 3, 0),
    shape: shape,
    material: defaultMaterial,
  });
  body.position.copy(position);
  world.addBody(body);

  body.addEventListener('collide', playHitSound);

  // Save in objects
  objectsToUpdate.push({ mesh, body });
};

/**
 * ------------
 * ANIMATION
 * ------------ */
const updateBasedByPhysics = () => {
  // sphere.position.copy(sphereBody.position);
  objectsToUpdate.forEach((object) => {
    object.mesh.position.copy(object.body.position);
    object.mesh.quaternion.copy(object.body.quaternion); // not rotation because cannon.js uses quaternion
  });
};

// Throw a sphere
// sphereBody.applyLocalForce(
//   // local means that all calculationg are relative to the sphereBody
//   new CANNON.Vec3(150, 0, 0), // force vector and power
//   new CANNON.Vec3(0, 0, 0) // local point. So the force will be applied to the center of the sphereBody
// );

/**
 * ------------
 * START
 * ------------ */
const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - previousTime;
  previousTime = elapsedTime;

  // Update physics world
  world.step(1 / 60, deltaTime, 3);

  updateBasedByPhysics();

  // Update controls
  controls.update();

  renderer.render(scene, camera);
  window.requestAnimationFrame(tick);
};

tick();
