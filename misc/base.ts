import { loadModule, Init } from './init';
import { EventHub,GeometryTransaction } from './utils';

export class DefaultDraw {

    Glyr:__esri.GraphicsLayer

    Graphic:__esri.GraphicConstructor
    Engine:__esri.geometryEngineAsync
    Translator:GeometryTransaction

    protected _View:__esri.MapView|__esri.SceneView
    protected _Map:__esri.Map|__esri.WebMap|__esri.WebScene

    constructor(Init:Init,Glyr:__esri.GraphicsLayer){
        this.Glyr = Glyr
        this._View = Init.view
        this._Map = Init.map
        this.Translator= new GeometryTransaction(Init)
    }
    
    async prepare():Promise<void>{
        if(!this.Graphic) this.Graphic = await loadModule<__esri.GraphicConstructor>("esri/Graphic")
        if(!this.Engine) this.Engine = await loadModule<__esri.geometryEngineAsync>("esri/geometry/geometryEngineAsync")
    }
    
    async getGlyrfromWKT(
        wkts:string[],
        symbol_partial_property?:any,
        src_spatialReference:__esri.SpatialReferenceProperties={wkid:102443},
    ){

        //- 先建立繪圖圖層、進行準備動作
        await this.prepare()
        
        //- get Arcgis geometries
        let geometries = await this.Translator.convertToArcGIS(wkts,src_spatialReference)

        //- merge Arcgis geometries by Engine if need (wkts.length >1)
        let geometry:__esri.Geometry
        if(wkts.length>1 && Array.isArray(geometries)){
            geometry = await this.Engine.union(geometries)
        }else{
            geometry = geometries[0]
        }
        
        //- 混和樣式屬性
        let point_symbol_mix = {...{
            type: "picture-marker",  // autocasts as new PictureMarkerSymbol()
            url: "data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTkuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeD0iMHB4IiB5PSIwcHgiIHZpZXdCb3g9IjAgMCA0ODYuMyA0ODYuMyIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDg2LjMgNDg2LjM7IiB4bWw6c3BhY2U9InByZXNlcnZlIiB3aWR0aD0iNTEycHgiIGhlaWdodD0iNTEycHgiPgo8Zz4KCTxwYXRoIHN0eWxlPSJmaWxsOiNDRDJBMDA7IiBkPSJNMjQzLjE1LDB2MTA0LjRjNDQuMTEsMCw4MCwzNS44OCw4MCw4MGMwLDQ0LjExLTM1Ljg5LDgwLTgwLDgwdjIyMS45bDE0Ni40My0xODQuMSAgIGMyNi4yOS0zMy4yNSw0MC4xOS03My4yMSw0MC4xOS0xMTUuNThDNDI5Ljc3LDgzLjcyLDM0Ni4wNSwwLDI0My4xNSwweiIvPgoJPHBhdGggc3R5bGU9ImZpbGw6I0Q4RDdEQTsiIGQ9Ik0zMjMuMTUsMTg0LjRjMC00NC4xMi0zNS44OS04MC04MC04MHYxNjBDMjg3LjI2LDI2NC40LDMyMy4xNSwyMjguNTEsMzIzLjE1LDE4NC40eiIvPgoJPHBhdGggc3R5bGU9ImZpbGw6I0ZGMzUwMTsiIGQ9Ik0xNjMuMTUsMTg0LjRjMC00NC4xMiwzNS44OS04MCw4MC04MFYwQzE0MC4yNSwwLDU2LjUzLDgzLjcyLDU2LjUzLDE4Ni42MiAgIGMwLDQyLjM3LDEzLjksODIuMzMsNDAuMjMsMTE1LjYyTDI0My4xNSw0ODYuM1YyNjQuNEMxOTkuMDQsMjY0LjQsMTYzLjE1LDIyOC41MSwxNjMuMTUsMTg0LjR6Ii8+Cgk8cGF0aCBzdHlsZT0iZmlsbDojRkZGRkZGOyIgZD0iTTE2My4xNSwxODQuNGMwLDQ0LjExLDM1Ljg5LDgwLDgwLDgwdi0xNjBDMTk5LjA0LDEwNC40LDE2My4xNSwxNDAuMjgsMTYzLjE1LDE4NC40eiIvPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+Cjwvc3ZnPgo=",
            width: 20,
            height: 20
        },...symbol_partial_property}

        let polygon_symbol_mix = {...{
            type: "simple-fill",
            color: [ 0,0, 255, 0.2 ],
            outline: {
                style:"dash-dot",
                color: [5, 5, 100, 0.95],
                width: 1
            }
        },...symbol_partial_property}

        // 清除圖層內的圖形
        this.Glyr.graphics.removeAll()
        
        //- 添加圖形到 glyr
        this.Glyr.add(new this.Graphic({
            geometry:geometry,
            symbol: /point/ig.test(geometry.type) ? point_symbol_mix : polygon_symbol_mix
        }))

        return this.Glyr
    }

