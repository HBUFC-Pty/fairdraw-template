/*
 * The contents of this file are subject to the Common Public Attribution License Version 1.0 (the “License”); you may
 * not use this file except in compliance with the License. You may obtain a copy of the License at
 * https://opensource.org/license/CPAL-1.0. The License is based on the Mozilla Public License Version 1.1 but Sections
 * 14 and 15 have been added to cover use of software over a computer network and provide for limited attribution for
 * the Original Developer. In addition, Exhibit A has been modified to be consistent with Exhibit B.
 * Software distributed under the License is distributed on an “AS IS” basis, WITHOUT WARRANTY OF ANY KIND, either
 * express or implied. See the License for the specific language governing rights and limitations under the License.
 * The Original Code is FairDraw operator template.
 * The Initial Developer of the Original Code is Harrison Jones. All portions of the code written by Harrison Jones are
 * Copyright (c) 2026 Harrison Jones. All Rights Reserved.
 */
/** Shared browser checks for the home page's motion: reduced motion and whether the brand turned motion on. */
export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

export function subscribeReducedMotion(onChange: () => void) {
  const m = window.matchMedia(REDUCED_MOTION);
  m.addEventListener('change', onChange);
  return () => m.removeEventListener('change', onChange);
}
export const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;
/** On the server, assume reduced motion: nothing moves until the browser says it may. */
export const reducedOnServer = () => true;

/** True when the brand has extras.motion (data-motion on <body>) and the visitor has not asked for reduced motion. */
export function motionAllowed(): boolean {
  return document.body.hasAttribute('data-motion') && !prefersReducedMotion();
}

const noop = () => () => {};
/** For useSyncExternalStore: false in the server HTML and the first browser render, true once hydrated. */
export const hydration = { subscribe: noop, client: () => true, server: () => false };
