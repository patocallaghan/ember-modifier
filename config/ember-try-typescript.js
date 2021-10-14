module.exports = {
  useYarn: true,
  scenarios: [
    {
      command: 'tsc --noEmit --project type-tests/tsconfig-3.6.json',
      name: 'typescript-3.6',
      npm: {
        typescript: '~3.6',
      },
    },
    {
      command: 'tsc --noEmit --project type-tests/tsconfig-3.7.json',
      name: 'typescript-3.7',
      npm: {
        typescript: '~3.7',
      },
    },
    {
      command: 'tsc --noEmit --project type-tests/tsconfig-3.8.json',
      name: 'typescript-3.8',
      npm: {
        typescript: '~3.8',
      },
    },
    {
      command: 'tsc --noEmit --project type-tests/tsconfig-3.9.json',
      name: 'typescript-3.9',
      npm: {
        typescript: '~3.9',
      },
    },
    {
      command: 'tsc --noEmit --project type-tests/tsconfig-4.0.json',
      name: 'typescript-4.0',
      npm: {
        typescript: '~4.0',
      },
    },
    {
      command: 'tsc --noEmit --project type-tests/tsconfig-4.1.json',
      name: 'typescript-4.1',
      npm: {
        typescript: '~4.1',
      },
    },
    {
      command: 'tsc --noEmit --project type-tests/tsconfig-4.2.json',
      name: 'typescript-4.2',
      npm: {
        typescript: '~4.2',
      },
    },
    {
      command: 'tsc --noEmit --project type-tests/tsconfig-4.3.json',
      name: 'typescript-4.3',
      npm: {
        typescript: '~4.3',
      },
    },
    {
      command: 'tsc --noEmit --project type-tests/tsconfig-4.4.json',
      name: 'typescript-4.4',
      npm: {
        typescript: '~4.4',
      },
    },
    {
      command: 'tsc --noEmit --project type-tests/tsconfig-next.json',
      name: 'typescript-next',
      allowedToFail: true,
      npm: {
        devDependencies: {
          typescript: 'next',
        },
      },
    },
  ],
};
