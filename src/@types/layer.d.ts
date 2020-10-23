declare namespace __layer {

    // __esri.MapImageLayerProperties
    // __esri.TileLayerProperties
    // __esri.FeatureLayerProperties
    // __esri.GraphicsLayerProperties
    // __esri.WMTSLayerProperties
    // __esri.WMSLayerProperties
    // __esri.WebTileLayerProperties
    // __esri.OpenStreetMapLayerProperties
    // __esri.SceneLayerProperties

  interface customLayerProperties {
    ArcgisLayerOption ?: object
    DataStatus ?: boolean
    Datatype ?: string
    DefLoadLyr ?: boolean
    ID ?: string
    MGroup ?: string
    SubGroup ?: string
    LayerIds ?: string
    LayerName ?: string
    MapSrvUrl ?: string
    MaxScale ?:number
    MinScale ?:number
    Opacity ?:number
    UserSetting ?: string
    Visible ?: boolean
    AgsToken ?: string
    isExplain ?: boolean
    ImgUrl?: string
  }

  interface baseEsriLayerProperties {
    id:string
    title:string
    opacity:number
    visible:boolean
    url:string
    minScale:number
    maxScale:number
  }

  type mixinLayerProperties = customLayerProperties & baseEsriLayerProperties
  
  interface handleOption {
    type:"baseLayer"|"layer"|"graphiclayer",
    id:string
  }
}


