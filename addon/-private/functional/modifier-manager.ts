import { capabilities } from '@ember/modifier';
import { assert } from '@ember/debug';
import { FunctionalModifier } from './modifier';
import { ModifierArgs } from '../interfaces';
import { consumeArgs } from '../compat';

const MODIFIER_ELEMENTS = new WeakMap<FunctionalModifier, Element>();
const MODIFIER_TEARDOWNS: WeakMap<FunctionalModifier, unknown> = new WeakMap();

function teardown(modifier: FunctionalModifier): void {
  const teardown = MODIFIER_TEARDOWNS.get(modifier);

  if (teardown && typeof teardown === 'function') {
    teardown();
  }
}

function setup(
  modifier: FunctionalModifier,
  element: Element,
  args: ModifierArgs
): void {
  const { positional, named } = args;
  const teardown = modifier(element, positional, named);

  MODIFIER_TEARDOWNS.set(modifier, teardown);
}

class FunctionalModifierManager {
  capabilities = capabilities('3.22');

  createModifier(modifier: FunctionalModifier): FunctionalModifier {
    // This looks superfluous, but this is creating a new instance
    // of a function -- this is important so that each instance of the
    // created modifier can have its own state which is stored in
    // the MODIFIER_ELEMENTS and MODIFIER_TEARDOWNS WeakMaps
    return (...args) => modifier(...args);
  }

  installModifier(
    modifier: FunctionalModifier,
    element: Element,
    args: ModifierArgs
  ): void {
    MODIFIER_ELEMENTS.set(modifier, element);
    consumeArgs(args);
    setup(modifier, element, args);
  }

  updateModifier(modifier: FunctionalModifier, args: ModifierArgs): void {
    const element = MODIFIER_ELEMENTS.get(modifier);
    assert(
      'ember-modifier: function-based modifier was not installed correctly on its element before calling updateModifier. Please file a bug: <https://github.com/ember-modifier/ember-modifier/issues>',
      !!element
    );

    teardown(modifier);
    consumeArgs(args);
    setup(modifier, element, args);
  }

  destroyModifier(modifier: FunctionalModifier): void {
    teardown(modifier);
  }
}

export default new FunctionalModifierManager();
