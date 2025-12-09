
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeBackground: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const disposablesRef = useRef<any[]>([]);
    const animationFrameIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 6;
        
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        const existingCanvas = containerRef.current.querySelector('canvas');
        if (existingCanvas) {
            containerRef.current.removeChild(existingCanvas);
        }
        containerRef.current.appendChild(renderer.domElement);
        
        let currentSceneUpdater: ((elapsedTime: number) => void) | null = null;
        const newDisposables: any[] = [];
        
        const mousePos = { x: 0, y: 0 };
        const targetPos = { x: 0, y: 0 };
        const windowHalfX = window.innerWidth / 2;
        const windowHalfY = window.innerHeight / 2;
        
        const onDocumentMouseMove = (event: MouseEvent) => {
            mousePos.x = (event.clientX - windowHalfX);
            mousePos.y = (event.clientY - windowHalfY);
        };
        document.addEventListener('mousemove', onDocumentMouseMove);
        
        // --- Themed Circuit Sphere Logic ---
        scene.fog = new THREE.FogExp2(0x110520, 0.1); // Dark purple fog
        const ambientLight = new THREE.AmbientLight(0xec4899, 0.2); // Pink ambient light
        scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x8b5cf6, 2, 100); // Purple point light
        scene.add(pointLight);
        
        const group = new THREE.Group();
        scene.add(group);

        const circuitGeometry = new THREE.SphereGeometry(3, 32, 32);
        const circuitMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8b5cf6, // Purple wireframe
            emissive: 0x8b5cf6, // Purple glow
            emissiveIntensity: 0.2, 
            wireframe: true 
        });
        const circuitSphere = new THREE.Mesh(circuitGeometry, circuitMaterial);
        group.add(circuitSphere);

        const points: THREE.Mesh[] = [];
        const pointGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        for(let i = 0; i < 50; i++) {
            const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xec4899 }); // Pink points
            const point = new THREE.Mesh(pointGeometry, pointMaterial);
            
            point.position.setFromSphericalCoords(3.01, Math.random() * Math.PI, Math.random() * 2 * Math.PI);
            point.userData.lifetime = Math.random() * 10;
            point.userData.velocity = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(0.02);
            
            group.add(point);
            points.push(point);
            newDisposables.push(pointMaterial);
        }
        newDisposables.push(circuitGeometry, circuitMaterial, pointGeometry);

        currentSceneUpdater = (elapsedTime) => {
            targetPos.x = mousePos.x * 0.001;
            targetPos.y = mousePos.y * 0.001;
            circuitSphere.rotation.y += 0.001;
            circuitSphere.rotation.x += 0.0005;
            
            points.forEach(p => {
                p.position.add(p.userData.velocity);
                p.userData.lifetime -= 0.05;

                if (p.userData.lifetime <= 0) {
                    p.position.setFromSphericalCoords(3.01, Math.random() * Math.PI, Math.random() * 2 * Math.PI);
                    p.userData.lifetime = Math.random() * 10;
                }

                p.position.setLength(3.01);
            });

            group.rotation.y += 0.05 * (targetPos.x - group.rotation.y);
            group.rotation.x += 0.05 * (targetPos.y - group.rotation.x);
            pointLight.position.x = Math.sin(elapsedTime * 0.5) * 4;
            pointLight.position.z = Math.cos(elapsedTime * 0.2) * 4;
        };
        // --- End of Scene Logic ---
        
        disposablesRef.current = newDisposables;
        const clock = new THREE.Clock();

        const animate = () => {
            animationFrameIdRef.current = requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();
            if(currentSceneUpdater) currentSceneUpdater(elapsedTime);
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
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
            document.removeEventListener('mousemove', onDocumentMouseMove);
            window.removeEventListener('resize', handleResize);
            
            disposablesRef.current.forEach(item => item.dispose());
            disposablesRef.current = [];
            
            while(scene.children.length > 0){ 
                const child = scene.children[0];
                scene.remove(child);
            }
            renderer.dispose();
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
