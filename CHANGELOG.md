# Changelog

## [0.2.0](https://github.com/chengzi-io/ts-fullstack-template/compare/v0.1.0...v0.2.0) (2026-10-31)


### ⚠ BREAKING CHANGES

* pnpm 12 is required (packageManager pnpm@12.16.1).
* Node 24 or later is required (engines.node >=24).

### Bug Fixes

* stop reporting expected api errors as unexpected ([#30](https://github.com/chengzi-io/ts-fullstack-template/issues/30)) ([3e26728](https://github.com/chengzi-io/ts-fullstack-template/commit/3e26728e81a65413f75bfef1de5eb28f884309ed))
* **web:** keep the dev tools out of vitest ([#28](https://github.com/chengzi-io/ts-fullstack-template/issues/28)) ([0bbd75f](https://github.com/chengzi-io/ts-fullstack-template/commit/0bbd75f4d7797dafa14cf5911bf12f64a86dcc30))
* **web:** make the demo follow its own rules ([#17](https://github.com/chengzi-io/ts-fullstack-template/issues/17)) ([eb1ed39](https://github.com/chengzi-io/ts-fullstack-template/commit/eb1ed39535f5145985b0d40ab443e98140490419))
* **web:** skip the debounce timer for an unchanged value ([#43](https://github.com/chengzi-io/ts-fullstack-template/issues/43)) ([24e42f5](https://github.com/chengzi-io/ts-fullstack-template/commit/24e42f5a014ef802c1a26e6303f69bc9b8728ccc))


### Build System

* move to node 24 ([#15](https://github.com/chengzi-io/ts-fullstack-template/issues/15)) ([d0b9bdd](https://github.com/chengzi-io/ts-fullstack-template/commit/d0b9bdd2c287e5623f0fb3adb63c55ceffa396eb))
* move to pnpm 12 ([#29](https://github.com/chengzi-io/ts-fullstack-template/issues/29)) ([9380038](https://github.com/chengzi-io/ts-fullstack-template/commit/93800384fdfcf1795b9d78ff3ad0824204707286))

## 0.1.0 (2026-10-28)


### Features

* add a quick start for projects made from the template ([#5](https://github.com/chengzi-io/ts-fullstack-template/issues/5)) ([438743d](https://github.com/chengzi-io/ts-fullstack-template/commit/438743d03c54d7b5703fc98b3d2037d2f9fc040f))
* **api:** authors/posts routers and slim package docs ([ba292ae](https://github.com/chengzi-io/ts-fullstack-template/commit/ba292aecad1d159a0530cb20466b78cae98c53b7))
* **api:** tRPC api with todos demo ([894cfc0](https://github.com/chengzi-io/ts-fullstack-template/commit/894cfc016c999fe55165f6644d7c9ba362cbd3a4))
* **backend:** complete authors/posts CRUD and DB URL convention ([54c606d](https://github.com/chengzi-io/ts-fullstack-template/commit/54c606ded3b993eafb069e46a1f9545422c46b26))
* **db:** add @workspace/db package with Drizzle schema ([803bfaa](https://github.com/chengzi-io/ts-fullstack-template/commit/803bfaaff7236a2e2dfd9f8e61178ff20ed4450e))
* **db:** add testing info ([22a1335](https://github.com/chengzi-io/ts-fullstack-template/commit/22a1335ed83752c3a490cb81213d3e3e80e9e670))
* **db:** authors/posts repos and slim package docs ([fc0000c](https://github.com/chengzi-io/ts-fullstack-template/commit/fc0000c6c53958c55cf18a4b9dd2f24aa1e5f082))
* **domain:** add shared contracts package for authors/posts ([061eb33](https://github.com/chengzi-io/ts-fullstack-template/commit/061eb33bf533a89e47e56eb629ebab6c2386bbdb))
* **global:** add vitest and script command ([52e2356](https://github.com/chengzi-io/ts-fullstack-template/commit/52e2356a4a91c67e8562cf65dc2946301fdc9d72))
* search author and post lists on the server ([d4a0f16](https://github.com/chengzi-io/ts-fullstack-template/commit/d4a0f16ab9d974eb2e5f3c39d73c151ac6037dd6))
* **server:** add opt-in OpenTelemetry tracing and log redaction ([d7b6577](https://github.com/chengzi-io/ts-fullstack-template/commit/d7b65778b2a3e14cb9e31fbc729d4d8f03621a17))
* **server:** drain before closing on shutdown ([4195994](https://github.com/chengzi-io/ts-fullstack-template/commit/41959941808fa6a4a8c08daa62bbd5a4b52669b6))
* **server:** init Hono server (apps/api-&gt;apps/server) ([a549669](https://github.com/chengzi-io/ts-fullstack-template/commit/a549669f2f1838f2629b2cd380c8934c5c60f53f))
* **server:** refuse a file database in production by default ([cc7c5cc](https://github.com/chengzi-io/ts-fullstack-template/commit/cc7c5cc2ff7020cf3764391dfc22e322af1d85a9))
* **ui:** add combobox primitive ([f9c4014](https://github.com/chengzi-io/ts-fullstack-template/commit/f9c40141f9613ef315a595523d5bd12324b35217))
* **ui:** add Dialog primitive for create/edit flows ([1de12c0](https://github.com/chengzi-io/ts-fullstack-template/commit/1de12c0f174c56e2e53cfa04c8f897156b3c0121))
* **ui:** add primitives for data table and forms ([9897789](https://github.com/chengzi-io/ts-fullstack-template/commit/9897789ad5cb3b6f3ee29f769c24ae7b7253f02a))
* **ui:** add table, form, and field primitives ([d3c4de7](https://github.com/chengzi-io/ts-fullstack-template/commit/d3c4de7520ebc4e3546fdef82d155522f04fc805))
* **web:** add a route error boundary and one error-reporting seam ([6f2e42f](https://github.com/chengzi-io/ts-fullstack-template/commit/6f2e42f44625be1383f1c2181a3ad948ded7b039))
* **web:** add TanStack Router file routes and app shell ([ae8c60f](https://github.com/chengzi-io/ts-fullstack-template/commit/ae8c60fce53051e059594e94129b3c602a19d99b))
* **web:** make the dev proxy target configurable ([dad5e6c](https://github.com/chengzi-io/ts-fullstack-template/commit/dad5e6c29447781ac8ae5d5428fc23db80c61b55))
* **web:** pick post authors with a searchable combobox ([784df65](https://github.com/chengzi-io/ts-fullstack-template/commit/784df6591aeb91c9862c955b7d430708ab04e763))
* **web:** remove invalid ts configuration ([42586ec](https://github.com/chengzi-io/ts-fullstack-template/commit/42586ec40f916f0c52d412efdf91e18ca1752916))
* **web:** replace the d hotkey with a theme toggle button ([05aadd6](https://github.com/chengzi-io/ts-fullstack-template/commit/05aadd686dc86785558fcdd69306737827f8dee6))
* **web:** replace todos demo with authors/posts crud ([fc51cd6](https://github.com/chengzi-io/ts-fullstack-template/commit/fc51cd64330e6bcc7575b382498539c0223965a3))
* **web:** wire tRPC client and Query for todos list ([df9ccfc](https://github.com/chengzi-io/ts-fullstack-template/commit/df9ccfc2997d2b659401a4e82aadae27c60f4020))


### Bug Fixes

* **api:** stop leaking SQL in errors, log root causes ([bd00907](https://github.com/chengzi-io/ts-fullstack-template/commit/bd0090707acdb760e9cf80cac16cba7fafb93b37))
* **ci:** let the release app label its pull requests ([f1bf4eb](https://github.com/chengzi-io/ts-fullstack-template/commit/f1bf4ebc9427a16ea36c975ea30df8efbcbff62f))
* **db:** require explicit DATABASE_URL for kit ([1fe4a65](https://github.com/chengzi-io/ts-fullstack-template/commit/1fe4a6561fb672b4c5695f316e6fa721afa3e4d5))
* **db:** treat a blank auth token as unset ([206b491](https://github.com/chengzi-io/ts-fullstack-template/commit/206b4919df1eebf0f81f567b1aa90e3395851325))
* **deps:** drop the shadcn express chain and declare a missing peer ([7437ca5](https://github.com/chengzi-io/ts-fullstack-template/commit/7437ca5e7873dfb1a11d9f763dfe29102969a93e))
* **deps:** patch audited packages and make shadcn a dev dependency ([062a989](https://github.com/chengzi-io/ts-fullstack-template/commit/062a98981d4d76add28bdf7d0947aa3fe9102041))
* **deps:** patch high advisories in dev tooling ([0e65513](https://github.com/chengzi-io/ts-fullstack-template/commit/0e6551381b925fcc45712a3ac0b8721990c75a55))
* **deps:** upgrade the router plugin off a vulnerable seroval ([a4f1afd](https://github.com/chengzi-io/ts-fullstack-template/commit/a4f1afdaee891abcd6abb4099186841ef7fdee6c))
* **kernel:** stop duplicating requestId in procedure logs ([331f5be](https://github.com/chengzi-io/ts-fullstack-template/commit/331f5bedb8c4a7ceccf26b2436882c7125313a47))
* let init-project run on an unreleased template ([#7](https://github.com/chengzi-io/ts-fullstack-template/issues/7)) ([a46bf4b](https://github.com/chengzi-io/ts-fullstack-template/commit/a46bf4b89992a891b5c0842508b833750e143b25))
* **server:** log why readiness fails ([3950e3d](https://github.com/chengzi-io/ts-fullstack-template/commit/3950e3ddeaed9102297291b1f98f7674b11e190a))
* **server:** remove drizzle phantom dep from readiness probe ([24e7b7d](https://github.com/chengzi-io/ts-fullstack-template/commit/24e7b7d8bc7aecf205bec8fda5229a5840ee5524))
* **server:** test the tracing gate and drop a false ordering claim ([46062cc](https://github.com/chengzi-io/ts-fullstack-template/commit/46062cc697904c96b9f04a9561245fc91e30ae0a))
* **ui:** take the Toaster theme from the caller ([4fdce3c](https://github.com/chengzi-io/ts-fullstack-template/commit/4fdce3cdb47b4b5a43403e1408a28dfd58b2cc31))
* **web:** drop planned tags from testing tools in use ([e37002d](https://github.com/chengzi-io/ts-fullstack-template/commit/e37002d8a143bd0b67ea98426b5ff7168f16caea))
* **web:** make typecheck follow project references ([a2edc74](https://github.com/chengzi-io/ts-fullstack-template/commit/a2edc74761a150c77d2172fa3c61c2591d5cd16f))
* **web:** page and search lists on the server ([f58982d](https://github.com/chengzi-io/ts-fullstack-template/commit/f58982dc444acff25cd7ee56228afd40ed52f02a))
* **web:** regenerate the route tree with the upgraded router plugin ([0272d9d](https://github.com/chengzi-io/ts-fullstack-template/commit/0272d9dd666e602a45f1528c82a0979305ef1ae2))
* **web:** report each error once and keep tRPC out of the entry chunk ([6c0f711](https://github.com/chengzi-io/ts-fullstack-template/commit/6c0f711931b6393a9e8b74b4c0c0611ea818cb42))
* **web:** stop root dialogs re-rendering while idle ([ecd2071](https://github.com/chengzi-io/ts-fullstack-template/commit/ecd207170c2d3cbf3dbde8e4ee9def8c5898f398))


### Performance Improvements

* **posts:** index the author foreign key ([ef3eb74](https://github.com/chengzi-io/ts-fullstack-template/commit/ef3eb74a7a4fabff0593c2666f5dcf95c8771b49))
