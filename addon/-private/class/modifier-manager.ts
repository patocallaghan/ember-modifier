import { capabilities } from '@ember/modifier';
import { set } from '@ember/object';
import { destroy, registerDestructor } from '@ember/destroyable';

import ClassBasedModifier from './modifier';
import { ModifierArgs } from 'ember-modifier/-private/interfaces';
import { consumeArgs } from '../compat';

function destroyModifier(modifier: ClassBasedModifier): void {
  modifier.willDestroy();
}

export default class ClassBasedModifierManager {
  capabilities = capabilities('3.22');

  constructor(private owner: unknown) {}

  createModifier(
    ModifierClass: typeof ClassBasedModifier,
    args: ModifierArgs
  ): ClassBasedModifier {
    const modifier = new ModifierClass(this.owner, args);

    registerDestructor(modifier, destroyModifier);

    return modifier;
  }

  installModifier(
    instance: ClassBasedModifier,
    element: Element,
    args: ModifierArgs
  ): void {
    instance.element = element;

    consumeArgs(args);

    instance.didReceiveArguments();
    instance.didInstall();
  }

  updateModifier(instance: ClassBasedModifier, args: ModifierArgs): void {
    // TODO: this should be an args proxy
    set(instance, 'args', args);

    consumeArgs(args);

    instance.didUpdateArguments();
    instance.didReceiveArguments();
  }

  destroyModifier(instance: ClassBasedModifier): void {
    destroy(instance);
  }
}
