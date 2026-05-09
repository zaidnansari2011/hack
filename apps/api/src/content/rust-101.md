---
title: Rust Foundations
slug: rust-101
source: rust-book-distilled
---

# Why Rust

Rust is a systems language that gives you direct control over memory and machine
resources without making you babysit a garbage collector or hunt down dangling
pointers. The compiler enforces a small set of rules — ownership, borrowing,
and lifetimes — that statically prove your program is memory- and thread-safe.
The cost is a learning curve up front; the reward is software that holds up
under load and doesn't surprise you in production.

# Ownership

Every value in Rust has exactly one owner. When the owner goes out of scope the
value is dropped, and its memory is reclaimed deterministically — no GC pause,
no leak. Assigning a value to a new binding **moves** ownership; the original
binding becomes invalid. This rule eliminates whole categories of bugs: there
is no double-free, no use-after-free, no aliasing surprise where two threads
free the same memory. If a type implements `Copy` (small stack types like
integers), assignment copies instead of moving — but for heap-backed types like
`String` and `Vec`, you must explicitly `clone()` if you want a separate copy.

# Borrowing

Most of the time you don't need to give away ownership — you just want to read
or temporarily mutate a value. Rust models that with **references**: `&T` is a
shared, read-only borrow; `&mut T` is an exclusive, mutable borrow. The borrow
checker enforces a single rule: at any moment, a value can have either many
shared borrows OR exactly one mutable borrow, never both. This is the property
that lets Rust's standard library expose data structures that are safe across
threads without runtime locks: the compiler has already proven there is no
data race.

# Lifetimes

Lifetimes are how the compiler tracks how long a reference is valid. You rarely
write them by hand — most are inferred — but they show up in function
signatures when the compiler can't tell which input a returned reference came
from. The notation `&'a T` reads as "a reference to T that lives at least as
long as 'a." Functions that return references must tie that reference to one
of their inputs so the compiler can guarantee the borrow does not outlive the
data it points at. Reading lifetime annotations gets easier once you stop
treating them as syntax noise and start reading them as proofs.

# Traits

Traits define shared behavior — the Rust analogue of interfaces, but more
powerful. `Display` is the trait you implement for human-readable formatting;
`Debug` is the trait used by `{:?}` printing. Traits compose: you can require
that a generic type parameter implement multiple traits with `T: Debug + Send`.
Trait objects (`Box<dyn Trait>`) give you runtime polymorphism when you really
need it, but most Rust code prefers static dispatch via generics — the compiler
monomorphizes each call site, producing zero-overhead code.

# Error handling

Rust has no exceptions. Functions that can fail return `Result<T, E>`, and
functions that can produce nothing return `Option<T>`. The `?` operator
propagates errors up the call stack one frame at a time, returning early on
`Err` and unwrapping on `Ok`. This forces you to think about failure where it
happens — the language won't let you accidentally pretend a failure didn't
occur. For convenience, library code typically defines a single error enum
with `thiserror`, and application code aggregates with `anyhow`.

# Iterators and closures

Iterators in Rust are zero-cost: chains like `vec.iter().filter(...).map(...)`
compile to the same machine code you'd write by hand with a for-loop. Closures
are first-class values that capture their environment; the compiler picks the
right Fn-trait (`Fn`, `FnMut`, `FnOnce`) based on how the closure uses its
captures. Combined with iterators, closures let you express transformations
declaratively without giving up performance.

# Testing

`cargo test` runs unit tests inline (in a `#[cfg(test)] mod tests` block) and
integration tests in `tests/`. Property tests via `proptest` and benchmarks via
`criterion` are one dependency away. Compile times can be a frustration, but
incremental compilation and `cargo check` (typecheck without codegen) keep the
inner-loop fast. The strong type system catches most bugs before you reach
tests; tests then cover behavior, not type errors.
