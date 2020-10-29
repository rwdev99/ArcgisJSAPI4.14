import { loadModule, GeometryTransaction } from './utils'
import { LayerFactory } from './layer'

export class BaseDraw {
  
  Graphic:__esri.GraphicConstructor
  Engine:__esri.geometryEngineAsync
  Circle:__esri.CircleConstructor

  geometryTransaction:GeometryTransaction

  view:__esri.MapView
  map:__esri.Map
  glyr:__esri.GraphicsLayer

  pointSymbol:__esri.PictureMarkerSymbolProperties = {
      type: "picture-marker",
      url: "data:image/svg+xml;utf8;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iaXNvLTg4NTktMSI/Pgo8IS0tIEdlbmVyYXRvcjogQWRvYmUgSWxsdXN0cmF0b3IgMTkuMC4wLCBTVkcgRXhwb3J0IFBsdWctSW4gLiBTVkcgVmVyc2lvbjogNi4wMCBCdWlsZCAwKSAgLS0+CjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeD0iMHB4IiB5PSIwcHgiIHZpZXdCb3g9IjAgMCA0ODYuMyA0ODYuMyIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgNDg2LjMgNDg2LjM7IiB4bWw6c3BhY2U9InByZXNlcnZlIiB3aWR0aD0iNTEycHgiIGhlaWdodD0iNTEycHgiPgo8Zz4KCTxwYXRoIHN0eWxlPSJmaWxsOiNDRDJBMDA7IiBkPSJNMjQzLjE1LDB2MTA0LjRjNDQuMTEsMCw4MCwzNS44OCw4MCw4MGMwLDQ0LjExLTM1Ljg5LDgwLTgwLDgwdjIyMS45bDE0Ni40My0xODQuMSAgIGMyNi4yOS0zMy4yNSw0MC4xOS03My4yMSw0MC4xOS0xMTUuNThDNDI5Ljc3LDgzLjcyLDM0Ni4wNSwwLDI0My4xNSwweiIvPgoJPHBhdGggc3R5bGU9ImZpbGw6I0Q4RDdEQTsiIGQ9Ik0zMjMuMTUsMTg0LjRjMC00NC4xMi0zNS44OS04MC04MC04MHYxNjBDMjg3LjI2LDI2NC40LDMyMy4xNSwyMjguNTEsMzIzLjE1LDE4NC40eiIvPgoJPHBhdGggc3R5bGU9ImZpbGw6I0ZGMzUwMTsiIGQ9Ik0xNjMuMTUsMTg0LjRjMC00NC4xMiwzNS44OS04MCw4MC04MFYwQzE0MC4yNSwwLDU2LjUzLDgzLjcyLDU2LjUzLDE4Ni42MiAgIGMwLDQyLjM3LDEzLjksODIuMzMsNDAuMjMsMTE1LjYyTDI0My4xNSw0ODYuM1YyNjQuNEMxOTkuMDQsMjY0LjQsMTYzLjE1LDIyOC41MSwxNjMuMTUsMTg0LjR6Ii8+Cgk8cGF0aCBzdHlsZT0iZmlsbDojRkZGRkZGOyIgZD0iTTE2My4xNSwxODQuNGMwLDQ0LjExLDM1Ljg5LDgwLDgwLDgwdi0xNjBDMTk5LjA0LDEwNC40LDE2My4xNSwxNDAuMjgsMTYzLjE1LDE4NC40eiIvPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+CjxnPgo8L2c+Cjwvc3ZnPgo=",
      width: 20,
      height: 20,
      yoffset: 10
  }

  polygonSymbol:__esri.SimpleFillSymbolProperties = {
    type: "simple-fill",
    color: [ 0,0, 255, 0.2 ],
    outline: {
        color: [5, 5, 100, 0.95],
        width: 1.2
    }
  }

  polylineSymbol :__esri.SimpleLineSymbolProperties={
    type: "simple-line", 
    color: [4, 90, 141],
    width: 1,
    cap: "round",
    join: "round"
}

  async load(){
    this.Graphic = await loadModule<__esri.GraphicConstructor>("esri/Graphic")
    this.Engine = await loadModule<__esri.geometryEngineAsync>("esri/geometry/geometryEngineAsync")
    this.Circle = await loadModule<__esri.CircleConstructor>("esri/geometry/Circle")
    this.geometryTransaction = await new GeometryTransaction().load()

    // auto create graphicslayer
    const layerFactory = new LayerFactory(this.map)
    this.glyr = await layerFactory.addRawLayer("graphiclayer",{
      ID:`Auto-Created-BaseDraw-${Date.now()}`,
      Datatype:"graphicslayer",
      LayerName:`Auto-Created-BaseDraw`,
    })

    return this
  }

  constructor(view:__esri.MapView, map:__esri.Map){
    this.view = view
    this.map = map
  }

  /** convert graphics in "this.glyr" to wkt */
  async getWkt():Promise<string>{
    /** "Esri/Collection" to Array @see https://developers.arcgis.com/javascript/latest/api-reference/esri-core-Collection.html#toArray */
    const geometries = this.glyr.graphics.toArray().map(({geometry})=>geometry).filter(g=>g)
    const geometriesUnioned = await this.Engine.union(geometries)
    return await this.geometryTransaction.toWkt([geometriesUnioned])
  }

  async addGraphic(wkt:string,symbolOpts:any):Promise<__esri.GraphicsLayer>{
   
    // todo wkt's spatialReference move to config , dest is always this.view.spatialReference
    const geometry = await this.geometryTransaction.toArcgis(
      wkt,
      {wkid:102443},
      this.view.spatialReference
    )

    this.glyr.graphics.removeAll()
    
    this.glyr.add(new this.Graphic({
      geometry,
      symbol: {...( geometry.type === 'point' ? this.pointSymbol : this.polygonSymbol ),...symbolOpts}
    }))
    return this.glyr
  }

  clearGraphics(type?:__esri.geometry.Geometry['type']):void{
    if(type === undefined){
      this.glyr.graphics.removeAll()
      return
    }
    for (const graphic of this.glyr.graphics.toArray()) {
      if(graphic.geometry.type === type){
        this.glyr.graphics.remove(graphic)
      } 
    }
  }
  
  /**
   * todo: figure out why need "geodesicBuffer"
   * @see https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-support-normalizeUtils.html
   * @see https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-support-normalizeUtils.html#normalizeCentralMeridian
   */
  async buffGeometry(g:__esri.geometry.Geometry,buffer:number):Promise<__esri.geometry.Geometry>{

    if(g.type === 'point'){
      const circle = new this.Circle({
        center: g,
        radius: buffer,
        radiusUnit: "meters",
        spatialReference: this.view.spatialReference
      })
      return circle
    }

    const simplePolygon = await this.Engine.simplify(g)
    const geodesicPolygon = await this.Engine.geodesicBuffer(simplePolygon , buffer, "meters")
    return geodesicPolygon as __esri.Polygon

  }

  destroy(){
    this.clearGraphics()
    this.map.remove(this.glyr)
    console.log("[BaseDraw destroyed]")
  }
}