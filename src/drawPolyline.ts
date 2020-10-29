import { proj84to97,loadModule,TipText,EventHub }from './utils'
import { BaseDraw } from './draw'

export class DrawPolyline extends BaseDraw {
    
    buffer: number = 0
    
    Polyline:__esri.PolylineConstructor

    Draw:__esri.DrawConstructor
    drawAction:__esri.DrawAction

    SketchViewModel:__esri.SketchViewModelConstructor
    sketchViewModel:__esri.SketchViewModel

    tipText:TipText
    eventHub:EventHub

    timestampQueue:number[] = new Array()
    
    async load(){
        await super.load()
        this.Polyline = await loadModule<__esri.PolylineConstructor>("esri/geometry/Polyline")
        this.Draw = await loadModule<__esri.DrawConstructor>("esri/views/draw/Draw")
        this.SketchViewModel = await loadModule<__esri.SketchViewModelConstructor>("esri/widgets/Sketch/SketchViewModel")
        this.tipText = new TipText(this.view)
        this.eventHub = new EventHub()
        return this
    }

    private async _addGraphicToGlyr(geometry:__esri.geometry.Geometry,timestamp:number){
        this.glyr.add(new this.Graphic({
            geometry,
            attributes:{timestamp},
            symbol: this.polylineSymbol
        }))
    }
    
    private async _addAndBuffGraphicToGlyr(geometry:__esri.geometry.Geometry,timestamp:number){
        if(!this.buffer) return
        this.glyr.add(new this.Graphic({
            geometry: await this.buffGeometry(geometry,this.buffer),
            attributes:{timestamp},
            symbol: Object.assign(this.polylineSymbol,{join: "miter"})
        }))
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
        this.drawAction = new this.Draw({view:this.view}).create("polyline",{mode:"click"})
        this.view.focus()

        // start
        this.tipText.setText("點擊地圖繪製起點")
        this.drawAction.on([
            'vertex-add',
            'cursor-update',
            'draw-complete'
        ],async (evt:(__esri.PolylineDrawActionVertexAddEvent|__esri.PolylineDrawActionCursorUpdateEvent|__esri.PolylineDrawActionDrawCompleteEvent)&{native:MouseEvent})=>{
            
            const polyline = new this.Polyline({
                paths: [evt.vertices],
                spatialReference: this.view.spatialReference
            })

            // if buffer ; only clear line 
            this.buffer>0 ? this.clearGraphicsByTime(timestamp,'polyline') : this.clearGraphicsByTime(timestamp)
            
            switch(evt.type){
                case 'vertex-add':
                    this.tipText.setText("再繼續點擊或雙擊可完成")
                    await this._addGraphicToGlyr(polyline,timestamp)
                    await this._addAndBuffGraphicToGlyr(polyline,timestamp)
                    break
                case 'cursor-update':
                    this.tipText.setPosition(evt.native.x,evt.native.y)
                    this._addGraphicToGlyr(polyline,timestamp)
                    break
                case 'draw-complete':
                    await this._addGraphicToGlyr(polyline,timestamp)
                    await this._addAndBuffGraphicToGlyr(polyline,timestamp)

                    this.tipText.setText('')
                    
                    this.timestampQueue.push(timestamp)
                    if(this.timestampQueue.length>1){
                        const t = this.timestampQueue.shift()
                        this.clearGraphicsByTime(t)
                    }
                    this.eventHub.emit("complete")
                    break
            }
        })
    }

    async sketch(){
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
            polylineSymbol:this.polylineSymbol
        })
        this.sketchViewModel.create("polyline",{mode:"click"})
        this.view.focus()

        // start
        let grcs = new Array<__esri.Graphic>()
        this.eventHub.emit("tipText","在約略位置點擊地圖建立線段起始點")
        this.sketchViewModel.on("create",evt=>{
            this.eventHub.emit("tipText","建立線段結束點")
            grcs.push(evt.graphic)
            if(grcs.length > 1){ // 兩點以上就開始請使用者修正位置
                this.sketchViewModel.complete()
                this.sketchViewModel.update(grcs,{tool:"reshape"})
                grcs.splice(0,grcs.length-1)
            }
        })
        this.sketchViewModel.on("update",evt=>{
            this.eventHub.emit("tipText","調整或移動線段成您想要的樣子，按下「確定」或 點擊其他地方來完成操作")
            if(evt.state==='complete'||evt.state==='cancel'){
                this.eventHub.emit("tipText","處理中...")
                this.eventHub.emit("complete")
            }
        })
    }

    
    destroy(){
        super.destroy()
        if(this.tipText) this.tipText.destroy()
        if(this.drawAction) this.drawAction.destroy()
        if(this.sketchViewModel) this.sketchViewModel.destroy()

        console.log("[DrawPolyline destroyed]")
    }
}


let drawPolyline:DrawPolyline = null
export const measure  = async (view:__esri.MapView,map:__esri.Map)=>{
    if(drawPolyline) return
    
    drawPolyline = await new DrawPolyline(view,map).load()
    // when finished ; emit "complete" event to "drawPolyline.eventHub" and must register event first
    drawPolyline.eventHub.on('complete',async ()=>{
        drawPolyline.draw()
        
        console.log("[ draw complete do measure ]", drawPolyline.glyr.graphics.toArray)
        
        // todo filter only polyline ??
        const g = drawPolyline.glyr.graphics.getItemAt(0).geometry
        const res = {
            metric:await drawPolyline.Engine.geodesicLength(g,"meters"),
            kmetric:await drawPolyline.Engine.geodesicLength(g,"kilometers")
        }

        console.log(res)
    })

    await drawPolyline.draw()
}
export const search  = async (view:__esri.MapView,map:__esri.Map)=>{
    if(drawPolyline) return
    
    drawPolyline = await new DrawPolyline(view,map).load()
    // when finished ; emit "complete" event to "drawPolyline.eventHub" and must register event first
    drawPolyline.eventHub.on('complete',async ()=>{
        console.log("[ draw complete do search]")
        drawPolyline.draw()
        const wktstr = await drawPolyline.getWkt()
        console.log(wktstr)
    })

    await drawPolyline.draw()
}
export const destroy = ()=>{
    if(drawPolyline) drawPolyline.destroy()
    drawPolyline = null
}
export const setBuffer = (buffer:number) => drawPolyline.buffer = Number(buffer) || 0