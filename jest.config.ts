import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  verbose: true,
  testPathIgnorePatterns: ['node_modules', 'lib', 'dist'],
  moduleNameMapper: {
    '@splootcode/(.*)': '<rootDir>/packages/$1',
    '\\.(css|less)$': 'identity-obj-proxy',
  },
}
export default config