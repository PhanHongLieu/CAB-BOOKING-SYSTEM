const { createRequire } = require('module');
const path = require('path');

function resolveDependency(packageName) {
  try {
    return require(packageName);
  } catch (rootErr) {
    try {
      const cwdRequire = createRequire(path.join(process.cwd(), 'package.json'));
      return cwdRequire(packageName);
    } catch (cwdErr) {
      throw rootErr;
    }
  }
}

module.exports = { resolveDependency };
