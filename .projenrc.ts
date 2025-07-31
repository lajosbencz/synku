import { NodePackageManager, NpmAccess } from 'projen/lib/javascript';
import { TypeScriptProject } from 'projen/lib/typescript';

const project = new TypeScriptProject({
  name: 'synku',
  description: 'SYNthesize KUbernetes manifests',
  authorName: 'Lajos Bencz',
  license: 'MIT',
  copyrightOwner: 'Lajos Bencz',
  bugsUrl: 'https://github.com/lajosbencz/synku/issues',
  defaultReleaseBranch: 'master',
  majorVersion: 0,
  prerelease: 'beta',
  projenrcTs: true,
  packageManager: NodePackageManager.YARN_CLASSIC,

  entrypoint: 'lib/index.js',
  bin: {
    synku: 'lib/bin/main.js',
  },

  deps: [
    'kubernetes-models@^4.5.0',
    'yaml@^2.8.0',
    'tsx@^4.20.3',
  ],
  devDeps: [],

  releaseToNpm: true,
  npmRegistryUrl: 'https://registry.npmjs.org/',
  npmAccess: NpmAccess.PUBLIC,
  npmTokenSecret: 'NPM_TOKEN',
});

project.synth();
