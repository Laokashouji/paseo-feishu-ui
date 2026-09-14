# Paseo Cafe submission

Paseo Cafe accepts pull requests to [paseo-cafe/paseo-cafe](https://github.com/paseo-cafe/paseo-cafe). Its [submission guide](https://paseo.cafe/submit) describes the process.

Add the contents of [paseo-cafe-submission.json](paseo-cafe-submission.json) as `registry/paseo-feishu-ui.json` in a fork, then open a pull request. The filename must match this plugin's manifest ID. The category is `theme`; `macos` is the tested desktop platform. Native mobile color-only support and browser/desktop differences are stated in the caveats and README.

The community validates the public repository and manifest, then scans the repository's package version, README, MIT license and gallery images. Maintainers decide whether to merge. After merge and deployment, the generated listing appears at `https://paseo.cafe/plugins/paseo-feishu-ui`.

Suggested PR title: `Add paseo-feishu-ui theme plugin`

Suggested body:

> Adds a Feishu-inspired light/dark theme and desktop layout plugin for Paseo 0.8.x. Desktop/web support includes continuous response bubbles and thinking/tool previews; official iOS/Android support is limited to colors. The registry caveats state the DOM compatibility and platform limits. The repository contains an MIT license and clearly labeled fictional design references.

A public GitHub repository does not itself imply acceptance by Paseo Cafe. Subsequent releases should increment `package.json.version`; Cafe uses it as the update identity. Installed copies still need a plugin update operation.
