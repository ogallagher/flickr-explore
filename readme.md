# flickr explore

[image url docs](https://www.flickr.com/services/api/misc.urls.html)

```
example preview url		= https://live.staticflickr.com/65535		/52551849781_526ea6e748_c	   .jpg
						  https://${domain}			   /${server-id}/${image}	_${secret} _${size}.${ext}

example image page url	= https://www.flickr.com/photos/141852728@N05/52551849781
						  https://${domain}		/photos/${user}		 /${image}

flickr api explore method = flickr.interestingness.getList
```

## Size suffixes

| Sufijo | Clase | Borde más grande (en px) | Notas |
| ------ | ----- | ------------------------ | ----- |
|s|miniatura|75|cuadrado recortado|
|q|miniatura|150|cuadrado recortado|
|t|miniatura|100||
|m|pequeño|240||
|n|pequeño|320||
|w|pequeño|400||
|(none)|mediano|500||
|z|mediano|640||
|c|mediano|800||
|b|grande|1024||
|h|grande|1600|tiene un secreto único; el propietario de la foto la puede restringir|
|k|grande|2048|tiene un secreto único; el propietario de la foto la puede restringir|
|3k|extra grande|3072|tiene un secreto único; el propietario de la foto la puede restringir|
|4k|extra grande|4096|tiene un secreto único; el propietario de la foto la puede restringir|
|f|extra grande|4096|tiene un secreto único; el propietario de la foto la puede restringir; existe únicamente para fotos con relación de aspecto de 2:1|
|5k|extra grande|5120|tiene un secreto único; el propietario de la foto la puede restringir|
|6k|extra grande|6144|tiene un secreto único; el propietario de la foto la puede restringir|
|o|original|arbitrario|tiene un secreto único; el propietario de la foto la puede restringir; los archivos tienes datos EXIF completos; los archivos no se pueden rotar; los archivos pueden utilizar una extensión de archivo arbitraria|

## Photo licenses

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
