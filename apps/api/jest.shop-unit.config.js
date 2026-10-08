const path = require('path')

module.exports = {
  displayName: 'api-shop-unit',
  testEnvironment: 'node',
  rootDir: path.join(__dirname, '../..'),
  testMatch: [
    '**/tests/shop/payment-safety.spec.ts',
    '**/tests/shop/payment-exception-review.spec.ts',
    '**/tests/shop/refund-recovery.spec.ts',
    '**/tests/shop/wechat-pay-adapter.spec.ts',
    '**/tests/shop/product-sku.spec.ts',
    '**/tests/shop/order-sku.spec.ts',
    '**/tests/shop/cart-dto.spec.ts',
    '**/tests/shop/cart-client-contract.spec.ts',
    '**/tests/shop/order-detail-client-contract.spec.ts',
    '**/tests/shop/response-serialization.spec.ts',
    '**/tests/shop/address-service.spec.ts',
  ],
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        target: 'ES2021',
        esModuleInterop: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        strict: true,
        skipLibCheck: true,
        types: ['jest', 'node'],
        baseUrl: path.join(__dirname, '../..'),
      },
    }],
  },
}
