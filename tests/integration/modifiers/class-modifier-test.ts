import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import type { TestContext as BaseContext } from '@ember/test-helpers';
import Service, { inject as service } from '@ember/service';
import { hbs } from 'ember-cli-htmlbars';
import Modifier, { ArgsFor } from 'ember-modifier';
import ClassBasedModifier from 'ember-modifier';
import {
  DefaultSignature,
  NamedArgs,
  PositionalArgs,
} from 'ember-modifier/-private/signature';
import { tracked } from '@glimmer/tracking';

// `any` required for the inference to work correctly here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConstructorFor<C> = new (...args: any[]) => C;

type Factory = (
  callback: (hookName: string, instance: ClassBasedModifier) => void
) => ConstructorFor<ClassBasedModifier>;

interface HookSetup {
  name: string;
  insert: boolean;
  update: boolean;
  destroy: boolean;
  element: boolean;
  factory: Factory;
}

interface Context extends BaseContext {
  instance: null | ClassBasedModifier;
  assertCalled(
    shouldCall: boolean,
    assertion: () => void | Promise<void>
  ): Promise<void>;
  hook(assertions: (instance: ClassBasedModifier) => void): void;
}

function testLifecycleHook({
  name,
  insert,
  update,
  destroy,
  element,
  factory,
}: HookSetup): void {
  module(`\`${name}\` hook`, function (hooks) {
    hooks.beforeEach(function (this: Context, assert) {
      this.instance = null;

      let called = (): void => {
        assert.ok(false, `\`${name}\` hook was called unexpectedly`);
      };

      this.hook = (assertions) => {
        const callback = (
          hookName: string,
          instance: ClassBasedModifier
        ): void => {
          this.instance = instance;

          if (hookName === name) {
            called();

            assert.strictEqual(
              instance.isDestroying,
              name === 'willDestroy',
              'isDestroying'
            );
            assert.strictEqual(instance.isDestroyed, false, 'isDestroyed');

            assertions(instance);
          }
        };

        this.owner.register('modifier:songbird', factory(callback));
      };

      this.assertCalled = async (shouldCall, callback) => {
        let count = 0;
        const _called = called;

        if (shouldCall) {
          called = () => count++;
        }

        try {
          await callback();
        } finally {
          if (shouldCall) {
            assert.equal(
              count,
              1,
              `Expected \`${name}\` hook to be called exactly once`
            );
          }

          called = _called;
        }
      };
    });

    hooks.afterEach(async function (this: Context, assert) {
      await settled();

      assert.strictEqual(this.instance?.isDestroying, true, 'isDestroying');
      assert.strictEqual(this.instance?.isDestroyed, true, 'isDestroyed');
    });

    if (element) {
      test('it has access to the DOM element', async function (this: Context, assert) {
        this.hook((instance) => {
          assert.equal(instance.element.tagName, 'H1', 'this.element.tagName');
          assert.equal(instance.element.id, 'expected', 'this.element.id');
        });

        assert.step('no-op render');

        await this.assertCalled(false, async () => {
          this.setProperties({
            isShowing: false,
            foo: 'foo',
          });

          await render(hbs`
            {{#if this.isShowing}}
              <h1 id="expected" {{songbird this.foo}}>Hello</h1>
            {{/if}}
          `);
        });

        assert.step('insert');

        await this.assertCalled(insert, () => {
          this.set('isShowing', true);
        });

        assert.step('update');

        await this.assertCalled(update, () => {
          this.set('foo', 'FOO');
        });

        assert.step('destroy');

        await this.assertCalled(destroy, () => {
          this.set('isShowing', false);
        });

        assert.verifySteps(['no-op render', 'insert', 'update', 'destroy']);
      });
    } else {
      test('it does not have access to the DOM element', async function (this: Context, assert) {
        this.hook((instance) => {
          assert.strictEqual(instance.element, null, 'this.element');
        });

        assert.step('no-op render');

        await this.assertCalled(false, async () => {
          this.setProperties({
            isShowing: false,
            foo: 'foo',
          });

          await render(hbs`
            {{#if this.isShowing}}
              <h1 id="expected" {{songbird this.foo}}>Hello</h1>
            {{/if}}
          `);
        });

        assert.step('insert');

        await this.assertCalled(insert, () => {
          this.set('isShowing', true);
        });

        assert.step('update');

        await this.assertCalled(update, () => {
          this.set('foo', 'FOO');
        });

        assert.step('destroy');

        await this.assertCalled(destroy, () => {
          this.set('isShowing', false);
        });

        assert.verifySteps(['no-op render', 'insert', 'update', 'destroy']);
      });
    }

    test('has access to positional arguments', async function (this: Context, assert) {
      let expected: string[];

      this.hook((instance) => {
        assert.deepEqual(
          instance.args.positional,
          expected,
          'this.args.positional'
        );
      });

      assert.step('no-op render');

      await this.assertCalled(false, async () => {
        this.setProperties({
          isShowing: false,
          foo: 'foo',
          bar: 'bar',
        });

        await render(hbs`
          {{#if this.isShowing}}
            <h1 id="expected" {{songbird this.foo this.bar}}>Hello</h1>
          {{/if}}
        `);
      });

      assert.step('insert');
      expected = ['foo', 'bar'];

      await this.assertCalled(insert, () => {
        this.set('isShowing', true);
      });

      assert.step('update 1');
      expected = ['FOO', 'bar'];

      await this.assertCalled(update, () => {
        this.set('foo', 'FOO');
      });

      assert.step('update 2');
      expected = ['FOO', 'BAR'];

      await this.assertCalled(update, () => {
        this.set('bar', 'BAR');
      });

      assert.step('destroy');

      await this.assertCalled(destroy, () => {
        this.set('isShowing', false);
      });

      assert.verifySteps([
        'no-op render',
        'insert',
        'update 1',
        'update 2',
        'destroy',
      ]);
    });

    test('has access to named arguments', async function (this: Context, assert) {
      let expected: Record<string, string>;

      this.hook((instance) => {
        assert.deepEqual(
          { ...instance.args.named },
          expected,
          'this.args.named'
        );
      });

      assert.step('no-op render');

      await this.assertCalled(false, async () => {
        this.setProperties({
          isShowing: false,
          foo: 'foo',
          bar: 'bar',
        });

        await render(hbs`
          {{#if this.isShowing}}
            <h1 id="expected" {{songbird foo=this.foo bar=this.bar}}>Hello</h1>
          {{/if}}
        `);
      });

      assert.step('insert');
      expected = { foo: 'foo', bar: 'bar' };

      await this.assertCalled(insert, () => {
        this.set('isShowing', true);
      });

      assert.step('update 1');
      expected = { foo: 'FOO', bar: 'bar' };

      await this.assertCalled(update, () => {
        this.set('foo', 'FOO');
      });

      assert.step('update 2');
      expected = { foo: 'FOO', bar: 'BAR' };

      await this.assertCalled(update, () => {
        this.set('bar', 'BAR');
      });

      assert.step('destroy');

      await this.assertCalled(destroy, () => {
        this.set('isShowing', false);
      });

      assert.verifySteps([
        'no-op render',
        'insert',
        'update 1',
        'update 2',
        'destroy',
      ]);
    });
  });
}

