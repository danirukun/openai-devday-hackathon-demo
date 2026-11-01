// Run with Three.js r187 installed: node verify_threejs_export.mjs /absolute/path/to/scenes
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const root = process.argv[2] ?? path.dirname(new URL(import.meta.url).pathname);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'threejs-export-manifest.json')));
const loader = new GLTFLoader();
for (const variant of ['cutaway', 'complete']) {
  const file = fs.readFileSync(path.join(root, `venue-threejs-${variant}.glb`));
  const bytes = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  const gltf = await loader.parseAsync(bytes, '');
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const architecture = scene.getObjectByName('Architecture');
  const furniture = scene.getObjectByName('Furniture');
  assert(architecture && furniture, 'Missing top-level groups');
  const indexed = new Map();
  scene.traverse(obj => {
    if (obj.userData.asset_id) {
      assert(!indexed.has(obj.userData.asset_id), `Duplicate asset ${obj.userData.asset_id}`);
      indexed.set(obj.userData.asset_id, obj);
    }
  });
  const expected = manifest.filter(r => variant === 'complete' || !r.hidden_in_preview);
  assert.equal(indexed.size, expected.length);
  for (const record of expected) {
    const obj = indexed.get(record.name);
    assert(obj && obj.isMesh, `Missing mesh ${record.name}`);
    assert.equal(obj.parent.name, record.group, `Wrong group for ${record.name}`);
    assert.equal(obj.parent.parent.name, record.root, `Wrong top group for ${record.name}`);
    if (record.root === 'Furniture') {
      assert.equal(obj.name, record.name);
      assert.equal(obj.userData.asset_category, record.category);
    }
    const bounds = new THREE.Box3().setFromObject(obj, true);
    const actual = [bounds.min.toArray(), bounds.max.toArray()];
    for (let end=0; end<2; end++) for (let axis=0; axis<3; axis++) {
      assert(Math.abs(actual[end][axis] - record.bounds[end][axis]) < 0.0002,
        `${record.name} changed bounds: ${JSON.stringify(actual)} vs ${JSON.stringify(record.bounds)}`);
    }
  }
  const items = manifest.filter(r => r.root === 'Furniture');
  assert.equal(items.length, 27);
  const selected = indexed.get(items[0].name);
  const other = indexed.get(items[1].name);
  const beforeSelected = selected.getWorldPosition(new THREE.Vector3()).clone();
  const beforeOther = other.getWorldPosition(new THREE.Vector3()).clone();
  selected.position.x += 1;
  scene.updateMatrixWorld(true);
  assert(selected.getWorldPosition(new THREE.Vector3()).distanceTo(beforeSelected) > .99);
  assert(other.getWorldPosition(new THREE.Vector3()).distanceTo(beforeOther) < 1e-7);
  console.log(`${variant}: ${expected.length} meshes loaded; 27 separate furniture nodes; world bounds and independent movement verified`);
}
