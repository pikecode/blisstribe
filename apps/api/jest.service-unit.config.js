const config = require('./jest.shop-unit.config')
module.exports = { ...config, displayName: 'api-service-unit', testMatch: ['**/tests/service-program/*.spec.ts'] }
