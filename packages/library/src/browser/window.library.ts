
/**
 * Displays a native browser alert dialog with the provided message.
 *
 * @param msg - The message to display in the alert dialog
 * @example
 * ```ts
 * alert('Operation completed successfully!');
 * ```
 */
export const alert = (msg: any) => window.alert(msg);

/**
 * Displays a native browser prompt dialog, asking the user for input.
 *
 * @param msg - The message/question to display
 * @param dflt - An optional default value for the input field
 * @returns The text entered by the user, or null if cancelled
 * @example
 * ```ts
 * const name = prompt('What is your name?', 'Guest');
 * ```
 */
export const prompt = (msg: any, dflt?: any) => window.prompt(msg, dflt);

/**
 * Displays a native browser confirmation dialog with OK/Cancel buttons.
 *
 * @param msg - The message to display (e.g., 'Are you sure?')
 * @returns True if the user clicked OK, false otherwise
 * @example
 * ```ts
 * const isSure = confirm('Are you sure you want to delete this?');
 * ```
 */
export const confirm = (msg?: string) => window.confirm(msg);
