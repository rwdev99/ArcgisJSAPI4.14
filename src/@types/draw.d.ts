declare namespace __draw {
    
    interface option{
        type: "circle"|"polygon"|"polyline"|"point"
        // mode?: "hybrid"|"freehand"|"click"
        symbolOption?:symbolOption
        spatialReference?:__esri.SpatialReference
        wkt?:string
    }

    type symbolOption =  __esri.LineSymbolProperties |
    __esri.SimpleMarkerSymbolProperties |
    __esri.SimpleLineSymbolProperties|
    __esri.FillSymbolProperties |
    __esri.PictureMarkerSymbol

    interface searchOption {
        symbol?:symbolOption,
        buffer_symbol?:symbolOption
    }

    interface measurePloygonResult{
      area_hectare:number,
      area_metric:number,
      length_metric:number,
      length_kmetric:number,
    }
    interface measurePointResult{
      latitude:number,
      longitude:number
      X97:number
      Y97:number
    }
    interface measurePolylineResult{
      metric:number
      kmetric:number
    }
}