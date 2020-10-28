import { proj,loadModule,TipText,EventHub }from './utils'
import { BaseDraw } from './draw'
import { proj84to97 } from './lib/proj4'

export class DrawPoint extends BaseDraw{
    
    buffer: number = 0

    Point:__esri.PointConstructor
    
    Draw:__esri.DrawConstructor
    drawAction:__esri.DrawAction

    SketchViewModel:__esri.SketchViewModelConstructor
    sketchViewModel:__esri.SketchViewModel

    tipText:TipText
    eventHub:EventHub

    timestampQueue:number[] = new Array()

    async load(){
        await super.load()
        this.Point = await loadModule<__esri.PointConstructor>("esri/geometry/Point")
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
            symbol: this.pointSymbol
        }))
    }
    
    private async _addBufferedGraphic(geometry:__esri.geometry.Geometry,timestamp:number){
        if(!this.buffer) return
        this.glyr.add(new this.Graphic({
            geometry: await this.buffGeometry(geometry,this.buffer) as __esri.Circle,
            attributes:{timestamp},
            symbol: this.polygonSymbol
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
        this.drawAction = new this.Draw({view:this.view}).create("point",{mode:"click"})
        this.view.focus()

        // start
        this.tipText.setText("點擊地圖進行")
        this.drawAction.on("cursor-update",async (evt:__esri.PointDrawActionCursorUpdateEvent&{native:MouseEvent})=>{

            this.tipText.setPosition(evt.native.x,evt.native.y)
            
            this.clearGraphicsByTime(timestamp)
            const [x,y] = evt.coordinates
            const point = new this.Point({x,y,spatialReference:this.view.spatialReference})

            await this._addBufferedGraphic(point,timestamp)
        })

        this.drawAction.on("draw-complete",(evt:__esri.PointDrawActionDrawCompleteEvent&{native:MouseEvent})=>{

            this.clearGraphicsByTime(timestamp)
            const [x,y] = evt.coordinates
            const point = new this.Point({x,y,spatialReference:this.view.spatialReference})
            this._addGraphicToGlyr(point,timestamp)

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
            pointSymbol:this.pointSymbol
        })
        this.sketchViewModel.create("point",{mode:"click"})
        this.view.focus()

        // start
        this.eventHub.emit("tipText","在約略位置點擊地圖建立點")
        
        this.sketchViewModel.on("create",evt=>{
            this.eventHub.emit("tipText","拖動圓點修正到您想要的位置")
            this.sketchViewModel.update(evt.graphic,{tool:"reshape"})
        })

        this.sketchViewModel.on("update",evt=>{
            this.eventHub.emit("tipText","確定位置後，點擊其他地方 或按下「確定」來完成操作")
            if(evt.state==="cancel" || evt.state==="complete"){
                this.eventHub.emit("tipText","處理中...")
            }
            this.eventHub.emit("complete",this.glyr)
        })
    }

    destroy(){
        super.destroy()
        if(this.tipText) this.tipText.destroy()
        if(this.drawAction) this.drawAction.destroy()
        if(this.sketchViewModel) this.sketchViewModel.destroy()

        console.log("[DrawPoint destroyed]")
    }
}

let drawPoint:DrawPoint = null
export const measure  = async (view:__esri.MapView,map:__esri.Map)=>{
    if(drawPoint) return
    
    drawPoint = await new DrawPoint(view,map).load()
    // when finished ; emit "complete" event to "drawPoint.eventHub" and must register event first
    drawPoint.eventHub.on('complete',async ()=>{
        console.log("[ draw complete do measure]")
        drawPoint.draw()

        const {latitude,longitude,x,y} = drawPoint.glyr.graphics.getItemAt(0).geometry  as __esri.Point       
        const [X97,Y97] = proj84to97([x,y])

        const res = {latitude,longitude,X97,Y97}

        console.log(res)
    })

    await drawPoint.draw()
}
export const search  = async (view:__esri.MapView,map:__esri.Map)=>{
    if(drawPoint) return
    
    drawPoint = await new DrawPoint(view,map).load()
    // when finished ; emit "complete" event to "drawPoint.eventHub" and must register event first
    drawPoint.eventHub.on('complete',async ()=>{
        console.log("[ draw complete do search]")
        drawPoint.draw()
        const wktstr = await drawPoint.getWkt()
        console.log(wktstr)
    })

    await drawPoint.draw()
}
export const destroy = ()=>{
    if(drawPoint) drawPoint.destroy()
    drawPoint = null
}