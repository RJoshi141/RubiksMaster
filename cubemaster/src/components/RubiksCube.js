import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './styles/RubiksCube.css';

const RubiksCube = () => {
  const mountRef = useRef(null);
  const [cubies, setCubies] = useState([]);
  const [renderer, setRenderer] = useState(null);
  const [scene, setScene] = useState(null);
  const [camera, setCamera] = useState(null);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [rotationSteps, setRotationSteps] = useState(1);
  const [rotationDirection, setRotationDirection] = useState(1); // 1 for clockwise, -1 for anticlockwise
  const [highlightMesh, setHighlightMesh] = useState(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    setScene(scene);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    setCamera(camera);

    const renderer = new THREE.WebGLRenderer({ antialiased: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);
    setRenderer(renderer);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;

    const faceColors = {
      front: 0xFF5900, // Orange
      back: 0x0045AD,  // Blue
      left: 0x009B48,  // Green
      right: 0xB90000, // Red
      top: 0xFFFFFF,   // White
      bottom: 0xFFD500 // Yellow
    };

    const createCubies = () => {
      const size = 1;
      const spacing = 0.1;
      const createdCubies = [];

      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
            if ((x === -1 || x === 1) || (y === -1 || y === 1) || (z === -1 || z === 1)) {
              const geometry = new THREE.BoxGeometry(size, size, size);
              const materials = [
                new THREE.MeshBasicMaterial({ color: x === -1 ? faceColors.left : (x === 1 ? faceColors.right : 0xaaaaaa) }),
                new THREE.MeshBasicMaterial({ color: x === -1 ? faceColors.left : (x === 1 ? faceColors.right : 0xaaaaaa) }),
                new THREE.MeshBasicMaterial({ color: y === -1 ? faceColors.bottom : (y === 1 ? faceColors.top : 0xaaaaaa) }),
                new THREE.MeshBasicMaterial({ color: y === -1 ? faceColors.bottom : (y === 1 ? faceColors.top : 0xaaaaaa) }),
                new THREE.MeshBasicMaterial({ color: z === -1 ? faceColors.front : (z === 1 ? faceColors.back : 0xaaaaaa) }),
                new THREE.MeshBasicMaterial({ color: z === -1 ? faceColors.front : (z === 1 ? faceColors.back : 0xaaaaaa) }),
              ];

              // Correctly color internal faces as grey
              if (x !== -1 && x !== 1) {
                materials[0] = materials[1] = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
              }
              if (y !== -1 && y !== 1) {
                materials[2] = materials[3] = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
              }
              if (z !== -1 && z !== 1) {
                materials[4] = materials[5] = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
              }

              const cubie = new THREE.Mesh(geometry, materials);
              cubie.position.set(x * (size + spacing), y * (size + spacing), z * (size + spacing));
              cubie.userData = { x, y, z }; // Store coordinates
              scene.add(cubie);
              createdCubies.push(cubie);
            }
          }
        }
      }
      setCubies(createdCubies);
    };

    createCubies();

    // Create the highlight mesh and add it to the scene
    const highlightGeometry = new THREE.BoxGeometry(1.1, 1.1, 1.1);
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
    });
    const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlightMesh.visible = false;
    scene.add(highlightMesh);
    setHighlightMesh(highlightMesh);

    camera.position.z = 5;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update(); // Update controls
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      const currentMountRef = mountRef.current;
      if (currentMountRef) {
        currentMountRef.removeChild(renderer.domElement);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const rotateFace = (face, direction, steps) => {
    const rotationAngle = (Math.PI / 2) * steps * direction;
    const rotationMatrix = new THREE.Matrix4().makeRotationZ(rotationAngle);

    const facePositions = {
      front: (cubie) => cubie.position.z === 1,
      back: (cubie) => cubie.position.z === -1,
      left: (cubie) => cubie.position.x === -1,
      right: (cubie) => cubie.position.x === 1,
      top: (cubie) => cubie.position.y === 1,
      bottom: (cubie) => cubie.position.y === -1
    };

    const isOnFace = facePositions[face];
    const faceCubies = cubies.filter(cubie => isOnFace(cubie));

    faceCubies.forEach(cubie => {
      const relativePosition = cubie.position.clone();
      const transformedPosition = relativePosition.applyMatrix4(rotationMatrix);
      cubie.position.set(transformedPosition.x, transformedPosition.y, transformedPosition.z);
    });

    renderer.render(scene, camera);
  };

  const handleCubeClick = useCallback((event) => {
    const intersectedObjects = event.intersections;
    if (intersectedObjects.length > 0) {
      const cubie = intersectedObjects[0].object;
      const { x, y, z } = cubie.userData;

      const face = cubie.position.x === -1 ? 'left' : cubie.position.x === 1 ? 'right' :
                   cubie.position.y === -1 ? 'bottom' : cubie.position.y === 1 ? 'top' :
                   cubie.position.z === -1 ? 'front' : 'back';

      setSelectedLayer({ face, position: cubie.position.clone() });

      // Highlight the selected face
      highlightMesh.position.copy(cubie.position);
      highlightMesh.visible = true;
    }
  }, [cubies, camera, highlightMesh]);

  const handleRotation = () => {
    if (selectedLayer) {
      rotateFace(selectedLayer.face, rotationDirection, rotationSteps);
    }
  };

  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(cubies);
      handleCubeClick({ intersections: intersects });
    };

    window.addEventListener('click', onMouseClick);

    return () => {
      window.removeEventListener('click', onMouseClick);
    };
  }, [cubies, camera, handleCubeClick]);

  return (
    <div>
      <div ref={mountRef} className="rubiks-cube-container" />
      <div className="controls">
        {selectedLayer && (
          <>
            <label>
              Rotation Direction:
              <select onChange={(e) => setRotationDirection(Number(e.target.value))} value={rotationDirection}>
                <option value={1}>Clockwise</option>
                <option value={-1}>Anticlockwise</option>
              </select>
            </label>
            <label>
              Steps:
              <select onChange={(e) => setRotationSteps(Number(e.target.value))} value={rotationSteps}>
                {[1, 2, 3].map(step => (
                  <option key={step} value={step}>{step}</option>
                ))}
              </select>
            </label>
            <button onClick={handleRotation}>Rotate Face</button>
          </>
        )}
      </div>
    </div>
  );
};

export default RubiksCube;
