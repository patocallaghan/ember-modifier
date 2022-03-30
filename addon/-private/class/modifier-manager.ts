import { capabilities } from '@ember/modifier';
import { gte } from 'ember-compatibility-helpers';
import { destroy } from '@ember/destroyable';

import ClassBasedModifier from './modifier';
import { ArgsFor, ElementFor } from 'ember-modifier/-private/signature';

/**
 * The state bucket used throughout the life-cycle of the modifier. Basically a
 * state *machine*, where the framework calls us with the version we hand back
 * to it at each phase. The two states are the two `extends` versions of this
 * below.
 *
 * @internal
 */
interface State<S> {
  instance: ClassBasedModifier<S>;
}

/**
 * The `State` after calling `createModifier`, and therefore the state available
 * at the start of `InstallModifier`.
 * @internal
 */
interface CreatedState<S> extends State<S> {
  element: null;
}

/**
 * The `State` after calling `installModifier`, and therefore the state
 * available in all `updateModifier` calls and in `destroyModifier`.
 * @internal
 */
interface InstalledState<S> extends State<S> {
  element: ElementFor<S>;
}

// Wraps the unsafe (b/c it mutates, rather than creating new state) code that
// TS does not yet understand.
function installElement<S>(
  state: CreatedState<S>,
  element: ElementFor<S>
): InstalledState<S> {
  // SAFETY: this cast represents how we are actually handling the state machine
  // transition: from this point forward in the lifecycle of the modifier, it
  // always behaves as `InstalledState<S>`. It is safe because, and *only*
  // because, we immediately initialize `element`. (We cannot create a new state
  // from the old one because the modifier manager API expects mutation of a
  // single state bucket rather than updating it at hook calls.)
  const installedState = state as State<S> as InstalledState<S>;
  installedState.element = element;
  return installedState;
}

export default class ClassBasedModifierManager<S> {
  capabilities = capabilities(gte('3.22.0') ? '3.22' : '3.13');

  constructor(private owner: unknown) {}

  createModifier(
    modifierClass: typeof ClassBasedModifier,
    args: ArgsFor<S>
  ): CreatedState<S> {
    const instance = new modifierClass(this.owner, args);
    return { instance, element: null };
  }

  installModifier(
    createdState: CreatedState<S>,
    element: ElementFor<S>,
    args: ArgsFor<S>
  ): void {
    const state = installElement(createdState, element);
    state.instance.modify(element, args.positional, args.named);
  }

  updateModifier(state: InstalledState<S>, args: ArgsFor<S>): void {
    state.instance.modify(state.element, args.positional, args.named);
  }

  destroyModifier({ instance }: InstalledState<S>): void {
    destroy(instance);
  }
}
