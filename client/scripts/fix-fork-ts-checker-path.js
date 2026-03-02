const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'fork-ts-checker-webpack-plugin',
  'lib',
  'typescript-reporter',
  'reporter',
  'TypeScriptConfigurationParser.js'
);

if (!fs.existsSync(target)) {
  process.exit(0);
}

const source = fs.readFileSync(target, 'utf8');

if (source.includes('const normalizedConfigFileName = configFileName.replace(/\\\\/g, \'/\');')) {
  process.exit(0);
}

const needle = 'const parsedConfigFileJSON = typescript.readConfigFile(configFileName, parseConfigFileHost.readFile);';

if (!source.includes(needle)) {
  process.exit(0);
}

const replacement = [
  "const normalizedConfigFileName = configFileName.replace(/\\\\/g, '/');",
  "const parsedConfigFileJSON = typescript.readConfigFile(normalizedConfigFileName, parseConfigFileHost.readFile);"
].join('\n    ');

const updated = source.replace(needle, replacement);
fs.writeFileSync(target, updated, 'utf8');
