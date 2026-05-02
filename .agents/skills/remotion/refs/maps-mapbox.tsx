// Mapbox map scene for Remotion.
// Install: npm i mapbox-gl @turf/turf @types/mapbox-gl
// Env: REMOTION_MAPBOX_TOKEN in .env
// Render flags: npx remotion render --gl=angle --concurrency=1

import { useEffect, useMemo, useRef, useState } from 'react';
import { AbsoluteFill, useDelayRender, useVideoConfig, interpolate, Easing, useCurrentFrame } from 'remotion';
import mapboxgl, { Map } from 'mapbox-gl';
import * as turf from '@turf/turf';

mapboxgl.accessToken = process.env.REMOTION_MAPBOX_TOKEN as string;

export const MapScene = () => {
    const ref = useRef<HTMLDivElement>(null);
    const { delayRender, continueRender } = useDelayRender();
    const { width, height, fps } = useVideoConfig();
    const frame = useCurrentFrame();
    const [handle] = useState(() => delayRender('Loading map...'));
    const [map, setMap] = useState<Map | null>(null);

    useEffect(() => {
        const _map = new Map({
            container: ref.current!,
            zoom: 11.53,
            center: [6.5615, 46.0598],
            pitch: 65,
            bearing: 0,
            style: 'mapbox://styles/mapbox/standard',
            interactive: false, // MUST be false — disable Mapbox self-animations
            fadeDuration: 0 // MUST be 0
        });

        _map.on('style.load', () => {
            // Hide all Mapbox Standard features for clean background
            const hideFeatures = [
                'showRoadsAndTransit',
                'showRoads',
                'showTransit',
                'showPedestrianRoads',
                'showRoadLabels',
                'showTransitLabels',
                'showPlaceLabels',
                'showPointOfInterestLabels',
                'showPointsOfInterest',
                'showAdminBoundaries',
                'showLandmarkIcons',
                'showLandmarkIconLabels',
                'show3dObjects',
                'show3dBuildings',
                'show3dTrees',
                'show3dLandmarks',
                'show3dFacades'
            ];
            for (const feature of hideFeatures) _map.setConfigProperty('basemap', feature, false);
            _map.setConfigProperty('basemap', 'colorTrunks', 'rgba(0, 0, 0, 0)');
        });

        _map.on('load', () => {
            continueRender(handle);
            setMap(_map);
        });
        // DO NOT add _map.remove() cleanup — causes rendering issues
    }, [handle]);

    // Animate camera from useCurrentFrame() — NOT useEffect with map.jumpTo per frame
    useEffect(() => {
        if (!map) return;
        // Example: animate bearing based on frame
        // map.jumpTo({ bearing: frame * 0.1 });
        // Call continueRender after camera settled: map.once('idle', () => continueRender(h))
    }, [map, frame]);

    const style: React.CSSProperties = useMemo(
        () => ({
            width,
            height,
            position: 'absolute'
        }),
        [width, height]
    );

    // Element with ref MUST have explicit width/height and position: "absolute"
    return <AbsoluteFill ref={ref} style={style} />;
};

// Key rules (do not remove):
// - interactive: false, fadeDuration: 0 — disable all Mapbox self-animations
// - Straight lines: linear interpolation between coordinates (NOT turf.lineSliceAlong — geodesic curves on Mercator)
// - Geodesic lines (flight paths): use turf.lineSliceAlong
// - Map labels: font-size >= 40px for 1920x1080 composition
// - text-offset: keep small, e.g. [0, 0.5] for circle-radius 40
// - Enable 3D: _map.setConfigProperty("basemap", "show3dObjects", true)
