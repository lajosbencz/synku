import { TextFile } from 'projen';
import { JobPermission } from 'projen/lib/github/workflows-model';
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
  docgen: true,

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
    'recursive-diff@^1.0.9',
  ],
  peerDeps: [
    'kubernetes-models@^4.5.0',
  ],

  gitIgnoreOptions: {
    ignorePatterns: [
      'docs/',
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

const wf = project.github!.addWorkflow('docs');
wf.on({
  push: { branches: ['master'] },
  workflowDispatch: {},
});

wf.addJobs({
  publish: {
    runsOn: ['ubuntu-latest'],
    permissions: {
      pages: JobPermission.WRITE,
      idToken: JobPermission.WRITE,
    },
    steps: [
      { uses: 'actions/checkout@v4' },
      { uses: 'actions/setup-node@v4', with: { 'node-version': 'lts/*' } },
      { run: 'yarn install --frozen-lockfile' },
      { run: 'yarn docgen' },
      {
        uses: 'actions/upload-pages-artifact@v3',
        with: {
          path: './docs',
        },
      },
      {
        uses: 'actions/deploy-pages@v4',
      },
    ],
  },
});

new TextFile(project, 'CONTRIBUTING.md', {
  lines: [
    '# Contributing',
    '',
    'Contributions are appreciated,',
    'but keep in mind that this project aims to be a minimalistic tool,',
    'and thus requests around extending the default suite of Behaviors and Components might be rejected.',
    'Please consider creating an auxilliary package for those cases.',
    '',
    'To contribute, follow these steps:',
    '',
    '1.  **Fork the repository** on GitHub.',
    '2.  **Clone your fork** to your local machine.',
    '3.  **Create a new branch** for your changes, with descriptive names like `feature/behaviors` or `fix/helm-chart-resolution`.',
    '4.  **Make your changes**, ensuring that your code follows the style guidelines.',
    '5.  **Commit your changes** with a clear and concise commit message.',
    '6.  **Push your changes** to your fork on GitHub.',
    '7.  **Open a pull request** from your fork to the `master` branch of this repository.',
  ],
});

project.synth();