    /**
     * 從實例中的成員 glyr 其中的 geometry 取得 WKT
     */
    async getWKTfromGlyr():Promise<string>{
        /**
         * this.glyr.graphics is Esri/Collection - use toArray() 
         * @see https://developers.arcgis.com/javascript/latest/api-reference/esri-core-Collection.html#toArray
         */
        let geometries = this.Glyr.graphics.toArray().map(g=>g.geometry).filter(g=>g)
        let unioned_geometries = await this.Engine.union(geometries)
        //- conver to wkts
        let resWKT = await this.Translator.convertToWkt([unioned_geometries])
        return resWKT
    }

    
    /**
     * @overload 
     * @param {undefine} type 清除所有 graphics
     * @param {__esri.geometry.Geometry['type']} type 清除指定 graphics
     */
    clearGraphics(type?:__esri.geometry.Geometry['type'])
    clearGraphics(type:unknown){
        if(type === "polyline" || type === "polygon" || type === "point"){
            this.Glyr.graphics.removeMany(this.Glyr.graphics.toArray().filter(graphic=>graphic.geometry && graphic.geometry.type === type))            
        }else if(type === undefined){
            this.Glyr.graphics.removeAll()
        }
    }

    /**
     * 放大幾何 
     * 1. point 增益為 circle
     * 2. 未定義 則預設，增益為 polygon
     * @param geometryInstance 幾何實例
     * @param buffer 增加量
     * 
     * ! Migrate Problem from v3.x
     * 增益為多邊形時未使用標準化，但舊有原著有使用類似方法 - 標準化 gemetry[] 的坐標
     * @see https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-support-normalizeUtils.html
     * @see https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-support-normalizeUtils.html#normalizeCentralMeridian
     * 
     */
    async buffGeometry(geometryInstance:__esri.geometry.Geometry,buffer:number):Promise<__esri.geometry.Geometry>{
        if(geometryInstance.type==='point'){ // 圓形
            return new (await loadModule("esri/geometry/Circle") as __esri.CircleConstructor)({
                center: geometryInstance,
                radius: buffer,
                radiusUnit: "meters",
                spatialReference: this._View.spatialReference
            }) as __esri.Circle
        }else{ // 多邊形
            let geometry = await this.Engine.simplify(geometryInstance)
            return await this.Engine.geodesicBuffer(geometry, buffer, "meters") as __esri.Polygon
        }
    }
}

export class TipText {
    
    dom:HTMLElement
    view:__esri.MapView|__esri.SceneView

    constructor(view:__esri.MapView|__esri.SceneView,style?:string){
        
        this.view = view
        this.dom = document.createElement("small")

        this.view.container.appendChild(this.dom)

        let defaultStyle = `
            visibility:hidden;
            position:fixed;
            top:0px;
            left:0px;
            margin:1rem 0 0 1rem;
            padding:0.5rem;
            pointer-events:none;
            background:rgba(0,0,0,0.5);
            color:#fff;
            border-radius:5px;
        `
        this.dom.style.cssText = defaultStyle + style

    }
    