function testHooksOrdering(factory: Factory): void {
  module('hooks ordering', function () {
    test('hooks are fired in the right order', async function (assert) {
      let actualHooks: undefined | string[];

      const callback = (name: string): void => {
        if (actualHooks) {
          actualHooks.push(name);
        } else {
          assert.ok(false, `\`${name}\` hook was called unexpectedly`);
        }
      };

      async function assertHooks(
        expectedHooks: string[],
        callback: () => void | Promise<void>
      ): Promise<void> {
        actualHooks = [];

        try {
          await callback();
        } finally {
          assert.deepEqual(actualHooks, expectedHooks, 'hooks');
          actualHooks = undefined;
        }
      }

      this.owner.register('modifier:songbird', factory(callback));

      assert.step('no-op render');

      await assertHooks([], async () => {
        this.setProperties({
          isShowing: false,
          foo: 'foo',
          bar: 'bar',
        });

        await render(hbs`
          {{#if this.isShowing}}
            <h1 id="expected" {{songbird this.foo bar=this.bar}}>Hello</h1>
          {{/if}}
        `);
      });

      assert.step('insert');

      await assertHooks(
        ['constructor', 'didReceiveArguments', 'didInstall'],
        () => {
          this.set('isShowing', true);
        }
      );

      assert.step('update 1');

      await assertHooks(['didUpdateArguments', 'didReceiveArguments'], () => {
        this.set('foo', 'FOO');
      });

      assert.step('update 2');

      await assertHooks(['didUpdateArguments', 'didReceiveArguments'], () => {
        this.set('bar', 'BAR');
      });

      assert.step('destroy');

      await assertHooks(['willDestroy'], () => {
        this.set('isShowing', false);
      });

      assert.verifySteps([
        'no-op render',
        'insert',
        'update 1',
        'update 2',
        'destroy',
      ]);
    });
  });
}

