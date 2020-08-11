`runmode.html` helper:
- let you highlight the specified sources in standalone
- useful to check the details of the token generated
- it is used to construct the regression test input / output.
- To use it, run `bin/start-runmode.sh` in project root. Open the specified URL in a browser.
    - Open the helper as file (i.e.,  with `file://` protocol ) will not work: It uses `fetch` to get the sample input sources, which requires http protocol.


Note about version history:
- Version `v0.9.0` is basically a snapshot of the code from (with minor path adjustment):
  https://github.com/orionlee/violentmonkey/commit/3535cddd16028bd727a2cc04b44bd31829417f29

- Commits after `v0.9.0` are in this repository only.

- The codes started out as a [pull request for Violentmonkey](https://github.com/violentmonkey/violentmonkey/pull/1022), it was decided to split the generic javascript-mixed support into its own repository, before the pull request was merged.
    - The commits prior to `v0.9.0` are snapshots of major changes, before the codes are migrated here. If one needs to know the details of the changes, see the version history in the pull request.
