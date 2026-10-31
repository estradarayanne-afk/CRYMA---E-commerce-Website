import { useEffect, useRef, useState } from "react";
import { PackageCheck, Store, Truck } from "lucide-react";

const BADGES = [
    { id: "seller", label: "Local sellers", detail: "Real people, nearby", Icon: Store, anchor: [-2.18, 1.32, 0.16] },
    { id: "find", label: "Good finds", detail: "Picked from the marketplace", Icon: PackageCheck, anchor: [0.2, 2.2, 0.2] },
    { id: "delivery", label: "On its way", detail: "From shop to your door", Icon: Truck, anchor: [2.18, -1.3, 0.12] },
];

function makeFacet(THREE, points, color, z, options = {}) {
    const shape = new THREE.Shape();
    points.forEach(([x, y], index) => {
        if (index === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    });
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: options.depth ?? 0.14,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelSize: options.bevelSize ?? 0.025,
        bevelThickness: options.bevelThickness ?? 0.035,
        curveSegments: 1,
    });
    geometry.translate(0, 0, z);

    const material = new THREE.MeshPhysicalMaterial({
        color,
        roughness: options.roughness ?? 0.27,
        metalness: options.metalness ?? 0.16,
        clearcoat: 0.92,
        clearcoatRoughness: 0.19,
        envMapIntensity: 1.05,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function buildOrigamiMark(THREE) {
    const mark = new THREE.Group();
    // These facets redraw the diagonal folded gesture in CRYMA's logo as real, beveled meshes.
    const point = (x, y) => [(x - 340) / 100, (280 - y) / 100];
    const points = (coords) => coords.map(([x, y]) => point(x, y));
    const faces = [
        {
            color: "#64132f",
            z: -0.14,
            coords: [[91, 411], [285, 137], [602, 53], [423, 329], [551, 429], [260, 510]],
            depth: 0.22,
        },
        {
            color: "#b92750",
            z: 0.04,
            coords: [[91, 411], [285, 137], [290, 367]],
            depth: 0.13,
            metalness: 0.21,
        },
        {
            color: "#df5374",
            z: 0.09,
            coords: [[285, 137], [602, 53], [423, 329], [290, 367]],
            depth: 0.14,
            roughness: 0.23,
            metalness: 0.23,
        },
        {
            color: "#f3a1b4",
            z: 0.2,
            coords: [[285, 137], [446, 329], [602, 53]],
            depth: 0.1,
            roughness: 0.2,
            metalness: 0.12,
        },
        {
            color: "#871a3c",
            z: 0.11,
            coords: [[290, 367], [423, 329], [551, 429], [260, 510]],
            depth: 0.15,
            roughness: 0.29,
        },
    ];

    faces.forEach((face) => {
        mark.add(makeFacet(THREE, points(face.coords), face.color, face.z, face));
    });

    const creaseMaterial = new THREE.MeshStandardMaterial({
        color: "#ffe3e8",
        emissive: "#9f2949",
        emissiveIntensity: 0.23,
        roughness: 0.32,
        metalness: 0.24,
    });
    const creaseCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(...point(285, 137), 0.35),
        new THREE.Vector3(...point(290, 367), 0.35),
        new THREE.Vector3(...point(423, 329), 0.35),
        new THREE.Vector3(...point(602, 53), 0.35),
    ], false, "centripetal", 0.1);
    const crease = new THREE.Mesh(new THREE.TubeGeometry(creaseCurve, 32, 0.012, 5, false), creaseMaterial);
    crease.castShadow = true;
    mark.add(crease);

    return mark;
}

