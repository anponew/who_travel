import type {NextConfig} from 'next';

const githubPages=process.env.GITHUB_PAGES==='true';
const config:NextConfig={
  devIndicators:false,
  ...(githubPages?{
    output:'export',
    basePath:'/who_travel',
    trailingSlash:true,
    images:{unoptimized:true},
  }:{}),
};
export default config;
