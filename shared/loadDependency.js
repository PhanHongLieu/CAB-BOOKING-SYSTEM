function loadDependency(name) {
  const searchPaths = [process.cwd(), __dirname];

  try {
    const resolvedPath = require.resolve(name, { paths: searchPaths });
    return require(resolvedPath);
  } catch (error) {
    error.message = `Cannot resolve dependency "${name}" from service cwd "${process.cwd()}". Install it in that service package.json. Original error: ${error.message}`;
    throw error;
  }
}

module.exports = loadDependency;
