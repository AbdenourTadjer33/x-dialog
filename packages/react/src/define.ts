import type { DialogDefinition } from "./types"

/**
 * Declare a dialog.
 *
 * The returned object *is* the handle you pass to `open()` — there is no
 * central registry to update, so adding a dialog is one file and one export.
 *
 * Pass both type arguments: they are what makes `open(definition, payload)`
 * check the payload and type the result.
 *
 * @example
 * export const renameDialog = defineDialog<{ name: string }, string>({
 *   kind: "rename",
 *   title: (payload) => `Rename ${payload.name}`,
 *   width: "sm",
 *   component: RenameSurface,
 * })
 */
export function defineDialog<Payload = void, Result = void>(
  definition: DialogDefinition<Payload, Result>
): DialogDefinition<Payload, Result> {
  return definition
}
