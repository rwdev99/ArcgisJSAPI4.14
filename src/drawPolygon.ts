import { proj84to97,loadModule,TipText,EventHub }from './utils'
import { BaseDraw } from './draw'

export class DrawPolygon extends BaseDraw {
    
    buffer: number = 0

    Polygon:__esri.PolygonConstructor
    
    Draw:__esri.DrawConstructor
    drawAction:__esri.DrawAction

    SketchViewModel:__esri.SketchViewModelConstructor
    sketchViewModel:__esri.SketchViewModel

    tipText:TipText
    eventHub:EventHub

    timestampQueue:number[] = new Array()

    private isCross:boolean = false

    async load(){
        await super.load()
        this.Polygon = await loadModule<__esri.PolygonConstructor>("esri/geometry/Polygon")
        this.Draw = await loadModule<__esri.DrawConstructor>("esri/views/draw/Draw")
        this.SketchViewModel = await loadModule<__esri.SketchViewModelConstructor>("esri/widgets/Sketch/SketchViewModel")
        this.tipText = new TipText(this.view)
        this.eventHub = new EventHub()
        return this
    }

    /** avoid graphic sparkle : excute in drawAction before add to glyr */
    private async _convertPolygon(polygon:__esri.Polygon){
        // reverse rings for fill color when rings is not clockwise
        if(!polygon.isClockwise(polygon.rings[0])){
            polygon.rings[0].reverse()
        }
        
        if(polygon.rings[0].length>3){
            let prvPloygon = polygon.clone()
            prvPloygon.removePoint(0,polygon.rings[0].length-1)
            const isCross = await this.Engine.overlaps(polygon,prvPloygon)
            if(isCross){
                return await this.Engine.simplify(polygon) as __esri.Polygon
            }
        }

        return polygon
    }

    private async _addGraphicToGlyr(geometry:__esri.geometry.Geometry,timestamp:number){
        
        if(geometry.type !== "polygon"){
            console.error(`_addAndBuffGraphicToGlyr() input geometry ${geometry}`)
            return
        }
        
        // assign symbol style
        let symbol:__esri.SimpleFillSymbolProperties|__esri.SimpleLineSymbolProperties = this.polygonSymbol
        // "lineSymbol" was not allow when the rings couldn't construct polygon
        if(geometry.rings[0].length<3){
            symbol = {
                type: "simple-line", 
                color: [4, 90, 141],
                width: 1,
                cap: "round",
                join: "round"
            }
        } 
        if(this.isCross){
            symbol = {
                type: "simple-fill",
                color: [ 255,0, 0, 0.2 ],
                outline: {
                    style:"dash-dot",
                    color: [255, 0, 0, 0.8],
                    width: 1
                }
            }
        }

        this.glyr.add(new this.Graphic({
            geometry,
            attributes:{timestamp},
            symbol
        }))

    }
    
    private async _addAndBuffGraphicToGlyr(geometry:__esri.geometry.Geometry,timestamp:number){
        if(!this.buffer) return

        if(geometry.type !== "polygon"){
            console.error(`_addAndBuffGraphicToGlyr() input geometry ${geometry}`)
            return
        }


        let symbol:__esri.SimpleFillSymbolProperties = {
            type: "simple-fill",
            color: [ 0,0, 255, 0.2 ],
            outline: {
                style:"dash-dot",
                color: [5, 5, 100, 0.95],
                width: 1
            }
        }
        
        this.glyr.add(new this.Graphic({
            geometry: await this.buffGeometry(geometry,this.buffer),
            attributes:{timestamp},
            symbol
        }))
    }

    private _setTipText(
        vertexIndex:
        __esri.PolygonDrawActionVertexAddEvent['vertexIndex']|
        __esri.PolygonDrawActionCursorUpdateEvent['vertexIndex']
    ){
        if(vertexIndex === 0) this.tipText.setText("單擊左鍵開始繪製，雙擊左鍵完成")
        else if(vertexIndex === 0) this.tipText.setText("請繼續單擊左鍵")
        else this.tipText.setText("繼續單擊左鍵繪製，或雙擊左鍵完成")
        
        if(this.isCross) this.tipText.setText("請移動滑鼠，當前位置不允許設置點，會使圖形破碎","warning")
    }

    clearGraphicsByTime(timestamp:number, type?:string){
        for (const graphic of this.glyr.graphics.toArray()) {
            if(graphic.attributes.timestamp === timestamp || graphic.geometry.type === type){
                this.glyr.graphics.remove(graphic)
            }
        }
    }

