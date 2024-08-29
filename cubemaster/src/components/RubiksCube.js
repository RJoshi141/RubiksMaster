import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './RubiksCube.css'; // Import the CSS file

const RubiksCube = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;

    // Define colors for each face
    const faceColors = {
      front: 0xff0000, // red
      back: 0xffa500,  // orange
      left: 0x0000ff,  // blue
      right: 0x00ff00, // green
      top: 0xffffff,   // white
      bottom: 0xffff00  // yellow
    };

    // Create the cube
    const createCubies = () => {
      const size = 1;
      const spacing = 0.1;

      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
            if ((x === -1 || x === 1) || (y === -1 || y === 1) || (z === -1 || z === 1)) {
              const geometry = new THREE.BoxGeometry(size, size, size);
              
              const materials = [
                new THREE.MeshBasicMaterial({ color: (x === -1) ? faceColors.left : (x === 1) ? faceColors.right : 0xaaaaaa }), // Left and Right
                new THREE.MeshBasicMaterial({ color: (x === -1) ? faceColors.left : (x === 1) ? faceColors.right : 0xaaaaaa }), // Back and Front
                new THREE.MeshBasicMaterial({ color: (y === -1) ? faceColors.bottom : (y === 1) ? faceColors.top : 0xaaaaaa }), // Top and Bottom
                new THREE.MeshBasicMaterial({ color: (y === -1) ? faceColors.bottom : (y === 1) ? faceColors.top : 0xaaaaaa }), // Top and Bottom
                new THREE.MeshBasicMaterial({ color: (z === -1) ? faceColors.front : (z === 1) ? faceColors.back : 0xaaaaaa }), // Front and Back
                new THREE.MeshBasicMaterial({ color: (z === -1) ? faceColors.front : (z === 1) ? faceColors.back : 0xaaaaaa })  // Front and Back
              ];

              const cubie = new THREE.Mesh(geometry, materials);
              cubie.position.set(x * (size + spacing), y * (size + spacing), z * (size + spacing));
              scene.add(cubie);
            }
          }
        }
      }
    };

    createCubies();
    camera.position.z = 5;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update(); // Update controls
      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Clean up
    return () => {
      mountRef.current.removeChild(renderer.domElement);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <div ref={mountRef} className="rubiks-cube-container" />;
};

export default RubiksCube;
