# Paseo Cafe submission

Paseo Cafe accepts pull requests to [paseo-cafe/paseo-cafe](https://github.com/paseo-cafe/paseo-cafe). Its [submission guide](https://paseo.cafe/submit) describes the process.

Add the contents of [paseo-cafe-submission.json](paseo-cafe-submission.json) as `registry/paseo-feishu-ui.json` in a fork, then open a pull request. The filename must match this plugin's manifest ID. The category is `theme`; `macos` is the tested desktop platform. Native mobile color-only support and browser/desktop differences are stated in the caveats and README.

The community validates the public repository and manifest, then scans the repository's package version, README, MIT license and gallery images. Maintainers decide whether to merge. After merge and deployment, the generated listing appears at `https://paseo.cafe/plugins/paseo-feishu-ui`.

Suggested PR title: `Add paseo-feishu-ui theme plugin`

Suggested body:

> Adds a Feishu-inspired light/dark theme and desktop layout plugin for Paseo 0.8.x. Desktop/web support includes continuous response bubbles and thinking/tool previews; official iOS/Android support is limited to colors. The registry caveats state the DOM compatibility and platform limits. The repository contains an MIT license and clearly labeled fictional design references.

A public GitHub repository does not itself imply acceptance by Paseo Cafe. Subsequent releases should increment `package.json.version`; Cafe uses it as the update identity. Installed copies still need a plugin update operation.

## Ready-to-submit entry

[Create the prefilled registry file on GitHub](https://github.com/paseo-cafe/paseo-cafe/new/main?filename=registry%2Fpaseo-feishu-ui.json&value=%7B%0A++%22repo%22%3A+%22Laokashouji%2Fpaseo-feishu-ui%22%2C%0A++%22categories%22%3A+%5B%22theme%22%5D%2C%0A++%22platforms%22%3A+%5B%22macos%22%5D%2C%0A++%22caveats%22%3A+%5B%0A++++%22Requires+Paseo+0.8.x+on+both+the+app+and+daemon%3B+install+on+every+conversation+host+for+thinking+previews.%22%2C%0A++++%22Full+skin+uses+a+version-specific+desktop%2Fweb+DOM+adapter%3B+official+iOS+and+Android+receive+theme+colors+only.%22%2C%0A++++%22UI+labels+are+Chinese.+Windows+and+Linux+desktop+have+not+been+tested.%22%2C%0A++++%22Gallery+images+are+fictional+design+references%2C+not+app+screenshots.%22%0A++%5D%2C%0A++%22submittedBy%22%3A+%22Laokashouji%22%0A%7D%0A). GitHub will offer a fork and a pull request after you review the file.

Validation on 2026-09-14: the community's `scripts/validate-registry.ts` passed with live GitHub checks (`1 registry entry validated OK`). Validator source revision: `f5d390c50a9bc2dcae4250010b5551f76c866c60`. No upstream pull request has been opened.
