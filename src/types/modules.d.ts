// world-atlas ships TopoJSON data files without type declarations.
declare module "world-atlas/countries-110m.json" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topology: any;
  export default topology;
}
