# SurePath img2threejs proof of concept

## Status
- Isolated prototype file: `public/img2threejs-poc.html`
- Intended target: validate a lightweight, touch-friendly Three.js viewer before adding 3D content to customer/agent workflows.
- This is **not production integration** and must not be represented as an img2threejs-generated asset. The current vehicle is procedural placeholder geometry.

## Why isolated
The upstream `img2threejs` repository is a code-generation/reconstruction workflow that emits TypeScript factories returning `THREE.Group`; it is not itself a browser runtime component. Keep its Python authoring pipeline out of the production request path. The generated model should be committed as reviewed TypeScript, then imported by a lazily loaded React viewer.

## POC test checklist
1. Open `/img2threejs-poc.html` in a browser with network access.
2. Confirm status reads “Viewer aktif · WebGL berhasil diinisialisasi”.
3. Drag to orbit, use wheel/trackpad to zoom, use Reset view and Auto-rotate.
4. Test on a narrow mobile viewport and on a device with reduced-motion preference.
5. Inspect browser console and network panel for WebGL/CDN failures.
6. Verify production build and PWA caching before promoting this into any portal.

## Current limitations / gates before integration
- Three.js is loaded from jsDelivr only in this isolated POC; it is not added to the app bundle or its dependency lockfile.
- The prototype has no access to policy/customer data and is not wired into any authenticated route.
- CDN and WebGL availability have not been verified in a real deployment in this change.
- No generated img2threejs model is included yet. Run the upstream image-to-code workflow against a licensed vehicle reference, inspect the generated code and visual comparison evidence, and then replace the placeholder geometry.
- Keep the viewer lazy-loaded and behind a feature flag or isolated route until bundle size, mobile performance, accessibility, and PWA behavior pass.

## Decision gate
Integrate into customer/agent UI only after the model is generated and visually reviewed, the local build/lint/tests pass, mobile performance is acceptable, and a preview deployment is reachable. Do not merge to `main` or claim production deployment based on this scaffold alone.