export default function HomeHeroScene() {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const badgesRef = useRef({});
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        const canvasHost = canvasRef.current;
        if (!container || !canvasHost) return undefined;

        let renderer;
        let camera;
        let scene;
        let mark;
        let rafId = 0;
        let resizeObserver;
        let environmentTarget;
        let disposed = false;
        let pointerHandler;
        let pointerLeaveHandler;
        let visibilityHandler;
        const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
        const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

        const mountScene = async () => {
            try {
                const [{ default: THREE }, { RoomEnvironment }] = await Promise.all([
                    import("three"),
                    import("three/addons/environments/RoomEnvironment.js"),
                ]);
                if (disposed) return;

                scene = new THREE.Scene();
                camera = new THREE.PerspectiveCamera(36, 1, 0.1, 70);
                camera.position.set(0, 0.18, 9.2);
                camera.lookAt(0, 0, 0);

                renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.45));
                renderer.outputColorSpace = THREE.SRGBColorSpace;
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                renderer.toneMappingExposure = 1.08;
                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                renderer.domElement.setAttribute("aria-hidden", "true");
                canvasHost.appendChild(renderer.domElement);

                const pmrem = new THREE.PMREMGenerator(renderer);
                const room = new RoomEnvironment();
                environmentTarget = pmrem.fromScene(room, 0.04);
                scene.environment = environmentTarget.texture;
                pmrem.dispose();
                room.traverse((object) => {
                    object.geometry?.dispose?.();
                    if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
                    else object.material?.dispose?.();
                });

                scene.add(new THREE.HemisphereLight("#fff0ee", "#311126", 1.75));
                const keyLight = new THREE.DirectionalLight("#fff1e6", 4.4);
                keyLight.position.set(-3.5, 5.4, 5);
                keyLight.castShadow = true;
                keyLight.shadow.mapSize.set(1536, 1536);
                keyLight.shadow.camera.left = -5;
                keyLight.shadow.camera.right = 5;
                keyLight.shadow.camera.top = 5;
                keyLight.shadow.camera.bottom = -5;
                keyLight.shadow.bias = -0.00018;
                keyLight.shadow.normalBias = 0.025;
                scene.add(keyLight);

                const roseLight = new THREE.PointLight("#ff7e9f", 25, 11, 2);
                roseLight.position.set(-3.2, 1.4, 3.2);
                scene.add(roseLight);
                const rimLight = new THREE.PointLight("#b69aff", 19, 10, 2);
                rimLight.position.set(3.5, 1.8, -1.7);
                scene.add(rimLight);

                mark = buildOrigamiMark(THREE);
                mark.scale.setScalar(0.91);
                scene.add(mark);

                const floor = new THREE.Mesh(
                    new THREE.PlaneGeometry(30, 30),
                    new THREE.ShadowMaterial({ color: "#1a0613", opacity: 0.42 }),
                );
                floor.rotation.x = -Math.PI / 2;
                floor.position.set(0, -2.17, 0);
                floor.receiveShadow = true;
                scene.add(floor);

                const badgePoints = BADGES.map((badge) => ({
                    ...badge,
                    point: new THREE.Vector3(...badge.anchor),
                }));

                const placeBadges = () => {
                    if (!renderer || !camera || !mark) return;
                    const width = container.clientWidth;
                    const height = container.clientHeight;
                    mark.updateMatrixWorld(true);
                    badgePoints.forEach((badge) => {
                        const element = badgesRef.current[badge.id];
                        if (!element) return;
                        const position = mark.localToWorld(badge.point.clone()).project(camera);
                        const visible = position.z > -1 && position.z < 1;
                        const badgeWidth = element.offsetWidth || 190;
                        const badgeHeight = element.offsetHeight || 58;
                        const left = Math.min(width - badgeWidth / 2 - 10, Math.max(badgeWidth / 2 + 10, (position.x * 0.5 + 0.5) * width));
                        const top = Math.min(height - badgeHeight / 2 - 10, Math.max(badgeHeight / 2 + 10, (-position.y * 0.5 + 0.5) * height));
                        element.style.left = `${left}px`;
                        element.style.top = `${top}px`;
                        element.style.setProperty("--badge-depth", `${Math.max(0, 1 - position.z) * 20}px`);
                        element.style.opacity = visible ? "1" : "0";
                    });
                };

                const resize = () => {
                    if (!renderer || !camera) return;
                    const width = Math.max(canvasHost.clientWidth, 1);
                    const height = Math.max(canvasHost.clientHeight, 1);
                    renderer.setSize(width, height, false);
                    camera.aspect = width / height;
                    camera.position.z = camera.aspect < 0.9 ? 10.6 : 9.2;
                    camera.updateProjectionMatrix();
                    renderer.render(scene, camera);
                    placeBadges();
                };
                resizeObserver = new ResizeObserver(resize);
                resizeObserver.observe(container);
                resize();

                if (reducedMotion) return;
                pointerHandler = (event) => {
                    const bounds = container.getBoundingClientRect();
                    pointer.targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
                    pointer.targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
                };
                pointerLeaveHandler = () => {
                    pointer.targetX = 0;
                    pointer.targetY = 0;
                };
                visibilityHandler = () => {
                    if (document.hidden) window.cancelAnimationFrame(rafId);
                    else animate();
                };
                container.addEventListener("pointermove", pointerHandler, { passive: true });
                container.addEventListener("pointerleave", pointerLeaveHandler, { passive: true });
                document.addEventListener("visibilitychange", visibilityHandler);

                const clock = new THREE.Clock();
                const animate = () => {
                    if (disposed || document.hidden) return;
                    rafId = window.requestAnimationFrame(animate);
                    const elapsed = clock.getElapsedTime();
                    pointer.x += (pointer.targetX - pointer.x) * 0.045;
                    pointer.y += (pointer.targetY - pointer.y) * 0.045;
                    mark.rotation.y = Math.sin(elapsed * 0.24) * 0.055 + pointer.x * 0.16;
                    mark.rotation.x = Math.cos(elapsed * 0.21) * 0.025 - pointer.y * 0.1;
                    mark.rotation.z = pointer.x * -0.025;
                    mark.position.y = Math.sin(elapsed * 0.55) * 0.035;
                    roseLight.position.x = -3.2 + pointer.x * 0.7;
                    rimLight.position.y = 1.8 - pointer.y * 0.4;
                    renderer.render(scene, camera);
                    placeBadges();
                };
                animate();
            } catch (error) {
                console.warn("The CRYMA 3D hero could not start.", error);
                renderer?.dispose();
                renderer?.domElement.remove();
                if (!disposed) setFailed(true);
            }
        };

        mountScene();
        return () => {
            disposed = true;
            window.cancelAnimationFrame(rafId);
            resizeObserver?.disconnect();
            if (pointerHandler) container.removeEventListener("pointermove", pointerHandler);
            if (pointerLeaveHandler) container.removeEventListener("pointerleave", pointerLeaveHandler);
            if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
            scene?.traverse((object) => {
                object.geometry?.dispose?.();
                if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
                else object.material?.dispose?.();
            });
            environmentTarget?.dispose?.();
            renderer?.dispose();
            renderer?.domElement.remove();
        };
    }, []);

    return (
        <div className={`buyer-hero-three-scene ${failed ? "is-fallback" : ""}`} ref={containerRef}>
            <div className="buyer-hero-three-canvas" ref={canvasRef} aria-hidden="true">
                {failed && (
                    <svg className="buyer-hero-three-fallback" viewBox="0 0 680 560" aria-hidden="true">
                        <path fill="#7f193a" d="m91 411 194-274 317-84-179 276 128 100-291 81-169-99Z" />
                        <path fill="#d7476b" d="m285 137 317-84-179 276-133 38-5-230Z" />
                        <path fill="#f3a1b4" d="m285 137 161 192L602 53l-317 84Z" />
                        <path fill="#4b102b" d="m290 367 133-38 128 100-291 81 30-143Z" />
                    </svg>
                )}
            </div>
            <span className="buyer-hero-three-kicker">THE CRYMA WAY <i /> SHOP · SELL · SEND</span>
            <div className="buyer-hero-three-badges" aria-label="CRYMA brings sellers, finds and delivery together">
                {BADGES.map(({ id, label, detail, Icon }) => (
                    <div
                        className={`buyer-hero-depth-badge buyer-hero-depth-badge-${id}`}
                        key={id}
                        ref={(element) => { badgesRef.current[id] = element; }}
                    >
                        <span className="buyer-hero-depth-badge-inner">
                            <span className="buyer-hero-depth-icon"><Icon size={16} strokeWidth={1.8} /></span>
                            <span className="buyer-hero-depth-copy"><b>{label}</b><small>{detail}</small></span>
                        </span>
                    </div>
                ))}
            </div>
            <div className="buyer-hero-three-footer"><span>MADE BY MANY.</span><span>FOUND ON CRYMA.</span></div>
        </div>
    );
}