    setPosition(evt:__draw.drawingEvt){
        this.dom.style.transform =`translate(${evt.native.clientX}px,${evt.native.clientY}px)`
        this.dom.style.visibility = "visible"
    }

    setText(text:string,type?:"warning"){
        this.dom.innerText = text
        this.dom.style.background = "rgba(0,0,0,0.5)"
        this.dom.style.color = "#fff"
        if(type==="warning"){
            this.dom.style.color = "red"
            this.dom.style.background = "rgba(256,256,256,0.8)"
        }
    }

    destroy(){
        //- remove all
        if(this.view.container.contains(this.dom)){
            this.view.container.removeChild(this.dom)
        }
    }

}

interface IDrawTool extends DefaultDraw{
    symbol:__draw.symbolOption
    buffer_symbol:__draw.symbolOption
    Action:__esri.DrawAction
    Draw:__esri.Draw
    buffer:number
    TipText:TipText
    EventHub:EventHub
    SketchViewModel:__esri.SketchViewModel
    perform():Promise<void>
    addToGlry(geometry:__esri.geometry.Geometry,checkBuffer:boolean):Promise<void>
    createPolylineByEvt(evt:__draw.polylineEvent):Promise<__esri.Polyline>
    createPointByEvt(evt:__draw.pointEvent):Promise<__esri.Point>
    createPolygonByEvt(evt:__draw.polygonEvent|__draw.polylineEvent):Promise<__esri.Polygon>
    destroy()
}

export abstract class DrawTool extends DefaultDraw implements IDrawTool{
    
    symbol:__draw.symbolOption
    buffer_symbol:__draw.symbolOption
    
    Action:__esri.DrawAction
    Draw:__esri.Draw

    buffer:number = 0
    TipText:TipText
    EventHub:EventHub
    SketchViewModel:__esri.SketchViewModel

    abstract async perform():Promise<void>
    abstract async addToGlry(geometry:__esri.geometry.Geometry,checkBuffer:boolean):Promise<void>

    async create(option?:__draw.searchOption){
        if(!this.TipText){
            this.TipText = new TipText(this._View)
        }

        await this.prepare()

        if(option){
            this.symbol = {...this.symbol,...option.symbol} as __draw.symbolOption
            this.buffer_symbol = {...this.buffer_symbol,...option.buffer_symbol} as __draw.symbolOption
        }

        this._View.focus()
        this.Draw = new (await loadModule<__esri.DrawConstructor>("esri/views/draw/Draw"))({view:this._View})
        
        this.SketchViewModel = new (await loadModule<__esri.SketchViewModelConstructor>("esri/widgets/Sketch/SketchViewModel"))({
            view:this._View,
            layer:this.Glyr,
            defaultUpdateOptions:{
                enableRotation:false,
                enableScaling:false
            },
            updateOnGraphicClick:false
        })
        this.EventHub = new EventHub()
    }

    //- each geometries instance create methods
    async createPolylineByEvt(evt:__draw.polylineEvent):Promise<__esri.Polyline>{ //- __esri.GeometryProperties
        return new (await loadModule<__esri.PolylineConstructor>("esri/geometry/Polyline"))({
            paths: [evt.vertices],
            spatialReference: this._View.spatialReference
        })
    }

    async createPointByEvt(evt:__draw.pointEvent):Promise<__esri.Point>{
        return new (await loadModule<__esri.PointConstructor>("esri/geometry/Point"))({
            x: evt.coordinates[0],
            y: evt.coordinates[1],
            spatialReference: this._View.spatialReference
        })
    }

    async createPolygonByEvt(evt:__draw.polygonEvent|__draw.polylineEvent):Promise<__esri.Polygon>{
        return new (await loadModule<__esri.PolygonConstructor>("esri/geometry/Polygon"))({
            rings: [evt.vertices],
            spatialReference: this._View.spatialReference
        })
    }

    destroy(){
        if(this.TipText){
            this.TipText.destroy()
            this.TipText = null
        }
        this.Draw && this.Draw.destroy()
        this.Action && this.Action.destroy()
    }
}