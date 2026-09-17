const { parseProjectEnv } = require('@expo/env');
const { assertPublicEnvironment } = require('./scripts/public-env-guard.cjs');

// EAS, Expo start y Expo export evalúan esta configuración antes de generar bundles.
assertPublicEnvironment({ ...parseProjectEnv(__dirname, { silent: true }).env, ...process.env });
module.exports = require('./app.json').expo;
