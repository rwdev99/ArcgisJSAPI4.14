* world 文件的內容類似於以下
	```
	20.17541308822119 
	0.00000000000000 
	0.00000000000000 
	-20.17541308822119 
	424178.11472601280548 
	4313415.90726399607956
	```
	
* 六參數仿射變換
	* x1 =軸+ By + C 	
	* y1 = Dx + Ey + F
	* x1 =地圖上像素的計算x坐標 	
	* y1 =地圖上像素的計算y坐標 	
	* x =圖像中像素的列號 	
	* y =圖像中像素的行號 	
	* A = x尺度；在x方向上以地圖單位表示的像素尺寸 	
	* B，D =旋轉項 
	* C，F =翻譯術語；左上像素中心的x，y地圖坐標 	
	* E = y尺度的負數；像素在y方向上的地圖尺寸

> 注意：y比例（E）為負，因為圖像的原點和地理坐標係不同。圖像的原點位於左上角，而地圖坐標系的原點位於左下角。圖像中的行值從原點開始向下增加，而地圖中的y坐標值從原點開始向上增加。

* 轉換參數按以下順序存儲在world文件中：
	```
	20.17541308822119-A   	
	0.00000000000000-D 	
	0.00000000000000-B 	
	-20.17541308822119-E 	
	424178.11472601280548-C 	
	4313415.90726399607956-F
	```


### ref
* [MapImageLayer](https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-MapImageLayer.html)

* [MapImage](https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-support-MapImage.html)

* [word file reader](https://github.com/WorldFile/wld-reader)

* [esri doc](https://gis.stackexchange.com/questions/120659/converting-esri-world-file-jgw-into-xy-corner-coordinates)

* [example](https://jsfiddle.net/shehzadzafarch/pwa6qf43/) 

### todo
* custom location manually ?

1. [ ] parse `extent` from word file by `word file reader`
2. [ ] add by `MapImageLayer`