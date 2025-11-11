import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './styles/RubiksCube.css';

const CUBIE_SIZE = 1;
const CUBIE_SPACING = 0.05;
const LAYER_UNIT = CUBIE_SIZE + CUBIE_SPACING;
const FACE_TOLERANCE = 0.01;
const ROTATION_DURATION_MS = 300;
const SHUFFLE_MOVE_COUNT = 25;

const FACE_META = {
  front: { label: 'Front', color: '#B90000' },
  back: { label: 'Back', color: '#FF5900' },
  right: { label: 'Right', color: '#009B48' },
  left: { label: 'Left', color: '#0045AD' },
  top: { label: 'Top', color: '#FFFFFF', textColor: '#000000' },
  bottom: { label: 'Bottom', color: '#FFD500', textColor: '#000000' },
  middleZ: { label: 'Middle (Front/Back)', color: '#777777' },
  middleX: { label: 'Middle (Left/Right)', color: '#777777' },
  middleY: { label: 'Middle (Top/Bottom)', color: '#777777' },
};

const FACE_GROUPS = [
  {
    title: 'Faces',
    faces: ['front', 'back', 'right', 'left', 'top', 'bottom'],
  },
  {
    title: 'Middle Layers',
    faces: ['middleZ', 'middleX', 'middleY'],
  },
];

const FACE_CONFIG = {
  front: { axis: new THREE.Vector3(0, 0, 1), layer: 1, angleSign: -1 },
  back: { axis: new THREE.Vector3(0, 0, -1), layer: -1, angleSign: 1 },
  right: { axis: new THREE.Vector3(1, 0, 0), layer: 1, angleSign: -1 },
  left: { axis: new THREE.Vector3(-1, 0, 0), layer: -1, angleSign: 1 },
  top: { axis: new THREE.Vector3(0, 1, 0), layer: 1, angleSign: -1 },
  bottom: { axis: new THREE.Vector3(0, -1, 0), layer: -1, angleSign: 1 },
  middleZ: { axis: new THREE.Vector3(0, 0, 1), layer: 0, angleSign: -1 },
  middleX: { axis: new THREE.Vector3(1, 0, 0), layer: 0, angleSign: -1 },
  middleY: { axis: new THREE.Vector3(0, 1, 0), layer: 0, angleSign: -1 },
};

const FACE_COLORS = {
  positiveX: 0x009b48,
  negativeX: 0x0045ad,
  positiveY: 0xffffff,
  negativeY: 0xffd500,
  positiveZ: 0xb90000,
  negativeZ: 0xff5900,
};

const snapToLayer = (value) => Math.round(value / LAYER_UNIT) * LAYER_UNIT;

const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const buildCubies = (scene) => {
  if (!scene) {
    return [];
  }
  const createdCubies = [];

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (
          x === -1 ||
          x === 1 ||
          y === -1 ||
          y === 1 ||
          z === -1 ||
          z === 1
        ) {
          const geometry = new THREE.BoxGeometry(
            CUBIE_SIZE,
            CUBIE_SIZE,
            CUBIE_SIZE
          );
          const materials = [
            new THREE.MeshBasicMaterial({
              color: x === 1 ? FACE_COLORS.positiveX : 0xaaaaaa,
            }),
            new THREE.MeshBasicMaterial({
              color: x === -1 ? FACE_COLORS.negativeX : 0xaaaaaa,
            }),
            new THREE.MeshBasicMaterial({
              color: y === 1 ? FACE_COLORS.positiveY : 0xaaaaaa,
            }),
            new THREE.MeshBasicMaterial({
              color: y === -1 ? FACE_COLORS.negativeY : 0xaaaaaa,
            }),
            new THREE.MeshBasicMaterial({
              color: z === 1 ? FACE_COLORS.positiveZ : 0xaaaaaa,
            }),
            new THREE.MeshBasicMaterial({
              color: z === -1 ? FACE_COLORS.negativeZ : 0xaaaaaa,
            }),
          ];

          const cubie = new THREE.Mesh(geometry, materials);
          cubie.position.set(
            x * LAYER_UNIT,
            y * LAYER_UNIT,
            z * LAYER_UNIT
          );
          cubie.userData = {
            coords: { x, y, z },
          };
          scene.add(cubie);
          createdCubies.push(cubie);
        }
      }
    }
  }

  return createdCubies;
};

