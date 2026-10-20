import createMDX from "@next/mdx";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  // Lets more than one dev server run from this repo (e.g. 3000 and 3005)
  // without sharing a build directory. Builds and `next start` stay on
  // `.next`, because the variable is unset for them.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

const withMDX = createMDX({
  options: {
    // We render plain JSX from MDX, so skip the @mdx-js/react provider. The
    // provider uses createContext and cannot run in a server component.
    providerImportSource: null,
  },
});

export default withMDX(nextConfig);
