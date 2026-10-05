/** Joins the truthy class names, e.g. `cx('tab', active && 'active')`. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
