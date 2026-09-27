# Changelog

All notable changes to the `@magmacomputing/tempo-plugin-spatial` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-27

### Added
- **GIS & Spatial Navigation Plugin (`@magmacomputing/tempo-plugin-spatial`)**:
  - `Tempo.spatial` Deep-Frozen Static Namespace:
    - `distance(from, to, unit?)`: Great-Circle spherical distance calculation in `km`, `miles`, or `m` (Haversine formula).
    - `bearing(from, to, options?)`: Initial forward azimuth compass bearing (0° to 360° True North).
    - `midpoint(from, to)`: Great-Circle geographic midpoint with automatic hemisphere inference.
    - `velocity(from, to, options?)`: Transit travel velocity between timestamped instances or coordinate objects in `km/h`, `mph`, or `m/s`.
    - `isImpossibleTravel(from, to, options?)`: Physical travel feasibility evaluation against commercial aviation thresholds (default: 900 km/h) for cybersecurity anomaly detection.
    - `isWithin(from, to, maxDistance, unit?)`: Radial proximity query evaluating whether coordinates are within a specified distance.
    - `inBoundingBox(coords, bbox)`: Spatial containment query testing containment within rectangular bounding boxes (with antimeridian 180° wrap support).
    - `solarOffset(coords, options?)`: Natural solar time offset between civil clock time and actual solar noon.
  - Fluent `Tempo` OOP Instance Methods:
    - `t.spatialDistance(to, unit?)`: Computes distance from current instance coordinates to target coordinates.
    - `t.spatialBearing(to, options?)`: Computes compass bearing from current instance coordinates to target coordinates.
    - `t.spatialVelocity(to, options?)`: Computes travel speed from current instance to target timestamped instance.
    - `t.spatialSolarOffset(options?)`: Calculates solar time offset for current instance coordinates.
    - `t.isWithin(to, maxDistance, unit?)`: Evaluates if current instance is within proximity radius of target coordinates.
    - `t.inBoundingBox(bbox)`: Evaluates if current instance coordinates fall within bounding box.
  - Side-Effect Auto-Installation Subpath:
    - Dedicated `@magmacomputing/tempo-plugin-spatial/install` subpath for one-line side-effect installation (`import '@magmacomputing/tempo-plugin-spatial/install'`).
