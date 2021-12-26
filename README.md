# Description

This Github Action is an opinionated node addon builder that is designed to be
used in conjunction with the [install-addons][] module.

This system is designed to make building and consuming prebuilt node addons as
easy as possible. It differs from other similar solutions such as node-pre-gyp
and prebuild/prebuildify in that:

 * Github Actions is used to do all of the pre-compilation. This is probably
   the biggest difference since the other solutions require you to manually set
   up the appropriate build environment and then upload the binary somewhere.

 * All output is stored in a Github Release. This means you don't need S3 or
   a separate file hosting provider.

 * For addons that have files only used for building that take up a large amount
   of space, you have the option of (manually) omitting such files when
   publishing to npm and instead having them downloaded on the fly only when
   needed (e.g. falling back to a build). This saves on the size of your
   published npm package.


# Current supported platforms/environments

  * node.js
    * Versions: v10.x and newer
    * Platforms
      * Windows
        * MSVC libc - x64 (amd64)
      * macOS
        * bsd/built-in libc - x64 (amd64)
      * Linux
        * kernel 3.10 - glibc 2.17 - x64 (amd64)
        * kernel 3.10 - glibc 2.17 - arm64 (armv8-a)
        * kernel 3.10 - glibc 2.17 - arm7 (armv7-a)
        * kernel 3.10 - musl 1.1.16 - x64 (amd64)

  There is currently no support for nwjs.


# How To Use

1. Set up your Github Actions workflow

   a. Add a job that creates the release

      * _Recommended:_ Create the release in draft mode to indicate
        "in progress" state

   b. Add a job that defines your build matrix. Example:

      ```yaml
      matrix:
        job:
          - { node: 16.x, os: ubuntu-latest,  arch: x64,   libc: glibc, libcver: "2.17", kernel: "3.10" }
          - { node: 16.x, os: ubuntu-latest,  arch: arm64, libc: glibc, libcver: "2.17", kernel: "3.10" }
          - { node: 16.x, os: macos-latest,   arch: x64,   macos: "10.11" }
          - { node: 16.x, os: "windows-2019", arch: x64,   msvs: "2019", vc: "14.2", winos: "7.0", winosflag: "0x0601" }
      ```

      * Common job properties
        * `node` - The node version to compile against
        * `electron` - The electron version to compile against
          * When this is specified, `node` merely becomes the node version used
            for running scripts during the build process
          * **Note:** You will need to make sure that the libc and other values
            that are dependent upon how electron was built (for the selected
            platform) are set appropriately
        * `os` - The name of a valid Github Runner
        * `arch` - The architecture to compile for
      * Linux-specific properties
        * `libc` - The name of a supported libc to compile against
        * `libcver` - The version of a supported libc to compile against
        * `kernel` - The version of a supported kernel to compile against
      * macOS-specific properties
        * `macos` - The version of the macOS to compile for
      * Windows-specific properties
        * `msvs` - The year-based Visual Studio version to use when compiling
        * `vc` - The version of Visual C++ to use
        * `winos` - The minimum supported Windows OS version
        * `winosflag` - The minimum supported Windows OS version as would be set
          for `_WIN32_WINNT`. The values of both `winos` and `winosflag` must
          agree. **Note:** currently node-gyp does not support setting compiler
          defines outside of .gyp/.gypi files, so you will need to manually set
          `_WIN32_WINNT` to the value of `winosflag`.

   c. Add this Github Action to the `steps` of that same job. Example:

      ```yaml
      steps:
      - name: Generate Binaries
        uses: mscdex/buildbinaries@...
        with:
          releaseID: ...
          buildOnlyPaths: ...
          binaryType: ...
          token: ...
      ```

      Where `releaseID` is set to the ID of the release you just created.

      * `buildOnlyPaths` is an optional comma-delimited string list of paths to
        use to create an archive of files used solely for building. This archive
        will be downloaded on demand by [install-addons][] when it needs to
        fallback to building.

      * `binaryType` is an optional string containing the mime type of the
        format that the indvidual binaries will be stored in. The supported
        values are currently: `"application/gzip"` or
        `"application/octet-stream"`. Normally this shouldn't need to be changed
        unless the default compressed output results in file sizes larger than
        the original binary. **Default:** "application/gzip"

      * `token` is an optional string containing the Github token to use when
        accessing the Github API. **Default:** `github.token`

   d. (_Recommended_) Add a job to change your draft release to a published
      release

   e. (_Recommended_) Add a job that removes the (draft) release when a
      failure occurs

2. Set up your package.json. See the [install-addons][] documentation for this.

3. Assuming your package.json is configured correctly, just trigger your
   workflow to generate your binaries and proceed to install your addon via npm.


[install-addons]: https://github.com/mscdex/install-addons