    draw(){
        // init
        const timestamp = Date.now()
        this.drawAction = new this.Draw({view:this.view}).create("polygon",{mode:"click"})
        this.view.focus()

        // start
        this.tipText.setText("點擊地圖進行")
        
        this.drawAction.on('vertex-add',async (evt:__esri.PolygonDrawActionVertexAddEvent&{native:MouseEvent})=>{
            const polygon = new this.Polygon({
                rings: [evt.vertices],
                spatialReference: this.view.spatialReference
            })
            const spolygon = await this._convertPolygon(polygon)

            this._setTipText(evt.vertexIndex)
            this.clearGraphicsByTime(timestamp)
            await this._addGraphicToGlyr(spolygon,timestamp)
        })
        this.drawAction.on("cursor-update",async (evt:__esri.PolygonDrawActionCursorUpdateEvent&{native:MouseEvent})=>{
            const polygon = new this.Polygon({
                rings: [evt.vertices],
                spatialReference: this.view.spatialReference
            })
            const spolygon = await this._convertPolygon(polygon)

            this.tipText.setPosition(evt.native.x,evt.native.y)
            this._setTipText(evt.vertexIndex)
            
            this.clearGraphicsByTime(timestamp)
            await this._addGraphicToGlyr(spolygon,timestamp)
        })
        this.drawAction.on('draw-complete',async (evt:__esri.PolygonDrawActionDrawCompleteEvent)=>{
            const polygon = new this.Polygon({
                rings: [evt.vertices],
                spatialReference: this.view.spatialReference
            })
            const spolygon = await this._convertPolygon(polygon)

            this.clearGraphicsByTime(timestamp)
            await this._addGraphicToGlyr(spolygon,timestamp)
            await this._addAndBuffGraphicToGlyr(spolygon,timestamp)

            this.tipText.setText('')
            
            this.timestampQueue.push(timestamp)
            if(this.timestampQueue.length>1){
                const t = this.timestampQueue.shift()
                this.clearGraphicsByTime(t)
            }
            this.eventHub.emit("complete")
        })
    }

    sketch(){
        // init
        if(this.sketchViewModel) this.sketchViewModel.destroy()
        this.sketchViewModel = new this.SketchViewModel({
            view:this.view,
            layer:this.glyr,
            defaultUpdateOptions:{
                enableRotation:false,
                enableScaling:false
            },
            updateOnGraphicClick:false,
            polygonSymbol:this.polygonSymbol
        })

        // start
        this.sketchViewModel.create("polygon",{mode:"click"})
        this.eventHub.emit("tipText","繪製多邊形，請點擊地圖來產生至少 3 個點來進行調整") 
        
        let cLastGs = new Array<__esri.Graphic>()
        let uLastG:__esri.Graphic = null

        this.sketchViewModel.on("create",evt=>{
            if(evt.state==="cancel"){
                return
            }
            if(evt.state==="complete"){
                uLastG = cLastGs.pop()
                this.sketchViewModel.update(uLastG,{tool:"reshape"})
                cLastGs = []
                return
            }
            if(evt.toolEventInfo.type === "vertex-add"){
                cLastGs.push(evt.graphic)
                if(cLastGs.length > 2) { // 可構成面，交給使用者變形
                    this.eventHub.emit("tipText","拖動各圓點改變多邊形，點擊其他地方完成操作") 
                    this.sketchViewModel.complete()
                }
            }
        })

        this.sketchViewModel.on("update",async evt=>{
            if(evt.state === "complete" || evt.state === "cancel"){
                this.eventHub.emit("tipText","處理中...") 
                this.eventHub.emit("complete")
            }
            let isCross = false
            isCross = await this.Engine.overlaps(uLastG.geometry,evt.graphics[0].geometry)
            if(!isCross){
                uLastG = evt.graphics[0]
            }else{
                this.eventHub.emit("tipText","圖形發生交集，請重試") 
                this.sketchViewModel.undo()
            }
        })
    }

    destroy(){
        super.destroy()
        if(this.tipText) this.tipText.destroy()
        if(this.drawAction) this.drawAction.destroy()
        if(this.sketchViewModel) this.sketchViewModel.destroy()

        console.log("[DrawPolygon destroyed]")
    }
}
let drawPolygon:DrawPolygon = null
export const measure  = async (view:__esri.MapView,map:__esri.Map)=>{
    if(drawPolygon) return
    
    drawPolygon = await new DrawPolygon(view,map).load()
    // when finished ; emit "complete" event to "drawPolygon.eventHub" and must register event first
    drawPolygon.eventHub.on('complete',async ()=>{
        
        drawPolygon.draw()
        
        console.log("[ draw complete do measure ]", drawPolygon.glyr.graphics.toArray)
        const g = drawPolygon.glyr.graphics.getItemAt(0).geometry as __esri.Polygon
        // todo union to a polygon ??

        const res = {
            area_hectare:await drawPolygon.Engine.geodesicArea(g,"hectares"),
            area_metric:await drawPolygon.Engine.geodesicArea(g,"square-meters"),
            length_metric:await drawPolygon.Engine.geodesicLength(g,"meters"),
            length_kmetric:await drawPolygon.Engine.geodesicLength(g,"kilometers"),
        }

        console.log("[drawPolygon measure]",res)
    })

    await drawPolygon.draw()
}
export const search  = async (view:__esri.MapView,map:__esri.Map)=>{
    if(drawPolygon) return
    
    drawPolygon = await new DrawPolygon(view,map).load()
    // when finished ; emit "complete" event to "drawPolygon.eventHub" and must register event first
    drawPolygon.eventHub.on('complete',async ()=>{
        console.log("[ draw complete do search]")
        drawPolygon.draw()
        const wktstr = await drawPolygon.getWkt()
        console.log(wktstr)
    })

    await drawPolygon.draw()
}
export const destroy = ()=>{
    if(drawPolygon) drawPolygon.destroy()
    drawPolygon = null
}
export const setBuffer = (buffer:number) => drawPolygon.buffer = Number(buffer) || 0