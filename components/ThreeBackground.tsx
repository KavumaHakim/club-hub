
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeBackground: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Scene Setup
        const scene = new THREE.Scene();
        // Slight fog for depth, color matching the dark bg
        scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        containerRef.current.appendChild(renderer.domElement);

        // Objects Group
        const group = new THREE.Group();
        scene.add(group);

        // 1. Outer Wireframe Sphere (The "Network")
        const geometry = new THREE.IcosahedronGeometry(2.5, 1);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xec4899, // Pink-500
            wireframe: true,
            transparent: true,
            opacity: 0.3 
        });
        const sphere = new THREE.Mesh(geometry, material);
        group.add(sphere);

        // 2. Inner Core (The "Hub")
        const coreGeometry = new THREE.OctahedronGeometry(1, 0);
        const coreMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x8b5cf6, // Purple-500
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        group.add(core);

        // 3. Particles (The "Data")
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 700;
        const posArray = new Float32Array(particlesCount * 3);

        for(let i = 0; i < particlesCount * 3; i++) {
            // Spread particles wide
            posArray[i] = (Math.random() - 0.5) * 20; 
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.02,
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
        });
        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particlesMesh);

        // Mouse Interaction
        let mouseX = 0;
        let mouseY = 0;
        let targetX = 0;
        let targetY = 0;

        const windowHalfX = window.innerWidth / 2;
        const windowHalfY = window.innerHeight / 2;

        const onDocumentMouseMove = (event: MouseEvent) => {
            mouseX = (event.clientX - windowHalfX);
            mouseY = (event.clientY - windowHalfY);
        };

        document.addEventListener('mousemove', onDocumentMouseMove);

        // Animation Loop
        const clock = new THREE.Clock();

        const animate = () => {
            requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();

            targetX = mouseX * 0.001;
            targetY = mouseY * 0.001;

            // Rotate Main Group
            sphere.rotation.y += 0.002;
            sphere.rotation.x += 0.001;

            // Rotate Core Faster
            core.rotation.y -= 0.005;
            core.rotation.z += 0.005;
            
            // Pulse Core
            const scale = 1 + Math.sin(elapsedTime * 2) * 0.1;
            core.scale.set(scale, scale, scale);

            // Gentle Particle Float
            particlesMesh.rotation.y = elapsedTime * 0.05;
            particlesMesh.rotation.x = mouseY * 0.00005;

            // Smooth Camera Movement (Parallax)
            group.rotation.y += 0.05 * (targetX - group.rotation.y);
            group.rotation.x += 0.05 * (targetY - group.rotation.x);

            renderer.render(scene, camera);
        };

        animate();

        // Handle Resize
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            document.removeEventListener('mousemove', onDocumentMouseMove);
            window.removeEventListener('resize', handleResize);
            if (containerRef.current) {
                containerRef.current.removeChild(renderer.domElement);
            }
            // Dispose geometry/materials to prevent leaks
            geometry.dispose();
            material.dispose();
            coreGeometry.dispose();
            coreMaterial.dispose();
            particlesGeometry.dispose();
            particlesMaterial.dispose();
        };
    }, []);

    return (
        <div 
            ref={containerRef} 
            className="absolute inset-0 z-0 pointer-events-none opacity-60 dark:opacity-80"
            style={{ overflow: 'hidden' }}
        />
    );
};

export default ThreeBackground;
