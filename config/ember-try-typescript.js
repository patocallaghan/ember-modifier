module.exports = {
  useYarn: true,
  scenarios: [
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
