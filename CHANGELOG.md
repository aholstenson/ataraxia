# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
