/**
 * Whether this browser can give MapLibre a WebGL context. MapLibre asks for
 * webgl2 and then webgl, and throws "Failed to initialize WebGL" when it gets
 * neither: older Androids, hardware acceleration turned off, some privacy
 * modes (QA TASK-003).
 */
export function supportsWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;
    // Hand the context back: browsers allow only a few at a time.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
