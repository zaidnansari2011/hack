---
title: React Fundamentals
slug: react-101
---

# Components and JSX

A React component is a JavaScript function that returns JSX — an XML-like syntax that compiles to `React.createElement` calls. The function takes a `props` object as its only argument and returns a tree of elements. `function Greeting({ name }) { return <h1>Hello, {name}</h1>; }` is the entire mental model: data in, markup out, no side effects.

JSX has three rules that catch beginners. **Class becomes className** because `class` is reserved in JavaScript. **Curly braces interpolate JavaScript expressions**, not statements — `{user.name}` works, `{if (x) y}` doesn't, but `{x ? y : z}` does. **Components must be capitalized** so the parser distinguishes `<Button>` (a component) from `<button>` (a DOM element).

Children are passed as a special prop. `<Card>Hello</Card>` is equivalent to `<Card children="Hello" />`. This composes naturally — a `Card` component renders its children inside a styled wrapper, and the parent decides what goes inside.

Render the same component multiple times and React treats them as separate instances with independent state. Identity is determined by position in the tree (and the `key` prop in lists). This is fundamental to how React decides what to update.

# Props vs state

Props are inputs passed from a parent. State is data the component owns and can change. Props are immutable from the receiver's perspective; state is mutable but only via setter functions.

`const [count, setCount] = useState(0)` declares a piece of state with an initial value. Calling `setCount(count + 1)` schedules a re-render with the new value. The new value is **not** visible synchronously inside the same function call — `setCount(1); console.log(count)` still logs the old count, because state updates are batched and applied between renders.

When the next state depends on the previous, use the function form: `setCount(c => c + 1)`. This avoids stale-closure bugs in async handlers and event listeners. As a rule, if you're computing the next state from the current state, always use the function form.

A common mistake is treating state as a place to derive values. If something can be computed from existing state or props (`const total = items.reduce(...)`), don't put it in `useState`. Storing derived data leads to inconsistency: you update one piece, forget the other, and the UI shows stale numbers.

# Effects and the dependency array

`useEffect(() => { ... }, [deps])` runs the function after render, and re-runs it whenever any dependency changes. The effect can return a cleanup function, which runs before the next effect and on unmount.

The dependency array is the most error-prone part of React. Empty `[]` means "run once on mount" — this is correct for setup that doesn't depend on anything. Missing the array entirely means "run after every render" — almost always a bug. The right pattern is to list every reactive value the effect reads (`[userId, filter]`).

The exhaustive-deps lint rule catches this for you. Trust it. The temptation to silence the warning to break a loop usually means the underlying logic is wrong — typically you're updating state inside an effect that depends on that state, which is an infinite loop. Refactor: derive instead of effecting, or move the work to an event handler.

`useEffect` should not be your first reach. If the work can happen in an event handler (button click, form submit), put it there. Effects exist for synchronizing with external systems — fetching data, subscribing to a websocket, setting up a DOM listener — not for cause-and-effect within React itself.

# Lists and keys

Rendering a list is `items.map(item => <Row key={item.id} {...item} />)`. The `key` prop tells React which array element corresponds to which rendered output, so when items are inserted or removed, React can move existing DOM nodes instead of recreating them.

Use a stable, unique ID — usually a database ID or a UUID. Do **not** use the array index as a key unless the list is static and never reordered. Index keys cause subtle bugs: state from one row shows up in another after a sort, animations target the wrong element, focus jumps to the wrong input.

Keys must be unique among siblings, not globally. Two `<Row key="42" />` elements at different levels of the tree are fine; two at the same level are a bug.

# Forms and controlled components

A controlled input is one whose value is held in React state. `<input value={name} onChange={e => setName(e.target.value)} />` is the canonical pattern. Every keystroke triggers a state update and a re-render. Sounds expensive; in practice, React's reconciler is fast enough that this is the default for any form you can plausibly write.

Uncontrolled inputs (`<input ref={ref} />`) read the value out of the DOM with a ref. Use them when integrating with a non-React form library, or for genuinely huge forms where re-rendering on every keystroke shows up in profiling. For everything else, controlled wins on debuggability — the state is right there in your component.

For complex forms, libraries like react-hook-form or Formik handle validation, error display, and submission state. Both are popular; react-hook-form is faster (uses uncontrolled inputs under the hood) and the API is more pleasant for new projects.

# Hooks: useReducer, useMemo, useCallback

`useReducer` is `useState` for state machines. When state has multiple sub-values that update together, or when "next state from current state" requires more than a one-liner, a reducer keeps the logic out of event handlers. `dispatch({ type: "INCREMENT" })` is more debuggable than scattered `setState` calls because every transition has a name.

`useMemo` caches the result of an expensive computation between renders. `const sorted = useMemo(() => items.sort(byDate), [items])`. Without it, the sort runs on every render. Be honest about "expensive" — a 10-element sort doesn't need memoization; a 10,000-element nested grouping does.

`useCallback` caches a function reference. The only reason this matters is when the function is passed to a memoized child component or used as a dependency in another hook. Sprinkling `useCallback` everywhere out of habit makes code harder to read without measurable benefit. Profile first.

# Context and prop drilling

Context (`createContext` + `useContext`) is React's solution to passing values through deep trees without threading props at every level. The classic use cases: theme, authenticated user, locale.

Wrap the tree in a provider: `<ThemeContext.Provider value={dark}>...</ThemeContext.Provider>`. Read from any descendant: `const theme = useContext(ThemeContext)`. The value can be anything — primitive, object, callback.

The trap: every consumer re-renders when the context value changes by reference. If you put your entire app state in one context and pass `{user, cart, theme}` as the value, changing the cart re-renders every component that reads any of them. Split contexts by axis of change, or use a state library (Zustand, Jotai) once context becomes the bottleneck.

# Performance: when to actually worry

React is fast by default. The component model batches updates and only re-touches DOM nodes that actually changed. Most apps don't need optimization until they have hundreds of components rendering tens of thousands of items.

When something feels slow, profile with the React DevTools Profiler before guessing. The Profiler highlights which components rendered and why — usually you'll find one component that re-renders too often (often because a parent passes a new object literal as a prop on every render) or one expensive child that doesn't need to.

The fixes, in order: split components so re-renders are smaller, memoize specific expensive children with `React.memo`, hoist state up only as far as needed (state that's local should stay local), virtualize long lists with `react-window` or `react-virtualized` so off-screen rows don't render at all.

Premature optimization in React looks like `useCallback` and `useMemo` everywhere with no measurement. Real optimization looks like a profile, a hypothesis, a fix, and a re-profile.
