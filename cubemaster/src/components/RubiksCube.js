import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './styles/RubiksCube.css';

const RubiksCube = () => {
  const mountRef = useRef(null);
  const [cubies, setCubies] = useState([]);
  const [scene, setScene] = useState(null);
  const [camera, setCamera] = useState(null);
  const [selectedCubie, setSelectedCubie] = useState(null);
  const [highlightMesh, setHighlightMesh] = useState(null);
  const [rotationDirection, setRotationDirection] = useState(1);
  const [rotationSteps, setRotationSteps] = useState(1);

  useEffect(() => {
    const scene = new THREE.Scene();
    setScene(scene);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    setCamera(camera);

    const renderer = new THREE.WebGLRenderer({ antialiased: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;

    // Define the colors for each face
    const faceColors = {
      front: '#FF5900', // Orange
      back: '#0045AD',  // Blue
      left: '#009B48',  // Green
      right: '#B90000', // Red
      top: '#FFFFFF',   // White
      bottom: '#FFD500' // Yellow
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
                new THREE.MeshBasicMaterial({ color: z === -1 ? faceColors.front : (z === 1 ? faceColors.back : 0xaaaaaa) }), // Front and Back
                new THREE.MeshBasicMaterial({ color: x === -1 ? faceColors.left : (x === 1 ? faceColors.right : 0xaaaaaa) }), // Left and Right
                new THREE.MeshBasicMaterial({ color: y === -1 ? faceColors.bottom : (y === 1 ? faceColors.top : 0xaaaaaa) }), // Top and Bottom
                new THREE.MeshBasicMaterial({ color: y === -1 ? faceColors.bottom : (y === 1 ? faceColors.top : 0xaaaaaa) }), // Top and Bottom
                new THREE.MeshBasicMaterial({ color: z === -1 ? faceColors.front : (z === 1 ? faceColors.back : 0xaaaaaa) }), // Front and Back
                new THREE.MeshBasicMaterial({ color: z === -1 ? faceColors.front : (z === 1 ? faceColors.back : 0xaaaaaa) })  // Front and Back
              ];

              const cubie = new THREE.Mesh(geometry, materials);
              cubie.position.set(x * (size + spacing), y * (size + spacing), z * (size + spacing));
              cubie.userData = { x, y, z, face: null }; // Store coordinates and initial face state
              scene.add(cubie);
              createdCubies.push(cubie);
            }
          }
        }
      }
      setCubies(createdCubies);
    };

    createCubies();
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
  }, []); // Removed unused state

  const updateHighlight = (cubie, face) => {
    if (highlightMesh) {
      scene.remove(highlightMesh);
    }

    const size = 1;
    const highlightGeometry = new THREE.PlaneGeometry(size, size);
    const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    const newHighlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    
    switch (face) {
      case 'front':
        newHighlightMesh.position.set(cubie.position.x, cubie.position.y, cubie.position.z + 1.01);
        break;
      case 'back':
        newHighlightMesh.position.set(cubie.position.x, cubie.position.y, cubie.position.z - 1.01);
        break;
      case 'left':
        newHighlightMesh.position.set(cubie.position.x - 1.01, cubie.position.y, cubie.position.z);
        break;
      case 'right':
        newHighlightMesh.position.set(cubie.position.x + 1.01, cubie.position.y, cubie.position.z);
        break;
      case 'top':
        newHighlightMesh.position.set(cubie.position.x, cubie.position.y + 1.01, cubie.position.z);
        break;
      case 'bottom':
        newHighlightMesh.position.set(cubie.position.x, cubie.position.y - 1.01, cubie.position.z);
        break;
      default:
        break;
    }

    switch (face) {
      case 'front':
      case 'back':
        newHighlightMesh.rotation.set(0, 0, 0);
        break;
      case 'left':
      case 'right':
        newHighlightMesh.rotation.set(0, Math.PI / 2, 0);
        break;
      case 'top':
      case 'bottom':
        newHighlightMesh.rotation.set(Math.PI / 2, 0, 0);
        break;
      default:
        break;
    }

    scene.add(newHighlightMesh);
    setHighlightMesh(newHighlightMesh);
  };

  const handleCubeClick = (event) => {
    const intersectedObjects = event.intersections;
    if (intersectedObjects.length > 0) {
      const cubie = intersectedObjects[0].object;
      const { x, y, z } = cubie.userData;

      const face = cubie.position.x === -1 ? 'left' : cubie.position.x === 1 ? 'right' :
                   cubie.position.y === -1 ? 'bottom' : cubie.position.y === 1 ? 'top' :
                   cubie.position.z === -1 ? 'front' : 'back';

      if (selectedCubie === cubie) {
        const faces = ['front', 'back', 'left', 'right', 'top', 'bottom'];
        const currentIndex = faces.indexOf(cubie.userData.face);
        const nextFace = faces[(currentIndex + 1) % faces.length];
        cubie.userData.face = nextFace;
        updateHighlight(cubie, nextFace);
      } else {
        cubie.userData.face = face;
        setSelectedCubie(cubie);
        updateHighlight(cubie, face);
      }
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
  }, [cubies, camera, highlightMesh, handleCubeClick]); // Added dependencies

  const handleRotation = () => {
    if (selectedCubie) {
      const rotationAxis = new THREE.Vector3();
      const step = rotationSteps;
      const direction = rotationDirection;

      switch (selectedCubie.userData.face) {
        case 'front':
          rotationAxis.set(0, 0, 1);
          break;
        case 'back':
          rotationAxis.set(0, 0, -1);
          break;
        case 'left':
          rotationAxis.set(-1, 0, 0);
          break;
        case 'right':
          rotationAxis.set(1, 0, 0);
          break;
        case 'top':
          rotationAxis.set(0, 1, 0);
          break;
        case 'bottom':
          rotationAxis.set(0, -1, 0);
          break;
        default:
          rotationAxis.set(0, 0, 0);
          break;
      }

      cubies.forEach((cubie) => {
        cubie.rotation[rotationAxis.getComponent(0) ? 'x' : rotationAxis.getComponent(1) ? 'y' : 'z'] += direction * (step * Math.PI / 2);
      });
    }
  };

  return (
    <div className="rubiks-cube-container" ref={mountRef}>
      <div className="controls">
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
            <option value={1}>1 Step</option>
            <option value={2}>2 Steps</option>
            <option value={3}>3 Steps</option>
          </select>
        </label>
        <button onClick={handleRotation}>Rotate</button>
      </div>
    </div>
  );
};

export default RubiksCube;
