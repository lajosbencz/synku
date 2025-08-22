import { NodePackageManager, NpmAccess } from 'projen/lib/javascript';
import { TypeScriptProject } from 'projen/lib/typescript';

const project = new TypeScriptProject({
  name: 'synku',
  description: 'SYNthesize KUbernetes manifests',
  authorName: 'Lajos Bencz',
  license: 'MIT',
  copyrightOwner: 'Lajos Bencz',
  repository: 'https://github.com/lajosbencz/synku',
  bugsUrl: 'https://github.com/lajosbencz/synku/issues',
  defaultReleaseBranch: 'master',
  majorVersion: 0,
  // prerelease: 'beta',
  projenrcTs: true,
  packageManager: NodePackageManager.YARN_CLASSIC,

  entrypoint: 'lib/index.js',
  bin: {
    synku: 'lib/bin/main.js',
  },
  devDeps: [
    'kubernetes-models@^4.5.0',
  ],
  deps: [
    'yaml@^2.8.1',
    'tsx@^4.20.3',
    'commander@^14.0.0',
  ],
  peerDeps: [
    'kubernetes-models@^4.5.0',
  ],

  gitIgnoreOptions: {
    ignorePatterns: [
      '.synku-temp*',
    ],
  },

  releaseToNpm: true,
  npmRegistryUrl: 'https://registry.npmjs.org/',
  npmAccess: NpmAccess.PUBLIC,
  npmTokenSecret: 'NPM_TOKEN',
  npmIgnoreOptions: {
    ignorePatterns: [
      '/docs/',
      '/examples/',
      '.synku-temp*',
    ],
  },
});

project.synth();
