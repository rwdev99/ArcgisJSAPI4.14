# Arcgis 4.14 JSAPI

## Project setup
```
npm install
```

### Compiles typescript Files ( export ES6 module ) 
```
tsc -w
```

### Rollup for browser
* reload manually
```
npm run build
```

### Unit Test
```
npm run test
```

#### About
* `layerWorldFile.ts`
    * 參考
        * [BaseDynamicLayer](https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-BaseDynamicLayer.html)
        * [WorldFile](https://gis.stackexchange.com/questions/120659/converting-esri-world-file-jgw-into-xy-corner-coordinates)
* `./lib/wicket.ts`
    * wicktet.js 套件原本 `Wkt.Wkt` 中 `toObject` `fromObjt` 方法所用屬性 `deconstruct`、`construct` 保存了`arcgis obj` 的建構，但因為使用 ES module ( esri-loader ) 來載入，所以另創建新類`Wicket`繼承覆寫

#### Demo Page
* [draw.html]('http://localhost:8080/gmap.html')
* [layerWorldFile.html]('http://localhost:8080/layerWorldFile.html')
* [gmap.html]('http://localhost:8080/gmap.html')

#### Todo
- [ ] `draw*.ts` convert to interface for new class `Meaure` 、 `Search`
- [ ] UML、Text Document

