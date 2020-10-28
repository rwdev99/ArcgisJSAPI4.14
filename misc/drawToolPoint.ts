import { DrawTool } from './drawTool'
import * as proj from './utils'

export class DrawToolPoint extends DrawTool {
    
    buffer:number = 0
    drawAction:__esri.DrawAction
    
    async addToGlyr(geometry:__esri.geometry.Geometry){
        if(this.buffer){
            this.glyr.add(new this.Graphic({
                geometry: await this.buffGeometry(geometry,this.buffer) as __esri.Circle,
                symbol: this.polygonSymbol
            }))
            return
        }
        this.glyr.add(new this.Graphic({
            geometry,
            symbol: this.pointSymbol
        }))
    }

    async draw(){
        this.tipText.setText("點擊地圖進行")
        this.drawAction = this.drawIns.create("point",{mode:"click"})
        this.drawAction.on("cursor-update",async (evt:__esri.PointDrawActionCursorUpdateEvent&{native:MouseEvent})=>{

            this.tipText.setPosition(evt.native.x,evt.native.y)

            this.clearGraphics()
            const [x,y] = evt.coordinates
            const point = new this.Point({x,y,spatialReference:this.view.spatialReference})
            this.addToGlyr(point)
        })

        await new Promise((res,rej)=>{
            this.drawAction.on("draw-complete",async (evt:__esri.PointDrawActionDrawCompleteEvent)=>{

                this.clearGraphics()
                const [x,y] = evt.coordinates
                const point = new this.Point({x,y,spatialReference:this.view.spatialReference})
                this.addToGlyr(point)

                this.tipText.destroy()
                res()
            })
        })
    }

    async drawSketch(){
        // todo : check wtheater following is need
        // this.sketchViewModel.pointSymbol 
        
        this.eventHub.emit("tipText","在約略位置點擊地圖建立點")
        await new Promise((resolve,reject)=>{

            this.sketchViewModel.on("create",evt=>{
                this.eventHub.emit("tipText","拖動圓點修正到您想要的位置")
                this.sketchViewModel.update(evt.graphic,{tool:"reshape"})
            })

            this.sketchViewModel.on("update",evt=>{
                this.eventHub.emit("tipText","確定位置後，點擊其他地方 或按下「確定」來完成操作")
                if(evt.state==="cancel"||evt.state==="complete"){
                    this.eventHub.emit("tipText","處理中...")
                    resolve()
                }
            })

            this.sketchViewModel.on("delete",evt=>reject())
    
            this.sketchViewModel.create("point",{mode:"click"})
        })
    }

    destory(){
        this.sketchViewModel.delete()
        this.drawAction.destroy()
        this.tipText.destroy()
    }

    async search(stackGlyr?:__esri.GraphicsLayer[]){
        // action loop need create another graphicslyr
    
        await this.draw()
        return await this.getWkt()
    }

    async measure(stackGlyr?:__esri.GraphicsLayer[]){
        
        // action loop need create another graphicslyr
        await this.draw()
        
        const {latitude,longitude,x,y} = this.glyr.graphics.getItemAt(0).geometry as  __esri.Point
        const [X97,Y97] = proj.proj84to97([x,y])

        return {latitude,longitude,X97,Y97}
    }
}
