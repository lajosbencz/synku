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

const wf = project.github!.addWorkflow("docs");
wf.on({
  push: { branches: ["main"] },
  workflowDispatch: {},
});

wf.addJobs({
  publish: {
    permissions: {
      contents: JobPermission.WRITE,
    },
    runsOn: ["ubuntu-latest"],
    steps: [
      { uses: "actions/checkout@v4" },
      { uses: "actions/setup-node@v4", with: { "node-version": "lts/*" } },
      { run: "yarn install --frozen-lockfile" },
      { run: "yarn docgen" },
      {
        uses: "peaceiris/actions-gh-pages@v4",
        with: {
          github_token: "${{ secrets.GITHUB_TOKEN }}",
          publish_dir: "./docs",
        },
      },
    ],
  },
});

project.synth();
