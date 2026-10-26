"use client";

import { Component, type ReactNode } from "react";

interface MapErrorBoundaryProps {
  children: ReactNode;
  /** Shown instead of the map once it has failed. */
  fallback?: ReactNode;
  /** Called once when the map fails. */
  onError?: () => void;
}

/**
 * Keeps a map that throws while mounting (MapLibre: "Failed to initialize
 * WebGL", among others) from taking the page down with it. Without a
 * boundary, Next.js replaces the whole page with "Application error".
 */
export class MapErrorBoundary extends Component<
  MapErrorBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    return this.state.failed
      ? (this.props.fallback ?? null)
      : this.props.children;
  }
}
