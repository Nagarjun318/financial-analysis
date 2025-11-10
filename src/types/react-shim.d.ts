// Temporary shim to unblock TypeScript JSX errors until @types/react is installed locally.
// Remove this file after running `npm install` which brings proper React type declarations.
declare module 'react' {
  export = React;
  const React: any;
}
declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}
// Allow any intrinsic elements to suppress JSX errors in strict bootstrap phase.
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}