function testLegacyHooks(factory: Factory): void {
  testLifecycleHook({
    name: 'constructor',
    insert: true,
    update: false,
    destroy: false,
    element: false,
    factory,
  });

  testLifecycleHook({
    name: 'didReceiveArguments',
    insert: true,
    update: true,
    destroy: false,
    element: true,
    factory,
  });

  testLifecycleHook({
    name: 'didUpdateArguments',
    insert: false,
    update: true,
    destroy: false,
    element: true,
    factory,
  });

  testLifecycleHook({
    name: 'didInstall',
    insert: true,
    update: false,
    destroy: false,
    element: true,
    factory,
  });

  testLifecycleHook({
    name: 'willDestroy',
    insert: false,
    update: false,
    destroy: true,
    element: true,
    factory,
  });

  testHooksOrdering(factory);
}

module(
  'Integration | Modifier Manager | class-based modifier',
  function (hooks) {
    setupRenderingTest(hooks);

    // NOTE: this can be removed at 4.0.
    testLegacyHooks(
      (callback) =>
        class NativeModifier extends Modifier {
          constructor(owner: unknown, args: ArgsFor<DefaultSignature>) {
            super(owner, args);
            callback('constructor', this);
          }

          didReceiveArguments(): void {
            callback('didReceiveArguments', this);
          }

          didUpdateArguments(): void {
            callback('didUpdateArguments', this);
          }

          didInstall(): void {
            callback('didInstall', this);
          }

          willDestroy(): void {
            callback('willDestroy', this);
          }
        }
    );

    test('the constructor', async function (assert) {
      let callCount = 0;
      class UsingConstructor extends Modifier {
        constructor(owner: unknown, args: ArgsFor<DefaultSignature>) {
          super(owner, args);
          assert.equal(callCount, 0, 'has initially never been called');
          callCount += 1;

          assert.equal(arguments.length, 2, 'receives exactly two arguments');
          assert.true('named' in args, 'the `args` has a `named` field');
          assert.equal(typeof args.named, 'object', 'which is an object');
          assert.true(
            'positional' in args,
            'the `args` has a `positional` field'
          );
          assert.true(Array.isArray(args.positional), 'which is an array');
        }
      }

      this.owner.register('modifier:using-constructor', UsingConstructor);

      class State {
        @tracked pos = 'pos';
        @tracked named = 'named';
      }
      const state = new State();
      this.set('state', state);

      await render(hbs`
        <h1 id="expected" {{using-constructor this.state.pos named=this.state.named}}>Hello</h1>
      `);

      assert.step('construction');

      state.pos = 'new pos';
      await settled();
      assert.step('first rerender');

      state.named = 'new named';
      await settled();
      assert.step('second rerender');

      assert.equal(callCount, 1, 'only gets called once');
      assert.verifySteps(['construction', 'first rerender', 'second rerender']);
    });

    test('the `modify` hook', async function (assert) {
      interface ModifySig {
        Element: HTMLParagraphElement;
        Args: {
          Named: {
            name: string;
            age: number;
          };
          Positional: [greet: string, farewell: string];
        };
      }

      class State {
        @tracked greet = 'hello';
        @tracked farewell = 'goodbye';
        @tracked name = 'Chris';
        @tracked age = 34;
      }

      const state = new State();
      this.set('state', state); // RFC 785

      let modifyCallCount = 0;

      class UsingModify extends Modifier<ModifySig> {
        constructor(owner: unknown, args: ArgsFor<ModifySig>) {
          super(owner, args);
          assert.equal(arguments.length, 2, '');
        }

        modify(
          element: HTMLParagraphElement,
          positional: PositionalArgs<ModifySig>,
          named: NamedArgs<ModifySig>
        ): void {
          modifyCallCount += 1;
          assert.true(
            element instanceof HTMLParagraphElement,
            'receives the element correctly'
          );
          assert.equal(positional.length, 2, 'receives all positional args');
          assert.equal(
            positional[0],
            state.greet,
            'receives 1st positional arg'
          );
          assert.equal(
            positional[1],
            state.farewell,
            'receives 2nd positional arg'
          );

          // Intentionally do not use `named.age`, so that we can test that
          // modify is appropriately "lazy" about what it consumes: triggering
          // a `set` operation on it will not
          assert.equal(typeof named, 'object', 'receives a named args object');
          assert.equal(named.name, state.name, 'receives correct named args');
        }
      }

      this.owner.register('modifier:using-modify', UsingModify);

      await render(hbs`
        <p {{using-modify this.state.greet this.state.farewell name=this.state.name}}></p>
      `);

      assert.step('initial render');

      state.greet = 'ahoy';
      await settled();
      assert.step('second render');

      state.name = 'Krycho';
      await settled();
      assert.step('third render');

      // This should *not* trigger `modify`, so the call count will remain 3.
      state.age = 35;
      await settled();
      assert.step('fourth render');

      assert.equal(
        modifyCallCount,
        3,
        'is called once each for installation and each update to args it actually uses'
      );
      assert.verifySteps([
        'initial render',
        'second render',
        'third render',
        'fourth render',
      ]);
    });

    // TODO: remove at 4.0
    module('using modify with legacy hooks', function () {
      test('didInstall', function (assert) {
        class WithDI extends Modifier {
          didInstall(): void {
            /* no op */
          }
          modify(): void {
            /* no op */
          }
        }

        assert.throws(
          () => new WithDI({}, { named: {}, positional: [] }),
          'throws'
        );
      });

      test('didReceiveArguments', function (assert) {
        class WithDRA extends Modifier {
          didReceiveArguments(): void {
            /* no op */
          }
          modify(): void {
            /* no op */
          }
        }

        assert.throws(
          () => new WithDRA({}, { named: {}, positional: [] }),
          'throws'
        );
      });

      test('didUpdateArguments', function (assert) {
        class WithDUA extends Modifier {
          didUpdateArguments(): void {
            /* no op */
          }
          modify(): void {
            /* no op */
          }
        }

        assert.throws(
          () => new WithDUA({}, { named: {}, positional: [] }),
          'throws'
        );
      });
    });

    module('service injection', function () {
      test('can participate in ember dependency injection', async function (this: Context, assert) {
        let called = false;

        class Foo extends Service {
          isFooService = true;
        }

        class Bar extends Service {
          isBarService = true;
        }

        this.owner.register('service:foo', Foo);
        this.owner.register('service:bar', Bar);

        class NativeModifier extends Modifier {
          @service foo!: Foo;

          // SAFETY: we're not using the registry here for convenience, because we
          // cannot extend it anywhere but at the top level of the module. The
          // cast is safe because of the registration of `service:bar` above.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          @service('bar' as any) baz!: Bar;

          constructor(owner: unknown, args: ArgsFor<DefaultSignature>) {
            super(owner, args);

            called = true;

            assert.strictEqual(
              this.foo.isFooService,
              true,
              'this.foo.isFooService'
            );
            assert.strictEqual(
              this.baz.isBarService,
              true,
              'this.baz.isBarService'
            );
          }
        }
        this.owner.register('modifier:songbird', NativeModifier);

        await render(hbs`<h1 {{songbird}}>Hello</h1>`);

        assert.strictEqual(called, true, 'constructor called');
      });
    });
  }
);
