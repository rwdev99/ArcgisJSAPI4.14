import { BaseDraw } from './draw'
import { TipText, EventHub, loadModule } from './utils'

export abstract class DrawTool extends BaseDraw {

  Polyline:__esri.PolylineConstructor
  Point:__esri.PointConstructor
  Polygon:__esri.PolygonConstructor

  sketchViewModel:__esri.SketchViewModel
  tipText: TipText
  eventHub: EventHub
  drawIns:__esri.Draw
  
  async load(){
    await super.load()

    this.Polyline = await loadModule<__esri.PolylineConstructor>("esri/geometry/Polyline")
    this.Point = await loadModule<__esri.PointConstructor>("esri/geometry/Point")
    this.Polygon = await loadModule<__esri.PolygonConstructor>("esri/geometry/Polygon")

    const Draw = await loadModule<__esri.DrawConstructor>("esri/views/draw/Draw")
    const SketchViewModel = await loadModule<__esri.SketchViewModelConstructor>("esri/widgets/Sketch/SketchViewModel")

    this.tipText = new TipText(this.view)
    this.eventHub = new EventHub()

    this.sketchViewModel = new SketchViewModel({
      view:this.view,
      layer:this.glyr,
      pointSymbol:this.pointSymbol,
      defaultUpdateOptions:{
          enableRotation:false,
          enableScaling:false
      }
    })

    this.drawIns = new Draw({view:this.view})

    this.view.focus()
  }

  abstract addToGlyr(g:__esri.geometry.Geometry):Promise<void>
  abstract async draw():Promise<void>
  abstract async measure():Promise<any>
  abstract async search():Promise<any>

  abstract destory():void

}