const getFaceCenterPosition = (face) => {
  const config = FACE_CONFIG[face];
  if (!config) {
    return new THREE.Vector3();
  }

  const { axis, layer } = config;
  const center = new THREE.Vector3(
    axis.x * layer * LAYER_UNIT,
    axis.y * layer * LAYER_UNIT,
    axis.z * layer * LAYER_UNIT
  );
  return center;
};

const getHighlightScaleFactors = (face) => {
  const baseDimension = CUBIE_SIZE + 0.1;
  const layerThickness = (LAYER_UNIT + 0.1) / baseDimension;
  const layerSpan = (3 * LAYER_UNIT + 0.1) / baseDimension;

  switch (face) {
    case 'front':
    case 'back':
    case 'middleZ':
      return new THREE.Vector3(layerSpan, layerSpan, layerThickness);
    case 'right':
    case 'left':
    case 'middleX':
      return new THREE.Vector3(layerThickness, layerSpan, layerSpan);
    case 'top':
    case 'bottom':
    case 'middleY':
      return new THREE.Vector3(layerSpan, layerThickness, layerSpan);
    default:
      return new THREE.Vector3(1, 1, 1);
  }
};

const RubiksCube = () => {
  const mountRef = useRef(null);
  const [cubies, setCubies] = useState([]);
  const [renderer, setRenderer] = useState(null);
  const [scene, setScene] = useState(null);
  const [camera, setCamera] = useState(null);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [rotationSteps, setRotationSteps] = useState(1);
  const [rotationDirection, setRotationDirection] = useState(1); // 1 clockwise -1 anticlockwise
  const [highlightMesh, setHighlightMesh] = useState(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isSequenceRunning, setIsSequenceRunning] = useState(false);
  const [activeSequenceType, setActiveSequenceType] = useState(null);
  const isRotatingRef = useRef(false);
  const cubiesRef = useRef([]);
  const moveHistoryRef = useRef([]);
  const sequenceCancelRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    setScene(scene);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    setCamera(camera);

    const renderer = new THREE.WebGLRenderer({ antialiased: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    const mountNode = mountRef.current;
    if (mountNode) {
      mountNode.appendChild(renderer.domElement);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      const { clientWidth, clientHeight } = mountNode.getBoundingClientRect();
      const initialWidth = clientWidth || window.innerWidth * 0.6;
      const initialHeight = clientHeight || window.innerHeight * 0.8;
      renderer.setSize(initialWidth, initialHeight);
      camera.aspect = initialWidth / initialHeight;
      camera.updateProjectionMatrix();
    }
    setRenderer(renderer);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableRotate = true;
    controls.target.set(0, 0, 0);
    camera.position.set(5.2, 5.2, 5.2);
    camera.lookAt(0, 0, 0);
    controls.update();

    const createdCubies = buildCubies(scene);
    cubiesRef.current = createdCubies;
    setCubies(createdCubies);

    // Create the highlight mesh and add it to the scene
    const highlightGeometry = new THREE.BoxGeometry(
      CUBIE_SIZE + 0.1,
      CUBIE_SIZE + 0.1,
      CUBIE_SIZE + 0.1
    );
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlightMesh.visible = false;
    scene.add(highlightMesh);
    setHighlightMesh(highlightMesh);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update(); // Update controls
      renderer.render(scene, camera);
    };
    animate();

    const updateRendererSize = () => {
      if (!mountRef.current) {
        return;
      }
      const { clientWidth, clientHeight } = mountRef.current.getBoundingClientRect();
      const width = clientWidth || window.innerWidth * 0.6;
      const height = clientHeight || window.innerHeight * 0.8;
      renderer.setSize(width, height);
      camera.aspect = width / height || 1;
      camera.updateProjectionMatrix();
    };

    updateRendererSize();

    window.addEventListener('resize', updateRendererSize);

    return () => {
      if (mountNode) {
        mountNode.removeChild(renderer.domElement);
      }
      window.removeEventListener('resize', updateRendererSize);
    };
  }, []);

  const rotateFace = useCallback(
    (face, direction, steps, options = {}) => {
      const { suppressHighlight = false } = options;
      if (!renderer || !scene || !camera || isRotatingRef.current) {
        return Promise.resolve(false);
      }

      const config = FACE_CONFIG[face];
      if (!config) {
        return Promise.resolve(false);
      }

      const layerCubies = cubiesRef.current.filter((cubie) => {
        const axisKey =
          config.axis.x !== 0 ? 'x' : config.axis.y !== 0 ? 'y' : 'z';
        const targetLayer = config.layer;
        const value = cubie.userData.coords[axisKey];
        return Math.abs(value - targetLayer) < FACE_TOLERANCE;
      });

      if (!layerCubies.length) {
        return Promise.resolve(false);
      }

      const pivot = new THREE.Group();
      scene.add(pivot);

      layerCubies.forEach((cubie) => {
        pivot.attach(cubie);
      });

      const angle =
        ((Math.PI / 2) * steps * direction * config.angleSign) %
        (Math.PI * 2);
      const axis = config.axis.clone().normalize();
      const startQuaternion = pivot.quaternion.clone();
      const targetQuaternion = new THREE.Quaternion().setFromAxisAngle(
        axis,
        angle
      );
      targetQuaternion.multiply(startQuaternion);

      isRotatingRef.current = true;
      setIsRotating(true);
      const startTime = performance.now();

      return new Promise((resolve) => {
        const animateRotation = (time) => {
          const elapsed = Math.min(1, (time - startTime) / ROTATION_DURATION_MS);
          const eased = easeInOutCubic(elapsed);
          const currentQuaternion = startQuaternion
            .clone()
            .slerp(targetQuaternion, eased);
          pivot.quaternion.copy(currentQuaternion);

          if (elapsed < 1) {
            requestAnimationFrame(animateRotation);
            return;
          }

          pivot.quaternion.copy(targetQuaternion);

          layerCubies.forEach((cubie) => {
            scene.attach(cubie);
            cubie.position.set(
              snapToLayer(cubie.position.x),
              snapToLayer(cubie.position.y),
              snapToLayer(cubie.position.z)
            );
            const logicalPosition = new THREE.Vector3(
              cubie.position.x / LAYER_UNIT,
              cubie.position.y / LAYER_UNIT,
              cubie.position.z / LAYER_UNIT
            );
            cubie.userData.coords = {
              x: Math.round(logicalPosition.x),
              y: Math.round(logicalPosition.y),
              z: Math.round(logicalPosition.z),
            };
            cubie.updateMatrixWorld();
          });

          scene.remove(pivot);
          pivot.clear();

          const updatedCubies = [...cubiesRef.current];
          cubiesRef.current = updatedCubies;
          setCubies(updatedCubies);
          isRotatingRef.current = false;
          setIsRotating(false);
          if (highlightMesh && !suppressHighlight) {
            const centerPosition = getFaceCenterPosition(face);
            const highlightScale = getHighlightScaleFactors(face);
            highlightMesh.position.copy(centerPosition);
            highlightMesh.scale.copy(highlightScale);
            const highlightColor = FACE_META[face]?.color;
            if (highlightColor && highlightMesh.material) {
              highlightMesh.material.color = new THREE.Color(highlightColor);
            }
            highlightMesh.visible = true;
          }
          resolve(true);
        };

        requestAnimationFrame(animateRotation);
      });
    },
    [renderer, scene, camera, highlightMesh]
  );

  const selectLayer = useCallback(
    (face, options = {}) => {
      if (!highlightMesh) {
        return;
      }
      const { force = false } = options;
      if (!force && (isRotatingRef.current || isSequenceRunning)) {
        return;
      }
      const centerPosition = getFaceCenterPosition(face);
      const highlightScale = getHighlightScaleFactors(face);
      highlightMesh.position.copy(centerPosition);
      highlightMesh.scale.copy(highlightScale);
      const highlightColor = FACE_META[face]?.color;
      if (highlightColor && highlightMesh.material) {
        highlightMesh.material.color = new THREE.Color(highlightColor);
      }
      highlightMesh.visible = true;
      setSelectedLayer({ face });
    },
    [highlightMesh, isSequenceRunning]
  );

  const resetCube = useCallback(() => {
    if (!scene || isRotatingRef.current) {
      return;
    }
    cubiesRef.current.forEach((cubie) => {
      scene.remove(cubie);
    });
    const freshCubies = buildCubies(scene);
    cubiesRef.current = freshCubies;
    setCubies(freshCubies);
    setSelectedLayer(null);
    moveHistoryRef.current = [];
    if (highlightMesh) {
      highlightMesh.visible = false;
    }
  }, [scene, highlightMesh]);

  const runMoveSequence = useCallback(
    async (sequence, { suppressUI = false } = {}) => {
      if (suppressUI && highlightMesh) {
        highlightMesh.visible = false;
      }

      let cancelled = false;
      sequenceCancelRef.current = () => {
        cancelled = true;
      };

      for (const move of sequence) {
        if (cancelled) {
          break;
        }
        if (!suppressUI) {
          selectLayer(move.face, { force: true });
        }
        await rotateFace(move.face, move.direction, move.steps, {
          suppressHighlight: suppressUI,
        });
        if (cancelled) {
          break;
        }
      }

      sequenceCancelRef.current = null;
      return !cancelled;
    },
    [rotateFace, selectLayer, highlightMesh]
  );

  const shuffleCube = useCallback(async () => {
    if (!scene || isSequenceRunning || isRotatingRef.current) {
      return;
    }
    const faces = Object.keys(FACE_CONFIG).filter(
      (faceKey) => !faceKey.startsWith('middle')
    );
    const moves = [];
    let previousFace = null;
    for (let i = 0; i < SHUFFLE_MOVE_COUNT; i += 1) {
      let face = faces[Math.floor(Math.random() * faces.length)];
      while (face === previousFace) {
        face = faces[Math.floor(Math.random() * faces.length)];
      }
      previousFace = face;
      const direction = Math.random() > 0.5 ? 1 : -1;
      const steps = Math.random() < 0.15 ? 2 : 1;
      moves.push({ face, direction, steps });
    }
    setIsSequenceRunning(true);
    setActiveSequenceType('shuffle');
    try {
      moveHistoryRef.current = [];
      const completed = await runMoveSequence(moves, { suppressUI: true });
      if (completed) {
        moveHistoryRef.current = moves
          .slice()
          .reverse()
          .map(({ face, direction, steps }) => ({
            face,
            direction: -direction,
            steps,
          }));
      }
    } finally {
      setActiveSequenceType(null);
      setIsSequenceRunning(false);
    }
  }, [scene, runMoveSequence, isSequenceRunning]);

  const solveCube = useCallback(async () => {
    if (isSequenceRunning || isRotatingRef.current) {
      return;
    }
    setIsSequenceRunning(true);
    setActiveSequenceType('solve');
    try {
      if (moveHistoryRef.current.length) {
        const solutionMoves = moveHistoryRef.current.slice();
        moveHistoryRef.current = [];
        await runMoveSequence(solutionMoves, { suppressUI: true });
      } else {
        resetCube();
      }
    } finally {
      setIsSequenceRunning(false);
      setActiveSequenceType(null);
    }
  }, [isSequenceRunning, runMoveSequence, resetCube]);

  const cancelCurrentSequence = useCallback(() => {
    if (sequenceCancelRef.current) {
      sequenceCancelRef.current();
    }
  }, []);

  const handleCubeClick = useCallback(
    (event) => {
      if (isSequenceRunning) {
        return;
      }
      const intersectedObjects = event.intersections;
      if (intersectedObjects.length > 0) {
        const cubie = intersectedObjects[0].object;
        const { coords } = cubie.userData;
        const face =
          coords.x === -1
            ? 'left'
            : coords.x === 1
            ? 'right'
            : coords.y === -1
            ? 'bottom'
            : coords.y === 1
            ? 'top'
            : coords.z === 1
            ? 'front'
            : 'back';

        selectLayer(face);
      }
    },
    [selectLayer, isSequenceRunning]
  );

  const handleRotation = useCallback(async () => {
    if (!selectedLayer || isSequenceRunning) {
      return;
    }
    const face = selectedLayer.face;
    const direction = rotationDirection;
    const steps = rotationSteps;

    const completed = await rotateFace(face, direction, steps);
    if (completed) {
      moveHistoryRef.current = [
        {
          face,
          direction: -direction,
          steps,
        },
        ...moveHistoryRef.current,
      ];
    }
  }, [
    selectedLayer,
    rotationDirection,
    rotationSteps,
    rotateFace,
    isSequenceRunning,
  ]);

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

  useEffect(() => {
    if (rotationSteps > 2) {
      setRotationSteps(2);
    }
  }, [rotationSteps]);

  const renderControlPanel = () => (
    <aside className="control-panel">
      <div className="control-header">
        <div className="control-title-group">
          <h2 className="control-title">Rubik&apos;s Cube</h2>
          <p className="control-subtitle">
            Tap a face or middle slice, then choose direction and quarter turns.
          </p>
        </div>
        <div className="quick-pill-group">
          <button
            type="button"
            className={`quick-pill ${
              isSequenceRunning && activeSequenceType === 'shuffle'
                ? 'quick-pill--stop'
                : ''
            }`}
            onClick={
              isSequenceRunning && activeSequenceType === 'shuffle'
                ? cancelCurrentSequence
                : shuffleCube
            }
            disabled={
              isSequenceRunning && activeSequenceType !== 'shuffle'
            }
          >
            {isSequenceRunning && activeSequenceType === 'shuffle'
              ? 'Stop'
              : 'Shuffle'}
          </button>
          <button
            type="button"
            className="quick-pill"
            onClick={solveCube}
            disabled={isRotating || isSequenceRunning}
          >
            Solve
          </button>
          <button
            type="button"
            className="quick-pill quick-pill--ghost"
            onClick={resetCube}
            disabled={isRotating || isSequenceRunning}
          >
            Reset
          </button>
        </div>
      </div>
      <div className="control-body">
        <div className="face-swimlane">
          <h3 className="swimlane-title">Faces</h3>
          <div className="swimlane-grid">
            {FACE_GROUPS[0].faces.map((face) => {
              const meta = FACE_META[face];
              if (!meta) {
                return null;
              }
              const isActive = selectedLayer?.face === face;
              return (
                <button
                  key={face}
                  type="button"
                  className={`chip-button ${isActive ? 'chip-button--active' : ''}`}
                  style={{
                    backgroundColor: meta.color,
                    color: meta.textColor || '#fff',
                  }}
                  onClick={() => selectLayer(face)}
                  disabled={isRotating || isSequenceRunning}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="face-swimlane">
          <h3 className="swimlane-title">Middle Layers</h3>
          <div className="swimlane-grid">
            {FACE_GROUPS[1].faces.map((face) => {
              const meta = FACE_META[face];
              if (!meta) {
                return null;
              }
              const isActive = selectedLayer?.face === face;
              return (
                <button
                  key={face}
                  type="button"
                  className={`chip-button chip-button--neutral ${isActive ? 'chip-button--active' : ''}`}
                  onClick={() => selectLayer(face)}
                  disabled={isRotating || isSequenceRunning}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="rotation-toolbar">
          <h3 className="swimlane-title">Rotate</h3>
          <div className="toolbar-row">
            <div className="toolbar-group">
              <span className="toolbar-caption">Direction</span>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segment ${rotationDirection === 1 ? 'segment--active' : ''}`}
                  onClick={() => setRotationDirection(1)}
                  disabled={isRotating || isSequenceRunning}
                >
                  CW
                </button>
                <button
                  type="button"
                  className={`segment ${rotationDirection === -1 ? 'segment--active' : ''}`}
                  onClick={() => setRotationDirection(-1)}
                  disabled={isRotating || isSequenceRunning}
                >
                  CCW
                </button>
              </div>
            </div>
            <div className="toolbar-group">
              <span className="toolbar-caption">Quarter turns</span>
              <div className="segmented-control">
                {[1, 2].map((step) => (
                  <button
                    key={step}
                    type="button"
                    className={`segment ${rotationSteps === step ? 'segment--active' : ''}`}
                    onClick={() => setRotationSteps(step)}
                    disabled={isRotating || isSequenceRunning}
                  >
                    {step}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleRotation}
              disabled={isRotating || isSequenceRunning || !selectedLayer}
              className={`rotate-button ${
                isRotating || isSequenceRunning ? 'rotate-button--busy' : ''
              }`}
            >
              <span className="rotate-button__icon" aria-hidden="true" />
              <span className="rotate-button__label">
                {isSequenceRunning
                  ? 'Sequence...'
                  : isRotating
                  ? 'Rotating...'
                  : 'Apply'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="cube-layout">
      {renderControlPanel()}
      <div className="canvas-area">
        <div ref={mountRef} className="rubiks-cube-container" />
      </div>
    </div>
  );
};

export default RubiksCube;
