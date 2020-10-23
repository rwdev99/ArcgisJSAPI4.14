import { loadModule } from './utils';

/**
 * 
 * LAYER 類 3.X 到 4.X 異動對照 :
 * ArcGISDynamicMapServiceLayer => MapImageLayerProperties
 * *ArcGISTiledMapServiceLayer => TileLayer
 * FeatureLayer
 * GraphicsLayer
 * WMTSLayer
 * WMSLayer
 * *WebTiledLayer => WebTileLayer
 * OpenStreetMapLayer
 * ?*GoogleMapsLayer 
 * ?*SGSTileLayer
 * 
 * @class ImageParameters
 * @urlv3 https://sigma.madrid.es/arcgis_js_api/sdk/3.22/jsapi/imageparameters-amd.html
 * @urlv4 https://developers.arcgis.com/javascript/latest/api-reference/esri-layers-support-ImageParameters.html
 * 
 */

class Layer<T> {
  
    private moduleUrl:string
    protected props:T & __layer.customLayerProperties //- 混入自定義屬性

    //- 拆分部分自定義屬性 作為 父類成員Layer 提供子類 直接使用
    constructor(moduleUrl:string,props:T & __layer.customLayerProperties) {
        this.props = props
        this.moduleUrl = moduleUrl
    }

    //- 返回實例
    protected async _init(){
        return new (await loadModule<any>(this.moduleUrl))(this.props)
    }

    //- 可被覆寫或直接呼叫
    async create(){
      return await this._init()
    }
}

export class MapImageLayer extends Layer<__esri.MapImageLayerProperties>{
    async create(){
        this.props.listMode = "hide-children" // arcgis's LayerList widget
        if(!this.props.hasOwnProperty("sublayers")){
            this.props.sublayers = []
        }
        const IDs = this.props.LayerIds.split(",").map(i=>+i).sort((a,b)=>b-a)
        // console.log("[IDs]",IDs)

        /** descending @see https://community.esri.com/thread/216434-how-to-control-sublayer-visibility-in-47-mapimagelayer */
        IDs.forEach(id=>{
            this.props.sublayers.push({
                id:id,
                visible:true
            })
        })
        // console.log("[this.props.sublayers]",this.props)
        // console.log("[this.props.sublayers]",this.props.sublayers)

        return await this._init() as __esri.MapImageLayer
    }
}
class TileLayer extends Layer<__esri.TileLayerProperties>{}
class FeatureLayer extends Layer<__esri.FeatureLayerProperties>{}
class GraphicsLayer extends Layer<__esri.GraphicsLayerProperties>{}
class WMSLayer extends Layer<__esri.WMSLayerProperties>{}
class WebTileLayer extends Layer<__esri.WebTileLayerProperties>{}
class OpenStreetMapLayer extends Layer<__esri.OpenStreetMapLayerProperties>{}
class SceneLayer extends Layer<__esri.SceneLayerProperties>{}
// class GoogleMapsLayer extends Layer{}

class WMTSLayer extends Layer<__esri.WMTSLayerProperties>{
    // @override
    async create(){
        let deSerialize_properties = JSON.parse(this.props.UserSetting)

        let remaped_wmtss_properties: __esri.WMTSSublayerProperties = {}

        if('wmtsLayerInfo' in deSerialize_properties){
            remaped_wmtss_properties.id = deSerialize_properties['wmtsLayerInfo']['identifier']
            remaped_wmtss_properties.tileMatrixSetId = deSerialize_properties['wmtsLayerInfo']['tileMatrixSet']
            remaped_wmtss_properties.imageFormat = deSerialize_properties['wmtsLayerInfo']['format']
        }

        this.props.activeLayer = new (await loadModule<__esri.WMTSSublayerConstructor>("esri/layers/support/WMTSSublayer"))(remaped_wmtss_properties)
        return new (await loadModule<__esri.WMTSLayerConstructor>("esri/layers/WMTSLayer"))(this.props)
    }
}

export class LayerFactory {

    //- *_bucket 為地圖實例 參考
    baseLayer_bucket:__esri.Layer[] = []
    layer_bucket:__esri.Layer[] = []
    graphiclayer_bucket:__esri.GraphicsLayer[] = []

