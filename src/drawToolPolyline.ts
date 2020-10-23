import { DrawTool } from './base';

export class DrawPolyline extends DrawTool {

    protected _symbol:__draw.symbolOption = {
        type: "simple-line", 
        color: [4, 90, 141],
        width: 1,
        cap: "round",
        join: "round"
    }

    protected _buffer_symbol:__draw.symbolOption = {
        type: "simple-line", 
        color: [4, 90, 141],
        width: 1,
        style: "dash-dot",
        join: "miter"
    }

    async addToGlry(geometry:__esri.geometry.Geometry,checkBuffer:boolean){
        this.Glyr.add(new this.Graphic({
            geometry:checkBuffer&&this.buffer>0?await this.buffGeometry(geometry,this.buffer):geometry,
            symbol:checkBuffer&&this.buffer>0?this._buffer_symbol:this._symbol
        }))
    }

    async perform(){

        this.Action = this.Draw.create("polyline",{mode:"click"})
        await new Promise(resolve=>{
            this.Action.on(['vertex-add','cursor-update','draw-complete'],async (
                evt:__esri.PolylineDrawActionVertexAddEvent|__esri.PolylineDrawActionCursorUpdateEvent|__esri.PolylineDrawActionDrawCompleteEvent
            )=>{

                let polyline = await this.createPolylineByEvt(evt)
                
                // if buffer was need only clear line 
                this.buffer>0 ? this.clearGraphics('polyline') : this.clearGraphics()

                switch(evt.type){
                    case 'vertex-add':
                        if(evt.vertexIndex === 0){
                            this.TipText.setText("點擊地圖繪製起點")
                        }
                        this.TipText.setText("再繼續點擊或雙擊可完成")
                        await this.addToGlry(polyline,true)
                        await this.addToGlry(polyline,false)
                        break
                    case 'cursor-update':
                        this.TipText.setPosition(evt)
                        await this.addToGlry(polyline,false)
                        break
                    case 'draw-complete':
                        await this.addToGlry(polyline,true)
                        await this.addToGlry(polyline,false)
                        this.TipText.destroy()
                        resolve()
                        break
                }
            })
        })
        
    }

    async performSketch(){
        await new Promise(resolve=>{
            
            this.SketchViewModel.polylineSymbol = this._symbol as any  // when complete wil be apply

            this.EventHub.emit("tipText","在約略位置點擊地圖建立線段起始點")
            
            let grcs = new Array<__esri.Graphic>()
            this.SketchViewModel.on("create",evt=>{
                this.EventHub.emit("tipText","建立線段結束點")
                grcs.push(evt.graphic)
                if(grcs.length > 1){ //- 兩點以上就開始請使用者修正位置
                    this.SketchViewModel.complete()
                    this.SketchViewModel.update(grcs,{tool:"reshape"})
                    grcs.splice(0,grcs.length-1)
                }
            })
            this.SketchViewModel.on("update",evt=>{
                this.EventHub.emit("tipText","調整或移動線段成您想要的樣子，按下「確定」或 點擊其他地方來完成操作")
                if(evt.state==='complete'||evt.state==='cancel'){
                    this.EventHub.emit("tipText","正在處理中...")
                    resolve()
                }
            })
            
            this.SketchViewModel.create("polyline",{mode:"click"})
        })

    }
}
