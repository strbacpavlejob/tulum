declare module "react-dom/client" {
  import { ReactNode } from "react";

  interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }

  function createRoot(container: Element | DocumentFragment): Root;
  function hydrateRoot(
    container: Element | Document,
    initialChildren: ReactNode,
  ): Root;
}
