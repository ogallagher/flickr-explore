# flickr explore

[Flickr](https://flickr.com) api client application designed to periodically fetch interesting/featured images from the web API and
save versions in a local output directory. 

This local directory can be used, for example, as a dynamic images source for rotating desktop backgrounds.

Options control how many images this directory will store at a time, before the oldest are deleted and replaced with new images.

## Install

The script uses the node JS interpreter. Assuming you have node and npm installed, clone or download the project dir, enter it, and install
the dependencies:

```
# inside flickr-explore/ project dir
npm install
```

Options are currently all set using a `.env` file in the same directory as the `flickr_explore.js` entrypoint script. Create your own version of this file by copying the contents of `.env_example`. Apart from other options, a value for `FLICKR_API_KEY` is required for the flickr api client to receive successful responses. See [flickr api docs](https://www.flickr.com/services/api/) for how to get a personal API key by filling a short form online.

## Usage

Once the dependencies are installed in `node_modules/` and the `.env` file exists with a valid flickr api key, run the entrypoint script either directly (`node flickr_explore.js`) or via driver that pipes for more legible logging (`./flickr-explore.sh`).

<!--
    TODO describe how to use out dir as source for rotating background/screensaver on Mac
    TODO describe how to use out dir as source for rotating background/screensaver on Win

    TODO describe how to schedule regular runs to periodically update the output dir
-->

## [Flickr image url components](https://www.flickr.com/services/api/misc.urls.html)

flickr api explore method = `flickr.interestingness.getList`

### Static image file url

| protocol | host | server-id | image | secret | size | ext | url |
| ---------| -----| --------- | ----- | ------ | ---- | --- | --- |
| https    | live.static.flickr.com | 65535 | 52551849781 | 526ea6e748 | c | jpg | https://live.staticflickr.com/65535/52551849781_526ea6e748_c.jpg |

### Image page url

| protocol | host | "photos" | user | image | url |
| ---------| -----| -------- | ---- | ----- | --- |
| https | www.flickr.com | photos | 141852728@N05 | 52551849781 | https://www.flickr.com/photos/141852728@N05/52551849781 |

## [Flickr image size suffixes](https://www.flickr.com/services/api/misc.urls.html)

<!-- TODO use table from english page version -->

| Suffix | Class | Longest edge (en px) | Notes |
| ------ | ----- | ------------------------ | ----- |
|s|mini|75|square|
|q|mini|150|square|
|t|mini|100||
|m|small|240||
|n|small|320||
|w|small|400||
|(none)|medium|500||
|z|medium|640||
|c|medium|800||
|b|large|1024||
|h|large|1600|tiene un secreto único; el propietario de la foto la puede restringir|
|k|large|2048|tiene un secreto único; el propietario de la foto la puede restringir|
|3k|extra large|3072|tiene un secreto único; el propietario de la foto la puede restringir|
|4k|extra large|4096|tiene un secreto único; el propietario de la foto la puede restringir|
|f|extra large|4096|tiene un secreto único; el propietario de la foto la puede restringir; existe únicamente para fotos con relación de aspecto de 2:1|
|5k|extra large|5120|tiene un secreto único; el propietario de la foto la puede restringir|
|6k|extra large|6144|tiene un secreto único; el propietario de la foto la puede restringir|
|o|original|arbitrario|tiene un secreto único; el propietario de la foto la puede restringir; los archivos tienes datos EXIF completos; los archivos no se pueden rotar; los archivos pueden utilizar una extensión de archivo arbitraria|

## [Flickr photo licenses](https://www.flickr.com/services/api/flickr.photos.licenses.getInfo.html)

```xml
<licenses>
  <license id="0" name="All Rights Reserved" url="" />
  <license id="1" name="Attribution-NonCommercial-ShareAlike License" url="https://creativecommons.org/licenses/by-nc-sa/2.0/" />
  <license id="2" name="Attribution-NonCommercial License" url="https://creativecommons.org/licenses/by-nc/2.0/" />
  <license id="3" name="Attribution-NonCommercial-NoDerivs License" url="https://creativecommons.org/licenses/by-nc-nd/2.0/" />
  <license id="4" name="Attribution License" url="https://creativecommons.org/licenses/by/2.0/" />
  <license id="5" name="Attribution-ShareAlike License" url="https://creativecommons.org/licenses/by-sa/2.0/" />
  <license id="6" name="Attribution-NoDerivs License" url="https://creativecommons.org/licenses/by-nd/2.0/" />
  <license id="7" name="No known copyright restrictions" url="https://www.flickr.com/commons/usage/" />
  <license id="8" name="United States Government Work" url="http://www.usa.gov/copyright.shtml" />
  <license id="9" name="Public Domain Dedication (CC0)" url="https://creativecommons.org/publicdomain/zero/1.0/" />
  <license id="10" name="Public Domain Mark" url="https://creativecommons.org/publicdomain/mark/1.0/" />
</licenses>
```