    //- defLoadLyr 僅保存為建構需要的屬性(已匹配)
    notDefaultLoadLayerProps:__layer.mixinLayerProperties[] = []

    private _Map:__esri.Map|__esri.WebMap|__esri.WebScene

    constructor(map:__esri.Map|__esri.WebMap|__esri.WebScene){
        this._Map = map
    }

    async LegendViewModel(view:__esri.MapView){
        const LegendViewModel = await loadModule<any>("esri/widgets/Legend/LegendViewModel")
        return new LegendViewModel({view})
    }

    async addRawLayer(type:"baseLayer"|"layer"|"graphiclayer",{
        ArcgisLayerOption,
        DataStatus,
        DefLoadLyr,
        ID,
        MGroup,
        SubGroup,
        LayerIds,
        MaxScale,
        MinScale,
        Opacity,
        UserSetting,
        Visible,
        AgsToken,
        isExplain,
        ImgUrl,
        Datatype,
        LayerName,
        MapSrvUrl,
        ...args
    }:__layer.customLayerProperties){

        try{
            console.log("[ before build lyrOpts, uncapture args ]",args)
            // grab props esri need & alias 
            let layerOpts:__layer.baseEsriLayerProperties&__layer.customLayerProperties = {
                id: String(ID || args['id'] || `layer_${this._Map.layers.length}`),
                title: LayerName || args['name'] || args['title'] || `layer_${this._Map.layers.length}`,
                opacity: Opacity || args['opacity'] || 1,
                visible: Visible || args['visible'] || true,
                url: MapSrvUrl || args["url"],
                minScale: MinScale || args['minScale'] || 0,
                maxScale: MaxScale || args['maxScale'] || 0,
                ArcgisLayerOption,
                DataStatus,
                DefLoadLyr: DefLoadLyr || args['defLoadLyr'] || false,
                MGroup: MGroup || args['mgroup'],
                SubGroup: SubGroup || args['subGroup'] || args['sgroup'],
                LayerIds: LayerIds || args["layerIds"],
                UserSetting: UserSetting || args["userSetting"] || Object.create(null),
                AgsToken,
                isExplain,
                ImgUrl: ImgUrl || args["imgUrl"],
                Datatype: Datatype || args["layerType"] || args["LayerType"] || args["dataType"]
            }
            console.log("[ after build lyrOpts, layerOpts ]",layerOpts)

            // ensure default load layer is visible 
            if(layerOpts.DefLoadLyr) layerOpts.visible = true
            // check not default load layer has saved or not every time
            if(!layerOpts.DefLoadLyr && type !=='graphiclayer'){
                const ptr = this.notDefaultLoadLayerProps.find(tl=>tl.id == layerOpts.id)
                if(!ptr){ // just keep
                    this.notDefaultLoadLayerProps.push(layerOpts)
                    return
                }
                // can be add remove record
                const idx = this.notDefaultLoadLayerProps.indexOf(ptr)
                this.notDefaultLoadLayerProps.splice(idx,1)
            }

            let layer_instance:any
            if(/^ArcGISDynamicMapServiceLayer$|^MapImageLayer$/ig.test(layerOpts.Datatype)){
                layer_instance = await new MapImageLayer("esri/layers/MapImageLayer",layerOpts).create()
            }else if(/FeatureLayer/ig.test(layerOpts.Datatype)){
                layer_instance = await new FeatureLayer("esri/layers/FeatureLayer",layerOpts).create()
            }else if(/GraphicsLayer/ig.test(layerOpts.Datatype)){
                layer_instance = await new GraphicsLayer("esri/layers/GraphicsLayer",layerOpts).create()
            }else if(/WMTSLayer/ig.test(layerOpts.Datatype)){
                layer_instance = await new WMTSLayer("esri/layers/WMTSLayer",layerOpts).create()
            }else if(/WMSLayer/ig.test(layerOpts.Datatype)){
                layer_instance = await new WMSLayer("esri/layers/WMSLayer",layerOpts).create()
            }else if(/OpenStreetMapLayer/ig.test(layerOpts.Datatype)){
                layer_instance = await new OpenStreetMapLayer("esri/layers/OpenStreetMapLayer",layerOpts).create()
            }else if(/SceneLayer/ig.test(layerOpts.Datatype)){
                layer_instance = await new SceneLayer("esri/layers/SceneLayer",layerOpts).create()
            }else if(/^ArcGISTiledMapServiceLayer$|^TileLayer$/ig.test(layerOpts.Datatype)){
                layer_instance = await new TileLayer("esri/layers/TileLayer",layerOpts).create()
            }else if(/^WebTileLayer$|^WebTiledLayer$/ig.test(layerOpts.Datatype)){
                layer_instance = await new WebTileLayer("esri/layers/WebTileLayer",layerOpts).create()
            }

            this._Map.add(layer_instance)
            this._handleLayerGroup(type,layer_instance)
            
            return layer_instance

        }catch(e){
            throw new Error("addRawLayer() : " + e)
        }
    }

