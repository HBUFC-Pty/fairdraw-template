import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// PageCounter runs in the browser. Here React's hooks run at once and the browser globals are stand-ins, so the test
// can check when it reports without a DOM.
const state = vi.hoisted(() => ({ pathname: '/', refs: [] as { current: unknown }[], refIndex: 0 }));
vi.mock('react', () => ({
  useEffect: (fn: () => void) => {
    fn();
  },
  useRef: (initial: unknown) => {
    state.refs[state.refIndex] ??= { current: initial };
    return state.refs[state.refIndex++];
  },
}));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));

type Listener = (e: { persisted?: boolean }) => void;

function fakeTarget() {
  const listeners = new Map<string, { fn: Listener; once: boolean }[]>();
  return {
    addEventListener: (type: string, fn: Listener, opts?: { once?: boolean }) => {
      listeners.set(type, [...(listeners.get(type) ?? []), { fn, once: Boolean(opts?.once) }]);
    },
    removeEventListener: (type: string, fn: Listener) => {
      listeners.set(type, (listeners.get(type) ?? []).filter((l) => l.fn !== fn));
    },
    dispatch(type: string, e: { persisted?: boolean } = {}) {
      const all = listeners.get(type) ?? [];
      listeners.set(type, all.filter((l) => !l.once));
      for (const l of all) l.fn(e);
    },
  };
}

let fetchMock: ReturnType<typeof vi.fn>;
let doc: ReturnType<typeof fakeTarget> & { prerendering?: boolean; referrer: string };
let win: ReturnType<typeof fakeTarget>;

beforeEach(() => {
  vi.resetModules();
  state.pathname = '/';
  state.refs = [];
  fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
  doc = Object.assign(fakeTarget(), { referrer: 'https://www.google.com/' });
  win = fakeTarget();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', win);
  vi.stubGlobal('navigator', {});
});
afterEach(() => {
  vi.unstubAllGlobals();
});

async function render() {
  const { PageCounter } = await import('../src/components/PageCounter');
  state.refIndex = 0;
  PageCounter();
}

const sentPaths = () => fetchMock.mock.calls.map((c) => JSON.parse((c[1] as RequestInit).body as string).p);

describe('PageCounter', () => {
  it('reports a normal page load once, with the referrer', async () => {
    await render();
    await render();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string)).toEqual({ p: '/', r: 'https://www.google.com/' });
  });

  it('waits until a prerendered page is shown before reporting it', async () => {
    doc.prerendering = true;
    await render();
    expect(fetchMock).not.toHaveBeenCalled();
    doc.prerendering = false;
    doc.dispatch('prerenderingchange');
    expect(sentPaths()).toEqual(['/']);
    doc.dispatch('prerenderingchange');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('counts a page brought back from the back and forward cache, but not the first pageshow', async () => {
    state.pathname = '/results';
    await render();
    win.dispatch('pageshow', { persisted: false });
    expect(sentPaths()).toEqual(['/results']);
    win.dispatch('pageshow', { persisted: true });
    expect(sentPaths()).toEqual(['/results', '/results']);
  });

  it('sends nothing when the browser asks not to be tracked', async () => {
    vi.stubGlobal('navigator', { globalPrivacyControl: true });
    await render();
    win.dispatch('pageshow', { persisted: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
