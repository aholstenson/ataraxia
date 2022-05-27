# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.12.2](https://github.com/aholstenson/ataraxia/compare/v0.12.1...v0.12.2) (2022-05-27)


### Bug Fixes

* **core:** Fix findAndGossip was not checking if group nodes length was empty before picking node ([df08fb4](https://github.com/aholstenson/ataraxia/commit/df08fb4a63fdbcdd2624f6233cec00639b31cc9c))





## [0.12.1](https://github.com/aholstenson/ataraxia/compare/v0.12.0...v0.12.1) (2022-05-23)


### Bug Fixes

* **services:** Fix onServiceUnavailable not triggered if service registration is triggered after node is available ([0ccf852](https://github.com/aholstenson/ataraxia/commit/0ccf852f6c9226798f337b11109da7ba243d5e1e))





# [0.12.0](https://github.com/aholstenson/ataraxia/compare/v0.11.0...v0.12.0) (2021-12-18)


### Bug Fixes

* **core:** Do not duplicate peers in TestNetwork ([36d6e66](https://github.com/aholstenson/ataraxia/commit/36d6e667ba7f3b6fcc0cf831fc40b68c9af8dd99))
* **core:** Fix SynchronizedValues when setLocal called multiple times ([31a0848](https://github.com/aholstenson/ataraxia/commit/31a084888c31a67690cedf58db9e08dcdf1a9719))
* **core:** Own instance should not be visible as node ([accc64c](https://github.com/aholstenson/ataraxia/commit/accc64c052dd9cc1af187ee3c52b27e50fe7d157))


### Features

* **core:** Add gossip for group membership ([46420ae](https://github.com/aholstenson/ataraxia/commit/46420aeee0ee458433c768bfd291ff91b6e1df4f))
* **core:** Add Gossiper helper ([d5cc740](https://github.com/aholstenson/ataraxia/commit/d5cc7400afd571afe96ee711daee6a38a70324d8))
* **core:** Apper peer names to debug namespace of TestNetwork ([4022d7f](https://github.com/aholstenson/ataraxia/commit/4022d7f94074eaa522ce7a53ae2c211000739768))
* **core:** Group interface to represent entire network or sub-sets of it ([061bd6b](https://github.com/aholstenson/ataraxia/commit/061bd6b7d7bdd37be75fdb5a28b522e30e7948a9))
* **core:** Introduce groups joinable via NamedGroup ([b65b5a8](https://github.com/aholstenson/ataraxia/commit/b65b5a80ef376a4fb2b71119f26b11f1bf0dad63))
* **core:** Shared Debugger abstraction ([689e63e](https://github.com/aholstenson/ataraxia/commit/689e63e0a52dc65371039d7aecd7d56a8114f4b1))
* **core:** SynchronizedValues for easy sharing of values between nodes ([8996117](https://github.com/aholstenson/ataraxia/commit/89961178914c75e1fa4a2155ae676a23c636b030))
* **transport-streams:** Make local and remote public key available for encrypted streams ([a35bbed](https://github.com/aholstenson/ataraxia/commit/a35bbedc57d51a4caa9b438d661352c7567f3c7e))





# [0.11.0](https://github.com/aholstenson/ataraxia/compare/v0.10.0...v0.11.0) (2021-06-17)


### Features

* **core:** Ability to use custom timeouts with RequestReplyHelper ([3ff258e](https://github.com/aholstenson/ataraxia/commit/3ff258e6464ab90420a9eba27cf81e606197c4a1))
* **core:** Add ability to iterate over nodes in Network ([5d7bf49](https://github.com/aholstenson/ataraxia/commit/5d7bf4970d518b72919867da2da4f9cf3bcdbda9))
* **core:** Drop peer disconnect event from Transport ([21fb9b0](https://github.com/aholstenson/ataraxia/commit/21fb9b056f9ac4a71b06a555917016ac82c0c4ac))
* **core:** EncryptedStreamingPeer for easier way to set up secure connections ([8458a74](https://github.com/aholstenson/ataraxia/commit/8458a747b720443bef40651f79866599987c87bf))
* **core:** Network now uses join/leave instead of start/stop ([eee9bdc](https://github.com/aholstenson/ataraxia/commit/eee9bdcacc0224923fa6190270c098c7cccd9c74))
* **core:** Node ids now use UUIDv4 ([77cc519](https://github.com/aholstenson/ataraxia/commit/77cc51967e53c3ad614eaac7b460cb0e619b7873))
* **service-contracts:** Add project for defining service contracts ([99a279f](https://github.com/aholstenson/ataraxia/commit/99a279f953514c1eb137a6a0b47caa0d592c8bce))
* **services:** Services now use contracts ([7ee4ab4](https://github.com/aholstenson/ataraxia/commit/7ee4ab4db89c167b2d0beaeb5380061d0638a1d0))
* **services:** Services now uses join/leave instead of start/stop ([845e5f5](https://github.com/aholstenson/ataraxia/commit/845e5f5d0fde275fc4d431f98c5d630eeee6eab3))
* **tcp:** No longer disconnect immediately when peer is reported unavailable ([9862f01](https://github.com/aholstenson/ataraxia/commit/9862f0133c253c63b517bcfe85f7feea293ccd82))
* **transport:** Split transport code into separate packages ([766b9c0](https://github.com/aholstenson/ataraxia/commit/766b9c0608acfea685d6e8bd65490a81557cecb1))
* Mark packages as side effect free ([2042d66](https://github.com/aholstenson/ataraxia/commit/2042d668d40fac2e2c2a44f4eb2be45c7012c120))





# [0.10.0](https://github.com/aholstenson/ataraxia/compare/v0.9.1...v0.10.0) (2021-06-07)


### Features

* **cli:** Display estimated latency of nodes ([9f93f78](https://github.com/aholstenson/ataraxia/commit/9f93f78313e5faff33ff2986b7e97cd736497d46))
* **cli:** Make --network optional ([179ecc7](https://github.com/aholstenson/ataraxia/commit/179ecc719827b7cab2552528782441457b6a6420))
* **core:** Add estimatedLatency to Node ([546e867](https://github.com/aholstenson/ataraxia/commit/546e8679ee18d8212e14d02e72ed5d63c8f1852f))
* **core:** Change how capability arrays are sent in the binary peer protocol ([b332c53](https://github.com/aholstenson/ataraxia/commit/b332c53fac4aa194baba6811e648622726eae7e2))
* **ws-client:** Use BackOff to calculate delays when attempting reconnect ([2696f9c](https://github.com/aholstenson/ataraxia/commit/2696f9c84985eea9b8b75f6bebcadc534a0125c6))