    private _handleLayerGroup(type:"baseLayer"|"layer"|"graphiclayer",layer_instance:__esri.Layer){
        switch (type) {
            case "baseLayer":
                this.baseLayer_bucket.push(layer_instance)
                
                //- 保持"加入"的底圖在最上方 並且唯一開啟
                if(this.baseLayer_bucket.length !== 1){
                    layer_instance.visible = false
                }
                this._Map.reorder(layer_instance,this.baseLayer_bucket.length-1)
                break;
            case "layer":
                //- 覆蓋有相同 ID 的狀態
                this.layer_bucket = this.layer_bucket.filter(l=>l.id !== layer_instance.id)
                this.layer_bucket.push(layer_instance)
                break;
            case "graphiclayer":
                this.graphiclayer_bucket.push(layer_instance as __esri.GraphicsLayer)
                break;
        }
        //- 保持繪圖圖層都在地圖最上方
        this.graphiclayer_bucket.length>0 && this.graphiclayer_bucket.forEach(ptr=>{
            this._Map.reorder(ptr,this._Map.layers.length-1)
        })
        
        console.log("baseLayer_bucket",this.baseLayer_bucket)
        console.log("layer_bucket",this.layer_bucket)
        console.log("graphiclayer_bucket",this.graphiclayer_bucket)
    }

    reorderInBucket(props:__layer.handleOption,index:number){
        try{
            let ptr = this[`${props.type}_bucket`].find(el=>el.id === props.id)
            
            switch(props.type){
                case "layer":
                    this._Map.reorder(ptr,this.baseLayer_bucket.length + this.layer_bucket.length - index - 1)
                break
                case "baseLayer":
                    this._Map.reorder(ptr,index)
                break
                case "graphiclayer":
                    this._Map.reorder(ptr,this.baseLayer_bucket.length + this.layer_bucket.length + this.graphiclayer_bucket.length - index - 1)
                break
            }
            
        }catch(e){
            throw new Error(e)
        }
    }
    
    handleVisibilityInBucket(props:__layer.handleOption,value:boolean){
        try{
            let ptr = this[`${props.type}_bucket`].find(el=>el.id === props.id)
            ptr.visible = value
        }catch(e){
            throw new Error(e)
        }
    }
    
    handleOpacityInBucket(props:__layer.handleOption,value:number){
        try{
            let ptr = this[`${props.type}_bucket`].find(el=>el.id === props.id)
            ptr.opacity = value>1 ? value/100 : value
        }catch(e){
            throw new Error(e)
        }
    }
    //- for baseMap : singleton
    handleBaseLayerVisibility(id:string){
        this.baseLayer_bucket.forEach(bLyr => {
            bLyr.visible = bLyr.id === id
        })
    }
    handleBaseLayerOpacity(value:number){
        this.baseLayer_bucket.forEach(bLyr => {
            if(bLyr.visible){
                bLyr.opacity = value>1 ? value/100 : value
            }
        })
    }

    //- for normal layer
    handleLayerVisibility(id:string,value:boolean){
        this.handleVisibilityInBucket({
            type:"layer",
            id:id
        },value)
    }
    handleLayerOpacity(id:string,value:number){
        this.handleOpacityInBucket({
            type:"layer",
            id:id
        },value)
    }
    
    removeInBucket(props:__layer.handleOption){
        try{

            let bucket = this[`${props.type}_bucket`]

            //- 從對應 BUCKET 找到對應圖層
            let ptr = bucket.find(el=>el.id === props.id)
            this._Map.remove(ptr)

        }catch(e){
            throw new Error(e)
        }
    }
}